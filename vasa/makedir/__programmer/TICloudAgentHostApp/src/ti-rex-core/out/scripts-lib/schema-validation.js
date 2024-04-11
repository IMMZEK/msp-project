'use strict';
// native modules
const path = require('path');
// our modules
const util = require('./util');
const { SchemaValidator } = require('../schema-validator/schema-validator-3-0');
const { ConsoleLogger } = require('../schema-validator/util');
///////////////////////////////////////////////////////////////////////////////
// Yargs Command config
///////////////////////////////////////////////////////////////////////////////
async function schemaValidator(config) {
    const logger = new ConsoleLogger();
    const schemaValidator = new SchemaValidator();
    await schemaValidator.config(logger, config);
    await schemaValidator.validate();
}
exports.command = `${path.basename(__filename, '.js')} [options]`;
exports.describe = 'Run schema validation on desktop without dinfra';
exports.builder = {
    contentPath: {
        describe: 'contentPath for schema validator',
        demandOption: true
    },
    cfg: {
        describe: 'The schema config',
        default: `${util.projectRoot}/config/contentPackages/schema3cfg.json`
    },
    full: {
        describe: 'If false, summarize the logs.',
        default: false
    }
};
exports.handler = function (argv) {
    schemaValidator(argv).catch((err) => {
        console.error('An error occurred during schema validation');
        console.error(err);
        process.exit(1);
    });
};
