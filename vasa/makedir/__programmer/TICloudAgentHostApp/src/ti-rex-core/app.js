'use strict';

const fs = require('fs-extra');
const path = require('path');

const { getAppConfig } = require('./out/utils/getAppConfig');

// Turn these on in development

// tslint:disable-next-line no-var-requires
require('source-map-support').install();
// tslint:disable-next-line no-var-requires
// require('longjohn');

// Allow requests to servers with self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function init() {
    // catch unhandled rejection and throw (in future node version this is supposed to happen
    // automatically and we will no longer need this)
    process.on('unhandledRejection', reason => {
        const error = new Error(`Unhandled Promise Rejection: ${reason}`);
        error.stack = reason.stack;
        throw error;
    });

    // Invocation: node app.js <path/to/dinfra.js> <path/to/dconfig> <path/to/tirex-config>
    const { dinfra: dinfraPath, dconfig: dconfigPath, appConfig } = await getAppConfig();

    const config = appConfig ? await fs.readJson(appConfig) : {};

    // process config overrides from cmd line, e.g. --refreshDB=true
    for (let o = 5; o < process.argv.length; o++) {
        if (process.argv[o].slice(0, 2) === '--') {
            const or = process.argv[o].slice(2).split('=');
            config[or[0]] = or[1];
        }
    }

    let dconfig;
    if (dconfigPath.endsWith('.json')) {
        dconfig = require(dconfigPath);
    } else {
        // use a localhost dconfig if dconfig file not found
        dconfig = {
            origin: { landscape: 'localhost', cluster: 'none', instance: 'localhost' },
            paths: {}
        };
    }

    // need to have fully set up dinfra & sqldb before requiring the app
    const app = require('./out/app');

    return new Promise((resolve, reject) => {
        app.setupTirex({ config, dconfig, dinfraPath }, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

init()
    .then(() => {
        // Tirex started successfully
    })
    .catch(err => {
        console.log(err);
    });
