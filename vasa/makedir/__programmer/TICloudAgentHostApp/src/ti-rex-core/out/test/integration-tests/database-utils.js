"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectValidDbId = exports.updateDatabaseWithScriptImpl = exports.updateDatabaseImpl = exports.writeMetadata = exports.generateSimpleCategories = exports.generateOverview = exports.generateResource = exports.generatePackageOverview = exports.generateDevtool = exports.generateDevice = exports.generateId = exports.firstFolderInAllPackages = void 0;
const path = require("path");
const child_process_1 = require("child_process");
const fs = require("fs-extra");
const expect_1 = require("../../test/expect");
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
const dbUpdateInfo_1 = require("../../lib/dbImporter/dbUpdateInfo");
const dbBuilderUtils = require("../../lib/dbBuilder/dbBuilderUtils");
const sqldbImporter_1 = require("../../lib/dbImporter/sqldbImporter");
const sqldb_1 = require("../../sqldb/sqldb");
const rexdb_1 = require("../../rexdb/lib/rexdb");
const logging_1 = require("../../utils/logging");
let idCounter = 0;
exports.firstFolderInAllPackages = 'Software';
function generatePublicIds(fullPaths, name) {
    return fullPaths.map(fullPath => dbBuilderUtils.createPublicIdFromTreeNodePath([...fullPath, name].join('/')));
}
function generateId() {
    idCounter++;
    return idCounter.toString();
}
exports.generateId = generateId;
function generateDevice(id, name) {
    return {
        // Swapping ids and name due to bug REX-1884
        id: name,
        name: id,
        _id: generateId(),
        type: 'device',
        packageUId: 'dummy_package_uid'
    };
}
exports.generateDevice = generateDevice;
function generateDevtool(id, name) {
    return {
        id,
        name,
        _id: generateId(),
        type: 'board',
        packageUId: 'dummy_package_uid',
        energiaBoards: [
            {
                id: name + '_energia_board_A'
            },
            {
                id: name + '_energia_board_B'
            }
        ]
    };
}
exports.generateDevtool = generateDevtool;
function generatePackageOverview(name, version, overrides = {}) {
    const packagePath = `${name}__${version.replace(/\./g, '_')}`;
    const packageId = `com.ti.${name.toUpperCase()}`;
    const recordDefaults = {
        name,
        version,
        type: 'software',
        _id: generateId(),
        package: name,
        packagePath,
        resourceType: 'packageOverview',
        packageId,
        id: packageId,
        packageVersion: version,
        packageUId: `${packageId}__${version}`,
        fullPaths: [[exports.firstFolderInAllPackages]],
        fullPathsPublicIds: [],
        description: 'Generic description for overview',
        image: 'path/to/image.png',
        license: 'path/to/license/file',
        semver: '1.0.0',
        dependencies: []
    };
    const record = {
        ...recordDefaults,
        ...overrides
    };
    record.fullPathsPublicIds = generatePublicIds(record.fullPaths, record.name);
    return record;
}
exports.generatePackageOverview = generatePackageOverview;
function generateResource(name, packageOverview, device, devtool, overrides = {}) {
    const resourceDefaults = {
        name,
        description: 'Out of Box Experience GUI ( Chunk-123z_ )',
        devtools: devtool ? [devtool.name] : [],
        // Bug REX-1884: device ids and names swapped
        // devices: [device.name],
        devices: [device.id],
        compiler: ['ccs'],
        categories: [
            [
                exports.firstFolderInAllPackages,
                packageOverview.name,
                'Examples',
                'Development Tools',
                'Demos',
                'outOfBox_msp432p401r'
            ]
        ],
        resourceType: 'web.app',
        _id: generateId(),
        package: packageOverview.name,
        packageId: packageOverview.packageId,
        packageVersion: packageOverview.version,
        packageUId: packageOverview.packageUId,
        packagePath: packageOverview.packagePath,
        order: 0,
        linkType: 'local',
        fullPaths: [
            [
                exports.firstFolderInAllPackages,
                packageOverview.name,
                'Examples',
                'Development Tools',
                'MSP432P401R LaunchPad - Red 2.x (Red)',
                'Demos',
                'outOfBox_msp432p401r'
            ]
        ],
        fullPathsPublicIds: [],
        devicesVariants: [device.name],
        tags: []
    };
    const record = {
        ...resourceDefaults,
        ...overrides
    };
    record.fullPathsPublicIds = generatePublicIds(record.fullPaths, record.name);
    return record;
}
exports.generateResource = generateResource;
function generateOverview(folderName, packageOverview, overrides = {}) {
    const overviewDefaults = {
        resourceType: 'overview',
        name: folderName,
        _id: generateId(),
        id: packageOverview.packageId,
        packageId: packageOverview.packageId,
        packageUId: packageOverview.packageUId,
        packageVersion: packageOverview.packageVersion,
        packagePath: packageOverview.packagePath,
        type: packageOverview.type,
        version: 'UNVERSIONED',
        categories: [
            [
                exports.firstFolderInAllPackages,
                packageOverview.name,
                'Examples',
                'Development Tools',
                'Demos',
                'outOfBox_msp432p401r'
            ]
        ],
        fullPaths: [
            [
                exports.firstFolderInAllPackages,
                packageOverview.name,
                'Examples',
                'Development Tools',
                'MSP432P401R LaunchPad - Red 2.x (Red)',
                'Demos',
                'outOfBox_msp432p401r'
            ]
        ],
        fullPathsPublicIds: [],
        semver: '1.0.0'
    };
    const record = {
        ...overviewDefaults,
        ...overrides
    };
    record.fullPathsPublicIds = generatePublicIds(record.fullPaths, record.name);
    return record;
}
exports.generateOverview = generateOverview;
/**
 * Generate a category record for each not yet encountered ancestor path in fullPaths
 * @param records
 * @param packageOverview
 */
