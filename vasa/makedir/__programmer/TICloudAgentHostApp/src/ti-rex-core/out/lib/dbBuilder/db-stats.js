"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const sizeof = require("object-sizeof");
// @ts-ignore name mismatch with @types/jsonstrema
const JSONStream = require("JSONStream");
const logging_1 = require("../../utils/logging");
const fsutils_1 = require("../../utils/fsutils");
const callbackifyAny_1 = require("../../utils/callbackifyAny");
/**
 * Calculates total occurrence count and size of each field (including key and value) in the specified JSON DB
 *
 */
const statsCb = (0, callbackifyAny_1.callbackifyAny)(statsAsync);
async function statsAsync(dbPath, logger) {
    const resourceDbDir = path.join(dbPath, 'resources.db');
    const regexNotIndex = /^((?!index).)*$/; // exclude the indices
    const resourceDbFiles = (0, fsutils_1.readDirRecursive)(resourceDbDir, regexNotIndex, 1);
    const dbFilePaths = resourceDbFiles.map(file => path.join(resourceDbDir, file));
    // dbFilePaths.push(path.join(dbPath, 'overviews.db'));
    const fieldStats = {};
    for (const dbFilePath of dbFilePaths) {
        logger.info('Calculating field sizes for ' + path.basename(dbFilePath));
        // const jsonArray = fse.readJsonSync(dbFilePath);
        await readStream(dbFilePath, fieldStats);
    }
    return fieldStats;
}
function readStream(dbFilePath, fieldStats) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(dbFilePath)
            .pipe(JSONStream.parse('$*'))
            .on('data', onData)
            .on('close', onClose)
            .on('error', onError);
        function onData({ value: record }) {
            if (record) {
                for (const field of Object.keys(record)) {
                    if (!fieldStats[field]) {
                        fieldStats[field] = { size: 0, count: 0 };
                    }
                    fieldStats[field].size +=
                        // @ts-ignore
                        (sizeof(record[field]) + sizeof(field)) / 1024 / 1024; // MB
                    fieldStats[field].count++;
                }
            }
        }
        function onClose() {
            resolve();
        }
        function onError(err) {
            reject(err);
        }
    });
}
exports.command = 'db-stats [options]';
exports.describe = 'Calculate DB field sizes';
exports.builder = {
    dbPath: {
        describe: 'The absolute path to the DB folder',
        string: true,
        demandOption: true
    }
};
exports.handler = (argv) => {
    statsCb(argv.dbPath, new logging_1.BaseLogger(), (err, fieldStats) => {
        if (err) {
            console.error(err);
        }
        else {
            console.log(fieldStats);
        }
    });
};
