'use strict';
const async = require('async');
const { doGetRequest } = require('../../shared/request-helpers');
exports.waitForTirex = function ({ tirexUrl }, callback) {
    {
        // process args
        if (!tirexUrl.endsWith('/')) {
            tirexUrl += '/';
        }
    }
    const attempts = [];
    for (let i = 0; i < 10; i++) {
        attempts.push(i);
    }
    async.mapSeries(attempts, (attempt, callback) => {
        console.log('Attempt number ', attempt);
        const refreshUrl = `${tirexUrl}api/serverstate`;
        doGetRequest(refreshUrl).then(() => callback('early exit'), err => {
            console.log('Got err');
            console.log(err);
            setTimeout(() => {
                callback();
            }, 1000 * 60 * 2);
        });
    }, err => {
        if (err && err !== 'early exit') {
            callback(err);
        }
        else if (err === 'early exit') {
            callback();
        }
        else {
            callback(new Error('Exceeded max number of attempts'));
        }
    });
};
//////////////////////////////////////////////////////////////////////////////
//  Yargs Command config
//////////////////////////////////////////////////////////////////////////////
exports.command = 'wait-for-tirex [options]';
exports.describe = 'Wait for tirex at the specified url';
exports.builder = {
    tirexUrl: {
        describe: 'url of the server to wait for',
        demandOption: true
    }
};
exports.handler = argv => {
    exports.waitForTirex(argv, err => {
        if (err) {
            console.log('Failed to wait for tirex');
            console.error(err);
            return process.exit(1);
        }
        console.log('Tirex is good to go');
    });
};
