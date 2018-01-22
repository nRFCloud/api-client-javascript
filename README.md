# nRF Cloud JavaScript API Client

[![npm preview version](https://img.shields.io/npm/v/@nrfcloud/api-client-javascript/preview.svg)](https://www.npmjs.com/package/@nrfcloud/api-client-javascript)
[![Greenkeeper badge](https://badges.greenkeeper.io/nrfcloud/api-client-javascript.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Build Status](https://travis-ci.org/nRFCloud/api-client-javascript.svg?branch=master)](https://travis-ci.org/nRFCloud/api-client-javascript)
[![Greenkeeper badge](https://badges.greenkeeper.io/nRFCloud/api-client-javascript.svg)](https://greenkeeper.io/)

Provides the JavaScript API client for the [nRFCloud.com REST API](https://github.com/nRFCloud/api).

## API Client

The API client is available on npm:

    npm i @nrfcloud/api-client-javascript
   
```javascript
const {Client} = require('@nrfcloud/api-client-javascript')

const client = new Client(token);
client
  .registerGateway({tenantId: 'foo'})
  .then(res => {
      console.log(res)
  })
```
