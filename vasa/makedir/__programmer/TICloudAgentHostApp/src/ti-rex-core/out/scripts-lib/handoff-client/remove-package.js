'use strict';
const { doDeleteRequest } = require('../../shared/request-helpers');
const removePackageApi = 'api/remove-package';
function main({ packageId, packageVersion, url, email }, callback) {
    if (!url.endsWith('/')) {
        url = url + '/';
    }
    doDeleteRequest(`${url}${removePackageApi}?id=${packageId}&version=${packageVersion}&email=${email}`).then(() => {
        callback(null, true);
    }, err => callback(null, err));
}
///////////////////////////////////////////////////////////////////////////////
// Yargs Command config
///////////////////////////////////////////////////////////////////////////////
exports.command = 'remove-package [options]';
exports.describe = 'A simple client to remove a package';
exports.builder = {
    packageId: {
        alias: 'id',
        describe: 'The id of the package to remove',
        demandOption: true
    },
    packageVersion: {
        describe: 'The version of the package to remove (use all to remove all versions)',
        default: '*'
    },
    url: {
        alias: 'u',
        describe: 'The url to DELETE to (http://tirex-bu-handoff.toro.design.ti.com/tirex/ for offical handoff or http://tirex-bu-develop-1.toro.design.ti.com/tirex/ for development / testing)',
        demandOption: true
    },
    email: {
        alias: 'e',
        describe: 'An email (or space separated list of emails) to send the result of the deletion to',
        array: true
    }
};
exports.handler = function (argv) {
    main(argv, (err, result) => {
        if (err) {
            console.error(err);
            console.log('Failed to delete package');
            process.exit(1);
        }
        else {
            if (result !== true) {
                console.log('Failed to delete package');
                console.log(result);
                return process.exit(1);
            }
            console.log('Successfully sent delete; wait for an email to see the results');
        }
    });
};
