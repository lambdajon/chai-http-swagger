const toJsonSchema = require('to-json-schema');
const fs = require('fs');
const YAML = require('json-to-pretty-yaml');
const httpStatusCodes = require('./httpStatusCodes');
const router = require('express').Router();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

class Routes {
  constructor() {
    this.routes = {}
    this.testsCount = 0
    this.docs = {}
    this.models = {
      components: {
        schemas: {}
      }
    }
    this.requestResponses = []
    this.failedTests = [];
    this.swaggerConfig = {}
    this.config = {}
  }

  incrementTests() {
    this.testsCount = this.testsCount + 1;

  }
  setRequest(req) {

    const path = Object.keys(req)[0];
    const method = Object.keys(req[Object.keys(req)])[0];

    if (!this.routes[path]) {
      this.routes = { ...req, ...this.routes }
    }
    else {
      if (this.routes[path] && this.routes[path][method]) {
        this.routes[path][method] = { ...this.routes[path][method], ...req[path][method] }
      }
      else {

        this.routes[path][method] = { ...req[path][method] }
      }
    }
  }
  setResponse(res) {
    const path = Object.keys(res)[0];
    const method = Object.keys(res[Object.keys(res)])[0];
    const code = Object.keys(res[path][method].responses)[0]
    if (!this.routes[path]) {
      this.routes = { ...res, ...this.routes }
    }
    else {
      if (this.routes[path] && this.routes[path][method]) {
        if (!this.routes[path][method].responses) {
          this.routes[path][method].responses = {}
          this.routes[path][method].responses[code] = res[path][method].responses[code]

          if (!this.routes[path][method].responses[code]) {
            this.routes[path][method].responses[code] = { ...this.routes[path][method].responses[code], ...res[path][method].responses[code] }
          }
        }
        else {
          this.routes[path][method].responses = { ...this.routes[path][method].responses, ...res[path][method].responses }
        }
      }
      else {

        this.routes[path][method] = { ...res[path][method] }
      }
    }
  }

