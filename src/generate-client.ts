import { ClientGenerator } from './generator';
const { api } = require('@nrfcloud/api');

import { writeFile as writeFileAsync } from 'fs';
import { promisify } from 'util';

const writeFile = promisify(writeFileAsync);
const generator = new ClientGenerator(api);

writeFile(process.argv[process.argv.length - 1], generator.generate(), 'utf-8');
