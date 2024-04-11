"use strict";
// tslint:disable:no-unused-expression    allow expect().to.exist to work
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const util = require("util");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT ||
    process.platform !== 'linux' // talks to backend database which is linux only
) {
    // @ts-ignore
    return;
}
const sqldb_1 = require("./sqldb");
const manage_1 = require("./manage");
const types_1 = require("./db/types");
const util_1 = require("../shared/util");
const expect_1 = require("../test/expect");
const util_2 = require("./util");
const appConfig_1 = require("../lib/appConfig");
const promisifyAny_1 = require("../utils/promisifyAny");
// By default, the mocha dconfig and test mode are used to execute appropriate tests.
// When set (with option --customTest), a custom dconfig and test set are used.
// See getTestConfig() for more details
const customTestSet = test_helpers_1.testingGlobals.customTest;
// Enable logging, off by default
let enableDinfraConsoleLogging = false;
// Enable db clear on suite teardown, on by default
let clearDbOnTeardown = true;
// Skip db import, off by default. Used to reuse existing db during test development/testing.
let skipImport = false;
let resetQueryCacheEnabled = true;
// Globals used by support functions (must be declared before describe block)
const reportDir = path.join(scriptsUtil.projectRoot, 'reports');
// Small resources db with limited set of packages
const stdJsonDbDir = path.join(scriptsUtil.projectRoot, 'test', 'data', 'jsondb-20200413');
// note: testdataPath is set with --testData, defaults to ~/ccs-cloud.local/ti-rex-testdata
// jsondb-benchmarks is currently local to my VM at ~/rex-testdata/jsondb-benchmarks
// TODO!: Reduce size of jsondb-benchmarks (currently 8G) and add to ti-rex-testdata
const benchmarkJsonDbDir = path.join(test_helpers_1.testingGlobals.testdataPath, 'jsondb-benchmarks');
const testConfig = getTestConfig();
let rexdb;
let dinfra;
describe('SQLDB', function () {
    // TODO! Should be set in config
    if (customTestSet === undefined &&
        test_helpers_1.testingGlobals.testMode !== scriptsUtil.TestMode.VERY_HEAVY) {
        this.timeout(900000);
    }
    else {
        this.enableTimeouts(false);
    }
    // Configure dinfra
    before(async () => {
        dinfra = require(testConfig.rexdbConfig.dinfraPath);
        if (enableDinfraConsoleLogging) {
            dinfra.dlog.console();
            dinfra.interceptEmitterErrors();
        }
        rexdb = await sqldb_1.SqlDb.instance(testConfig.rexdbConfig);
        // TODO! Print what's relevant
        rexdb.console.log('Configuration: ' + JSON.stringify(testConfig.rexdbConfig));
        rexdb.db.sqlStats.enableStatCollection(true);
        rexdb.console.fine('configuring dinfra...');
        Object.assign(testConfig.dconfig.databases.defaults, appConfig_1.tirexDatabasesDefaults);
        await dinfra.configure(testConfig.dconfig);
        rexdb.console.fine('dinfra configured');
    });
    suite('Standard', () => {
        // All tests in this suite use the same small set of packages to reduce total run time
        suite('manage', () => {
            test('updateSchema', 'should be possible to update the schema', async () => {
                return rexdb.manage.updateSchema();
            });
            test('createDb', 'should be possible to create an empty database', async () => {
                if (!skipImport) {
                    await rexdb.manage.createDb();
                }
            });
            test('reset', 'should be possible to reset the database', () => {
                rexdb.manage.reset();
            });
            test('import', 'should be possible to import into the database', async () => {
                const packageGroupUids = [
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02',
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38',
                    'com.ti.mmwave_industrial_toolbox__2.3.1',
                    'digital_power_c2000ware_sdk_software_package__1.01.00.00',
                    'devices__1.11.00.00',
                    'devtools__1.11.00.00'
                ];
                if (!skipImport) {
                    await rexdb.manage.import(stdJsonDbDir, null, getPackageGroupsToImport(packageGroupUids) // ,
                    // options
                    );
                }
            });
        });
        suite('resources', () => {
            test('fields_test_compiler_kernel', 'should have compiler and kernel fields in the resources', async () => {
                const packages = await rexdb.db.simpleQuery('get-package-info', `select * from ${rexdb.db.tables.packages} where uid = ?`, ['com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02']);
                const records = await rexdb.db.simpleQuery('get-projectspecs-ccs-freertos', `select * from ${rexdb.db.tables.resources} n where package_id = ?
                        and type = ? and compiler = ? and kernel = ?`, [packages[0].id, 'projectSpec', 'ccs', 'freertos']);
                (0, expect_1.expect)(records).to.not.be.empty;
            });
            test('fields_test_override_projspec_device', 'should have override_projspec_device in resources', async () => {
                let records = await rexdb.db.simpleQuery('get-override-true', `select * from ${rexdb.db.tables.resources} where type = 'projectSpec' 
                        and override_projspec_device = true`, []);
                (0, expect_1.expect)(records).to.not.be.empty;
                records = await rexdb.db.simpleQuery('get-override-false', `select * from ${rexdb.db.tables.resources} where type = 'projectSpec' 
                        and override_projspec_device = false`, []);
                (0, expect_1.expect)(records).to.be.empty;
                records = await rexdb.db.simpleQuery('get-override-null', `select * from ${rexdb.db.tables.resources} 
                        where override_projspec_device IS NULL`, []);
                (0, expect_1.expect)(records).to.not.be.empty;
            });
        });
        suite('tree', () => {
            test('traverseResourceTree', 'should be possible to traverse the resource tree', async () => {
                await testResourceTreeTraversal();
            });
            // Package tree testing
            test('traversePackageTree', 'should be possible to traverse full package tree', async () => {
                await testPackageTreeTraversal();
            });
            const packageTreeTestData = [
                {
                    testName: 'packageTreePath1',
                    testDescription: 'should be possible to navigate to foundation node',
                    shouldExist: true,
                    path: ['Software', 'SimpleLink SDK Plugins']
                },
                {
                    testName: 'packageTreePath2',
                    testDescription: 'should be possible to navigate to package overview with single version',
                    shouldExist: true,
                    path: ['Software', 'C2000Ware_DigitalPower_SDK'],
                    packageGroupPublicId: 'digital_power_c2000ware_sdk_software_package',
                    packageGroupVersion: '1.01.00.00',
                    packagePublicId: 'digital_power_c2000ware_sdk_software_package',
                    packageVersion: '1.01.00.00'
                },
                {
                    testName: 'packageTreePath3',
                    testDescription: 'should not be possible to navigate to foundation node without package overviews',
                    shouldExist: false,
                    path: ['Device Documentation']
                },
                {
                    testName: 'packageTreePath4',
                    testDescription: 'should be possible to navigate to package overview of latest version',
                    shouldExist: true,
                    path: [
                        'Software',
                        'SimpleLink SDK Plugins',
                        'Connectivity',
                        'SimpleLink SDK WiFi Plugin'
                    ],
                    packageGroupPublicId: 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN',
                    packageGroupVersion: '1.50.00.38',
                    packagePublicId: 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN',
                    packageVersion: '1.50.00.38'
                },
                {
                    testName: 'packageTreePath5',
                    testDescription: 'should not be possible to navigate to package overview of non-latest version',
                    shouldExist: false,
                    path: [
                        'Software',
                        'SimpleLink SDK Plugins',
                        'Connectivity',
                        'SimpleLink MSP432 SDK WiFi Plugin'
                    ],
                    packageGroupPublicId: 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN',
                    packageGroupVersion: '1.40.00.02'
                },
                {
                    testName: 'packageTreePath6',
                    testDescription: 'should be possible to navigate to nested package overview',
                    shouldExist: true,
                    path: [
                        'Software',
                        'SimpleLink SDK Plugins',
                        'Connectivity',
                        'SimpleLink SDK WiFi Plugin',
                        'SimpleLink Academy'
                    ],
                    packageGroupPublicId: 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN',
                    packageGroupVersion: '1.50.00.38',
                    packagePublicId: 'com.ti.SIMPLELINK_ACADEMY_WIFIPLUGIN',
                    packageVersion: ' 1.15.00.00'
                },
                {
                    testName: 'packageTreePath7',
                    testDescription: 'should not be possible to navigate to restricted package',
                    shouldExist: false,
                    path: ['Software Tools', 'Temboo Library']
                }
            ];
            async () => {
                for (const testArgs of packageTreeTestData) {
                    test(testArgs.testName, testArgs.testDescription, async () => {
                        const node = await getPackageTreeNode(testArgs.path, testArgs.packageGroupPublicId, testArgs.packageGroupVersion);
                        if (testArgs.shouldExist) {
                            (0, expect_1.expect)(node).to.exist;
                        }
                        else {
                            (0, expect_1.expect)(node).to.not.exist;
                        }
                    });
                }
            };
        });
        suite('public ids', () => {
            test('lookupNodeOnPublicId', 'should be possible to look up node with public id', async () => {
                await lookupNodeOnPublicId();
            });
        });
        // Package-scoped custom id and global custom id tests
        suite('custom ids', () => {
            const mainTestArgsList = [
                {
                    publicIdType: 'custom-resource-id',
                    publicId: 'Custom_resource_id_123',
                    publicIdWrongCase: 'CustoM_Resource_iD_123',
                    package: {
                        publicId: 'com.ti.mmwave_industrial_toolbox',
                        version: '2.3.1'
                    },
                    packageAlias: 'package_alias_123',
                    expectedPackageGroup: {
                        publicId: 'com.ti.mmwave_industrial_toolbox',
                        version: '2.3.1'
                    },
                    expectedPackage: {
                        publicId: 'com.ti.mmwave_industrial_toolbox',
                        version: '2.3.1'
                    },
                    expectedNodePublicId: 'AA6oVo6QDMQZAgDGt5S2pw',
                    expectedNodeName: 'CCS Project',
                    hasDevice: 'IWR1443',
                    notDevice: 'IWR1642',
                    hasDevtool: 'IWR1443BOOST',
                    notDevtool: 'IWR1642BOOST',
                    hasDeviceAlias: 'iwr1443-alias',
                    hasDevtoolAlias: 'iwr1443boost-alias'
                },
                {
                    publicIdType: 'global-id',
                    publicId: 'Custom_global_resource_id_123',
                    publicIdWrongCase: 'CustoM_Global_Resource_iD_123',
                    expectedPackageGroup: {
                        publicId: 'com.ti.mmwave_industrial_toolbox',
                        version: '2.3.1'
                    },
                    expectedPackage: {
                        publicId: 'com.ti.mmwave_industrial_toolbox',
                        version: '2.3.1'
                    },
                    expectedNodePublicId: 'AA6oVo6QDMQZAgDGt5S2pw',
                    expectedNodeName: 'CCS Project',
                    hasDevice: 'IWR1443',
                    notDevice: 'IWR1642',
                    hasDevtool: 'IWR1443BOOST',
                    notDevtool: 'IWR1642BOOST',
                    hasDeviceAlias: 'iwr1443-alias',
                    hasDevtoolAlias: 'iwr1443boost-alias'
                }
            ];
            function verifyNode(node, args) {
                expectValidDbId(node.nodeDbId, 'node db id');
                (0, expect_1.expect)(node.hashedNodePublicId, 'node public id').to.equal(args.expectedNodePublicId);
                if (args.expectedPackageGroup) {
                    (0, expect_1.expect)(node.packageGroup, 'package group').to.include(args.expectedPackageGroup);
                }
                if (args.expectedPackage) {
                    (0, expect_1.expect)(node.package, 'package').to.include(args.expectedPackage);
                }
            }
            for (const args of mainTestArgsList) {
                function verifySingleNode(nodes) {
                    (0, expect_1.expect)(nodes).to.have.lengthOf(1);
                    verifyNode(nodes[0], args);
                }
                const baseTestName = 'lookupNodesOn' +
                    (args.publicIdType === 'custom-resource-id' ? 'PackageScoped' : 'Global') +
                    'Id';
                const baseTestDescr = 'should be possible to look up nodes using ' +
                    (args.publicIdType === 'custom-resource-id' ? 'package-scoped' : 'global') +
                    ' custom ids';
                test(baseTestName, baseTestDescr, async () => {
                    if (args.publicIdType === 'custom-resource-id') {
                        // Should work with just package public id and *no* version
                        let start = Date.now();
                        let nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, {
                            publicId: args.package.publicId
                        });
                        verifySingleNode(nodes);
                        verifyRunTime(start, 50);
                        // Should work with package public id *and* version
                        start = Date.now();
                        nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, {
                            publicId: args.package.publicId,
                            version: args.package.version
                        });
                        verifySingleNode(nodes);
                        verifyRunTime(start, 50);
                    }
                    else {
                        const start = Date.now();
                        const nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId);
                        verifySingleNode(nodes);
                        verifyRunTime(start, 50);
                    }
                });
                if (args.publicIdWrongCase) {
                    test(baseTestName + 'CaseInsensitive', baseTestDescr + ' regardless of case', async () => {
                        // Should work with public id arg with different case from actual
                        let nodes;
                        if (args.publicIdType === 'custom-resource-id') {
                            nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, {
                                publicId: args.package.publicId
                            });
                        }
                        else {
                            nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId);
                        }
                        verifySingleNode(nodes);
                    });
                }
                if (args.hasDevice) {
                    test(baseTestName + 'AndDevice', baseTestDescr + ' and devices', async () => {
                        // Should work with device public id
                        let nodes;
                        const start = Date.now();
                        if (args.publicIdType === 'custom-resource-id') {
                            nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, { publicId: args.package.publicId }, { type: 'device', publicId: args.hasDevice });
                        }
                        else {
                            nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, {
                                type: 'device',
                                publicId: args.hasDevice
                            });
                        }
                        verifySingleNode(nodes);
                        verifyRunTime(start, 50);
                        // Expect no nodes when node doesn't have the given device
                        if (args.notDevice) {
                            let nodes;
                            if (args.publicIdType === 'custom-resource-id') {
                                nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, { publicId: args.package.publicId }, { type: 'device', publicId: args.notDevice });
                            }
                            else {
                                nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, {
                                    type: 'device',
                                    publicId: args.notDevice
                                });
                            }
                            (0, expect_1.expect)(nodes).to.be.empty;
                        }
                    });
                }
                if (args.hasDevtool) {
                    test(baseTestName + 'AndDevtool', baseTestDescr + ' and devtools', async () => {
                        // Should work with devtool public id
                        let nodes;
                        const start = Date.now();
                        if (args.publicIdType === 'custom-resource-id') {
                            nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, { publicId: args.package.publicId }, { type: 'devtool', publicId: args.hasDevtool });
                        }
                        else {
                            nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, {
                                type: 'devtool',
                                publicId: args.hasDevtool
                            });
                        }
                        verifySingleNode(nodes);
                        verifyRunTime(start, 50);
                        // Expect no nodes when none have the given devtool
                        if (args.notDevtool) {
                            let nodes;
                            if (args.publicIdType === 'custom-resource-id') {
                                nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, { publicId: args.package.publicId }, { type: 'devtool', publicId: args.notDevtool });
                            }
                            else {
                                nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, {
                                    type: 'devtool',
                                    publicId: args.notDevtool
                                });
                            }
                            (0, expect_1.expect)(nodes).to.be.empty;
                        }
                    });
                }
                if (args.publicIdType === 'custom-resource-id') {
                    test(baseTestName + 'AndPackageAlias', baseTestDescr + ' and package aliases', async () => {
                        // Should work with package alias
                        const start = Date.now();
                        let nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, {
                            publicId: args.packageAlias
                        });
                        verifySingleNode(nodes);
                        verifyRunTime(start, 50);
                        // Should work with package alias *and* version
                        nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, {
                            publicId: args.packageAlias,
                            version: args.package.version
                        });
                        verifySingleNode(nodes);
                    });
                }
                if (args.hasDeviceAlias) {
                    test(baseTestName + 'AndDevAlias', baseTestDescr + ' and device and devtool aliases', async () => {
                        // Should work with device alias
                        let start = Date.now();
                        if (args.publicIdType === 'custom-resource-id') {
                            const nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, { publicId: args.package.publicId }, { type: 'device', publicId: args.hasDeviceAlias });
                            verifySingleNode(nodes);
                        }
                        else {
                            const nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, {
                                type: 'device',
                                publicId: args.hasDeviceAlias
                            });
                            verifySingleNode(nodes);
                        }
                        verifyRunTime(start, 50);
                        // Should work with devtool alias
                        start = Date.now();
                        if (args.publicIdType === 'custom-resource-id') {
                            const nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, { publicId: args.package.publicId }, { type: 'devtool', publicId: args.hasDevtoolAlias });
                            verifySingleNode(nodes);
                        }
                        else {
                            const nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, {
                                type: 'devtool',
                                publicId: args.hasDevtoolAlias
                            });
                            verifySingleNode(nodes);
                        }
                        verifyRunTime(start, 50);
                    });
                }
            }
            const multiDeviceNodeTestArgsList = [
                {
                    publicIdType: 'custom-resource-id',
                    publicId: 'Custom_resource_id_1234',
                    publicIdWrongCase: 'CustoM_Resource_iD_1234',
                    package: {
                        publicId: 'com.ti.mmwave_devices',
                        version: '2.0.0'
                    },
                    expectedPackageGroup: {
                        publicId: 'devices',
                        version: '1.11.00.00'
                    },
                    expectedNodePublicIdsByDevice: {
                        IWR1443: 'AKHXle8VAjWnDQvnyvV.wQ',
                        IWR1642: 'APYQbeH9kjk-6T09uVlcrA',
                        IWR6843: 'AKflSPvL5uHyGidb4SJO9g'
                    },
                    expectedNodeName: 'Technical Reference Manual'
                },
                {
                    publicIdType: 'global-id',
                    publicId: 'Custom_global_resource_id_1234',
                    publicIdWrongCase: 'CustoM_Global_Resource_iD_1234',
                    package: {
                        publicId: 'com.ti.mmwave_devices',
                        version: '2.0.0'
                    },
                    expectedPackageGroup: {
                        publicId: 'devices',
                        version: '1.11.00.00'
                    },
                    expectedNodePublicIdsByDevice: {
                        IWR1443: 'AKHXle8VAjWnDQvnyvV.wQ',
                        IWR1642: 'APYQbeH9kjk-6T09uVlcrA',
                        IWR6843: 'AKflSPvL5uHyGidb4SJO9g'
                    },
                    expectedNodeName: 'Technical Reference Manual'
                }
            ];
            for (const args of multiDeviceNodeTestArgsList) {
                const baseTestName = 'lookupNodesOn' +
                    (args.publicIdType === 'custom-resource-id' ? 'PackageScoped' : 'Global') +
                    'Id';
                const baseTestDescr = 'should be possible to look up nodes using ' +
                    (args.publicIdType === 'custom-resource-id' ? 'package-scoped' : 'global') +
                    ' custom ids';
                test(baseTestName + 'AndMultiDeviceNodes', baseTestDescr + ' and devices when resource has multiple device nodes', async () => {
                    // Test resource has 3 nodes, each corresponding to a distinct device.
                    // Verify that just one node is found and that it is the one associated
                    // with the device specified in the lookup.
                    // Do this for all 3 devices.
                    for (const [device, nodePublicId] of Object.entries(args.expectedNodePublicIdsByDevice)) {
                        let nodes;
                        if (args.publicIdType === 'custom-resource-id') {
                            nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, { publicId: args.package.publicId }, { type: 'device', publicId: device });
                        }
                        else {
                            nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, {
                                type: 'device',
                                publicId: device
                            });
                        }
                        (0, expect_1.expect)(nodes).to.have.lengthOf(1);
                        verifyNode(nodes[0], {
                            ...args,
                            expectedNodePublicId: nodePublicId
                        });
                    }
                });
                test(baseTestName + 'AndMultiDeviceNodes2', baseTestDescr + ' but no devices when resource has multiple device nodes', async () => {
                    // Verify that all 3 nodes are found when no device is specified in the lookup
                    let nodes;
                    if (args.publicIdType === 'custom-resource-id') {
                        nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, {
                            publicId: args.package.publicId
                        });
                    }
                    else {
                        nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId);
                    }
                    (0, expect_1.expect)(nodes).to.have.lengthOf(3);
                    for (const [, nodePublicId] of Object.entries(args.expectedNodePublicIdsByDevice)) {
                        const node = _.find(nodes, { hashedNodePublicId: nodePublicId });
                        (0, expect_1.expect)(node).to.exist;
                        verifyNode(node, {
                            ...args,
                            expectedNodePublicId: nodePublicId
                        });
                    }
                });
                test(baseTestName + 'WithLimit', baseTestDescr + ' and with limit of 1', async () => {
                    // Verify that just one node is returned when limit is set to 1 when there
                    // are multiple matches
                    let nodes;
                    if (args.publicIdType === 'custom-resource-id') {
                        nodes = await rexdb.tree.lookupNodesOnCustomResourceId(args.publicId, {
                            publicId: args.package.publicId
                        }, undefined, 1);
                    }
                    else {
                        nodes = await rexdb.tree.lookupNodesOnGlobalId(args.publicId, undefined, 1);
                    }
                    (0, expect_1.expect)(nodes).to.have.lengthOf(1);
                });
            }
        });
        suite('devices and devtools', () => {
            test('getDevices', 'should be possible to fetch all devices', async () => {
                const devices = await rexdb.devices.getAll();
                rexdb.console.fine('Number of Devices: ' + devices.length);
                rexdb.console.finer('Devices:');
                devices.forEach((device) => {
                    rexdb.console.finer('Device #' + device.id + ': ' + util.inspect(device));
                });
            });
            test('getDevtools', 'should be possible to fetch all devtools', async () => {
                const devtools = await rexdb.devtools.getAll();
                rexdb.console.fine('Number of Devtools: ' + devtools.length);
                rexdb.console.finer('Devtools:');
                devtools.forEach((devtool) => {
                    rexdb.console.finer('Devtool #' + devtool.id + ': ' + util.inspect(devtool));
                });
                // TODO: Need to actually check for expected devtools
            });
            test('getDevtools2', 'should be possible to fetch package devtools and their devices', async () => {
                const deviceMap = toMap(await rexdb.devices.getAll());
                const devtools = await rexdb.devtools.getAll();
                rexdb.console.finer('Devtools and their packages:');
                // Get each devtool's source package, and print along with devtool
                for (const devtool of devtools) {
                    expectValidDbId(devtool.id);
                    rexdb.console.finer('Devtool #' + devtool.id + ': ' + devtool.name);
                    const devices = await rexdb.devices.getIdsOnDevtool(devtool.id);
                    if (!_.isEmpty(devices)) {
                        rexdb.console.finer('  devices:');
                        devices.forEach((deviceId) => {
                            const device = deviceMap[deviceId];
                            rexdb.console.finer('    #' + device.id + ': ' + device.name);
                        });
                    }
                    else {
                        rexdb.console.finer('  no devices');
                    }
                }
                // TODO: Need to actually check for expected devtools and their devices
            });
        });
        suite('packages', () => {
            test('getPackages', 'should be possible to fetch overviews and the packages they came from', async () => {
                await testPackageRetrieval();
            });
            test('getPackages2', 'should be possible to fetch overviews by public id and the packages they came from', async () => {
                await testPackageRetrieval({
                    // TODO!: Replace this package with another, no longer in
                    packagePublicId: 'com.ti.mmwave_training'
                });
            });
        });
        // TODO!: Create test for REX-3052 that imports three generated resources, one with
        // view_limitations undefined, another as [], and a third ['foo'], and verify that all 3 are
        // recomposed correctly.
        suite('table view', () => {
            test('tableView1', 'should be possible to get all table view rows for a set of package groups', async () => {
                const packageGroupIds = await getPackageGroupIds([
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02',
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38'
                ]);
                const device = await getDevice('MSP432P401R');
                (0, expect_1.expect)(device).to.exist;
                const tableViewItems = await rexdb.tableViews.getTableView(undefined, packageGroupIds, {
                    deviceId: device.id
                });
                (0, expect_1.expect)(_.chain(tableViewItems)
                    .filter((o) => o.name === 'cloud_ota')
                    .map((o) => o.packageId)
                    .uniq()
                    .value()).to.have.lengthOf(2, 'there should be table view cloud_ota items from exactly two distinct packages');
                // TODO! Expand this test
            });
            test('tableView2', "should be possible to get a package node's table view rows", async () => {
                const node = await getNodeAtPath('/Software/mmWave Sensors/Industrial Toolbox/Labs', ['com.ti.mmwave_industrial_toolbox__2.3.1']);
                (0, expect_1.expect)(node).to.exist;
                const device = await getDevice('IWR1642');
                (0, expect_1.expect)(device).to.exist;
                const tableViewItems = await rexdb.tableViews.getTableView(node.id, await getPackageGroupIds([
                    'com.ti.mmwave_industrial_toolbox__2.3.1',
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02',
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38'
                ]), {
                    deviceId: device.id
                });
                (0, expect_1.expect)(tableViewItems).to.not.be.empty;
                (0, expect_1.expect)(_.find(tableViewItems, (o) => o.name === 'CCS Project -- DSS' &&
                    o.categoryContext === 'mmWave Sensors / Labs / Traffic Monitoring')).to.exist;
                // TODO! Is there a better built-in way to do this, e.g. as with chai-things:
                // expect(tableViewRows)
                //     .to.contain.something.like({
                //         name: 'CCS Project -- DSS',
                //         categoryContext: ['Labs/Traffic Monitoring']
                //     });
                // TODO! Expand this test
            });
            test('tableView3', "should be possible to get a package node's table view rows filtered on keywords and " +
                'compiler', async () => {
                const node = await getNodeAtPath('/Software/mmWave Sensors/Industrial Toolbox/Labs', ['com.ti.mmwave_industrial_toolbox__2.3.1']);
                (0, expect_1.expect)(node).to.exist;
                const device = await getDevice('IWR1642');
                (0, expect_1.expect)(device).to.exist;
                const tableViewItems = await rexdb.tableViews.getTableView(node.id, await getPackageGroupIds([
                    'com.ti.mmwave_industrial_toolbox__2.3.1',
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02',
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38'
                ]), {
                    deviceId: device.id,
                    search: ['traffic', 'monitoring', 'DSS'],
                    compiler: ['ccs']
                });
                (0, expect_1.expect)(tableViewItems).to.not.be.empty;
                (0, expect_1.expect)(tableViewItems).to.have.lengthOf(1);
                (0, expect_1.expect)(tableViewItems[0]).to.include({
                    name: 'CCS Project -- DSS',
                    subClass: 'example.general',
                    categoryContext: 'mmWave Sensors / Labs / Traffic Monitoring'
                });
            });
            test('tableView4', "should be possible to get a package node's table view rows filtered on two compilers", async () => {
                const node = await getNodeAtPath('/Software/SimpleLink SDK Plugins/Connectivity/SimpleLink SDK WiFi Plugin', ['com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38']);
                (0, expect_1.expect)(node).to.exist;
                // TODO: This isn't a great test, as the table-view item found has both gcc and iar.
                // Much better to find two items, one with compiler A, another with a compiler B. Not
                // doing this at present as none of the existing test packages contain such an item,
                // and a quick look for a new one came up empty.
                const tableViewItems = await rexdb.tableViews.getTableView(node.id, await getPackageGroupIds([
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38'
                ]), {
                    deviceId: (await getDevice('MSP432P4111')).id,
                    search: ['network_terminal'],
                    compiler: ['gcc', 'iar']
                });
                (0, expect_1.expect)(tableViewItems).to.have.lengthOf(1);
                const tableViewItem = tableViewItems[0];
                (0, expect_1.expect)(tableViewItem).to.include({
                    name: 'network_terminal'
                });
                (0, expect_1.expect)(tableViewItem.variants).to.include.deep.members([
                    { compiler: 'gcc', kernel: 'freertos' },
                    { compiler: 'iar', kernel: 'freertos' }
                ]);
            });
            test('tableView5', 'should be possible to get the expected nodes for a table view item with several variants', async () => {
                // TODO! Break this test up into several, testing too many different things
                const device = await getDevice('MSP432P401R');
                (0, expect_1.expect)(device).to.exist;
                const deviceId = device.id;
                const packageGroupIds = await getPackageGroupIds([
                    'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38'
                ]);
                (0, expect_1.expect)(packageGroupIds).to.have.lengthOf(1);
                const allVariants = [
                    { compiler: 'ccs', kernel: 'tirtos' },
                    { compiler: 'ccs', kernel: 'freertos' },
                    { compiler: 'iar', kernel: 'tirtos' },
                    { compiler: 'iar', kernel: 'freertos' },
                    { compiler: 'gcc', kernel: 'tirtos' },
                    { compiler: 'gcc', kernel: 'freertos' }
                ];
                // Test with different compiler filters to get and test for expected variation in
                // the returned variants
                for (const compiler of [undefined, 'iar', 'gcc', 'ccs']) {
                    const tableViewItems = await rexdb.tableViews.getTableView(undefined, packageGroupIds, {
                        deviceId,
                        compiler
                    });
                    const networkTermItems = _.filter(tableViewItems, (o) => o.name === 'network_terminal');
                    (0, expect_1.expect)(networkTermItems).to.have.lengthOf(1);
                    const networkTermItem = networkTermItems[0];
                    // in this particular case IAR projects should have no readme or children while
                    // non-IRA projects do, so use that to test these attributes
                    (0, expect_1.expect)(networkTermItem).to.include({
                        hasReadme: compiler !== 'iar',
                        hasChildren: compiler !== 'iar'
                    });
                    const expectedVariants = !compiler
                        ? allVariants
                        : _.filter(allVariants, (variant) => variant.compiler === compiler);
                    (0, expect_1.expect)(networkTermItem.variants).to.have.deep.members(expectedVariants);
                    const nodeIds = [];
                    for (const variant of expectedVariants) {
                        const node = await rexdb.tableViews.getNode(networkTermItem.id, { deviceId }, variant);
                        (0, expect_1.expect)(node).to.exist.and.to.include({
                            name: 'network_terminal'
                        });
                        if (variant.compiler === 'iar') {
                            (0, expect_1.expect)(node).to.include({
                                resourceType: 'project.iar'
                            });
                            (0, expect_1.expect)(node.readmeNodePublicId).to.not.exist;
                        }
                        else {
                            (0, expect_1.expect)(node).to.include({
                                resourceType: 'projectSpec'
                            });
                            (0, expect_1.expect)(node.readmeNodePublicId).to.exist;
                        }
                        nodeIds.push(node.id);
                    }
                    (0, expect_1.expect)(_.uniq(nodeIds)).to.have.lengthOf(expectedVariants.length, 'expected each variant to have a unique node');
                }
            });
        });
        suite('delete', () => {
            // Ideally this would be part of suite manage, but splitting off here so that the package group
            // only has to imported once
            test('deletePackageGroup', 'should be possible to delete a package group', async () => {
                // Packages used by this test that must be imported by earlier tests
                const packageGroupToDeleteUid = 'com.ti.mmwave_industrial_toolbox__2.3.1';
                const otherPackageGroupUid = 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02';
                // Get package groups, and confirm that they exist, are non-empty, and published
                const packageGroup = await getPackageGroup(packageGroupToDeleteUid);
                const otherPackageGroup = await getPackageGroup(otherPackageGroupUid);
                (0, expect_1.expect)(packageGroup.state).to.equal('published');
                _.each(await getPackageGroupChildRowCounts(packageGroup.id), (count, table) => {
                    (0, expect_1.expect)(count, `${table}-count`).to.be.above(0);
                });
                (0, expect_1.expect)(otherPackageGroup.state).to.equal('published');
                const originalRowCountsOfOther = await getPackageGroupChildRowCounts(otherPackageGroup.id);
                _.each(originalRowCountsOfOther, (count, table) => {
                    (0, expect_1.expect)(count, `${table}-count`).to.be.above(0);
                });
                // Unpublish and confirm
                await rexdb.manage.unpublishPackageGroup(packageGroupToDeleteUid);
                (0, expect_1.expect)((await getPackageGroup(packageGroupToDeleteUid)).state).to.equal('unpublished');
                // Delete all unpublished content sources
                await rexdb.manage.deleteContentSource({ states: ['unpublished'], age: 0 });
                // Verify that the content source row is marked deleted, that all child rows have been
                // deleted, and that database referential integrity hasn't been broken (which will also
                // confirm that deeper descendant rows have been deleted as well)
                (0, expect_1.expect)((await getPackageGroup(packageGroupToDeleteUid)).state).to.equal('deleted');
                _.each(await getPackageGroupChildRowCounts(packageGroup.id), (count, table) => {
                    (0, expect_1.expect)(count, `${table}-count`).to.equal(0);
                });
                (0, expect_1.expect)(await rexdb.manage.checkDatabaseReferentialIntegrity()).to.be.empty;
                // Verify that other package group hasn't been affected by the deletion
                (0, expect_1.expect)((await getPackageGroup(otherPackageGroupUid)).state).to.equal('published');
                (0, expect_1.expect)(await getPackageGroupChildRowCounts(otherPackageGroup.id), 'post-delete row counts of other').to.deep.equal(originalRowCountsOfOther);
            });
        });
        suite('importSuite', () => {
            test('bigImport', 'should be possible to import a lot of packages', async () => {
                // TODO! Move this into a heavier test suite that's run occasionally.
                // Currently interferes with other tests.
                // TODO! Needs cleanup
                // Read all package filenames from directory and use to contruct package group import obj
                // specifying what to import
                const dir = '/home/auser/host/json-db-tgrttub01-20200309';
                const packageFilenames = await util.promisify(fs.readdir)(`${dir}/resources_full.db`);
                const packages = _.map(packageFilenames, (s) => {
                    const [name, version] = _.split(s, '__');
                    return { name, version };
                });
                const packagesByType = _.groupBy(packages, (p) => p.name.match(/device/i)
                    ? 'device'
                    : p.name.match(/devtool|(^sdtoutilities|xdsdebugprobes)/i)
                        ? 'devtool'
                        : p.name.match(/academy/i)
                            ? p.name
                            : 'primary');
                const primaryToSecondary = {
                    'com.ti.SIMPLELINK_CC13X0_SDK': 'com.ti.SIMPLELINK_ACADEMY_CC13X0SDK',
                    'com.ti.SIMPLELINK_CC2640R2_SDK': 'com.ti.SIMPLELINK_ACADEMY_CC2640R2SDK',
                    'com.ti.SIMPLELINK_CC32XX_SDK__2.40.02.00': 'com.ti.SIMPLELINK_ACADEMY_CC32XXSDK',
                    'com.ti.SIMPLELINK_MSP432E4_SDK__2.40.00.11': 'com.ti.SIMPLELINK_ACADEMY_MSP432E4SDK',
                    'com.ti.SIMPLELINK_ZIGBEE_SDK_PLUGIN__2.20.00.06': 'com.ti.SIMPLELINK_ACADEMY_ZIGBEEPLUGIN'
                };
                const packageGroups = [
                    // Device package group
                    {
                        uid: 'devices__1.02.03.04',
                        packages: _.map(packagesByType.device, (p) => p.name + '__' + p.version)
                    },
                    // Devtool package group
                    {
                        uid: 'devtools__1.04.03.02',
                        packages: _.map(packagesByType.devtool, (p) => p.name + '__' + p.version)
                    },
                    // Standard package groups
                    ..._.map(packagesByType.primary, (primary) => {
                        const secondaryPid = primaryToSecondary[primary.name];
                        if (secondaryPid) {
                            const secondaries = packagesByType[secondaryPid];
                            // Look for secondary package with nearest greater version first, and if not
                            // found look for that with nearest lesser version. This approach isn't really
                            // correct, but OK for now for just pairing secondary and primaries up.
                            let secondaryPackage = _.reduce(secondaries, (closest, p) => p.version >= primary.version &&
                                (!closest || p.version < closest.version)
                                ? p
                                : closest, null);
                            if (!secondaryPackage) {
                                secondaryPackage = _.reduce(secondaries, (closest, p) => p.version < primary.version &&
                                    (!closest || p.version > closest.version)
                                    ? p
                                    : closest, null);
                            }
                            return {
                                uid: primary.name + '__' + primary.version,
                                packages: [
                                    primary.name + '__' + primary.version,
                                    secondaryPackage.name + '__' + secondaryPackage.version
                                ]
                            };
                        }
                        else {
                            return {
                                uid: primary.name + '__' + primary.version,
                                packages: [primary.name + '__' + primary.version]
                            };
                        }
                    })
                ];
                // Import
                if (!skipImport) {
                    rexdb.console.log(`Package groups to import: ${packageGroups}`);
                    await rexdb.manage.import(dir, null, packageGroups);
                }
                // TODO!: Add some basic verification
            });
            const incrPackageGroupUids = [
                'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38',
                'com.ti.mmwave_industrial_toolbox__2.3.1'
            ];
            test('import-incremental-1', 'should be possible to incrementally import packages', async () => {
                // Incremental import
                if (!skipImport) {
                    await rexdb.manage.createDb();
                    await rexdb.manage.importFilterDevSet(stdJsonDbDir, filterDevSetId);
                    await rexdb.manage.publishFilterDevSet(filterDevSetId);
                    for (const packageGroup of getPackageGroupsToImport(incrPackageGroupUids)) {
                        const packageGroupInternalIds = await rexdb.manage.importPackageGroups(stdJsonDbDir, [packageGroup], filterDevSetId);
                        rexdb.reset();
                        for (const id of packageGroupInternalIds) {
                            await rexdb.manage.publishPackageGroup((0, types_1.publicVIdToString)(id));
                        }
                    }
                }
            });
            test('import-incremental-2', 'should be possible to incrementally re-import packages', async () => {
                // Incremental re-import packages already in database
                if (!skipImport) {
                    for (const packageGroup of getPackageGroupsToImport(incrPackageGroupUids)) {
                        const packageGroupInternalIds = await rexdb.manage.importPackageGroups(stdJsonDbDir, [packageGroup], filterDevSetId, { skipExistingPackages: false } // , quiet: quietImport }
                        );
                        rexdb.reset();
                        for (const id of packageGroupInternalIds) {
                            await rexdb.manage.publishPackageGroup((0, types_1.publicVIdToString)(id));
                        }
                    }
                }
            });
            test('import-dev', 'used for debugging import issues', async () => {
                if (!skipImport) {
                    await rexdb.manage.createDb();
                    const jsonDbDir = path.join('/home/auser/host/jsondb-20200918-c2000ware');
                    await rexdb.manage.importFilterDevSet(jsonDbDir, filterDevSetId);
                    await rexdb.manage.publishFilterDevSet(filterDevSetId);
                    // const incrPackageGroupUids = [
                    //     'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38',
                    //     'com.ti.mmwave_industrial_toolbox__2.3.1'
                    // ];
                    // {
                    //     uid?: string;
                    //     packages: string[];
                    //     mainPackage?: string;
                    // }
                    for (const packageGroup of [
                        [{ packages: ['c2000ware_software_package__3.03.00.00'] }]
                    ]) {
                        const packageGroupInternalIds = await rexdb.manage.importPackageGroups(jsonDbDir, packageGroup, filterDevSetId);
                        rexdb.reset();
                        for (const id of packageGroupInternalIds) {
                            await rexdb.manage.publishPackageGroup((0, types_1.publicVIdToString)(id));
                        }
                    }
                }
            });
        });
    });
    const filterDevSetId = 'devset__1.0.0.0';
    const benchmarks = [];
    suite('Benchmarks', async () => {
        suite('import', async () => {
            const smallerPackageGroupUids = [
                'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02',
                'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38',
                'com.ti.mmwave_industrial_toolbox__2.3.1',
                'digital_power_c2000ware_sdk_software_package__1.01.00.00'
            ];
            // These packages are needed by later benchmarks
            const largePackageGroupUids1 = ['msp430ware__3.80.09.03'];
            // While these packages are not
            const largePackageGroupUids2 = [
                'c2000ware_software_package__3.02.00.00',
                'com.ti.SIMPLELINK_CC13X2_26X2_SDK__4.20.00.35'
            ];
            const importTestData = [
                // Smaller packages, some of which are needed for later benchmarks
                [
                    'importBenchmark1',
                    'Benchmark import of many smaller packages',
                    [getPackageGroupsToImport(smallerPackageGroupUids)]
                ],
                // A single large package that's needed by some later benchmarks
                [
                    'importBenchmark2',
                    'Benchmark import of single large package',
                    [getPackageGroupsToImport(largePackageGroupUids1)]
                ],
                // Optional large packages that aren't needed by later benchmarks
                [
                    'importBenchmark3',
                    'Benchmark import of more large packages',
                    [getPackageGroupsToImport(largePackageGroupUids2)]
                ]
            ];
            before(async () => {
                const packageFilenames = await util.promisify(fs.readdir)(`${benchmarkJsonDbDir}/resources_full.db`);
                const packages = _.map(packageFilenames, (s) => {
                    const [name, version] = _.split(s, '__');
                    return { name, version };
                });
                const packagesByType = _.groupBy(packages, (p) => p.name.match(/device/i)
                    ? 'device'
                    : p.name.match(/devtool|(^sdtoutilities|xdsdebugprobes)/i)
                        ? 'devtool'
                        : p.name.match(/academy/i)
                            ? p.name
                            : 'primary');
                const devPackageGroups = [
                    // Device package group
                    {
                        uid: 'devices__1.02.03.04',
                        packages: _.map(packagesByType.device, (p) => p.name + '__' + p.version)
                    },
                    // Devtool package group
                    {
                        uid: 'devtools__1.02.03.04',
                        packages: _.map(packagesByType.devtool, (p) => p.name + '__' + p.version)
                    }
                ];
                // Import benchmark setup
                if (skipImport) {
                    return;
                }
                await rexdb.manage.createDb();
                const start = process.hrtime();
                await rexdb.manage.importFilterDevSet(benchmarkJsonDbDir, filterDevSetId);
                await rexdb.manage.publishFilterDevSet(filterDevSetId);
                const time = (0, util_2.hrtimeToSec)(process.hrtime(start));
                rexdb.console.log(`Import time: ${time}s`);
                // Import dev sets
                const packageGroupInternalIds = await rexdb.manage.importPackageGroups(benchmarkJsonDbDir, devPackageGroups, filterDevSetId);
                for (const id of packageGroupInternalIds) {
                    await rexdb.manage.publishPackageGroup((0, types_1.publicVIdToString)(id));
                }
            });
            // Run package import benchmarks
            for (const [name, description, packageGroupSets] of importTestData) {
                test(name, description, async () => {
                    if (skipImport) {
                        return;
                    }
                    for (const packageGroupSet of packageGroupSets) {
                        rexdb.console.log(`Package Set: ${packageGroupSet[0]}: ${util.inspect(packageGroupSet[1])}`);
                        const start = process.hrtime();
                        const packageGroupInternalIds = await rexdb.manage.importPackageGroups(benchmarkJsonDbDir, packageGroupSet, filterDevSetId);
                        for (const id of packageGroupInternalIds) {
                            await rexdb.manage.publishPackageGroup((0, types_1.publicVIdToString)(id));
                        }
                        const time = (0, util_2.hrtimeToSec)(process.hrtime(start));
                        rexdb.console.log(`Import time: ${time}s`);
                        benchmarks.push({
                            suite: 'Import',
                            name,
                            mean: time * 1000,
                            iterations: 1
                        });
                    }
                });
            }
        });
        suite('table view', () => {
            // TODO! These benchmarks are now dependent on the import benchmark. However, need to
            // verify that the packages below are actually imported, or alternatively run them
            // if import benchmark is skipped.
            const packageGroupUids = [
                'msp430ware__3.80.09.03',
                'digital_power_c2000ware_sdk_software_package__1.01.00.00',
                'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38',
                'com.ti.mmwave_industrial_toolbox__2.3.1',
                'devices__1.11.00.00',
                'devtools__1.11.00.00'
            ];
            // Table View test data
            const testData = [
                [
                    'tableViewPerf1',
                    'should be able to quickly get a large table view with no filters',
                    undefined,
                    undefined
                ],
                [
                    'tableViewPerf2',
                    'should be able to quickly get a large table view filtered on a low cardinality filter',
                    // Filtering on compiler 'ccs' as it's very frequent, occuring in most (often all)
                    { compiler: 'ccs' },
                    undefined
                ],
                [
                    'tableViewPerf3',
                    'should be able to quickly get a large table view filtered on a medium cardinality filter',
                    { search: ['register'] },
                    undefined
                ],
                [
                    'tableViewPerf4',
                    'should be able to quickly get a large table view on a medium-high cardinality filter',
                    { search: ['dma'] },
                    200
                ],
                [
                    'tableViewPerf5',
                    'should be able to quickly get a large table view on a high cardinality filter',
                    { search: ['duplex'] },
                    undefined
                ],
                [
                    'tableViewPerf6',
                    'should be able to quickly get a large table view on two keywords',
                    { search: ['uart', 'transceiver'] },
                    undefined
                ],
                [
                    // TODO! Improve performance of this query, which is far slower than I'd like
                    'tableViewPerf7',
                    'should be able to quickly get a large table view on 6 keywords',
                    {
                        search: ['usci', 'uart', 'standard', 'transceiver', 'register', 'level']
                    },
                    1200
                ]
            ];
            // Run Table View performance tests
            for (const [name, description, additionalFilters, timeLimit] of testData) {
                test(name, description, async () => {
                    const packageGroupIds = await getPackageGroupIds(packageGroupUids);
                    const node = await getNodeAtPath('/', packageGroupUids);
                    (0, expect_1.expect)(node).to.exist;
                    const device = await getDevice('MSP430F5438');
                    (0, expect_1.expect)(device).to.exist;
                    // Inititializing tree now so that it doesn't interfere with benchmarking
                    await rexdb.tree.init();
                    const iterations = 40;
                    let total = 0;
                    let max;
                    let min;
                    let tableViewSize;
                    for (let i = 0; i < iterations; i++) {
                        const start = process.hrtime();
                        const tableViewItems = await rexdb.tableViews.getTableView(node.id, packageGroupIds, {
                            deviceId: device.id,
                            ...additionalFilters
                        });
                        const time = (0, util_2.hrtimeToMillisec)(process.hrtime(start));
                        (0, expect_1.expect)(tableViewItems).to.not.be.empty;
                        if (tableViewSize === undefined) {
                            tableViewSize = tableViewItems.length;
                        }
                        else {
                            (0, expect_1.expect)(tableViewSize).to.equal(tableViewItems.length, 'table view length should be constant');
                        }
                        const failOnSlowBenchmarks = false;
                        if (failOnSlowBenchmarks) {
                            (0, expect_1.expect)(time, 'expected to be faster (ms)').to.be.lessThan(timeLimit ? timeLimit : 100);
                        }
                        // Stats
                        total += time;
                        if (max === undefined || time > max) {
                            max = time;
                        }
                        if (min === undefined || time < min) {
                            min = time;
                        }
                    }
                    rexdb.console.log(`Table View size: ${tableViewSize}`);
                    const mean = total / iterations;
                    rexdb.console.log(`Call times: min: ${msTimeToString(min)} ms, ` +
                        `mean: ${msTimeToString(mean)} ms, ` +
                        `max: ${msTimeToString(max)}s`);
                    const itemsPerSecond = tableViewSize / mean;
                    rexdb.console.log(`Table View item retrieval rate: ${itemsPerSecond}/s`);
                    benchmarks.push({
                        suite: 'Table View',
                        name,
                        mean,
                        stdDev: undefined,
                        median: undefined,
                        min,
                        max,
                        iterations
                    });
                });
            }
        });
        suite('tree', () => {
            // TODO! These benchmarks are now dependent on the import benchmark. However, need to
            // verify that the packages below are actually imported, or alternatively run them
            // if import benchmark is skipped.
            // Packages to display in tree
            const selectedPackageGroupUids = [
                'msp430ware__3.80.09.03',
                'digital_power_c2000ware_sdk_software_package__1.01.00.00',
                'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.50.00.38',
                'com.ti.mmwave_industrial_toolbox__2.3.1',
                'devices__1.11.00.00',
                'devtools__1.11.00.00'
            ];
            const testData = [
                [
                    'treeTraversalBenchmarkUnfiltered',
                    'should be able to quickly traverse a large unfiltered tree',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: undefined,
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkCompilerLow',
                    'should be able to quickly traverse a large tree filtered on a low cardinality compiler',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            {
                                name: 'ccs',
                                type: 'compiler'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkKeywordLow1',
                    'should be able to quickly traverse a large tree filtered on a very low cardinality keyword',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            // cardinality: 82915 of 94605 nodes
                            {
                                name: ['msp'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkKeywordLow2',
                    'should be able to quickly traverse a large tree filtered on a low cardinality keyword',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            // cardinality: 48458 of 94605 nodes (all package groups)
                            {
                                name: ['register'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkMediumKeyword1',
                    'should be able to quickly traverse a large tree filtered on a low-medium cardinality keyword',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        // cardinality: 9681 of 94605 nodes
                        filters: [
                            {
                                name: ['i2c'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkMediumKeyword2',
                    'should be able to quickly traverse a large tree filtered on a medium cardinality filter',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        // cardinality: 1052 of 94605 nodes
                        filters: [
                            {
                                name: ['duplex'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkHighKeyword1',
                    'should be able to quickly traverse a large tree filtered on high cardinality keyword',
                    // These filters narrow the tree down to a single path
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            // cardinality: 190 of 94605 nodes
                            {
                                name: ['boostxl'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkHighKeyword2',
                    'should be able to quickly traverse a large tree filtered on a devtool and very high cardinality keyword',
                    // These filters narrow the tree down to a single path
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            {
                                name: 'MSP-EXP430FR6989',
                                type: 'devtool'
                            },
                            // cardinality: 17 of 94605 nodes
                            {
                                name: ['batpakmkii'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmark2Keywords',
                    'should be able to quickly traverse a large tree filtered on two keywords',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            {
                                name: ['uart', 'transceiver'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmark6Keywords',
                    'should be able to quickly traverse a large tree filtered on 6 keywords',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            {
                                name: [
                                    'usci',
                                    'uart',
                                    'standard',
                                    'transceiver',
                                    'register',
                                    'level'
                                ],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmark4KeywordsLow',
                    'should be able to quickly traverse a large tree filtered on 4 low cardinality keywords',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            {
                                name: ['msp', '430', 'exp', 'driver'],
                                type: 'search'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkExamples1',
                    'should be able to quickly traverse a large tree filtered on examples and a kernel and compiler',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            {
                                name: 'example',
                                type: 'resource-class'
                            },
                            {
                                name: 'nortos',
                                type: 'kernel'
                            },
                            {
                                name: 'ccs',
                                type: 'compiler'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ],
                [
                    'treeTraversalBenchmarkExamples2',
                    'should be able to quickly traverse a large tree filtered on a device, examples, and a kernel, and compiler',
                    {
                        activePackageGroupUids: selectedPackageGroupUids,
                        filters: [
                            {
                                name: 'MSP430F5630',
                                type: 'device'
                            },
                            {
                                name: 'example',
                                type: 'resource-class'
                            },
                            {
                                name: 'nortos',
                                type: 'kernel'
                            },
                            {
                                name: 'ccs',
                                type: 'compiler'
                            }
                        ],
                        iter: 250
                    },
                    undefined
                ]
            ];
            // Run Table View performance tests
            for (const [name, description, testDataX] of testData) {
                test(name, description, async () => {
                    await benchmarkResourceTreeTraversal(name, testDataX);
                });
            }
        });
    });
    // Benchmark resource tree traversal
    async function benchmarkResourceTreeTraversal(name, testData) {
        // TODO! A lot of duplication between this and tree traversal test
        // Get all packages
        const allPackages = await rexdb.packages.getOverviews();
        expectValidDbObjs(allPackages, 'packages');
        const testFilterPackageGroups = await rexdb.packages.getPackageGroups({
            packageGroupUids: testData.activePackageGroupUids
        });
        (0, expect_1.expect)(testFilterPackageGroups, 'at least one package group expected').to.not.be.empty;
        expectValidDbObjs(testFilterPackageGroups);
        let groupWithMainPackageFound = false;
        for (const packageGroup of testFilterPackageGroups) {
            expectValidPackageGroup(packageGroup, allPackages);
            if (packageGroup.mainPackageId != null) {
                groupWithMainPackageFound = true;
                expectValidDbId(packageGroup.mainPackageId, 'main package id');
            }
        }
        (0, expect_1.expect)(groupWithMainPackageFound, 'no groups have main packages').to.be.true;
        rexdb.console.finer(`Testing with Package Groups: ${testFilterPackageGroups.map((g) => g.publicVId)}`);
        // Get all devices
        const allDevices = await rexdb.devices.getAll();
        expectValidDbObjs(allDevices, 'devices');
        // Get all devtools
        const allDevtools = await rexdb.devtools.getAll();
        expectValidDbObjs(allDevtools, 'devtools');
        const somePackages = [];
        for (let i = 0; i < allPackages.length; i += 3) {
            somePackages.push(allPackages[i]);
        }
        let countDescendants;
        let packageGroupIds;
        let filters;
        rexdb.tree.enableMetrics(true);
        const testDataSet = testData;
        rexdb.console.fine();
        rexdb.console.fine('Test Data: ' + util.inspect(testDataSet, { depth: 0 }));
        await cleanDb();
        const callsByNodeId = {};
        const pathsTraversed = [];
        let pathNodes;
        const users = testDataSet.users || 1;
        let n = 0;
        await processWithConcurrentLimit(testDataSet.iter, users, async () => {
            await doRandomTraversal(testDataSet, n++);
        });
        rexdb.console.finer('call times by node id: ' +
            _.join(_.map(callsByNodeId, (calls, id) => `#${id}: ${_.map(calls, (call) => call.toFixed(2) + 'ms')}`), '\n'));
        const allChildCounts = _.map(_.flatten(pathsTraversed), (o) => o.childCount);
        rexdb.console.log(`Children per node call statistics: ` +
            `Mean ${_.mean(allChildCounts).toFixed(2)}, ` +
            `Std Dev ${stddev(allChildCounts).toFixed(2)}, ` +
            `Median ${median(allChildCounts)}, ` +
            `Min ${_.min(allChildCounts)}, ` +
            `Max ${_.max(allChildCounts)}`);
        const firstCallTimes = _.sortBy(_.flatten(_.map(_.values(callsByNodeId), (t) => t[0])));
        const allCallTimes = _.sortBy(_.flatten(_.values(callsByNodeId)));
        const meanFirst = _.mean(firstCallTimes);
        const stdDevFirst = stddev(firstCallTimes);
        const medianFirst = median(firstCallTimes);
        const minFirst = _.min(firstCallTimes);
        const maxFirst = _.max(firstCallTimes);
        const callsFirst = firstCallTimes.length;
        rexdb.console.log(`Node children calls, first per-node:  ` +
            `Mean ${msTimeToString(meanFirst)}, ` +
            `Std Dev ${msTimeToString(stdDevFirst)}, ` +
            `Median ${msTimeToString(medianFirst)}, ` +
            `Min ${msTimeToString(minFirst)}, ` +
            `Max ${msTimeToString(maxFirst)}, ` +
            `Calls ${callsFirst}`);
        benchmarks.push({
            suite: 'Tree',
            name: `${name}First`,
            mean: meanFirst,
            stdDev: stdDevFirst,
            median: medianFirst,
            min: minFirst,
            max: maxFirst,
            iterations: callsFirst
        });
        const meanAll = _.mean(allCallTimes);
        const stdDevAll = stddev(allCallTimes);
        const medianAll = median(allCallTimes);
        const minAll = _.min(allCallTimes);
        const maxAll = _.max(allCallTimes);
        const callsAll = allCallTimes.length;
        rexdb.console.log(`Node children calls, all:             ` +
            `Mean ${msTimeToString(meanAll)}, ` +
            `Std Dev ${msTimeToString(stdDevAll)}, ` +
            `Median ${msTimeToString(medianAll)}, ` +
            `Min ${msTimeToString(minAll)}, ` +
            `Max ${msTimeToString(maxAll)}, ` +
            `Calls ${callsAll}`);
        benchmarks.push({
            suite: 'Tree',
            name: `${name}All`,
            mean: meanAll,
            stdDev: stdDevAll,
            median: medianAll,
            min: minAll,
            max: maxAll,
            iterations: callsAll
        });
        async function doRandomTraversal(testDataSet, i) {
            rexdb.console.fine();
            rexdb.console.fine('Tree Traversal #' + i);
            packageGroupIds = testFilterPackageGroups.map((packageGroup) => {
                expectValidDbId(packageGroup.id, 'package group id');
                return packageGroup.id;
            });
            filters = {};
            let searchSubstring = null;
            if (testDataSet.filters) {
                for (const filter of testDataSet.filters) {
                    rexdb.console.finer('Filter: ' + util.inspect(filter));
                    switch (filter.type) {
                        case 'devtool':
                            const devtool = allDevtools.find((devtool) => devtool.name === filter.name && devtool.id !== null);
                            (0, expect_1.expect)(devtool, 'devtool').to.exist;
                            filters.devtoolId = devtool.id;
                            break;
                        case 'device':
                            const device = allDevices.find((device) => device.name === filter.name && device.id !== null);
                            (0, expect_1.expect)(device, 'device').to.exist;
                            filters.deviceId = device.id;
                            break;
                        case 'compiler':
                            filters.compiler = filter.name;
                            break;
                        case 'kernel':
                            filters.kernel = filter.name;
                            break;
                        case 'resource-class':
                            filters.resourceClass = filter.name;
                            break;
                        case 'search':
                            filters.search = filter.name;
                            break;
                        case 'search-auto':
                            searchSubstring = filter.name;
                            break;
                        default:
                            (0, util_1.assertNever)(filter);
                            throw new Error('Unknown filter type in test data: ' +
                                JSON.stringify(filter, null, 3));
                    }
                }
            }
            countDescendants = testDataSet.count;
            if (searchSubstring) {
                // Find the search tokens matching searchSubstring, and then pick one at
                // random to use.
                const searchTokens = await rexdb.tree.getSearchSuggestions(searchSubstring);
                // TODO: Handle case where we have no matches (possible with bad test data
                // or partial db).
                (0, expect_1.expect)(searchTokens, 'search tokens').is.not.empty;
                rexdb.console.finer("Search tokens matching '" + searchSubstring + "': " + searchTokens);
                filters.search = searchTokens;
                rexdb.console.finer('Chosen search token: ' + filters.search);
            }
            // Get root and its children, and their descendants recursively.
            const root = await getRootNode();
            rexdb.console.finer();
            rexdb.console.finer('Root Node (#' + root.id + ')');
            pathNodes = [];
            await getNodeChildren(root.id);
            // TODO!
            rexdb.console.fine('path: ' +
                _.join(_.map(pathNodes, (call) => `${call.id === root.id ? '' : call.name}` +
                    `${call.childCount === 0 ? '' : '/(' + call.childCount + ')'}`), ''));
            rexdb.console.fine('child queries: ' +
                _.join(_.map(pathNodes, (call) => `${call.getChildrenCallTime.toFixed(3)}ms/${call.childCount}`), ', '));
        }
        async function getNodeChildren(nodeId) {
            const start = process.hrtime();
            // Get children
            const childNodeIds = await rexdb.tree.getNodeChildren(nodeId, packageGroupIds, filters);
            const getChildrenCallTime = (0, util_2.hrtimeToSec)(process.hrtime(start)) * 1000;
            // Track call info
            pathNodes.push({
                id: nodeId,
                name: (await rexdb.tree.getNodePresentation([nodeId]))[0].name,
                childCount: childNodeIds.length,
                getChildrenCallTime
            });
            pathsTraversed.push(pathNodes);
            let calls = callsByNodeId[nodeId];
            if (!calls) {
                calls = [];
                callsByNodeId[nodeId] = calls;
            }
            calls.push(getChildrenCallTime);
            if (_.isEmpty(childNodeIds)) {
                // No children, we're done.
                return;
            }
            for (const id of childNodeIds) {
                expectValidDbId(id, 'child node id');
            }
            const childNodes = await rexdb.tree.getNodePresentation(childNodeIds);
            for (const childNode of childNodes) {
                expectValidDbId(childNode.id, 'child node id');
                if (countDescendants) {
                    // Print child nodes, and get and print their descendant counts.
                    const count = await rexdb.tree.getNodeDescendantCount(childNode.id, packageGroupIds, filters);
                    rexdb.console.finer('Child #' +
                        childNode.id +
                        ': ' +
                        childNode.name +
                        (count
                            ? ' (' + count + (count === 1000 ? '+' : '') + ' descendants)'
                            : ''));
                }
                else {
                    // Print child nodes
                    rexdb.console.finer('Child #' + childNode.id + ': ' + childNode.name);
                }
                if (childNode.packageId != null) {
                    expectValidPackageDbId(childNode.packageId, allPackages);
                }
            }
            // Pick and traverse a random child node
            const nextNode = childNodes[Math.floor(randomIndex(childNodes))];
            rexdb.console.finer('Node #' + nextNode.id + ': ' + nextNode.name);
            await getNodeChildren(nextNode.id);
        }
    }
    function stringToPath(path) {
        if (!path.startsWith('/')) {
            throw new Error('path must be absolute');
        }
        return _.filter(_.split(_.trim(path, '/'), '/'), (s) => !_.isEmpty(s));
    }
    async function getPackageGroupIds(packageGroupUids) {
        return _.map(await rexdb.packages.getPackageGroups({
            packageGroupUids
        }), (o) => o.id);
    }
    // Get node in tree at the given path and within one of the given package groups
    async function getNodeAtPath(path, packageGroupUids) {
        const path2 = stringToPath(path);
        let node = rexdb.tree.nodeToPresentationNode(await getRootNode());
        for (const segment of path2) {
            const childIds = await rexdb.tree.getNodeChildren(node.id, await getPackageGroupIds(packageGroupUids), {});
            const children = await rexdb.tree.getNodePresentation(childIds);
            const child = _.find(children, (o) => o.name === segment);
            if (!child) {
                return null;
            }
            else {
                node = child;
            }
        }
        return node;
    }
    async function getDevice(name) {
        const device = _.find(await rexdb.devices.getAll(), (d) => d.name === name);
        (0, expect_1.expect)(device).to.exist;
        return device;
    }
    after(() => new Promise((resolve, reject) => {
        // Write SQL stats to CSV file and console.
        // Skip for now
        resolve();
        return;
        rexdb.console.log('SQL Stats:');
        const stats = rexdb.db.sqlStats.getSqlStats();
        const csvFileWriter = fs.createWriteStream(path.join(reportDir, 'sql_stats.csv'));
        csvFileWriter.on('finish', resolve);
        csvFileWriter.on('error', reject);
        const csvStringifier = require('csv-stringify')({
            columns: [
                'sequence',
                'query_name',
                'test_params',
                'query_time',
                'row_count',
                'descendant_count',
                'sql_params'
            ],
            header: true
        });
        csvStringifier.pipe(csvFileWriter);
        // Print and save query stats, grouped by test parameter sets
        _.each(stats, (queryStats, queryName) => {
            rexdb.console.log('Query: ' + queryName);
            _.each(queryStats, (paramStats, testParams) => {
                rexdb.console.log('  Test Params: ' + testParams);
                if (_.isEmpty(paramStats)) {
                    rexdb.console.log('  no queries');
                    return;
                }
                // Print query call info, and write to CSV, in call sequence order.
                // Also calculate the mean call time.
                let totalNsTime = 0;
                const callCount = paramStats.length;
                paramStats.forEach((stat) => {
                    totalNsTime += (0, util_2.hrtimeToNanosec)(stat.time);
                    csvStringifier.write([
                        stat.seq,
                        queryName,
                        testParams,
                        (0, util_2.hrtimeToSec)(stat.time),
                        stat.rowCount,
                        stat.descendantCount,
                        stat.sqlParams
                    ]);
                    rexdb.console.fine('    call #' +
                        stat.seq +
                        ': time: ' +
                        (0, util_2.hrtimeToSec)(stat.time) +
                        (stat.rowCount != null ? ' ; rows: ' + stat.rowCount : '') +
                        (stat.descendantCount != null
                            ? ' ; descendants: ' + stat.descendantCount
                            : ''));
                });
                const meanNsTime = totalNsTime / callCount;
                // Print summary stats for current
                // Sort stats array by time so that we can get min, median, and max query time
                paramStats.sort((a, b) => {
                    // Compare nanoseconds if seconds are same; otherwise compare seconds
                    if (a.time[0] === b.time[0]) {
                        return a.time[1] - b.time[1];
                    }
                    else {
                        return a.time[0] - b.time[0];
                    }
                });
                let medianNsTime;
                if (callCount % 2 === 0) {
                    medianNsTime =
                        ((0, util_2.hrtimeToNanosec)(paramStats[paramStats.length / 2].time) +
                            (0, util_2.hrtimeToNanosec)(paramStats[paramStats.length / 2 - 1].time)) /
                            2;
                }
                else {
                    medianNsTime = (0, util_2.hrtimeToNanosec)(paramStats[Math.floor(paramStats.length / 2)].time);
                }
                rexdb.console.fine('    Summary:\n' +
                    '      min:    ' +
                    (0, util_2.hrtimeToSec)(paramStats[0].time) +
                    '\n' +
                    '      median: ' +
                    (0, util_2.nstimeToSec)(medianNsTime) +
                    '\n' +
                    '      mean:   ' +
                    (0, util_2.nstimeToSec)(meanNsTime) +
                    '\n' +
                    '      max:    ' +
                    (0, util_2.hrtimeToSec)(paramStats[paramStats.length - 1].time) +
                    '\n');
            });
        });
        csvStringifier.end();
    }));
    after(() => new Promise((resolve, reject) => {
        if (_.isEmpty(benchmarks)) {
            resolve();
            return;
        }
        // Print benchmarks to console
        console.log('Benchmarks:');
        let suite;
        let totalMean = 0;
        let count = 0;
        let min;
        let max;
        for (const benchmark of benchmarks) {
            if (suite !== benchmark.suite) {
                if (suite !== undefined) {
                    printSuiteSummary(); // print summary for last suite
                }
                suite = benchmark.suite;
                totalMean = 0;
                count = 0;
                min = undefined;
                max = undefined;
                console.log(`Suite ${suite}:`);
                console.log(`    (test: mean, sd, median, min, max, iterations)`);
            }
            if (benchmark.mean !== undefined) {
                totalMean += benchmark.mean;
                count++;
            }
            if (benchmark.min !== undefined) {
                min = min === undefined ? benchmark.min : Math.min(benchmark.min, min);
            }
            if (benchmark.max !== undefined) {
                max = max === undefined ? benchmark.max : Math.min(benchmark.max, max);
            }
            console.log(`    ${benchmark.name}: \t` +
                `${msTimeToString(benchmark.mean)}, ` +
                `${msTimeToString(benchmark.stdDev)}, ` +
                `${msTimeToString(benchmark.median)}, ` +
                `${msTimeToString(benchmark.min)}, ` +
                `${msTimeToString(benchmark.max)}, ` +
                `${benchmark.iterations}`);
        }
        if (suite !== undefined) {
            printSuiteSummary(); // print summary for last suite
        }
        function printSuiteSummary() {
            console.log(`    Summary: mean: ${count ? msTimeToString(totalMean / count) : '-'}, ` +
                `min: ${min !== undefined ? msTimeToString(min) : '-'}, ` +
                `max: ${max !== undefined ? msTimeToString(max) : '-'}`);
        }
        // Write benchmarks to CSV file
        const benchmarksCsvFilepath = path.join(reportDir, `rex-sqldb-benchmarks-${Math.floor(new Date().getTime() / 1000)}.csv`);
        const csvFileWriter = fs.createWriteStream(benchmarksCsvFilepath);
        csvFileWriter.on('finish', resolve);
        csvFileWriter.on('error', reject);
        const csvStringifier = require('csv-stringify')({
            columns: [
                'seq',
                'suite',
                'benchmark',
                'mean (ms)',
                'std dev',
                'median (ms)',
                'min (ms)',
                'max (ms)',
                'iterations'
            ],
            header: true
        });
        csvStringifier.pipe(csvFileWriter);
        let i = 1;
        for (const benchmark of benchmarks) {
            csvStringifier.write([
                i++,
                benchmark.suite,
                benchmark.name,
                benchmark.mean,
                benchmark.stdDev,
                benchmark.median,
                benchmark.min,
                benchmark.max,
                benchmark.iterations
            ]);
        }
        csvStringifier.end();
        rexdb.console.log('Benchmarks saved to: ' + benchmarksCsvFilepath);
    }));
    after(async () => {
        // Clear the database so that other remoteserver tests can still run
        // See REX-2348 for details
        if (clearDbOnTeardown) {
            await rexdb.manage.createDb();
        }
    });
});
function test(testName, testDescription, testBody) {
    if ((!testConfig.testsToRun || testConfig.testsToRun.test(testName)) &&
        (!testConfig.testsToSkip || !testConfig.testsToSkip.test(testName))) {
        it(`${testDescription} (${testName})`, testBody);
    }
    else {
        it.skip(`${testDescription} (${testName})`, testBody);
    }
}
function suite(title, suiteBody) {
    if ((!testConfig.testsToRun || testConfig.testsToRun.test(title)) &&
        (!testConfig.testsToSkip || !testConfig.testsToSkip.test(title))) {
        describe(title, suiteBody);
    }
    else {
        describe.skip(title, suiteBody);
    }
}
// Print N random filter tree paths, with and without filter
async function testResourceTreeTraversal() {
    // Get all packages
    const allPackages = await rexdb.packages.getOverviews();
    expectValidDbObjs(allPackages, 'packages');
    // Packages to display in tree
    const selectedPackages = [
        'devices__1.11.00.00',
        'devtools__1.11.00.00',
        'digital_power_c2000ware_sdk_software_package__1.01.00.00',
        'com.ti.mmwave_industrial_toolbox__2.3.1',
        'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN__1.40.00.02'
    ];
    // Filters to apply to tree
    const testFilters = [
        {
            name: 'MSP432P401R',
            type: 'device'
        },
        {
            name: 'ccs',
            type: 'compiler'
        },
        {
            name: 'MMWAVE-DEVPACK',
            type: 'devtool'
        },
        {
            name: 'MSP-EXP432P401R',
            type: 'devtool'
        },
        {
            name: 'MSP432P4111',
            type: 'device'
        },
        {
            name: ['rtos'],
            type: 'search'
        },
        {
            name: ['powersuite'],
            type: 'search'
        }
    ];
    const testFilterPackageGroups = await rexdb.packages.getPackageGroups({
        packageGroupUids: selectedPackages
    });
    (0, expect_1.expect)(testFilterPackageGroups, 'at least one package group expected').to.not.be.empty;
    expectValidDbObjs(testFilterPackageGroups);
    let groupWithMainPackageFound = false;
    for (const packageGroup of testFilterPackageGroups) {
        expectValidPackageGroup(packageGroup, allPackages);
        if (packageGroup.mainPackageId != null) {
            groupWithMainPackageFound = true;
            expectValidDbId(packageGroup.mainPackageId, 'main package id');
        }
    }
    (0, expect_1.expect)(groupWithMainPackageFound, 'no groups have main packages').to.be.true;
    rexdb.console.fine(`Testing with Package Groups: ${testFilterPackageGroups.map((g) => g.publicVId)}`);
    // Get all devices
    const allDevices = await rexdb.devices.getAll();
    expectValidDbObjs(allDevices, 'devices');
    // Get all devtools
    const allDevtools = await rexdb.devtools.getAll();
    expectValidDbObjs(allDevtools, 'devtools');
    const somePackages = [];
    for (let i = 0; i < allPackages.length; i += 3) {
        somePackages.push(allPackages[i]);
    }
    const childNodeAttributes = {
        packageIds: new Set(),
        linkExts: new Set(),
        linkTypes: new Set(),
        icons: new Set(),
        resourceTypes: new Set(),
        fileTypes: new Set(),
        leafTypes: new Set()
    };
    const testDataX = [
        {
            packageGroups: testFilterPackageGroups,
            filters: testFilters,
            iter: 30
        },
        // { packageGroups: testFilterPackageGroups, iter: 7 },
        // {
        //     count: true,
        //     packageGroups: testFilterPackageGroups,
        //     filters: testFilters,
        //     iter: 10
        // },
        // {
        //     count: true,
        //     packageGroups: testFilterPackageGroups,
        //     filters: testFilters,
        //     iter: 1000,
        //     users: 20
        // },
        // {
        //     count: true,
        //     packageGroups: testFilterPackageGroups,
        //     iter: 1000,
        //     users: 20
        // },
        {
            deep: true,
            packageGroups: testFilterPackageGroups,
            filters: testFilters,
            iter: 10
        },
        {
            // TODO!: Reenable once getNodeDescendantCount() is fixed
            // count: true,
            count: false,
            packageGroups: testFilterPackageGroups,
            filters: testFilters,
            iter: 10
        }
        //        { deep: true, count: true, packageGroups: testFilterPackageGroups, iter: 10 },
    ];
    /*
    const testDataQuickComplete: TestData[] = [
        { iter: 1 },

        { packageGroups: testFilterPackageGroups, iter: 1 },
        { devtools: allDevtools, iter: 1 },
        { devices: allDevices, iter: 1 },
        { tags: ['API'], iter: 1 },
        { compilers: ['ccs'], iter: 1 },

        {
            packageGroups: testFilterPackageGroups,
            devtools: allDevtools,
            iter: 1
        },
        {
            packageGroups: testFilterPackageGroups,
            devices: allDevices,
            iter: 1
        },

        { count: true, packageGroups: testFilterPackageGroups, iter: 1 },
        { count: true, iter: 1 },

        { deep: true, iter: 1 },
        { deep: true, packageGroups: testFilterPackageGroups, iter: 1 }
    ];
    */
    // @ts-ignore - unused
    const testDataBenchmarkLight = [
        // {
        //     count: true,
        //     packageGroups: testFilterPackageGroups,
        //     devices: allDevices,
        //     iter: 200
        // },
        // { count: true, iter: 200 },
        // {
        //     count: true,
        //     packageGroups: testFilterPackageGroups,
        //     devices: allDevices,
        //     iter: 30
        // },
        // { packageGroups: testFilterPackageGroups, devices: allDevices, iter: 30 },
        { packageGroups: testFilterPackageGroups, iter: 30 }
        //        { count: true, packageGroups: testFilterPackageGroups, iter: 30 },
        /*
            { devtools: allDevtools, iter: 100 },
            { devices: allDevices, iter: 100 },
            { tags: [ "API" ], iter: 100 },
            { compilers: [ "ccs" ], iter: 100 },
    
            { packageGroups: testFilterPackageGroups, devtools: allDevtools, iter: 1000 },
            { packageGroups: testFilterPackageGroups, devices: allDevices, iter: 1000 },
        */
    ];
    /*
    const testDataHeavy: TestData[] = [
        { iter: 1000 },

        { packageGroups: testFilterPackageGroups, iter: 1000 },
        { devtools: allDevtools, iter: 100 },
        { devices: allDevices, iter: 100 },
        { tags: ['API'], iter: 100 },
        { compilers: ['ccs'], iter: 100 },

        {
            packageGroups: testFilterPackageGroups,
            devtools: allDevtools,
            iter: 1000
        },
        {
            packageGroups: testFilterPackageGroups,
            devices: allDevices,
            iter: 1000
        },

        { count: true, packageGroups: testFilterPackageGroups, iter: 1000 },
        { count: true, iter: 1000 },

        { deep: true, iter: 30 },
        { deep: true, packageGroups: testFilterPackageGroups, iter: 30 }
    ];
    */
    const testData = testDataX;
    // const testMetrics: QueryMetrics[] = [];
    let deep;
    let countDescendants;
    let packageGroupIds;
    let filters;
    rexdb.tree.enableMetrics(true);
    for (const testDataSet of testData) {
        await cleanDb();
        const users = testDataSet.users || 1;
        let n = 0;
        await processWithConcurrentLimit(testDataSet.iter, users, async () => {
            await doRandomTraversal(testDataSet, n++);
        });
        // testMetrics.push(rexdb.tree.getMetrics());
        // rexdb.tree.resetMetrics();
        // testMetrics.forEach((metrics, i) => {
        //     rexdb.console.fine();
        //     rexdb.console.fine('Data Set #' + i + ' Metrics (initial node/filter accesses only):');
        //     let totalCalls = 0;
        //     let minCallTime = Number.POSITIVE_INFINITY;
        //     let maxCallTime = 0;
        //     // let totalCallTime = 0;
        //     // let minQ1Time = Number.POSITIVE_INFINITY;
        //     // let maxQ1Time = 0;
        //     // let totalQ1Time = 0;
        //     // let minQ2Time = Number.POSITIVE_INFINITY;
        //     // let maxQ2Time = 0;
        //     // let totalQ2Time = 0;
        //     const totalDescendantCount = 0;
        //     let totalChildCount = 0;
        // getObjectKeys(metrics).forEach(filter => {
        //     const filterMetrics = metrics[filter];
        //     getObjectKeys(filterMetrics).forEach(nodeId => {
        //         const nodeCallMetrics = filterMetrics[nodeId];
        //         totalChildCount += nodeCallMetrics.nodeInfo.childCount || 0;
        // if (
        //     nodeCallMetrics.nodeInfo.childDescendantCount !=
        //     null
        // ) {
        //     totalDescendantCount +=
        //         nodeCallMetrics.nodeInfo.childDescendantCount;
        // }
        // Only counting the inital node query for now
        // TODO: report subsequent queries separately?
        // totalCalls++;
        // const callTime = hrtimeToSec(nodeCallMetrics.calls[0].callTime);
        // const q1Time = hrtimeToSec(nodeCallMetrics.calls[0].q1Time);
        // const q2Time = hrtimeToSec(nodeCallMetrics.calls[0].q2Time);
        // minCallTime = Math.min(minCallTime, callTime);
        // maxCallTime = Math.max(maxCallTime, callTime);
        // totalCallTime += callTime;
        // minQ1Time = Math.min(minQ1Time, q1Time);
        // maxQ1Time = Math.max(maxQ1Time, q1Time);
        // totalQ1Time += q1Time;
        // minQ2Time = Math.min(minQ2Time, q2Time);
        // maxQ2Time = Math.max(maxQ2Time, q2Time);
        // totalQ2Time += q2Time;
        //     });
        // });
        // rexdb.console.fine('Total Calls:           %d' + totalCalls);
        // rexdb.console.fine('Min. Call Time:        %ds' + minCallTime.toFixed(9));
        // rexdb.console.fine(
        //     'Avg. Call Time:        %ds' + (totalCallTime / totalCalls).toFixed(9)
        // );
        // rexdb.console.fine('Max. Call Time:        %ds' + maxCallTime.toFixed(9));
        // rexdb.console.fine('Min. Q1 Time:        %ds' + minQ1Time.toFixed(9));
        // rexdb.console.fine('Avg. Q1 Time:        %ds' + (totalQ1Time / totalCalls).toFixed(9));
        // rexdb.console.fine('Max. Q1 Time:        %ds' + maxQ1Time.toFixed(9));
        // rexdb.console.fine('Min. Q2 Time:        %ds' + minQ2Time.toFixed(9));
        // rexdb.console.fine('Avg. Q2 Time:        %ds' + (totalQ2Time / totalCalls).toFixed(9));
        // rexdb.console.fine('Max. Q2 Time:        %ds' + maxQ2Time.toFixed(9));
        // rexdb.console.fine(
        //     'Avg. # of Children:    %d' + (totalChildCount / totalCalls).toFixed(5)
        // );
        // rexdb.console.fine(
        //     'Avg. Descendant Count: %d' + (totalDescendantCount / totalChildCount).toFixed(5)
        // );
        // });
    }
    // Expect with sufficient tree iterations over the standard test package
    // group set (medium set at the moment), that all of the following node
    // attributes would be observered.
    // TODO: Instead check for expected attributes and the absense of unexpected
    // while traveling a specific path.
    (0, expect_1.expect)(childNodeAttributes.packageIds, 'packages ids').to.not.be.empty;
    (0, expect_1.expect)(Array.from(childNodeAttributes.linkExts)).to.include.members([undefined, '.html']);
    // TODO: Select better package group set so we can test for 'e' too
    (0, expect_1.expect)(Array.from(childNodeAttributes.linkTypes), 'link types').to.include.members([
        undefined,
        'local'
    ]);
    (0, expect_1.expect)(Array.from(childNodeAttributes.icons), 'icons').to.include.members([
        undefined,
        'C2000Ware_DigitalPower_SDK_1_01_00_00/.metadata/.tirex/graphics/powerSUITE.png'
    ]);
    // TODO: Select better package set so we can test for more types
    (0, expect_1.expect)(Array.from(childNodeAttributes.resourceTypes), 'resource types').to.include.members([
        undefined,
        'packageOverview',
        'overview',
        'file'
    ]);
    // TODO: Select better package group set so we can test for fileTypes
    (0, expect_1.expect)(Array.from(childNodeAttributes.fileTypes), 'file types').to.include.members([]);
    (0, expect_1.expect)(Array.from(childNodeAttributes.leafTypes), 'leaf types').to.include.members([
        true,
        false
    ]);
    async function doRandomTraversal(testDataSet, i) {
        rexdb.console.fine();
        rexdb.console.fine('Tree Traversal #' + i);
        packageGroupIds = testDataSet.packageGroups.map((packageGroup) => {
            expectValidDbId(packageGroup.id, 'package group id');
            return packageGroup.id;
        });
        filters = {};
        let searchSubstring = null;
        if (testDataSet.filters) {
            const filter = testDataSet.filters[randomIndex(testDataSet.filters)];
            rexdb.console.finer('Filter: ' + util.inspect(filter));
            switch (filter.type) {
                case 'devtool':
                    const devtool = allDevtools.find((devtool) => devtool.publicId === filter.name && devtool.id !== null);
                    (0, expect_1.expect)(devtool, 'devtool ' + filter.name).to.exist;
                    filters.devtoolId = devtool.id;
                    break;
                case 'device':
                    const device = allDevices.find((device) => device.name === filter.name && device.id !== null);
                    (0, expect_1.expect)(device, 'device ' + filter.name).to.exist;
                    filters.deviceId = device.id;
                    break;
                case 'compiler':
                    filters.compiler = filter.name;
                    break;
                case 'kernel':
                    filters.kernel = filter.name;
                    break;
                case 'resource-class':
                    filters.resourceClass = filter.name;
                    break;
                case 'search':
                    filters.search = filter.name;
                    break;
                case 'search-auto':
                    searchSubstring = filter.name;
                    break;
                default:
                    (0, util_1.assertNever)(filter);
                    throw new Error('Unknown filter type in test data: ' + JSON.stringify(filter, null, 3));
            }
        }
        deep = testDataSet.deep;
        countDescendants = testDataSet.count;
        if (searchSubstring) {
            // Find the search tokens matching searchSubstring, and then pick one at
            // random to use.
            const searchTokens = await rexdb.tree.getSearchSuggestions(searchSubstring);
            // TODO: Handle case where we have no matches (possible with bad test data
            // or partial db).
            (0, expect_1.expect)(searchTokens, 'search tokens').is.not.empty;
            rexdb.console.finer("Search tokens matching '" + searchSubstring + "': " + searchTokens);
            filters.search = [searchTokens[randomIndex(searchTokens)]];
            rexdb.console.finer('Chosen search token: ' + filters.search);
        }
        // Get root and its children, and their descendants recursively.
        const root = await getRootNode();
        rexdb.console.finer();
        rexdb.console.finer('Root Node (#' + root.id + ')');
        await getNodeChildren(root.id);
    }
    async function getNodeChildren(nodeId) {
        const childNodeIds = await rexdb.tree.getNodeChildren(nodeId, packageGroupIds, filters);
        if (_.isEmpty(childNodeIds)) {
            // No children, we're done.
            return;
        }
        for (const id of childNodeIds) {
            expectValidDbId(id, 'child node id');
        }
        const childNodes = await rexdb.tree.getNodePresentation(childNodeIds);
        for (const childNode of childNodes) {
            expectValidDbId(childNode.id, 'child node id');
            if (countDescendants) {
                // Print child nodes, and get and print their descendant counts.
                const count = await rexdb.tree.getNodeDescendantCount(childNode.id, packageGroupIds, filters);
                rexdb.console.finer('Child #' +
                    childNode.id +
                    ': ' +
                    childNode.name +
                    (count ? ' (' + count + (count === 1000 ? '+' : '') + ' descendants)' : ''));
            }
            else {
                // Print child nodes
                rexdb.console.finer('Child #' + childNode.id + ': ' + childNode.name);
            }
            if (childNode.packageId != null) {
                expectValidPackageDbId(childNode.packageId, allPackages);
                childNodeAttributes.packageIds.add(childNode.packageId);
            }
            childNodeAttributes.linkExts.add(childNode.linkExt);
            childNodeAttributes.linkTypes.add(childNode.linkType);
            childNodeAttributes.icons.add(childNode.icon);
            childNodeAttributes.resourceTypes.add(childNode.resourceType);
            childNodeAttributes.fileTypes.add(childNode.fileType);
            childNodeAttributes.leafTypes.add(childNode.isLeaf);
        }
        // Pick and traverse a random child node, and retrieve its resource.
        await traverseAChild(childNodes[Math.floor(randomIndex(childNodes))]);
        async function traverseAChild(nextNode) {
            rexdb.console.finer();
            rexdb.console.finer('Node #' + nextNode.id + ': ' + nextNode.name);
            // TODO: Add arg to control retrieval and output of additional info,
            // so that it can be benchmarked with and without.
            // Get node's parent - doing this just to test API, actually unneeded
            // since it was printed earlier when processing parent
            if (deep) {
                const parentNodeId = await rexdb.tree.getNodeParent(nextNode.id);
                if (parentNodeId) {
                    rexdb.console.finer('  (parent node: #' + parentNodeId + ')');
                }
                else {
                    rexdb.console.finer('  (no parent node)');
                }
                // Get node again with getNodePresentation() - doing this *just* to test API
                const nodeIds = [nextNode.id];
                if (parentNodeId != null) {
                    nodeIds.push(parentNodeId);
                }
                const presentationInfo = await rexdb.tree.getNodePresentation(nodeIds);
                rexdb.console.finer('  node presentation attr: ' + util.inspect(presentationInfo));
                // Get node's resource
                const resource = await rexdb.resources.getOnNode(nextNode.id);
                if (resource != null) {
                    expectValidDbId(resource.id);
                    rexdb.console.finer('  Resource #' +
                        resource.id +
                        ': ' +
                        resource.name +
                        '; type: ' +
                        resource.type);
                    rexdb.console.finer('    full resource: ' + util.inspect(resource));
                    await getResourceAssociations(resource);
                }
                else {
                    rexdb.console.finer('  no resource');
                    await getNodeChildren(nextNode.id);
                }
            }
            else {
                await getNodeChildren(nextNode.id);
            }
            async function getResourceAssociations(resource) {
                const packages = await rexdb.packages.getOverviews({
                    resourceId: resource.id
                });
                rexdb.console.finer('    package #' + packages[0].id + ':  ' + packages[0].uid);
                const devtoolIds = await rexdb.devtools.getIdsOnResource(resource.id);
                if (!_.isEmpty(devtoolIds)) {
                    rexdb.console.finer('    devtools:');
                    devtoolIds.forEach((id) => {
                        rexdb.console.finer('      #' + id + ': ' + allDevtools.find((dt) => dt.id === id).name);
                    });
                }
                else {
                    rexdb.console.finer('    no devtools');
                }
                const deviceIds = await rexdb.devices.getIdsOnResource(resource.id);
                if (!_.isEmpty(deviceIds)) {
                    rexdb.console.finer('    devices:');
                    deviceIds.forEach((id) => {
                        const device = allDevices.find((d) => d.id === id);
                        (0, expect_1.expect)(device).to.exist;
                        rexdb.console.finer('      #' + id + ': ' + device.name);
                    });
                }
                else {
                    rexdb.console.finer('    no devices');
                }
                const parent = await rexdb.resources.getParent(resource.id);
                if (parent != null) {
                    rexdb.console.finer('    parent resource #' + parent.id + ': ' + parent.name);
                }
                else {
                    rexdb.console.finer('    no parent resource');
                }
                const children = await rexdb.resources.getChildren(resource.id);
                if (!_.isEmpty(children)) {
                    rexdb.console.finer('    child resources:');
                    children.forEach((child) => {
                        rexdb.console.finer('      #' + child.id + ': ' + child.name);
                    });
                }
                else {
                    rexdb.console.finer('    no child resources');
                }
                // TODO: Reenable once (or if) getNodesOnResource() is fixed
                if (false) {
                    const catNodeIds = await rexdb.tree.getNodesOnResource(resource.id, filters);
                    if (!_.isEmpty(catNodeIds)) {
                        rexdb.console.finer('    paths to resource:');
                        // Get and print the full path to each of the resource's nodes.
                        for (const nodeId of catNodeIds) {
                            const fullPath = await getFullPathToNode(nodeId);
                            rexdb.console.finer('      ' + fullPath);
                        }
                    }
                    else {
                        rexdb.console.finer('    resource has no nodes!');
                    }
                }
                await getNodeChildren(nextNode.id);
            }
        }
    }
}
async function getRootNode() {
    const root = await rexdb.tree.getRootNode();
    expectValidDbId(root.id, 'root node id');
    return root;
}
// Test traversal of the full package tree
async function testPackageTreeTraversal() {
    const node = await rexdb.tree.getNodePackageTree();
    traverseNodePackageTree(node, 1);
    function traverseNodePackageTree(node, level = 0) {
        expectValidDbId(node.id);
        (0, expect_1.expect)(!node.packageGroupId || node.resourceType === 'packageOverview', 'a foundation or package overview node was expected').to.be.true;
        rexdb.console.finer(' '.repeat(level * 2) +
            `#${node.id}: ${node.name}` +
            (node.packageGroupId
                ? ` (${node.resourceType}, ` +
                    `pkg-grp ${node.packageGroupPublicId} ${node.packageGroupVersion}, ` +
                    `pkg ${node.packagePublicId} ${node.packageVersion})`
                : ''));
        _.each(node.children, (child) => traverseNodePackageTree(child, level + 1));
    }
}
async function getPackageTreeNode(path, packageGroupPublicId, packageGroupVersion) {
    // Get node package tree
    let node = await rexdb.tree.getNodePackageTree();
    // Traverse tree along the given path
    for (const segment of path) {
        node = _.find(node.children, ['name', segment]);
        if (!node) {
            break;
        }
        expectValidDbId(node.id, 'node id');
    }
    // Verify that the node's package group matches the given package group (if specified)
    if (node &&
        ((packageGroupPublicId && node.packageGroupPublicId !== packageGroupPublicId) ||
            (packageGroupVersion && node.packageGroupVersion !== packageGroupVersion))) {
        node = undefined;
    }
    return node;
}
// import, and use that here instead of hardcoding?
async function lookupNodeOnPublicId() {
    // TODO!: break this up into multiple tests
    const nodeLookups = [
        // Leaf node, with projectSpec resource
        {
            descr: 'leaf node #1',
            nodePublicId: 'AA6oVo6QDMQZAgDGt5S2pw',
            packageGroup: { publicId: 'com.ti.mmwave_industrial_toolbox', version: '2.3.1' },
            expectedNodeName: 'CCS Project'
        },
        // Another leaf node, with file resource, and a different package
        {
            descr: 'leaf node #2',
            nodePublicId: 'AJQP1lgAoj36xOEbfHqGYQ',
            packageGroup: {
                publicId: 'digital_power_c2000ware_sdk_software_package',
                version: '1.01.00.00'
            },
            expectedNodeName: 'Compensation Designer User Guide'
        },
        // A non-leaf node with a overview resource
        {
            descr: 'non-leaf overview node',
            nodePublicId: 'APhjFJpcExlrndhPu186Iw',
            packageGroup: {
                publicId: 'digital_power_c2000ware_sdk_software_package',
                version: '1.01.00.00'
            },
            expectedNodeName: 'powerSUITE'
        },
        // A non-leaf node with a package overview resource, another package
        {
            descr: 'non-leaf package overview node',
            nodePublicId: 'AJoMGA2ID9pCPWEKPi16wg',
            packageGroup: { publicId: 'com.ti.mmwave_industrial_toolbox', version: '2.3.1' },
            expectedNodeName: 'Industrial Toolbox'
        },
        // A non-leaf node
        {
            descr: 'non-leaf category node',
            nodePublicId: 'AIwrf0ov9cvaIYNewkknNQ',
            packageGroup: {
                publicId: 'digital_power_c2000ware_sdk_software_package',
                version: '1.01.00.00'
            },
            expectedNodeName: 'Documentation'
        },
        // A few of the same nodes as before, except with latest package group version
        // TODO: Tests should look for nodes that's available in one version but not the other
        {
            descr: 'a node, latest version glob',
            nodePublicId: 'ALiFijmHhJiib1ixFqduPg',
            packageGroup: { publicId: 'com.ti.mmwave_industrial_toolbox', version: 'LATEST' },
            expectedNodeName: 'CCS Project'
        },
        {
            descr: 'another node, latest version glob',
            nodePublicId: 'AGyrLIjYfBRV2KMbhYuiMw',
            packageGroup: {
                publicId: 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN',
                version: 'LATEST'
            },
            expectedNodeName: 'Documentation Overview'
        },
        {
            descr: 'yet another node, latest version glob',
            nodePublicId: 'AFwPR3-4-Yu72-Pk92DRUg',
            packageGroup: {
                publicId: 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN',
                version: 'LATEST'
            },
            expectedNodeName: 'MSP432E401Y LaunchPad'
        },
        // A foundation node
        {
            descr: 'foundation node',
            nodePublicId: 'AJrQUiceAYbtEIq1GixWhA',
            expectedNodeName: 'Software'
        }
    ];
    // TODO: More tests needed: negative testing, resources with multiple paths, ...
    for (const nodeLookup of nodeLookups) {
        const nodeId = await rexdb.tree.lookupNodeOnPublicId(nodeLookup.nodePublicId, nodeLookup.packageGroup);
        expectValidDbId(nodeId, nodeLookup.descr + ': node id');
        const nodes = await rexdb.tree.getNodePresentation([nodeId]);
        (0, expect_1.expect)(nodes, nodeLookup.descr + ': # of presentation nodes').to.have.length(1);
        const node = nodes[0];
        (0, expect_1.expect)(node.name, nodeLookup.descr + ": node's name").to.equal(nodeLookup.expectedNodeName);
        // TODO: Test more attributes of node, such as resource type, json id,
        // existence of children, correct package, ...
    }
}
async function getFullPathToNode(nodeId) {
    const ancestorIds = await rexdb.tree.getNodeAncestors(nodeId);
    // Remove the root node (which we don't want to print)
    ancestorIds.shift();
    // And add the node arg
    ancestorIds.push(nodeId);
    // Get node names
    const nodes = await rexdb.tree.getNodePresentation(ancestorIds);
    // Convert node array to path string
    let path = '';
    nodes.forEach((node) => (path += '/' + node.name));
}
async function testPackageRetrieval(criteria) {
    const packages = await rexdb.packages.getOverviews(criteria);
    rexdb.console.finer();
    rexdb.console.finer('Number of Package Overviews matching criteria ' +
        JSON.stringify(criteria) +
        ': ' +
        packages.length);
    rexdb.console.finer('Package Overviews matching criteria ' + JSON.stringify(criteria) + ':');
    for (const pkg of packages) {
        rexdb.console.finer('Package #' + pkg.id + ': ' + pkg.uid + ', ' + pkg.name);
        rexdb.console.finer('  license:' + pkg.license);
        expectValidDbId(pkg.id);
        const catOverviews = await rexdb.resources.getOverviewsOnPackage(pkg.id);
        if (!_.isEmpty(catOverviews)) {
            rexdb.console.finer('  overviews:');
            catOverviews.forEach((overview) => {
                rexdb.console.finer('    overview #' + overview.id + ': ' + overview.name);
            });
        }
        else {
            rexdb.console.finer('  (no overviews)');
        }
    }
    if (criteria == null) {
        const c2000WarePackage = _.find(packages, {
            publicId: 'digital_power_c2000ware_sdk_software_package',
            version: '1.01.00.00'
        });
        (0, expect_1.expect)(c2000WarePackage).to.exist.and.to.deep.include({
            license: 'C2000Ware_DigitalPower_SDK_1_01_00_00/.metadata/.tirex/license/license.txt'
        });
        const msp432Package = _.find(packages, {
            publicId: 'com.ti.SIMPLELINK_MSP432_SDK_WIFI_PLUGIN',
            version: '1.50.00.38'
        });
        (0, expect_1.expect)(msp432Package).to.exist.and.to.deep.include({
            moduleOf: { packageId: 'aPackage', versionRange: '12.34.56.78' }
        });
        (0, expect_1.expect)(msp432Package.dependencies).to.include.deep.members([
            {
                refId: 'com.ti.SIMPLELINK_MSP432E4_SDK',
                versionRange: '1.55.00.21',
                require: undefined,
                message: undefined
            },
            {
                refId: 'com.ti.SIMPLELINK_MSP432_SDK',
                versionRange: '1.50.00.12',
                require: undefined,
                message: undefined
            },
            {
                refId: 'com.ti.SIMPLELINK_ACADEMY_WIFIPLUGIN',
                versionRange: '1.15.00.00',
                require: 'optional',
                message: undefined
            }
        ]);
        (0, expect_1.expect)(msp432Package.modules).to.include.deep.members([
            {
                refId: 'com.ti.SIMPLELINK_MSP432_SDK',
                versionRange: '1.50.00.12',
                require: undefined,
                message: undefined
            },
            {
                refId: 'com.ti.SIMPLELINK_ACADEMY_WIFIPLUGIN',
                versionRange: '1.15.00.00',
                require: 'optional',
                message: 'aMessage'
            }
        ]);
    }
}
async function processWithConcurrentLimit(count, limit, task) {
    let index = 0;
    async function processNext() {
        if (index !== count) {
            ++index;
            await task();
            await processNext();
        }
    }
    const concurrentTasks = [];
    for (let i = 0; i < limit; ++i) {
        // no await - enque task to run in parallel
        concurrentTasks.push(processNext());
    }
    await Promise.all(concurrentTasks);
}
function expectValidDbId(id, message) {
    (0, expect_1.expect)(id, message).to.exist;
    (0, expect_1.expect)(id, message).to.be.greaterThan(-1);
}
function expectValidDbObjs(collection, message) {
    collection.forEach((value) => expectValidDbId(value.id, message));
}
function expectValidPackageGroup(packageGroup, allPackages) {
    expectValidDbId(packageGroup.id);
    (0, expect_1.expect)(packageGroup.headNodeIds).to.not.be.empty;
    (0, expect_1.expect)(packageGroup.packageIds).to.not.be.empty;
    for (const headNodeId of packageGroup.headNodeIds) {
        // TODO: Validate that node is a head node
        expectValidDbId(headNodeId);
    }
    for (const packageId of packageGroup.packageIds) {
        expectValidPackageDbId(packageId, allPackages);
    }
    // TODO: Add additional validation of other Package Group
}
function expectValidPackageDbId(id, allPackages) {
    expectValidDbId(id);
    (0, expect_1.expect)(allPackages.find((entry) => id === entry.id), `package with id ${id} not found`).to.exist;
}
function verifyRunTime(start, maxAllowableDuration) {
    (0, expect_1.expect)(Date.now() - start, 'maximum allowable run time exceeded').to.be.at.most(maxAllowableDuration);
}
function toMap(collection) {
    return collection.reduce((map, item) => {
        expectValidDbId(item.id);
        map[item.id] = item;
        return map;
    }, {});
}
// Remove all query results from the database's query cache.
async function cleanDb() {
    const conn = await dinfra.openWritableDB();
    try {
        // Remove all query results from query cache
        const query = (0, promisifyAny_1.promisifyAny)(conn.query).bind(conn);
        if (resetQueryCacheEnabled) {
            rexdb.console.finer('Resetting query cache...');
            try {
                await query('reset query cache');
            }
            catch (e) {
                if (e.message && e.message.includes('ER_SPECIFIC_ACCESS_DENIED_ERROR')) {
                    // Disable future query cache resets, and swallow error.
                    resetQueryCacheEnabled = false;
                    rexdb.console.finer('Disabling query cache reset, db ' + 'user missing RELOAD privilege');
                }
                else {
                    throw e;
                }
            }
        }
        // Analyze tables to clear out any heuristics from earlier
        // queries and start with a fresh analyzed state.
        rexdb.console.finer('Analyzing tables...');
        await Promise.all(_.map(rexdb.db.tables, (tableName) => query('analyze table ' + tableName)));
    }
    finally {
        await conn.close();
    }
}
function getTestConfig() {
    const fullTestConfig = require('../../config/sqldb/test-config.json');
    const testConfigToRun = getTestConfigToRun();
    const rexdbConfig = getRexDbConfig();
    // Get test configuration and arguments.
    const testFileConfig = {
        ...fullTestConfig.defaults,
        ...fullTestConfig.configs[testConfigToRun],
        // applied only if option --customTest used
        ...(customTestSet && fullTestConfig.customOverrides ? fullTestConfig.customOverrides : {})
    };
    // Override rexdbConfig.consoleVerbosity with setting in test config if set
    if (testFileConfig.consoleVerbosity) {
        rexdbConfig.consoleVerbosity =
            manage_1.ConsoleVerbosity[testFileConfig.consoleVerbosity];
        if (rexdbConfig.consoleVerbosity === undefined) {
            throw new Error(`Invalid verbosity: ${testFileConfig.consoleVerbosity}`);
        }
    }
    console.log('Test config: ' + util.inspect(testFileConfig)); // TODO! Skip when quiet-mode
    const dconfig = getDConfig();
    const dataSet = fullTestConfig.dataSet;
    let { testsToRun, testsToSkip } = fullTestConfig.testSets[testFileConfig.testSet];
    if (testFileConfig.testsToRun) {
        testsToRun = testFileConfig.testsToRun;
    }
    if (testFileConfig.testsToSkip) {
        testsToSkip = testFileConfig.testsToSkip;
    }
    if (testFileConfig.enableDinfraConsoleLogging !== undefined) {
        enableDinfraConsoleLogging = testFileConfig.enableDinfraConsoleLogging;
    }
    if (testFileConfig.clearDbOnTeardown !== undefined) {
        clearDbOnTeardown = testFileConfig.clearDbOnTeardown;
    }
    if (testFileConfig.skipImport !== undefined) {
        skipImport = testFileConfig.skipImport;
    }
    return {
        rexdbConfig,
        dconfig,
        testsToRun: testsToRun ? new RegExp(testsToRun) : undefined,
        testsToSkip: testsToSkip ? new RegExp(testsToSkip) : undefined,
        dataSet
    };
    // Functions to switch the config based on the setting of customTestSet at the top
    function getTestConfigToRun() {
        return customTestSet
            ? customTestSet
            : test_helpers_1.testingGlobals.testMode === scriptsUtil.TestMode.VERY_HEAVY
                ? 'all' // all tests
                : 'all-fast'; // faster tests
    }
    function getDConfig() {
        if (customTestSet === undefined) {
            scriptsUtil.initMochaDConfig({});
            return scriptsUtil.getMochaDconfig();
        }
        else {
            return require(fullTestConfig.defaults.dconfigPath);
        }
    }
    // TODO!: Consider instead getting some rexdb attr from test-config instead of rexdb-config,
    // even when not custom test.
    // TODO!: Also consider varying table prefix for non-standard tests?
    function getRexDbConfig() {
        if (customTestSet === undefined) {
            scriptsUtil.initMochaConfig({});
            return {
                dinfraPath: test_helpers_1.testingGlobals.dinfraPath,
                tablePrefix: scriptsUtil.getMochaConfig().dbTablePrefix
            };
        }
        else {
            const config = require('../../config/sqldb/rexdb-config.json');
            if (config.consoleVerbosity) {
                // Convert to enum from string
                config.consoleVerbosity = manage_1.ConsoleVerbosity[config.consoleVerbosity];
            }
            return config;
        }
    }
}
function getPackageGroupsToImport(packageGroupUids) {
    // let packageGroups: PackageGroupJson[];
    if (!packageGroupUids) {
        // Nothing specified, so return  full package group set
        return testConfig.dataSet.packageGroups;
    }
    else {
        // Import subset of package group specified by importSet.packageGroupUids
        return _.filter(testConfig.dataSet.packageGroups, (packageGroup) => packageGroupUids.includes(typeof packageGroup === 'object'
            ? packageGroup.uid
                ? packageGroup.uid
                : packageGroup.packages[0]
            : packageGroup));
    }
}
// TODO! Still needs work, split off seed generation, replace with something more generic
let rand;
function randomIndex(collection) {
    if (rand === undefined) {
        const seedX = xmur3('sleeping-giant');
        rand = mulberry32(seedX());
    }
    return Math.floor(rand() * collection.length);
}
/**
 * Get the counts of table rows that directly reference the given package group's content_sources
 * row.
 */
async function getPackageGroupChildRowCounts(packageGroupId) {
    return {
        chunks: (await rexdb.db.simpleQuery('get-pkggrp-chunk-count', `select count(*) cnt from ${rexdb.db.tables.chunks} c where c.package_group_id = ?`, [packageGroupId]))[0].cnt,
        filters: (await rexdb.db.simpleQuery('get-pkggrp-filter-count', `select count(*) cnt from ${rexdb.db.tables.filters} f where f.package_group_id = ?`, [packageGroupId]))[0].cnt,
        nodes: (await rexdb.db.simpleQuery('get-pkggrp-node-count', `select count(*) cnt from ${rexdb.db.tables.nodes} n where n.content_source_id = ?`, [packageGroupId]))[0].cnt,
        packages: (await rexdb.db.simpleQuery('get-pkggrp-csp-count', `select count(*) cnt from ${rexdb.db.tables.contentSourcePackages} sp where sp.content_source_id = ?`, [packageGroupId]))[0].cnt
    };
}
/**
 * Get package group with given uid.
 */
async function getPackageGroup(packageGroupUid) {
    const packageGroups = await rexdb.packages.getPackageGroups({
        packageGroupUids: [packageGroupUid],
        states: ['incomplete', 'imported', 'published', 'unpublished', 'deleting', 'deleted']
    }, false, false);
    (0, expect_1.expect)(packageGroups, `package groups with uid ${packageGroupUid}`).to.have.length(1);
    return packageGroups[0];
}
/**
 * Get corrected sample standard deviation of the given array
 * @param ar
 */
function stddev(ar) {
    return ar.length <= 1
        ? 0
        : Math.sqrt(_.sum(_.map(ar, (x) => Math.pow(x - _.mean(ar), 2))) / (ar.length - 1));
}
/**
 * Get median of the given sorted array
 * @param ar
 */
function median(ar) {
    const n = ar.length;
    return n === 0 ? NaN : n % 2 ? ar[Math.floor(n / 2)] : (ar[n / 2] + ar[n / 2 - 1]) / 2;
}
function msTimeToString(ms, precision = 2) {
    return ms === undefined ? '' : `${ms.toFixed(precision)} ms`;
}
/**
 * Random number generator, returns pseudo-random number generator function.
 * @param seed
 *
 * See https://stackoverflow.com/a/47593316
 */
function mulberry32(seed) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        // tslint:disable-next-line:no-bitwise
        t = Math.imul(t ^ (t >>> 15), t | 1);
        // tslint:disable-next-line:no-bitwise
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        // tslint:disable-next-line:no-bitwise
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
// Hashing function xmur3, used for seeding random number generator (see
// https://stackoverflow.com/a/47593316).
/**
 * Hashing function used for seeding random number generator.
 * @param s  string to hash
 *
 * See https://stackoverflow.com/a/47593316
 */
function xmur3(s) {
    // tslint:disable-next-line:no-bitwise
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
        // tslint:disable-next-line:no-bitwise
        h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
        // tslint:disable-next-line:no-bitwise
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        // tslint:disable-next-line:no-bitwise
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        // tslint:disable-next-line:no-bitwise
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        // tslint:disable-next-line:no-bitwise
        return (h ^= h >>> 16) >>> 0;
    };
}