  generateDocs = () => {

    for (let path in this.routes) {

      this.docs[path] = {};
      for (let method in this.routes[path]) {

        const lowerMethod = method.toLowerCase()
        this.docs[path][lowerMethod] = {}

        if (this.swaggerConfig
          && this.swaggerConfig.swaggerDefinition
          && this.swaggerConfig.swaggerDefinition.components
          && this.swaggerConfig.swaggerDefinition.components.securitySchemes) {
            
          const SecurityInSwagger = this.swaggerConfig.swaggerDefinition.components.securitySchemes;
          const SecurityKeysInSwagger = Object.keys(SecurityInSwagger);
          
          const SecurityList = []

          SecurityKeysInSwagger.forEach((key) => {
            const securityObj = {}
            securityObj[key] = []
            if(this.routes[path][lowerMethod].request && this.routes[path][lowerMethod].request.security && securityObj[key]){
              const securityKeyName = SecurityInSwagger[key]['name']

              if(this.routes[path][lowerMethod].request.security[securityKeyName]){
                SecurityList.push(securityObj)
              }
            }
          })

          if(SecurityList.length > 0){
            this.docs[path][lowerMethod].security = SecurityList
          }
        } 

        this.docs[path][lowerMethod].tags = [`${(path.split('/').filter(name => name))[0]}`.toUpperCase()]
        let paramsList = []
        let regExpPath = /{(.*?)}/gi
        let pathParams = path.match(regExpPath)
        // 
        if (pathParams && pathParams.length > 0) {

          for (let pathParam of pathParams) {
            let pathParameterName = pathParam.slice(1, -1)
            let pathParameter = {
              in: 'path',
              name: pathParameterName,
              schema: {
                type: 'string',
                required: true
              },
              description: `${pathParameterName} parametr`
            }
            paramsList.push(pathParameter)
          }
        }


        if (this.routes[path][method].request && this.routes[path][method].request.queryParams) {

          let queryParamsObj = []

          for (let queryParamName in this.routes[path][method].request.queryParams) {
            let queryParam = {
              in: 'query',
              name: queryParamName,
              schema: toJsonSchema(this.routes[path][method].request.queryParams[queryParamName], { strings: { detectFormat: false } }),
              description: `${queryParamName} parametr`
            }

            paramsList.push(queryParam)
          }
        }

        this.docs[path][lowerMethod].parameters = paramsList

        if (this.routes[path][method].request && this.routes[path][method].request.body && Object.keys(this.routes[path][method].request.body).length > 0) {
          if (this.routes[path][method].request.header && Object.keys(this.routes[path][method].request.header)[0]) {
            this.docs[path][lowerMethod].requestBody = {}
            const requestHeader = this.routes[path][method].request.header
            let contentTypeRequest = requestHeader[Object.keys(this.routes[path][method].request.header)[0]]
            let modelelCol = path.split('/').filter(name => name).map(name => name.replace(/[^a-zA-Z ]/g, ""))

            let hasTag =
              modelelCol.push(lowerMethod)
            let modelName = modelelCol.join('_')
            let basicSchema = {}
            let fileObjects = {}
            let schemaBody = { ...this.routes[path][method].request.body }
            for (let inputPropName in schemaBody) {
              if (typeof (schemaBody[inputPropName]) === 'object' && schemaBody[inputPropName].type) {
                fileObjects[inputPropName] = {
                  type: 'string',
                  format: 'binary'
                }
              }
              else {
                basicSchema[inputPropName] = schemaBody[inputPropName]
              }
            }
            basicSchema = toJsonSchema(basicSchema)
            basicSchema.properties = {
              ...basicSchema.properties,
              ...fileObjects
            }
            
            this.models.components.schemas[modelName] = basicSchema

            this.docs[path][lowerMethod].requestBody['content'] = {}
            this.docs[path][lowerMethod].requestBody['content'][contentTypeRequest] = {
              schema: {
                $ref: `#/components/schemas/${modelName}`
              }
            }
          }
        }
        let codes = {}
        for (let code in this.routes[path][method].responses) {

          let contentType = this.routes[path][method].responses[code].header['content-type'].split(';')[0];
          codes[code] = {
            description: httpStatusCodes[code],
            content: {}
          }

          const body = toJsonSchema(this.routes[path][method].responses[code].body, )

          codes[code].content[contentType] = {
            schema: body
          }
          if (this.docs[path][lowerMethod].responses) {
            this.docs[path][lowerMethod].responses[code] = codes[code]
          }
          else {
            this.docs[path][lowerMethod].responses = {}
            this.docs[path][lowerMethod].responses[code] = codes[code]
          }
        }
      }
    }
    let docFilePath = `${this.config.swaggerPath}/${Date.now()}_doc.yaml`
    let modelFilePath = `${this.config.swaggerPath}/${Date.now()}_model.yaml`
    if (this.config.fileName) {
      docFilePath = `${this.config.swaggerPath}/${this.config.fileName}_doc.yaml`
      modelFilePath = `${this.config.swaggerPath}/${this.config.fileName}_model.yaml`
    }
    const strDocs = JSON.stringify(this.docs)
    const jsonDocs = JSON.parse(strDocs);
    const yamlDocs = YAML.stringify(jsonDocs);
    fs.writeFileSync(docFilePath, yamlDocs, 'utf-8');

    const strModels = JSON.stringify(this.models)
    const jsonModels = JSON.parse(strModels);
    const yamlModels = YAML.stringify(jsonModels);
    fs.writeFileSync(modelFilePath, yamlModels, 'utf-8');

  }
  setup(conf) {
    this.config = conf.config

    return {
      swagger: this.setupSwagger(conf.swagger)
    }
  }

  // init()
  setupSwagger(config) {
    this.swaggerConfig = config
    this.swaggerConfig.apis = [`${this.config.swaggerPath}/*.yaml`]
    
    const swaggerDocs = swaggerJsDoc(this.swaggerConfig);
    router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
    return router;
  }
  getCallerName(){
    if(this.config.callerName){
      return this.config.callerName
    }
    return null
  }
  
  setRequestResponse(data) {
    this.requestResponses.push(data);
  }

  skip(description) {
    this.failedTests.push(description);
  }
  skipFailedRequests() {
    this.requestResponses.forEach((rqrs, index) => {
      Object.keys(rqrs).forEach(path => {
        Object.keys(rqrs[path]).forEach(methodName => {
          if (rqrs[path][methodName] && rqrs[path][methodName].description) {
            const isFailed = this.failedTests.includes(rqrs[path][methodName].description)
            delete rqrs[path][methodName].description
            if(!isFailed){
              
              if(rqrs[path][methodName].request){
                this.setRequest(this.requestResponses[index])
              }
              if(rqrs[path][methodName].responses){
                this.setRequest(this.requestResponses[index])
              }
            }
          }
        })
      })
    })
  }
}

const routeCollection = new Routes()
process.on('exit', (code) => {
  console.log('Generate Docs started... 🚀')
  routeCollection.skipFailedRequests()
  routeCollection.generateDocs()
  console.log('Generate Docs successfully ✅',);
});

module.exports = routeCollection