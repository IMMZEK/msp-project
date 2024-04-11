'use strict';
// native modules
const path = require('path');
// our modules
const { ConsoleLogger } = require('../schema-validator/util');
const { UrlValidator } = require('../schema-validator/url-validator');
///////////////////////////////////////////////////////////////////////////////
// Yargs Command config
///////////////////////////////////////////////////////////////////////////////
async function urlValidator(config) {
    const logger = new ConsoleLogger();
    const urlValidator = new UrlValidator(logger, true);
    await urlValidator.validate(config.contentPath);
}
exports.command = `${path.basename(__filename, '.js')} [options]`;
exports.describe = 'Run url validation on desktop without dinfra';
exports.builder = {
    contentPath: {
        describe: 'contentPath for schema validator',
        demandOption: true
    }
};
exports.handler = function (argv) {
    urlValidator(argv).catch((err) => {
        console.error('An error occurred during url validation');
        console.error(err);
        process.exit(1);
    });
};
