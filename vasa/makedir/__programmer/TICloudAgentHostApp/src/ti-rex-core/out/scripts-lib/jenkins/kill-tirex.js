'use strict';
const { doGetRequest } = require('../../shared/request-helpers');
exports.killTirex = function ({ tirexUrl }, callback) {
    {
        // process args
        if (!tirexUrl.endsWith('/')) {
            tirexUrl += '/';
        }
    }
    const refreshUrl = `${tirexUrl}api/exit`;
    doGetRequest(refreshUrl).then(() => callback(), err => callback(err));
};
//////////////////////////////////////////////////////////////////////////////
//  Yargs Command config
//////////////////////////////////////////////////////////////////////////////
exports.command = 'kill-tirex [options]';
exports.describe = 'Kill the tirex at the specified url';
exports.builder = {
    tirexUrl: {
        describe: 'url of the server to kill',
        demandOption: true
    }
};
exports.handler = argv => {
    exports.killTirex(argv, err => {
        if (err) {
            console.log('Failed to kill Tirex');
            console.error(err);
            return process.exit(1);
        }
        console.log('Killed Tirex successfully');
    });
};
