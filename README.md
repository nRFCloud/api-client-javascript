# nRF Cloud JavaScript API Client

[![npm preview version](https://img.shields.io/npm/v/@nrfcloud/api-client-javascript/preview.svg)](https://www.npmjs.com/package/@nrfcloud/api-client-javascript)
[![Greenkeeper badge](https://badges.greenkeeper.io/nrfcloud/api-client-javascript.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Build Status](https://travis-ci.org/nRFCloud/api-client-javascript.svg?branch=master)](https://travis-ci.org/nRFCloud/api-client-javascript)
[![DeepScan Grade](https://deepscan.io/api/projects/1710/branches/7383/badge/grade.svg)](https://deepscan.io/dashboard/#view=project&pid=1710&bid=7383)
[![Known Vulnerabilities](https://snyk.io/test/github/nrfcloud/api-client-javascript/badge.svg)](https://snyk.io/test/github/nrfcloud/api-client-javascript)
[![Maintainability](https://api.codeclimate.com/v1/badges/7d5bd4bef1a93572dd3f/maintainability)](https://codeclimate.com/github/nRFCloud/api-client-javascript/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/7d5bd4bef1a93572dd3f/test_coverage)](https://codeclimate.com/github/nRFCloud/api-client-javascript/test_coverage)

Provides the JavaScript API client for the [nRFCloud.com REST API](https://github.com/nRFCloud/api).

> :warning: **This is a preview release and might be changed without notice.**

## API Client

The API client is available on npm:

    npm i @nrfcloud/api-client-javascript

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
require('es6-promise').polyfill();
require('isomorphic-fetch');

const {Client} = require('@nrfcloud/api-client-javascript')

...
```
