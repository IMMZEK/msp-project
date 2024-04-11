'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.folderNodeTableItem1 = void 0;
// determine if we want to run this test
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.E2E) {
    // @ts-ignore
    return;
}
// 3rd party
const QueryString = require("query-string");
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const browser_emulator_1 = require("../browser-emulator");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const util_2 = require("../page-objects/util");
const page_1 = require("../../../shared/routes/page");
const table_view_1 = require("../page-objects/table-view");
const response_data_1 = require("../../../shared/routes/response-data");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData, 
// Folder nodes
folderNode2, folderNode3, folderNode4, folderNode5, 
// Packages
package2, 
// PackageGroups
packageGroup2, 
// Variants
variant3, 
// TableItems
tableItem1, tableItem2: _tableItem2, tableItem3: _tableItem3, tableItem4: _tableItem4, tableItem5: _tableItem5, 
// Devices
device1, device2, 
// Kernels
kernel1, kernel2, 
// Compilers
compiler1, compiler2 } = Data;
exports.folderNodeTableItem1 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: tableItem1.tableItemNodeDbId,
    nodePublicId: 'publicFolderNodeTableItem1',
    name: 'Folder for table view',
    descriptor: {},
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: []
    },
    packagePublicUid: null,
    packageGroupPublicUid: null
};
const tableItem2 = {
    ..._tableItem2,
    filterData: {
        ..._tableItem2.filterData,
        filterDevice: [device1.publicId]
    }
};
const tableItem3 = {
    ..._tableItem3,
    filterData: {
        ..._tableItem3.filterData,
        filterDevice: [device2.publicId]
    }
};
const tableItem4 = {
    ..._tableItem4,
    filterData: {
        ..._tableItem4.filterData,
        filterDevice: [device1.publicId]
    }
};
const tableItem5 = {
    ..._tableItem5,
    filterData: {
        ..._tableItem5.filterData,
        filterDevice: [device1.publicId]
    }
};
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.TABLE_ITEM_DATA,
    rootNode,
    softwareNodePublicId: tableItem1.tableItemPublicId,
    hierarchy: {
        [rootNode]: [exports.folderNodeTableItem1.nodeDbId],
        [exports.folderNodeTableItem1.nodeDbId]: [folderNode2.nodeDbId, folderNode3.nodeDbId],
        [folderNode2.nodeDbId]: [folderNode4.nodeDbId],
        [folderNode3.nodeDbId]: [folderNode5.nodeDbId]
    },
    nodeData: {
        [exports.folderNodeTableItem1.nodeDbId]: exports.folderNodeTableItem1,
        [folderNode2.nodeDbId]: folderNode2,
        [folderNode3.nodeDbId]: folderNode3,
        [folderNode4.nodeDbId]: folderNode4,
        [folderNode5.nodeDbId]: folderNode5
    },
    filterData: {
        ...emptyFilterData,
        packages: [package2],
        packageGroups: [packageGroup2],
        kernels: [kernel1, kernel2],
        compilers: [compiler1, compiler2],
        devices: [device1, device2]
    },
    tableItemHierarchy: {
        [tableItem1.tableItemDbId]: [tableItem2.tableItemDbId, tableItem3.tableItemDbId],
        [tableItem2.tableItemDbId]: [tableItem4.tableItemDbId],
        [tableItem3.tableItemDbId]: [tableItem5.tableItemDbId]
    },
    tableItemData: {
        [tableItem1.tableItemDbId]: tableItem1,
        [tableItem2.tableItemDbId]: tableItem2,
        [tableItem3.tableItemDbId]: tableItem3,
        [tableItem4.tableItemDbId]: tableItem4,
        [tableItem5.tableItemDbId]: tableItem5
    }
};
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] TableView', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    // tableItem2 - 1 variant  (variant2)
    //     - filterKernel = kernel 1
    //     - filterDevice = device 1
    // tableItem3 - 2 variants (variant3, variant2)
    //     - filterCompiler = compiler 1
    //     - filterDevice = device 2
    it('Should prompt the user to select a device if one is not selected', async function () {
        await setup({});
        await table_view_1.TableView.verifyChangeFilterDisplay('Select a Board or Device to see example projects.');
    });
    it('Should prompt the user to change their filters if there is no results ', async function () {
        await setup({ urlQuery: { devices: [device1.publicId], kernels: [kernel2.publicId] } });
        await table_view_1.TableView.verifyChangeFilterDisplay('No example projects found. Please change your filter.');
    });
    // Variant tests
    it('Should go to a variant when selecting the node', async function () {
        await setup({ urlQuery: { devices: [device1.publicId] } });
        await table_view_1.TableView.selectTableItemNode(tableItem2.tableItemDbId);
        await table_view_1.TableView.verifyContentDisplay();
        await (0, util_2.verifyUrl)({
            apis,
            urlQuery: { devices: [device1.publicId] },
            node: folderNode2,
            page: page_1.Page.WIZARD
        });
    });
    it.skip('Should go to readme when selecting the readme', async function () { });
    it.skip('Should import upon click', async function () { });
    it('Should prompt to select a variant when clicking to view node if it has multiple variants', async function () {
        await setup({ urlQuery: { devices: [device2.publicId] } });
        await table_view_1.TableView.selectTableItemNode(tableItem3.tableItemDbId);
        await table_view_1.TableView.verifySelectVariantDialog();
        await table_view_1.TableView.selectVariant(variant3);
        await table_view_1.TableView.selectVariantOk();
        await table_view_1.TableView.verifyContentDisplay();
        await (0, util_2.verifyUrl)({
            apis,
            urlQuery: { devices: [device2.publicId] },
            node: folderNode3,
            page: page_1.Page.WIZARD
        });
    });
    it.skip('Should prompt to select a variant upon import if it has multiple variants', async function () { });
    it.skip('Should prompt to select a variant when clicking to view read me if it has multiple variants', async function () { });
    it.skip('Should apply the variant selection to the filters when the option is selected', async function () { });
    // Content
    it.skip('Should not provide a link to view node if it has nothing to display', async function () { });
    it.skip('Should not provide a link to view readme if it has nothing to display', async function () { });
    async function setup({ urlQuery = {} }) {
        const location = `${page_1.Page.WIZARD}/select`;
        const urlQueryFinal = {
            ...urlQuery,
            // Note this node doesn't have a package group
            // If it did we need to call getPublicIdFromIds
            node: exports.folderNodeTableItem1.nodePublicId
        };
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            page: page_1.Page.WIZARD,
            node: exports.folderNodeTableItem1,
            urlQuery: urlQueryFinal,
            customUrl: `${location}?${QueryString.stringify(urlQueryFinal)}`
        });
    }
});
