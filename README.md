# nRF Cloud JavaScript API Client

[![npm preview version](https://img.shields.io/npm/v/@nrfcloud/api-client-javascript/preview.svg)](https://www.npmjs.com/package/@nrfcloud/api-client-javascript)
[![Build Status](https://travis-ci.org/nRFCloud/api-client-javascript.svg?branch=master)](https://travis-ci.org/nRFCloud/api-client-javascript)
[![Test Coverage](https://api.codeclimate.com/v1/badges/7d5bd4bef1a93572dd3f/test_coverage)](https://codeclimate.com/github/nRFCloud/api-client-javascript/test_coverage)  
[![Greenkeeper badge](https://badges.greenkeeper.io/nrfcloud/api-client-javascript.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)  
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)  
[![DeepScan Grade](https://deepscan.io/api/projects/1710/branches/7383/badge/grade.svg)](https://deepscan.io/dashboard/#view=project&pid=1710&bid=7383)
[![Known Vulnerabilities](https://snyk.io/test/github/nrfcloud/api-client-javascript/badge.svg)](https://snyk.io/test/github/nrfcloud/api-client-javascript)
[![Maintainability](https://api.codeclimate.com/v1/badges/7d5bd4bef1a93572dd3f/maintainability)](https://codeclimate.com/github/nRFCloud/api-client-javascript/maintainability)

Provides the JavaScript API client for the [nRFCloud.com REST API](https://github.com/nRFCloud/api).

> :warning: **This is a preview release and might be changed without notice.**

## API Client

The API client is available on npm:

    npm i @nrfcloud/api-client-javascript@preview
    
You also need to install the [updated models](https://github.com/nRFCloud/models).

    npm i @nrfcloud/models@next
    
### Browser

```javascript
const {Client} = require('@nrfcloud/api-client-javascript')

const client = new Client(token);
client
  .registerGateway('foo')
  .then(res => {
      console.log(res)
  })
```

### Node.js

    npm i isomorphic-fetch es6-promise

```javascript
require('es6-promise').polyfill()
require('isomorphic-fetch')

const {Client} = require('@nrfcloud/api-client-javascript')

...
```

## Testing with the API client

A testing API Gateway can provide an `/token` endpoint which returns a
Cognito User Pool Identity Token so it is not required to use the AWS
Cognito SDK.

Example:

    npm i @nrfcloud/api-client-javascript@preview @nrfcloud/models@next isomorphic-fetch es6-promise

```javascript
require('es6-promise').polyfill();
require('isomorphic-fetch');
const { Client } = require('@nrfcloud/api-client-javascript');

const endpoint = 'https://1ewo2b2jmj.execute-api.us-east-1.amazonaws.com/dev';
const username = 'changeme'; // nrfcloud.com email
const password = 'changeme';

(async () => {

   // This is an undocumented endpoint, which will only be on dev / test stages
   const res = await fetch(`${endpoint}/token`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
   });
   const { token } = await res.json();

   // Construct a client
   const client = new Client(token, endpoint);
   client
      .listTenants('true')
      .then(([{ id }]) => client.registerGateway(id))
      .then(res => {
         console.log(res)
      })
      .catch(err => {
         console.error(err)
      })
})();
```