function generateSimpleCategories(records, packageOverview, overviews) {
    // put placeholder to prevent creating a category that collides with a resource, packageOverview or
    // an already created category
    const PLACEHOLDER = null;
    const categoryMap = {};
    packageOverview.fullPaths.forEach(fullPath => {
        categoryMap[[...fullPath, packageOverview.name].join('/')] = PLACEHOLDER;
    });
    overviews?.forEach(overview => {
        overview.fullPaths.forEach(fullPath => {
            categoryMap[[...fullPath, overview.name].join('/')] = PLACEHOLDER;
        });
    });
    records.forEach(record => {
        record.fullPaths.forEach(fullPath => {
            categoryMap[[...fullPath, record.name].join('/')] = PLACEHOLDER;
            fullPath.forEach((pathElement, i, fullPath) => {
                const key = fullPath.slice(0, i + 1).join('/');
                if (!categoryMap[key] && categoryMap[key] !== PLACEHOLDER) {
                    const category = {
                        resourceType: 'category',
                        name: pathElement,
                        _id: generateId(),
                        id: packageOverview.packageId,
                        packageId: packageOverview.packageId,
                        packageUId: packageOverview.packageUId,
                        packageVersion: packageOverview.packageVersion,
                        packagePath: packageOverview.packagePath,
                        type: packageOverview.type,
                        version: 'UNVERSIONED',
                        fullPaths: [fullPath.slice(0, i)],
                        fullPathsPublicIds: [],
                        semver: '1.0.0'
                    };
                    category.fullPathsPublicIds = generatePublicIds(category.fullPaths, category.name);
                    categoryMap[key] = category;
                }
            });
        });
    });
    const categories = Object.values(categoryMap).filter((category) => category !== PLACEHOLDER);
    return categories;
}
exports.generateSimpleCategories = generateSimpleCategories;
// ------------------------------------------------------------------------------------------------
// Functions to write the metadata to disk so that it can be imported
async function writeMetadata(data) {
    // create the necessary folders
    const dbFolder = (0, test_helpers_1.getUniqueFolderName)();
    const overviewsDbFolder = path.join(dbFolder, 'overviews_split.db');
    const resourcesDbFolder = path.join(dbFolder, 'resources_full.db');
    fs.emptyDirSync(dbFolder);
    fs.ensureDirSync(resourcesDbFolder);
    fs.ensureDirSync(overviewsDbFolder);
    // write the json db files
    await writeDb(data.devices, dbFolder, 'devices.db');
    await writeDb(data.devtools, dbFolder, 'devtools.db');
    let allOverviews = [];
    for (const pkg of data.packages) {
        allOverviews = allOverviews.concat([pkg.packageOverview], pkg.overviews, pkg.simpleCategories);
        await writeDb([pkg.packageOverview, ...pkg.overviews, ...pkg.simpleCategories], overviewsDbFolder, pkg.packageOverview.packageUId);
        await writeDb(pkg.resources, resourcesDbFolder, pkg.packageOverview.packageUId);
    }
    // TODO: temp until sqldb supports split overview db
    await writeDb(allOverviews, dbFolder, 'overviews.db');
    return dbFolder;
}
exports.writeMetadata = writeMetadata;
async function writeDb(records, folder, filename) {
    const db = new rexdb_1.RexDB(new logging_1.BaseLogger(), path.join(folder, filename));
    await db.insertAsync(records);
    await db.saveAsync();
}
/**
 * Update the database in process
 * @param data
 */
