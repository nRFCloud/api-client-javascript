import { ClientGenerator } from './generator';

const {api} = require('@nrfcloud/api');
const pjson = require('../package.json');

import { writeFile as writeFileAsync, readFile as readFileAsync } from 'fs';
import { promisify } from 'util';

const writeFile = promisify(writeFileAsync);
const readFile = promisify(readFileAsync);

readFile('./skeleton/client.ts', 'utf-8')
  .then(skeletonSource => {
    const generator = new ClientGenerator(skeletonSource, api, pjson);
    return writeFile(process.argv[process.argv.length - 1], generator.generate(), 'utf-8');
  });
