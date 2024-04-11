"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const sinon = require("sinon");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const ajax_1 = require("./ajax");
const ajax_harness_1 = require("../../test/ajax-harness/ajax-harness");
const apis_1 = require("./apis");
const apis_internal_1 = require("./apis-internal");
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const apis_cache_interface_1 = require("./apis-cache-interface");
const expect_1 = require("../../test/expect");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const Data = require("../../test/server-harness/server-harness-data");
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Devices
device1, device2, 
// Package Nodes
packageNode2, packageNode3, packageNode4, packageNode5, packageNode6, packageNode7, packageNode8, 
// PackageGroups
packageGroup2, packageGroup4, packageGroup8, 
// Packages
package2, package3, package4, package5, package6, package7, package8 } = Data;
// Filter data
const filterData1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
    filterData: {
        devices: [{ publicId: '1', name: '741opamp' }],
        devtools: [{ publicId: '1', name: 'wrench' }],
        resourceClasses: [{ publicId: '1', name: 'pdf' }],
        ides: [{ publicId: '1', name: 'CCS' }],
        compilers: [{ publicId: '1', name: 'gcc' }],
        kernels: [{ publicId: '1', name: 'linux' }],
        packages: [
            {
                name: 'msp430ware',
                packageVersion: '1.0.0',
                packagePublicUid: '1',
                packagePublicId: '1',
                packageGroupPublicUids: ['3'],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './something.exe' },
                downloadUrl: { win: 'foobar/downloadable.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            }
        ],
        languages: [{ publicId: '1', name: 'English' }, { publicId: '2', name: 'Chinese' }]
    }
};
const filterData2 = {
    ...emptyFilterData,
    devices: [device1, device2],
    packages: [package2, package3, package4, package5, package6, package7]
};
const filterData3 = {
    ...emptyFilterData,
    devices: [device1, device2]
};
const filterData5 = {
    ...emptyFilterData,
    packages: [package2, package4, package8],
    packageGroups: [packageGroup2, packageGroup4, packageGroup8]
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Note: most of the functionality of apis + it's helpers is tested in use-apis.spec.ts
 *
 * This focuses on some more complex cases / details
 */
describe('[frontend] APIs', function () {
    before(() => (0, browser_emulator_1.browserEmulator)());
    describe('getNodes', function () {
        // Spies
        let getNodesDataSpy;
        let ajaxGetSpy;
        let data;
        beforeEach(function () {
            data = setupTest();
            // Setup spies
            getNodesDataSpy = sinon.spy(data.serverInterface, 'getNodesData');
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
        });
        afterEach(function () {
            // Restore spies
            getNodesDataSpy.restore();
            ajaxGetSpy.restore();
            data.ajaxHarness.cleanup();
        });
        const data3 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [packageNode2.nodeDbId, packageNode3.nodeDbId]
            },
            nodeData: {
                [packageNode2.nodeDbId]: packageNode2,
                [packageNode3.nodeDbId]: packageNode3
            },
            filterData: filterData2
        };
        const data4 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [packageNode2.nodeDbId, packageNode4.nodeDbId, packageNode8.nodeDbId]
            },
            nodeData: {
                [packageNode2.nodeDbId]: packageNode2,
                [packageNode4.nodeDbId]: packageNode4,
                [packageNode8.nodeDbId]: packageNode8
            },
            filterData: filterData5
        };
        it('Should fill the caches with the appropriate data', async function () {
            await data.ajaxHarness.setupTestFakeServer(data4);
            const nodes = [packageNode2, packageNode4, packageNode8];
            const nodeIds = nodes.map(item => item.nodeDbId);
            const pkgs = data4.filterData.packages;
            await data.apis.getNodes(nodeIds);
            (0, expect_1.expect)(Object.keys(data.cacheInterface.getNodesDataBulk(nodeIds).nodesData)).to.deep.equal(nodeIds);
            (0, expect_1.expect)(nodes.map(item => {
                const pkg = pkgs.find(pkg => pkg.packagePublicUid === item.packagePublicUid);
                return data.cacheInterface.getNodeDbId({
                    nodePublicId: item.nodePublicId,
                    packageGroupPublicUid: item.packageGroupPublicUid ||
                        apis_internal_1._PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY,
                    packagePublicId: (pkg && pkg.packagePublicId) ||
                        apis_internal_1._PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY,
                    isLatest: false
                });
            })).to.deep.equal(nodeIds);
        });
        it('Should only call getNodes for the missing nodes', async function () {
            await data.ajaxHarness.setupTestFakeServer(data3);
            await data.apis.getNodes([packageNode2.nodeDbId]);
            (0, expect_1.expect)(getNodesDataSpy.calledOnce).to.equal(true);
            const args = await data.apis.getNodes([packageNode2.nodeDbId, packageNode3.nodeDbId]);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(2);
            validateNode(args, [packageNode2.nodeDbId, packageNode3.nodeDbId]);
            (0, expect_1.expect)(getNodesDataSpy.getCall(1).args[0]).to.deep.equal([packageNode3.nodeDbId]);
        });
        function validateNode(result, expectedIds) {
            const ids = result.map(node => node.nodeDbId);
            (0, expect_1.expect)(ids).to.deep.equal(expectedIds);
        }
    });
    describe('getExtendedNodes', function () {
        // Spies
        let ajaxGetSpy;
        let getExtendedNodesDataSpy;
        let data;
        beforeEach(function () {
            data = setupTest();
            // Setup spies
            getExtendedNodesDataSpy = sinon.spy(data.serverInterface, 'getExtendedNodesData');
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
        });
        afterEach(function () {
            // Restore spies
            getExtendedNodesDataSpy.restore();
            ajaxGetSpy.restore();
            data.ajaxHarness.cleanup();
        });
        const data1 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [packageNode2.nodeDbId]
            },
            nodeData: {
                [packageNode2.nodeDbId]: packageNode2
            },
            filterData: filterData2
        };
        it('Should fill the caches with the appropriate data', async function () {
            await data.ajaxHarness.setupTestFakeServer(data1);
            const node = packageNode2;
            await data.apis.getExtendedNodes(node.nodeDbId);
            const fromCache = data.cacheInterface.getExtendedNodesData(node.nodeDbId);
            (0, expect_1.expect)(fromCache && fromCache.nodeDbId).to.deep.equal(node.nodeDbId);
        });
    });
    describe('getFilteredChildrenNodes', function () {
        // Spies
        let getFilteredChildrenNodeIdsSpy;
        let getNodesDataSpy;
        let getNodesSpy;
        let ajaxGetSpy;
        let data;
        beforeEach(function () {
            data = setupTest();
            // Setup spies
            getNodesDataSpy = sinon.spy(data.serverInterface, 'getNodesData');
            getNodesSpy = sinon.spy(data.apis, 'getNodes');
            getFilteredChildrenNodeIdsSpy = sinon.spy(data.serverInterface, 'getFilteredChildrenNodeIds');
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
        });
        afterEach(function () {
            // Restore spies
            getFilteredChildrenNodeIdsSpy.restore();
            getNodesDataSpy.restore();
            getNodesSpy.restore();
            ajaxGetSpy.restore();
            data.ajaxHarness.cleanup();
        });
        // Data
        const data2 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [packageNode2.nodeDbId, packageNode3.nodeDbId],
                [packageNode2.nodeDbId]: [packageNode6.nodeDbId],
                [packageNode3.nodeDbId]: [packageNode5.nodeDbId]
            },
            nodeData: {
                [packageNode2.nodeDbId]: packageNode2,
                [packageNode3.nodeDbId]: packageNode3,
                [packageNode6.nodeDbId]: packageNode6,
                [packageNode5.nodeDbId]: packageNode5
            },
            filterData: filterData2
        };
        const data3 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [packageNode2.nodeDbId],
                [packageNode2.nodeDbId]: [packageNode4.nodeDbId, packageNode5.nodeDbId]
            },
            nodeData: {
                [packageNode2.nodeDbId]: packageNode2,
                [packageNode4.nodeDbId]: packageNode4,
                [packageNode5.nodeDbId]: packageNode5
            },
            filterData: filterData2
        };
        const data4 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [packageNode2.nodeDbId, packageNode3.nodeDbId],
                [packageNode2.nodeDbId]: [packageNode7.nodeDbId],
                [packageNode3.nodeDbId]: [packageNode5.nodeDbId]
            },
            nodeData: {
                [packageNode2.nodeDbId]: packageNode2,
                [packageNode3.nodeDbId]: packageNode3,
                [packageNode7.nodeDbId]: packageNode7,
                [packageNode5.nodeDbId]: packageNode5
            },
            filterData: filterData2
        };
        it('Should only call the server for relations if we called it with another filter with the same parent id', async function () {
            await data.ajaxHarness.setupTestFakeServer(data3);
            await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.calledOnce).to.equal(true);
            const args = await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId], {
                devices: [device2.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.callCount).to.equal(2);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(2);
            validateNode(args, [packageNode4.nodeDbId]);
        });
        it('Should only call the server for node data if we already have the relations and have missing nodes', async function () {
            await data.ajaxHarness.setupTestFakeServer(data2);
            await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.calledOnce).to.equal(true);
            data.cacheInterface._clearNodesDataCache();
            const args = await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(args).to.exist;
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(2);
        });
        it('Should only call the server for parents not in the cache', async function () {
            await data.ajaxHarness.setupTestFakeServer(data2);
            await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.calledOnce).to.equal(true);
            const args = await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId, packageNode3.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.callCount).to.equal(2);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(2);
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.getCall(1).args[0]).to.deep.equal([
                packageNode3.nodeDbId
            ]);
            validateNode(args, [packageNode6.nodeDbId, packageNode5.nodeDbId]);
        });
        it('Should only call the server for relations not in the cache', async function () {
            // both parents have nodes data but 1 does not have it's relations
            await data.ajaxHarness.setupTestFakeServer(data4);
            await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId], {
                devices: [device2.publicId]
            });
            await data.apis.getFilteredChildrenNodes([packageNode3.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.callCount).to.equal(2);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(2);
            const args = await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId, packageNode3.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.callCount).to.equal(3);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(2);
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.getCall(2).args[0]).to.deep.equal([
                packageNode2.nodeDbId
            ]);
            validateNode(args, [packageNode7.nodeDbId, packageNode5.nodeDbId]);
        });
        it('Should only call the server for data not in the cache', async function () {
            // both parents have relations but 1 does not have it's data
            await data.ajaxHarness.setupTestFakeServer(data2);
            await data.apis.getFilteredChildrenNodes([packageNode3.nodeDbId, packageNode2.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.calledOnce).to.equal(true);
            data.cacheInterface._clearNodesDataCache();
            await data.apis.getNodes([packageNode5.nodeDbId]);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(2);
            const args = await data.apis.getFilteredChildrenNodes([packageNode2.nodeDbId, packageNode3.nodeDbId], {
                devices: [device1.publicId]
            });
            (0, expect_1.expect)(getFilteredChildrenNodeIdsSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(3);
            (0, expect_1.expect)(getNodesDataSpy.getCall(2).args[0]).to.deep.equal([packageNode6.nodeDbId]);
            validateNode(args, [packageNode6.nodeDbId, packageNode5.nodeDbId]);
        });
        function validateNode(result, expectedIds) {
            const ids = result
                .map(item => item.map(node => node.nodeDbId))
                .reduce((accum, item) => accum.concat(item), []);
            (0, expect_1.expect)(result).to.be.lengthOf(expectedIds.length);
            (0, expect_1.expect)(ids).to.deep.equal(expectedIds);
        }
    });
    describe('expandNode', function () {
        // Spies
        let getExpandedFilteredDescendantNodesDataSpy;
        let getNodesDataSpy;
        let ajaxGetSpy;
        let data;
        beforeEach(function () {
            data = setupTest();
            // Setup spies
            getExpandedFilteredDescendantNodesDataSpy = sinon.spy(data.serverInterface, 'getExpandedFilteredDescendantNodesData');
            getNodesDataSpy = sinon.spy(data.serverInterface, 'getNodesData');
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
        });
        afterEach(function () {
            // Restore spies
            getExpandedFilteredDescendantNodesDataSpy.restore();
            getNodesDataSpy.restore();
            ajaxGetSpy.restore();
            data.ajaxHarness.cleanup();
        });
        const data1 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [packageNode2.nodeDbId],
                [packageNode2.nodeDbId]: [packageNode3.nodeDbId]
            },
            nodeData: {
                [packageNode2.nodeDbId]: packageNode2,
                [packageNode3.nodeDbId]: packageNode3
            },
            filterData: filterData3
        };
        it('Should fill the caches with the appropriate data', async function () {
            const params = {
                filterPackageGroup: [],
                filterDevice: [device1.publicId]
            };
            const pkgs = data1.filterData.packages;
            await data.ajaxHarness.setupTestFakeServer(data1);
            await data.apis.expandNode(rootNode, { devices: [device1.publicId] });
            (0, expect_1.expect)(data.cacheInterface.getFilteredChildrenNodeIds(apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(rootNode, params))).to.deep.equal([packageNode2.nodeDbId]);
            (0, expect_1.expect)(data.cacheInterface.getFilteredDescendentNodeIds(apis_cache_interface_1.ApisCacheInterface.urlQueryCacheKey(rootNode, params))).to.deep.equal([packageNode2.nodeDbId, packageNode3.nodeDbId]);
            (0, expect_1.expect)(Object.keys(data.cacheInterface.getNodesDataBulk([
                packageNode2.nodeDbId,
                packageNode3.nodeDbId
            ]).nodesData)).to.deep.equal([packageNode2.nodeDbId, packageNode3.nodeDbId]);
            (0, expect_1.expect)([packageNode2, packageNode3].map(item => {
                const pkg = pkgs.find(pkg => pkg.packagePublicUid === item.packagePublicUid);
                return data.cacheInterface.getNodeDbId({
                    nodePublicId: item.nodePublicId,
                    packageGroupPublicUid: item.packageGroupPublicUid ||
                        apis_internal_1._PACKAGE_GROUP_PUBLIC_UID_CACHE_PLACEHOLDER_KEY,
                    packagePublicId: (pkg && pkg.packagePublicUid) ||
                        apis_internal_1._PACKAGE_PUBLIC_ID_CACHE_PLACEHOLDER_KEY,
                    isLatest: false
                });
            })).to.deep.equal([packageNode2.nodeDbId, packageNode3.nodeDbId]);
        });
        it('Should call the server again if we have the data but not the relations', async function () {
            await data.ajaxHarness.setupTestFakeServer(data1);
            await data.apis.expandNode(rootNode, { devices: [device1.publicId] });
            (0, expect_1.expect)(getExpandedFilteredDescendantNodesDataSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(0);
            data.cacheInterface._clearFilteredDescendentNodeIdsCache();
            await data.apis.expandNode(rootNode, { devices: [device1.publicId] });
            (0, expect_1.expect)(getExpandedFilteredDescendantNodesDataSpy.callCount).to.equal(2);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(0);
        });
        it('Should only call the server for the data if we have all the relations', async function () {
            await data.ajaxHarness.setupTestFakeServer(data1);
            await data.apis.expandNode(rootNode, { devices: [device1.publicId] });
            (0, expect_1.expect)(getExpandedFilteredDescendantNodesDataSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(0);
            data.cacheInterface._clearNodesDataCache();
            await data.apis.expandNode(rootNode, { devices: [device1.publicId] });
            (0, expect_1.expect)(getExpandedFilteredDescendantNodesDataSpy.calledOnce).to.equal(true);
            (0, expect_1.expect)(getNodesDataSpy.callCount).to.equal(1);
        });
    });
    describe('acquireControl & releaseControl', function () {
        let data;
        beforeEach(function () {
            data = setupTest();
        });
        afterEach(function () {
            data.ajaxHarness.cleanup();
        });
        const PREVIOUS_MASTER_CONTROL_TIME = 1000;
        it('Should allow you to call APIs after acquiring control', async function () {
            await data.ajaxHarness.setupTestFakeServer(filterData1);
            const masterName = 'test1';
            await data.apis.getAPIControl().acquireControl(masterName);
            const apiPromise = data.apis.getFilterOptions(masterName);
            await (0, expect_1.expect)(apiPromise).to.eventually.be.fulfilled;
        });
        it('Should only give you control when the previous master releases control', async function () {
            await data.ajaxHarness.setupTestFakeServer(filterData1);
            const masterName = 'test2';
            await data.apis.getAPIControl().acquireControl(masterName);
            const masterName2 = 'test3';
            const acquirePromise2 = data.apis.getAPIControl().acquireControl(masterName2);
            let releaseCallback;
            let hasControl = false;
            setTimeout(() => {
                (0, expect_1.expect)(hasControl).to.be.false;
            }, PREVIOUS_MASTER_CONTROL_TIME / 2);
            setTimeout(() => {
                data.apis.getAPIControl().releaseControl(masterName);
                releaseCallback();
            }, PREVIOUS_MASTER_CONTROL_TIME);
            await Promise.all([
                new Promise(async function (resolve, reject) {
                    try {
                        await (0, expect_1.expect)(acquirePromise2).to.be.eventually.fulfilled;
                        hasControl = true;
                        resolve();
                    }
                    catch (e) {
                        reject(e);
                    }
                }),
                new Promise(resolve => (releaseCallback = resolve))
            ]);
        });
        it('Should not allow API calls without a master to go through until the current master releases control', async function () {
            await data.ajaxHarness.setupTestFakeServer(filterData1);
            const masterName = 'test2';
            await data.apis.getAPIControl().acquireControl(masterName);
            const apiPromise = data.apis.getFilterOptions();
            let releaseCallback;
            let hasControl = false;
            setTimeout(() => {
                (0, expect_1.expect)(hasControl).to.be.false;
            }, PREVIOUS_MASTER_CONTROL_TIME / 2);
            setTimeout(() => {
                data.apis.getAPIControl().releaseControl(masterName);
                releaseCallback();
            }, PREVIOUS_MASTER_CONTROL_TIME);
            await Promise.all([
                new Promise(async function (resolve, reject) {
                    try {
                        await (0, expect_1.expect)(apiPromise).to.be.eventually.fulfilled;
                        hasControl = true;
                        resolve();
                    }
                    catch (e) {
                        reject(e);
                    }
                }),
                new Promise(resolve => (releaseCallback = resolve))
            ]);
        });
        it('Should not allow API calls with a different master to go through', async function () {
            await data.ajaxHarness.setupTestFakeServer(filterData1);
            const masterName = 'test2';
            await data.apis.getAPIControl().acquireControl(masterName);
            const masterName2 = 'test3';
            const apiPromise = data.apis.getFilterOptions(masterName2);
            await (0, expect_1.expect)(apiPromise).to.be.eventually.rejected;
        });
    });
});
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
function setupTest() {
    const apis = new apis_1.APIs();
    return {
        ajaxHarness: new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER }),
        serverInterface: apis._getServerInterface(),
        cacheInterface: apis._getCacheInterface(),
        apis
    };
}