async function updateDatabaseImpl(data) {
    const folder = await writeMetadata(data);
    DatabaseUpdateEvent.reset();
    // TODO REX-2268 Should allow multiple instances of sqldb
    // SQLDB may not work correctly if multiple instances are created.
    // For now use the single instance until this is verified/fixed.
    const sqldb = await sqldb_1.SqlDb.instance({
        dinfraPath: test_helpers_1.testingGlobals.dinfraPath,
        tablePrefix: scriptsUtil.getMochaConfig().dbTablePrefix
    });
    const dinfra = require(test_helpers_1.testingGlobals.dinfraPath);
    await (0, sqldbImporter_1.metadataImport)(dinfra, sqldb, folder, null, {
        notify_forTestingOnly: true,
        verboseLogging: false,
        quiet: true
    });
    await DatabaseUpdateEvent.wait();
    return folder;
}
exports.updateDatabaseImpl = updateDatabaseImpl;
/**
 * Update the database spawning the db-import script in another process
 * @param data
 */
async function updateDatabaseWithScriptImpl(data) {
    const folder = await writeMetadata(data);
    // Write dconfig file to use
    const dconfigFile = path.join(folder, 'dconfig.json');
    scriptsUtil.initMochaDConfig({});
    fs.writeFileSync(dconfigFile, JSON.stringify(scriptsUtil.getMochaDconfig()));
    // Write appconfig file to use
    // The update only cares about where the content is, and what the table prefix is, so this file
    // is a lot smaller than normal
    const appConfigFile = path.join(folder, 'appconfig.json');
    scriptsUtil.initMochaConfig({});
    const appConfig = {
        ...scriptsUtil.getMochaConfig(),
        dbPath: folder
    };
    fs.writeFileSync(appConfigFile, JSON.stringify(appConfig));
    // Now run the actual update script
    const args = [
        path.join(__dirname, '..', '..', 'scripts-lib', 'tirex-scripts.js'),
        'db-import',
        '--dinfra',
        test_helpers_1.testingGlobals.dinfraPath,
        '--dconfig',
        dconfigFile,
        '--appconfig',
        appConfigFile,
        '--skipContent',
        '--quiet',
        '--notify_forTestingOnly'
    ];
    if (scriptsUtil.getMochaConfig().dbTablePrefix === 'tirex') {
        throw new Error('tried to update the real metadata (instead of the test data)!');
    }
    DatabaseUpdateEvent.reset();
    await spawnAsync(process.execPath, args);
    await DatabaseUpdateEvent.wait();
    return folder;
}
exports.updateDatabaseWithScriptImpl = updateDatabaseWithScriptImpl;
function spawnAsync(command, args) {
    const cp = (0, child_process_1.spawn)(command, args);
    return new Promise((resolve, reject) => {
        cp.stdout.on('data', buf => console.log(buf.toString()));
        cp.stderr.on('data', buf => console.error(buf.toString()));
        cp.on('error', reject);
        cp.on('disconnect', reject);
        cp.on('exit', exitCode => {
            if (exitCode === 0) {
                resolve();
            }
            else {
                reject(new Error(`Exited with exit code ${exitCode}`));
            }
        });
    });
}
var DatabaseUpdateEvent;
(function (DatabaseUpdateEvent) {
    // Register for database updates, mark them seen and then execute a generic handler
    let onDatabaseUpdatedHandler = () => { };
    let databaseUpdateSeen = false;
    if (test_helpers_1.testingGlobals.testConfig === scriptsUtil.TestConfig.REMOTESERVER) {
        // If this event is registered and you haven't started the server yet, then
        // it's going to throw an exception
        (0, dbUpdateInfo_1.registerDatabaseUpdateHandler)(require(test_helpers_1.testingGlobals.dinfraPath), () => {
            databaseUpdateSeen = true;
            onDatabaseUpdatedHandler();
        });
    }
    // Call to reset the event so it will fire again
    function reset() {
        databaseUpdateSeen = false;
    }
    DatabaseUpdateEvent.reset = reset;
    // If an update has occurred since the last call to reset, return immediately.  Otherwise
    // wait for an event to be fired
    function wait() {
        if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
            throw new Error('You cannot wait for a db update in this test mode as the notification system ' +
                'requires that you pre-register a service with dinfra');
        }
        if (!databaseUpdateSeen) {
            return new Promise(resolve => (onDatabaseUpdatedHandler = resolve));
        }
        return Promise.resolve();
    }
    DatabaseUpdateEvent.wait = wait;
})(DatabaseUpdateEvent || (DatabaseUpdateEvent = {}));
function expectValidDbId(id) {
    (0, expect_1.expect)(parseInt(id)).to.be.greaterThan(0);
}
exports.expectValidDbId = expectValidDbId;
