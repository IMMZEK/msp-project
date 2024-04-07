"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const _ = require("lodash");
const sinon = require("sinon");
const QueryString = require("query-string");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const ajax_1 = require("../apis/ajax");
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const expect_1 = require("../../test/expect");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const Data = require("../../test/frontend/data");
const util_1 = require("../../test/frontend/util");
const create_app_props_1 = require("../testing-helpers/create-app-props");
const page_1 = require("../../shared/routes/page");
const hook_tests_1 = require("./hook-tests");
const use_apis_1 = require("./use-apis");
const filter_helpers_1 = require("./filter-helpers");
const util_2 = require("../../test/frontend/enzyme/util");
const util_3 = require("../../shared/util");
const apis_1 = require("../apis/apis");
const delay_1 = require("../../test/delay");
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Package Nodes
packageNode2, packageNode61, 
// Folder nodes
folderNode2, folderNode3, folderNode6: _folderNode6, 
// Variants
variant2, variant3, 
// TableItems
tableItem1, tableItem2, tableItem3, 
// PackageGroups
packageGroup2, packageGroup61, 
// Packages
package2, package61, 
// Devices
device1, 
// Kernels
kernel1, kernel2, 
// Compilers
compiler1, compiler2 } = Data;
const folderNode6 = {
    ..._folderNode6,
    filterData: {
        ..._folderNode6.filterData,
        filterDevice: [device1.publicId]
    },
    packageGroupPublicUid: null,
    packagePublicUid: null
};
const packageNode2Link = 'package-2-node-link';
const packageNode61Link = 'package-61-node-link';
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        devices: [device1],
        packages: [package2, package61],
        packageGroups: [packageGroup2, packageGroup61]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode61].map(item => item.nodeDbId),
        [packageNode2.nodeDbId]: [folderNode6].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode61.nodeDbId]: packageNode61,
        [folderNode6.nodeDbId]: folderNode6
    },
    rex3Links: {
        [packageNode2Link]: packageNode2.nodeDbId,
        [packageNode61Link]: packageNode61.nodeDbId
    }
};
const data2 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.TABLE_ITEM_DATA,
    rootNode,
    hierarchy: {
        [rootNode]: [folderNode2.nodeDbId, folderNode3.nodeDbId]
    },
    nodeData: {
        [folderNode2.nodeDbId]: folderNode2,
        [folderNode3.nodeDbId]: folderNode3
    },
    filterData: {
        ...emptyFilterData,
        kernels: [kernel1, kernel2],
        compilers: [compiler1, compiler2]
    },
    tableItemHierarchy: {
        [tableItem1.tableItemDbId]: [tableItem2.tableItemDbId, tableItem3.tableItemDbId],
        [tableItem2.tableItemDbId]: [],
        [tableItem3.tableItemDbId]: []
    },
    tableItemData: {
        [tableItem1.tableItemDbId]: tableItem1,
        [tableItem2.tableItemDbId]: tableItem2,
        [tableItem3.tableItemDbId]: tableItem3
    }
};
const errorCallback = {
    current: sinon.stub()
};
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
// Account for api/packages, api/packageGroups, api/filterOptions
const ajaxCallCountOffset = 3;
describe('[frontend] use-apis', function () {
    this.timeout(20000);
    before(async () => {
        (0, browser_emulator_1.browserEmulator)();
    });
    after(() => {
        (0, util_1.cleanupEnzymeTest)();
    });
    describe('useApi', function () {
        beforeEach(async function () {
            await (0, util_1.setupEnzymeTest)({ data: data1 });
        });
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            errorCallback.current.resetHistory();
        });
        it('Should only make the call when the trigger is true', async function () {
            // Data
            let counter = 1;
            const helper = async () => {
                await (0, delay_1.delay)(300);
                return counter++;
            };
            const spy = sinon.spy(helper);
            const deps = { api: spy, trigger: false };
            // Setup
            const hook = createHook(deps);
            const { wrapper } = (0, util_2.getDataFromHook)(hook);
            // Update, wait, verify
            (0, expect_1.expect)(spy.called).to.be.false;
            deps.trigger = true;
            wrapper.setProps({ hook });
            await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(spy.calledOnce).to.be.true;
        });
        it('Should not update the result when trigger is false', async function () {
            // Data
            let counter = 1;
            const helper = async () => {
                await (0, delay_1.delay)(300);
                return counter++;
            };
            const helper2 = async () => {
                await (0, delay_1.delay)(300);
                return 500;
            };
            const spy = sinon.spy(helper);
            const spy2 = sinon.spy(helper2);
            const deps = { api: spy, trigger: true };
            // Setup
            const hook = createHook(deps);
            const { wrapper } = (0, util_2.getDataFromHook)(hook);
            // Wait for first call
            await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(spy.calledOnce).to.be.true;
            // Update, verify no update until trigger set
            deps.trigger = false;
            deps.api = spy2;
            wrapper.setProps({ hook });
            const result = await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result).to.equal(1);
            // Set trigger, expect update
            deps.trigger = true;
            wrapper.setProps({ hook });
            const result2 = await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            (0, expect_1.expect)(result2).to.equal(500);
            (0, expect_1.expect)(spy2.calledOnce).to.be.true;
        });
        // Helpers
        function createHook(args) {
            return () => (0, use_apis_1._useApi)({ dependencies: [], apis: new apis_1.APIs(), errorCallback, ...args }).result;
        }
    });
    describe('useApi - manageControl', function () {
        const MASTER_NAME = 'useApi';
        beforeEach(async function () {
            await (0, util_1.setupEnzymeTest)({ data: data1 });
        });
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            errorCallback.current.resetHistory();
        });
        it('Should acquire control when trigger is set', async function () {
            const { wrapper, deps, aquireControlSpy, hook } = setup();
            deps.trigger = true;
            wrapper.setProps({ hook });
            await (0, delay_1.delay)(10); // Get off event queue to let hooks react to dependency change
            // Verify
            (0, expect_1.expect)(aquireControlSpy.calledOnce).to.be.true;
        });
        it('Should call the api when control is acquired', async function () {
            const { wrapper, hook, deps, apiSpy, aquireControlSpy } = setup();
            deps.trigger = true;
            wrapper.setProps({ hook });
            await (0, delay_1.delay)(10); // Get off event queue to let hooks react to dependency
            // Make sure we aquired control before checking if api called
            (0, expect_1.expect)(aquireControlSpy.calledOnce).to.be.true;
            (0, expect_1.expect)(apiSpy.calledOnce).to.be.true;
        });
        it('Should release control when hook is done', async function () {
            const { wrapper, hook, deps, releaseControlSpy } = setup();
            deps.trigger = true;
            wrapper.setProps({ hook });
            await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
            // Verify
            (0, expect_1.expect)(releaseControlSpy.calledOnce).to.be.true;
        });
        function setup() {
            const apis = new apis_1.APIs();
            // api
            const api = async () => {
                await (0, delay_1.delay)(300);
                return 'done';
            };
            // Spies
            const aquireControlSpy = sinon.spy(apis.getAPIControl(), 'acquireControl');
            const releaseControlSpy = sinon.spy(apis.getAPIControl(), 'releaseControl');
            const apiSpy = sinon.spy(api);
            const deps = { api: apiSpy, trigger: false, apis };
            // Setup
            const hook = createHook(deps);
            const { wrapper } = (0, util_2.getDataFromHook)(hook);
            return { wrapper, aquireControlSpy, releaseControlSpy, apiSpy, deps, hook };
        }
        function createHook(args) {
            return () => (0, use_apis_1.useApi)({
                ...args,
                errorCallback,
                manageControl: true,
                masterName: MASTER_NAME,
                dependencies: []
            }).result;
        }
    });
    describe('useGetNodes', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            const nodeDbIds = [packageNode2.nodeDbId, packageNode61.nodeDbId];
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ ids: nodeDbIds }, appProps), result => {
                (0, expect_1.expect)((result || []).map(item => item.nodeDbId)).to.deep.equal(nodeDbIds);
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                ids: [folderNode6.nodeDbId]
            };
            const updatedDeps = {
                ids: [packageNode2.nodeDbId, packageNode61.nodeDbId]
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { ids } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                return (0, use_apis_1.useGetNodes)({
                    ids,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy) {
            const { ids } = deps;
            const expectedCount = count + ajaxCallCountOffset;
            const params = {
                dbId: ids
            };
            const url = `${"api/nodesData" /* API.GET_NODES_DATA */}?${QueryString.stringify(params)}`;
            (0, expect_1.expect)(result).to.be.not.null;
            return verifyResultForApi(expectedCount, [url], spy);
        }
    });
    describe('useGetExtendedNodes', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            const nodeDbId = packageNode2.nodeDbId;
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ id: nodeDbId }, appProps), result => {
                (0, expect_1.expect)(result && result.nodeDbId).to.equal(nodeDbId);
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                id: folderNode6.nodeDbId
            };
            const updatedDeps = {
                id: packageNode2.nodeDbId
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { id } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                return (0, use_apis_1.useGetExtendedNodes)({
                    id,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy) {
            const { id } = deps;
            const expectedCount = count + ajaxCallCountOffset;
            const params = {
                dbId: id
            };
            const url = `${"api/nodeExtendedData" /* API.GET_NODE_EXTENDED_DATA */}?${QueryString.stringify(params)}`;
            (0, expect_1.expect)(result).to.be.not.null;
            return verifyResultForApi(expectedCount, [url], spy);
        }
    });
    describe('useGetFilteredChildrenNodes', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ parentIds: [packageNode2.nodeDbId], urlQuery: {} }, appProps), result => {
                (0, expect_1.expect)(_.flatten(result).map(item => item.nodeDbId)).to.deep.equal([
                    folderNode6.nodeDbId
                ]);
            }, errorCallback, 
            // api/nodesData & api/filteredChildrenNodeIds called
            2 + ajaxCallCountOffset);
        }
        it('Should handle dependencies changing', async function () {
            // There's 2 apis involved, changing the filter vs the query triggers
            // different number of ajax calls
            // Also can't determine the query from the result, need more info than the helper
            // provides (verify function isn't provided input info / what dependency was
            // changed / how)
            // Simpler to just make a custom version here
            const deps = {
                parentIds: [rootNode],
                urlQuery: {}
            };
            const updatedDeps = {
                parentIds: [packageNode2.nodeDbId],
                urlQuery: { devices: [device1.publicId] }
            };
            // Setup
            const { data: appProps, spy } = await setup();
            const hook = createHook(deps, appProps);
            const { wrapper } = (0, util_2.getDataFromHook)(hook);
            // Wait & verify first result
            {
                const result = await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
                const nodesDataUrl = getNodesDataUrl(result);
                const filteredChildrenNodeIdsUrl = getFilteredChildrenNodeIdsUrl(deps, appProps);
                const expectedCount = 2 + ajaxCallCountOffset;
                await verifyResultForApi(expectedCount, [nodesDataUrl, filteredChildrenNodeIdsUrl], spy);
            }
            const updateAndWait = async () => {
                wrapper.setProps({ hook });
                const result = await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
                return result;
            };
            // parentIds update
            {
                (0, util_3.setValueForPair)(deps, updatedDeps, 'parentIds', val => val);
                const result = await updateAndWait();
                const nodesDataUrl = getNodesDataUrl(result);
                const filteredChildrenNodeIdsUrl = getFilteredChildrenNodeIdsUrl(deps, appProps);
                const expectedCount = 4 + ajaxCallCountOffset;
                await verifyResultForApi(expectedCount, [nodesDataUrl, filteredChildrenNodeIdsUrl], spy);
            }
            // urlQuery update
            {
                (0, util_3.setValueForPair)(deps, updatedDeps, 'urlQuery', val => val);
                const result = await updateAndWait();
                const nodesDataUrl = getNodesDataUrl(result);
                const filteredChildrenNodeIdsUrl = getFilteredChildrenNodeIdsUrl(deps, appProps);
                const expectedCount = 5 + ajaxCallCountOffset;
                await verifyResultForApi(expectedCount, [nodesDataUrl, filteredChildrenNodeIdsUrl], spy);
            }
        });
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { parentIds, urlQuery } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                return (0, use_apis_1.useGetFilteredChildrenNodes)({
                    parentIds,
                    urlQuery,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function getFilteredChildrenNodeIdsUrl(deps, appProps) {
            const { parentIds, urlQuery } = deps;
            // ServerFilterQuery
            const { filterOptions, packageGroups } = appProps;
            const query = (0, filter_helpers_1.getServerFilterQueryFromBrowserUrlQuery)(urlQuery, packageGroups, filterOptions);
            const params = {
                parentDbId: parentIds,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const url = `${"api/filteredChildrenNodeIds" /* API.GET_FILTERED_CHILDREN_NODE_IDS */}?${QueryString.stringify(params)}`;
            return url;
        }
        function getNodesDataUrl(result) {
            if (!result) {
                throw new Error('Result is null');
            }
            const params = {
                dbId: _.flatten(result).map(item => item.nodeDbId)
            };
            const url = `${"api/nodesData" /* API.GET_NODES_DATA */}?${QueryString.stringify(params)}`;
            return url;
        }
    });
    describe('useGetFiltredTableItems', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            const expectedItems = [tableItem2, tableItem3];
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({
                parentId: tableItem1.tableItemNodeDbId,
                urlQuery: {},
                page: page_1.Page.EXPLORE
            }, appProps), result => {
                (0, expect_1.expect)((result || []).map(item => item.tableItemDbId)).to.deep.equal(expectedItems.map(item => item.tableItemDbId));
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                parentId: tableItem2.tableItemNodeDbId,
                urlQuery: {},
                page: page_1.Page.EXPLORE
            };
            const updatedDeps = {
                parentId: tableItem1.tableItemNodeDbId,
                urlQuery: { kernels: ['freertos'] },
                page: page_1.Page.WIZARD
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy, data) => createVerifyResult(deps, count, result, spy, data), errorCallback, deps, updatedDeps);
        }
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data2);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { parentId, urlQuery, page } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                return (0, use_apis_1.useGetFilteredTableItems)({
                    parentId,
                    urlQuery,
                    page,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy, appProps) {
            const expectedCount = count + ajaxCallCountOffset;
            (0, expect_1.expect)(result).to.be.not.null;
            const url = getFilteredTableItemsUrl(deps, appProps);
            return verifyResultForApi(expectedCount, [url], spy);
        }
        function getFilteredTableItemsUrl(deps, appProps) {
            const { parentId, urlQuery, page } = deps;
            // ServerFilterQuery
            const { filterOptions, packageGroups } = appProps;
            const query = (0, filter_helpers_1.getServerFilterQueryFromBrowserUrlQuery)(urlQuery, packageGroups, filterOptions);
            // Form url
            const params = {
                parentDbId: parentId,
                isProjectWizard: page === page_1.Page.WIZARD,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const url = `${"api/filteredTableItemsData" /* API.GET_FILTERED_TABLE_ITEMS_DATA */}?${QueryString.stringify(params)}`;
            return url;
        }
    });
    describe('useGetNodeDataForTableItemVariant', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ id: tableItem2.tableItemDbId, urlQuery: {}, variant: variant2.variant }, appProps), result => {
                (0, expect_1.expect)(result && result.nodeDbId).to.deep.equal(variant2.nodeDbId);
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                id: tableItem2.tableItemDbId,
                urlQuery: {},
                variant: variant2.variant
            };
            const updatedDeps = {
                id: tableItem3.tableItemDbId,
                urlQuery: { compilers: [compiler2.publicId] },
                variant: variant3.variant
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy, data) => createVerifyResult(deps, count, result, spy, data), errorCallback, deps, updatedDeps);
        }
        {
            const deps = {
                id: tableItem2.tableItemDbId,
                urlQuery: { compilers: [compiler2.publicId] },
                variant: null
            };
            const updatedDeps = {
                id: tableItem2.tableItemDbId,
                urlQuery: { compilers: [compiler2.publicId] },
                variant: variant2.variant
            };
            (0, hook_tests_1.doWaitUntilOptionsSetTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy, data) => createVerifyResult(deps, count, result, spy, data), errorCallback, deps, updatedDeps);
        }
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data2);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { id, urlQuery, variant } = deps;
                return (0, use_apis_1.useGetNodeDataForTableItemVariant)({
                    id,
                    urlQuery,
                    variant,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy, appProps) {
            const expectedCount = count + ajaxCallCountOffset;
            (0, expect_1.expect)(result).to.be.not.null;
            const url = getNodeDataForTableItemVariantUrl(deps, appProps);
            return verifyResultForApi(expectedCount, [url], spy);
        }
        function getNodeDataForTableItemVariantUrl(deps, appProps) {
            const { id, urlQuery, variant } = deps;
            if (!variant) {
                throw new Error('Did not set deps correctly');
            }
            // ServerFilterQuery
            const { filterOptions, packageGroups } = appProps;
            const query = (0, filter_helpers_1.getServerFilterQueryFromBrowserUrlQuery)(urlQuery, packageGroups, filterOptions);
            // Form urlQuery
            const params = {
                tableItemDbId: id,
                variantCompiler: variant.compiler,
                variantKernel: variant.kernel,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const url = `${"api/nodeDataForTableItemVariant" /* API.GET_NODE_DATA_FOR_TABLE_ITEM_VARIANT */}?${QueryString.stringify(params)}`;
            return url;
        }
    });
    describe('useExpandNode', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ id: packageNode2.nodeDbId, urlQuery: {} }, appProps), result => {
                (0, expect_1.expect)(result).to.be.not.null;
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                id: rootNode,
                urlQuery: {}
            };
            const updatedDeps = {
                id: packageNode2.nodeDbId,
                urlQuery: { devices: [device1.publicId] }
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy, data) => createVerifyResult(deps, count, result, spy, data), errorCallback, deps, updatedDeps);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { id, urlQuery } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                const { result } = (0, use_apis_1.useExpandNode)({
                    id,
                    urlQuery,
                    apis: appProps.apis,
                    errorCallback
                });
                if (result === null) {
                    return result;
                }
                else {
                    // We attach this as a prop to a div internally, we get a warning
                    // about assigning a boolean to a non-boolean attribute if we don't do this
                    return result ? 'true' : 'false';
                }
            };
        }
        function createVerifyResult(deps, count, result, spy, appProps) {
            const { id, urlQuery } = deps;
            const expectedCount = count + ajaxCallCountOffset;
            (0, expect_1.expect)(result).to.be.not.null;
            // ServerFilterQuery
            const { filterOptions, packageGroups } = appProps;
            const query = (0, filter_helpers_1.getServerFilterQueryFromBrowserUrlQuery)(urlQuery, packageGroups, filterOptions);
            // Form url + verify
            const params = {
                parentDbId: id,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const url = `${"api/expandedFilteredDescendantNodesData" /* API.GET_EXPANDED_FILTERED_DESCENDANT_NODES_DATA */}?${QueryString.stringify(params)}`;
            return verifyResultForApi(expectedCount, [url], spy);
        }
    });
    describe('useGetSearchSuggesstions', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ text: 'foo', urlQuery: {} }, appProps), result => {
                (0, expect_1.expect)(result).to.be.not.null;
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                text: 'foo',
                urlQuery: {}
            };
            const updatedDeps = {
                text: 'bar',
                urlQuery: { devices: [device1.publicId] }
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy, data) => createVerifyResult(deps, count, result, spy, data), errorCallback, deps, updatedDeps);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { text, urlQuery } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                return (0, use_apis_1.useGetSearchSuggesgtions)({
                    text,
                    urlQuery,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy, appProps) {
            const { text, urlQuery } = deps;
            const expectedCount = count + ajaxCallCountOffset;
            (0, expect_1.expect)(result).to.be.not.null;
            // ServerFilterQuery
            const { filterOptions, packageGroups } = appProps;
            const query = (0, filter_helpers_1.getServerFilterQueryFromBrowserUrlQuery)(urlQuery, packageGroups, filterOptions);
            // Form url + verify
            const params = {
                text,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const url = `${"api/searchSuggestions" /* API.GET_SEARCH_SUGGESTIONS */}?${QueryString.stringify(params)}`;
            return verifyResultForApi(expectedCount, [url], spy);
        }
    });
    describe('useGetImportInfo', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            const nodeDbId = packageNode2.nodeDbId;
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ id: nodeDbId, urlQuery: {} }, appProps), result => {
                (0, expect_1.expect)(result).to.be.not.null;
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                id: folderNode6.nodeDbId,
                urlQuery: {}
            };
            const updatedDeps = {
                id: packageNode2.nodeDbId,
                urlQuery: { devices: [device1.publicId] }
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy, data) => createVerifyResult(deps, count, result, spy, data), errorCallback, deps, updatedDeps);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { id, urlQuery } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                return (0, use_apis_1.useGetImportInfo)({
                    id,
                    urlQuery,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy, appProps) {
            const { id, urlQuery } = deps;
            const expectedCount = count + ajaxCallCountOffset;
            (0, expect_1.expect)(result).to.be.not.null;
            // ServerFilterQuery
            const { filterOptions, packageGroups } = appProps;
            const query = (0, filter_helpers_1.getServerFilterQueryFromBrowserUrlQuery)(urlQuery, packageGroups, filterOptions);
            // Form url + verify
            const params = {
                dbId: id,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const url = `${"api/importInfo" /* API.GET_IMPORT_INFO */}?${QueryString.stringify(params)}`;
            return verifyResultForApi(expectedCount, [url], spy);
        }
    });
    describe('useGetPackages', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            (0, hook_tests_1.doCommonTests)(() => setup(), data => createHook(data), result => {
                (0, expect_1.expect)(result).to.be.not.null;
            }, errorCallback);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            await (0, util_1.setupEnzymeTest)({ data: data1 });
            return { data: new apis_1.APIs(), spy: ajaxGetSpy };
        }
        function createHook(apis) {
            return () => {
                return (0, use_apis_1.useGetPackages)({
                    apis,
                    errorCallback
                }).result;
            };
        }
    });
    describe('useGetPackageGroups', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            (0, hook_tests_1.doCommonTests)(() => setup(), data => createHook(data), result => {
                (0, expect_1.expect)(result).to.be.not.null;
            }, errorCallback);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            await (0, util_1.setupEnzymeTest)({ data: data1 });
            return { data: new apis_1.APIs(), spy: ajaxGetSpy };
        }
        function createHook(apis) {
            return () => {
                return (0, use_apis_1.useGetPackageGroups)({
                    apis,
                    errorCallback
                }).result;
            };
        }
    });
    describe('useGetFilterOptions', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            (0, hook_tests_1.doCommonTests)(() => setup(), data => createHook(data), result => {
                (0, expect_1.expect)(result).to.be.not.null;
            }, errorCallback);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            await (0, util_1.setupEnzymeTest)({ data: data1 });
            return { data: new apis_1.APIs(), spy: ajaxGetSpy };
        }
        function createHook(apis) {
            return () => {
                return (0, use_apis_1.useGetFilterOptions)({
                    apis,
                    errorCallback
                }).result;
            };
        }
    });
    describe('useGetNodeDbId', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            const node = packageNode2;
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({
                nodePublicId: packageNode2.nodePublicId,
                packageGroupPublicUid: node.packageGroupPublicUid,
                packagePublicId: package2.packagePublicId
            }, appProps), result => {
                (0, expect_1.expect)(result).to.deep.equal(node.nodeDbId);
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        it('Should handle dependencies changing', async function () {
            // Need to change both dependencies at once so use a custom version here
            const node1 = packageNode2;
            const node2 = folderNode6;
            const deps = {
                nodePublicId: node1.nodePublicId,
                packageGroupPublicUid: node1.packageGroupPublicUid,
                packagePublicId: package2.packagePublicId
            };
            const updatedDeps = {
                nodePublicId: node2.nodePublicId,
                packageGroupPublicUid: node2.packageGroupPublicUid,
                packagePublicId: null
            };
            // Setup
            const { data: appProps, spy } = await setup();
            const hook = createHook(deps, appProps);
            const { wrapper } = (0, util_2.getDataFromHook)(hook);
            // Wait & verify first result
            {
                const result = await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
                const url = getUrl(deps);
                const expectedCount = 1 + ajaxCallCountOffset;
                (0, expect_1.expect)(result).to.deep.equal(node1.nodeDbId);
                await verifyResultForApi(expectedCount, [url], spy);
            }
            // Update, wait, & verify
            {
                (0, util_3.setValueForPair)(deps, updatedDeps, 'nodePublicId', val => val);
                (0, util_3.setValueForPair)(deps, updatedDeps, 'packageGroupPublicUid', val => val);
                (0, util_3.setValueForPair)(deps, updatedDeps, 'packagePublicId', val => val);
                wrapper.setProps({ hook });
                const url = getUrl(deps);
                const expectedCount = 2 + ajaxCallCountOffset;
                const result = await (0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val, errorCallback));
                (0, expect_1.expect)(result).to.deep.equal(node2.nodeDbId);
                await verifyResultForApi(expectedCount, [url], spy);
            }
        });
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { nodePublicId, packageGroupPublicUid, packagePublicId } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                // Note: packageGroupPublicUid can be validily null
                return (0, use_apis_1.useGetNodeDbId)({
                    nodePublicId,
                    packageGroupPublicUid,
                    packagePublicId,
                    apis: appProps.apis,
                    isLatest: false,
                    errorCallback
                }).result;
            };
        }
        function getUrl(deps) {
            const { nodePublicId, packageGroupPublicUid } = deps;
            let url = null;
            if (packageGroupPublicUid) {
                const params = {
                    nodePublicId,
                    packageGroupPublicUid,
                    packagePublicId: null,
                    toDbIdType: "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */
                };
                url = `${"api/nodePublicIdToDbId" /* API.GET_NODE_PUBLIC_ID_TO_DB_ID */}?${QueryString.stringify(params)}`;
            }
            else {
                const params = {
                    nodePublicId,
                    toDbIdType: "ToDbIdNoGroup" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_NO_GROUP */
                };
                url = `${"api/nodePublicIdToDbId" /* API.GET_NODE_PUBLIC_ID_TO_DB_ID */}?${QueryString.stringify(params)}`;
            }
            return url;
        }
    });
    describe('useGetRex3LinkToDbId', function () {
        // Spies
        let ajaxGetSpy;
        afterEach(function () {
            (0, util_1.cleanupEnzymeTest)();
            ajaxGetSpy.restore();
            errorCallback.current.resetHistory();
        });
        {
            const link = packageNode2Link;
            const dbId = packageNode2.nodeDbId;
            (0, hook_tests_1.doCommonTests)(() => setup(), appProps => createHook({ link }, appProps), result => {
                (0, expect_1.expect)(result).to.deep.equal(dbId);
            }, errorCallback, 1 + ajaxCallCountOffset);
        }
        {
            const deps = {
                link: packageNode2Link
            };
            const updatedDeps = {
                link: packageNode61Link
            };
            (0, hook_tests_1.doDependencyTest)(() => setup(), appProps => createHook(deps, appProps), (count, result, spy) => createVerifyResult(deps, count, result, spy), errorCallback, deps, updatedDeps);
        }
        // Helpers
        async function setup() {
            ajaxGetSpy = sinon.spy(ajax_1.ajax, 'get');
            const { appProps } = await setupCommon(data1);
            return { data: appProps, spy: ajaxGetSpy };
        }
        function createHook(deps, appProps) {
            return () => {
                const { link } = deps;
                // Throw error if any deps are null (currently none can be for this api)
                return (0, use_apis_1.useGetRex3LinkToDbId)({
                    link,
                    apis: appProps.apis,
                    errorCallback
                }).result;
            };
        }
        function createVerifyResult(deps, count, result, spy) {
            const { link } = deps;
            const expectedCount = count + ajaxCallCountOffset;
            const params = {
                linkField: link
            };
            const url = `${"api/rex3LinkToDbId" /* API.GET_REX3_LINK_TO_DB_ID */}?${QueryString.stringify(params)}`;
            (0, expect_1.expect)(result).to.be.not.null;
            return verifyResultForApi(expectedCount, [url], spy);
        }
    });
});
// Helpers
async function verifyResultForApi(expectedCallCount, expectedArgs, spy) {
    (0, expect_1.expect)(spy.callCount).to.equal(expectedCallCount);
    const args = _.flatten(spy.args).slice(expectedCallCount - expectedArgs.length, expectedCallCount);
    (0, expect_1.expect)(expectedArgs.sort()).to.deep.equal(args.sort());
}
async function setupCommon(data) {
    await (0, util_1.setupEnzymeTest)({ data });
    const appProps = await (0, create_app_props_1.createAppProps)({
        page: page_1.Page.EXPLORE,
        urlQuery: {}
    });
    return { appProps };
}
