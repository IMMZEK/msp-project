"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactFile = exports.compact = void 0;
//  native
const path = require("path");
// 3rd party
const fse = require("fs-extra");
const async = require("async");
const jsonStableStringify = require("json-stable-stringify");
// @ts-ignore name mismatch with @types/jsonstrema
const JSONStream = require("JSONStream");
const fsutils_1 = require("../../utils/fsutils");
const utils = require("./dbBuilderUtils");
const idHelperTirex3_1 = require("./idHelperTirex3");
const promisifyAny_1 = require("../../utils/promisifyAny");
const promise_utils_1 = require("../../utils/promise-utils");
const util_1 = require("../../shared/util");
const regexNotIndex = /^((?!index).)*$/;
/**
 * compact
 */
async function compact(dbPath) {
    const resourceDbFullDir = path.join(dbPath, 'resources_full.db'); // source
    const overviewDbDir = path.join(dbPath, 'overviews_split.db');
    const resourceDbFiles = (0, fsutils_1.readDirRecursive)(resourceDbFullDir, regexNotIndex, 1);
    const overviewDbFiles = (0, fsutils_1.readDirRecursive)(overviewDbDir, regexNotIndex, 1);
    let dbFilePaths = resourceDbFiles.map(file => path.join(resourceDbFullDir, file));
    dbFilePaths = dbFilePaths.concat(overviewDbFiles.map(file => path.join(overviewDbDir, file)));
    dbFilePaths.push(path.join(dbPath, 'overviews.db'));
    // Move the search and filter index files to the resources.db folder
    // Copy the db index files to the resources.db as compacted db which goes to the resources.db will need them too
    for (const dbFilePath of dbFilePaths) {
        await fse.move(dbFilePath + '.filter.index', dbFilePath.replace('resources_full.db', 'resources.db') + '.filter.index', {
            overwrite: true
        });
        await fse.move(dbFilePath + '.search.index', dbFilePath.replace('resources_full.db', 'resources.db') + '.search.index', {
            overwrite: true
        });
        if (dbFilePath.indexOf('resources_full.db') !== -1) {
            await fse.copy(dbFilePath + '.index', dbFilePath.replace('resources_full.db', 'resources.db') + '.index');
        }
    }
    // compact resources_full.db/xxx -> resources.db/xxx
    const resourceDbFullFiles = (0, fsutils_1.readDirRecursive)(resourceDbFullDir, regexNotIndex, 1);
    for (const file of resourceDbFullFiles) {
        await compactFile(dbPath, file);
    }
}
exports.compact = compact;
/**
 * compactFile
 */
async function compactFile(dbPath, file) {
    const resourceDbFullDir = path.join(dbPath, 'resources_full.db'); // source
    const resourceDbCompactDir = path.join(dbPath, 'resources.db'); // destination
    const compactDBArray = [];
    await new Promise((resolve, reject) => {
        fse.createReadStream(path.join(resourceDbFullDir, file)) // read from full DB
            .pipe(JSONStream.parse('$*'))
            .on('data', ({ value: record }) => {
            deleteUnecessaryFields(record);
            compactRecord(record);
            compactDBArray.push(record);
        })
            .on('close', async () => {
            await writeStreamDBAsync(path.join(resourceDbCompactDir, file), compactDBArray);
            resolve();
        })
            .on('error', (err) => {
            reject(err);
        });
    });
}
exports.compactFile = compactFile;
function compactRecord(record) {
    // fields that can be removed now since they were indexed
    delete record.compiler;
    delete record.kernel;
    // fields that are needed for importable resources only
    if (!utils.isImportableResource(record)) {
        // Tirex 3 Desktop: Workaround for REX-2566 (Unable to import projects from CCS ReX if the board/device filter is enabled)
        // Better solution: keep those 2 fields removed and start using filter/search index on desktop
        // delete record.devtools;
        // delete record.devices;
        // @ts-ignore allow delete on non-optional value for now
        delete record.devicesVariants;
        delete record.coreTypes;
    }
    // fields that are only needed for rex4
    // TODO: add them back for rex 4 desktop
    // @ts-ignore allow delete on non-optional value for now
    delete record.fullPathsPublicIds;
    delete record.ide;
    delete record.resourceClass;
}
/**
 * Delete unnecessary fields (not needed by rex 3 or rex 4 sqldb)
 * More files are removed by compacter.js later after the full records were indexed
 *
 * @param record
 */
