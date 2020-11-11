# Chai-HTTP-Swagger

> Chai plugin for generate Swagger documentation of Chai HTTP testcases

The library provides [Chai](http://chaijs.com/) assertions for responses from http requests made using [Chai-HTTP](https://www.chaijs.com/plugins/chai-http/). And documented your api. This library automaticly generate [Swagger/OpenAPI](https://swagger.io/docs/specification/about/) documentation and schemas

---

## Installation

```
npm install chai-http-swagger
```

---

# Summary

- [Chai-HTTP-Swagger](#chai-http-swagger)
  - [Installation](#installation)
- [Summary](#summary)
  - [Usage](#usage)
- [Demo](#demo)
---

## Usage

```javascript
// app.js
const express = require("express");
const { setup } = require("chai-http-swagger");
const app = express();
const options = {
  swagger: {
    // ... Your swagger configurations
  },
  config: {
    swaggerPath: __dirname, // your .yamlfiles directory
    fileName: 'test' // your custom fileName for generated .yaml files
  }
};
const chaiHttpSwaggerSetup = setup(options);

app.use("/swagger", chaiHttpSwaggerSetup.swagger);

app.get("/status", (req, res) => {
  res.sendStatus(200);
  res.json({
    msg: "HELLO WORLD",
  });
});

app.listen(3000);
// ... etc
```

---

```javascript
// test.js
const chai = require("chai");
const chaiHttpSwagger = require("chai-http-swagger");
const app = require("./app");

chai.use(chaiHttpSwagger.httpClient);

it("should check status", (done) => {
  chai
    .request({
      app, // your express aplication
      method: "get", // request method
      path: "/status",
    })
    .end((err, res) => {
      res.should.have.status(200);
      res.should.be.a("Object");
      // your asserts
      done();
    });
});
```
Run your tests and generate `.yaml` files for swagger

---

## Demo

[Demo](https://github.com/AhmadulinJs/chai-http-swagger-examples)

---

Happy Coding !