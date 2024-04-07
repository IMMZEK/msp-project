'use strict';
const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const _ = require('lodash');
const { readJsonWithCommentsCb } = require('../../utils/readJsonWithComments');
const { doFormDataPostRequest } = require('../../shared/request-helpers');
const util = require('../util');
const { emitWarning } = require('process');
const addPackageApi = 'api/add-package';
function main({ handoffFile, url }, callback) {
    if (!url.endsWith('/')) {
        url = url + '/';
    }
    const file = util.resolvePath(handoffFile);
    async.waterfall([
        callback => {
            readJsonWithCommentsCb(file, callback);
        },
        (json, callback) => {
            addPackage(json, {
                relativePath: path.dirname(file),
                url
            }, callback);
        }
    ], callback);
}
function addPackage(entries, { relativePath, url }, callback) {
    async.waterfall([
        callback => {
            const error = validateEntrySchema(entries);
            if (error) {
                return setImmediate(callback, error);
            }
            const absZips = _.flatten(entries.map(({ localAssets = {} }) => Object.values(localAssets).map(zip => util.resolvePath(zip, { relative: relativePath }))));
            async.map(absZips, (zip, callback) => {
                fs.stat(zip, err => {
                    if (err) {
                        console.log(`Error: zip ${zip} does not exist`);
                    }
                    callback(err);
                });
            }, err => {
                if (err) {
                    return callback(err);
                }
                callback(null, absZips);
            });
        },
        (absZips, callback) => {
            const formData = {
                attachments: absZips.map(zip => {
                    return fs.createReadStream(zip);
                }),
                entries: JSON.stringify(entries),
                version: '4.8.0'
            };
            doFormDataPostRequest(`${url}${addPackageApi}`, formData).then(() => callback(null, true), err => callback(null, err));
        }
    ], callback);
}
function validateEntrySchema(entries) {
    if (_.isEmpty(entries)) {
        return new Error('Nothing to handoff');
    }
    let error = null;
    entries.map(entry => {
        if (error) {
            return;
        }
        const { email, localAssets = {}, assets = {}, submissionType, handoffChecklist } = entry;
        if (!email || !submissionType) {
            error = new Error('Missing required field, see <url> for required format');
        }
        else if (submissionType !== 'moduleGroup' && !localAssets && !assets) {
            error = new Error('Missing required localAssets or assets, see <url> for required format');
        }
        else if (typeof localAssets !== 'object' && typeof assets !== 'object') {
            error = new Error('Bad localAssets or assets format, see <url> for required format');
        }
        else if (submissionType === 'installer' &&
            (!entry.installCommand || !entry.submittedPackage)) {
            error = new Error('Missing installer or submittedPackage field, see <url> for required format');
        }
        else if (submissionType === 'installer' && typeof entry.installCommand !== 'object') {
            error = new Error('Bad installer field format, see <url> for required format');
        }
        else if (submissionType === 'zip' &&
            (Object.values(assets).find(item => !item.endsWith('.zip')) ||
                Object.values(localAssets).find(item => !item.endsWith('.zip')))) {
            error = new Error('Some assets or localAssets are not zips, all zip submissions must be zip files in the .zip format');
        }
        else if (submissionType === 'installer' &&
            (assets['macos'] || localAssets['macos']) &&
            !(assets['macos'] || localAssets['macos']).endsWith('.zip')) {
            error = new Error('OSX installer must be a .app folder in a .zip');
        }
        else if (submissionType === 'moduleGroup' && !submissionType.moduleGroupMetadata) {
            error = new Error('Missing moduleGroupMetadata field, see <url> for required format');
        }
        else {
            if (!handoffChecklist) {
                emitWarning('Missing handoffChecklist field');
            }
            else if (typeof handoffChecklist !== 'object') {
                emitWarning('Bad handoffChecklist format, see <url> for required format');
            }
            else if (Object.keys(handoffChecklist).length === 0) {
                emitWarning('Missing handoff checklist items');
            }
            const filenames = [
                ...Object.values(assets).map(item => path.basename(item)),
                ...Object.values(localAssets).map(item => path.basename(item))
            ];
            if (_.uniq(filenames).length !== filenames.length) {
                error = new Error('Some assets or localAssets have the same name, please name all items uniquely');
            }
        }
    });
    return error;
}
exports.validateEntrySchema = validateEntrySchema;
///////////////////////////////////////////////////////////////////////////////
// Yargs Command config
///////////////////////////////////////////////////////////////////////////////
exports.command = 'handoff [options]';
exports.describe = 'A simple client to handoff package(s)';
exports.builder = {
    handoffFile: {
        alias: 'f',
        describe: 'The json file to handoff (absolute or relative to the current working directory)',
        demandOption: true
    },
    url: {
        alias: 'u',
        describe: 'The url to POST to (http://tirex-bu-handoff.toro.design.ti.com/tirex/ for offical handoff or http://tirex-bu-develop-1.toro.design.ti.com/tirex/ for development / testing)',
        demandOption: true
    }
};
exports.handler = function (argv) {
    main(argv, (err, result) => {
        if (err) {
            console.error(err);
            console.log('Failed to handoff');
            process.exit(1);
        }
        else if (result !== true) {
            console.log(result);
            process.exit(1);
        }
        else {
            console.log('Successfully sent handoff; wait for an email to see the results');
        }
    });
};