function deleteUnecessaryFields(record) {
    // only needed during refresh:
    delete record.devtools_category;
    // @ts-ignore allow delete on non-optional value for now
    delete record.categories;
    delete record.implictDependencyFile;
    delete record.isIncludedFile;
    // feature no longer supported:
    // @ts-ignore allow delete on non-optional value for now
    delete record.allowPartialDownload;
    if (record.resourceType !== 'packageOverview') {
        // NOTE: removing these will effectively disable partial download
        // // TODO: don't add them to resources in the first place
        // @ts-ignore allow delete on non-optional value for now
        delete record.packagePath;
        // @ts-ignore allow delete on non-optional value for now
        delete record.packageVersion;
        // @ts-ignore allow delete on non-optional value for now
        delete record.packageId;
        // @ts-ignore allow delete on non-optional value for now
        delete record.package;
        delete record.includedFilesForDownload;
        delete record.license;
        delete record.hideNodeDirPanel;
        // @ts-ignore allow delete on non-optional value for now
        delete record.dependencies;
        // @ts-ignore allow delete on non-optional value for now
        delete record.semver;
        // @ts-ignore allow delete on non-optional value for now
        delete record.version;
    }
}
// NOTE: Await does not wait for promise from ws.once('drain', () => resolve),
// which results in calling the goldenLog test too soon.
// Thus we just keep the callback version of writeStreamDB and promisify it.
const writeStreamDBAsync = (0, promisifyAny_1.promisifyAny)(writeStreamDB);
function writeStreamDB(file, documents, callback) {
    const ws = fse.createWriteStream(file).on('open', () => {
        ws.write('[\n');
        async.forEachOfSeries(documents, (document, index, callback) => {
            setImmediate(() => {
                const isDrained = ws.write(jsonStableStringify(document, { space: 1 }));
                const indexAsNumber = typeof index === 'string' ? parseInt(index, 10) : index;
                if (indexAsNumber < (documents.length - 1)) {
                    ws.write(',');
                }
                if (isDrained) {
                    callback();
                }
                else {
                    ws.once('drain', callback);
                }
            });
        }, () => {
            ws.end('\n]', () => {
                callback();
            });
        });
    });
}
// @ts-ignore
async function mergeCompact(dbPath, logger) {
    // resources of all packages and versions will be written to a single db file
    const allResourcesMap = {};
    const resourceDbDir = path.join(dbPath, 'resources.db');
    const resourceDbFiles = (0, fsutils_1.readDirRecursive)(resourceDbDir, regexNotIndex, 1);
    try {
        for (const file of resourceDbFiles) {
            logger.info('Merging ' + file);
            await mergeCompactReadStream(file, resourceDbDir, allResourcesMap);
        }
    }
    catch (err) {
        logger.error(JSON.stringify(err));
    }
    await writeStreamDBAsync(path.join(dbPath, 'resources_merge_compacted.db'), Object.values(allResourcesMap));
}
async function mergeCompactReadStream(file, resourceDbDir, allResourcesMap) {
    const jsonStream = JSONStream.parse('$*');
    jsonStream.on('data', ({ value: resource }) => {
        const hash = hashRecord(resource);
        if (!allResourcesMap[hash]) {
            allResourcesMap[hash] = {
                ...resource,
                packageUId: [resource.packageUId],
                packagePath: [resource.packagePath],
                _id: [resource._id]
            };
        }
        else {
            const existingResource = allResourcesMap[hash];
            existingResource.packageUId.push(resource.packageUId);
            existingResource.packagePath.push(resource.packagePath);
            existingResource._id.push(resource._id);
        }
    });
    await (0, promise_utils_1.promisePipe)([fse.createReadStream(path.join(resourceDbDir, file)), jsonStream]);
}
function hashRecord(record) {
    // remove the package path portion to make these fields version independent
    ['link', 'icon', 'image'].forEach(prop => {
        (0, util_1.setValueForPair)(record, record, prop, item => item && item.replace(record.packagePath, ''));
    });
    // remove fields to make record same between versions
    // @ts-ignore allow delete on non-optional value for nwo
    delete record.packageUId;
    // @ts-ignore allow delete on non-optional value for now
    delete record.packagePath;
    // @ts-ignore allow delete on non-optional value for now
    delete record._id;
    return (0, idHelperTirex3_1.createUuid)(record).idVal;
}
