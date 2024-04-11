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
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const browser_emulator_1 = require("../browser-emulator");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const page_1 = require("../../../shared/routes/page");
const response_data_1 = require("../../../shared/routes/response-data");
const wizard_1 = require("../page-objects/wizard");
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
describe('[frontend] Wizard - REX-3108#1, REX-2897#1', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    afterEach(async function () {
        const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
        await (0, util_1.logBrowserConsole)(testName);
    });
    // tableItem2 - 1 variant  (variant2)
    //     - filterKernel = kernel 1
    //     - filterDevice = device 1
    // tableItem3 - 2 variants (variant3, variant2)
    //     - filterCompiler = compiler 1
    //     - filterDevice = device 2
    it('Should not proceed to the select page until a board is selected', async function () {
        await setup({});
        await wizard_1.Wizard.verifyNextDisabled();
    });
    it.skip('Should be able to successfully import an item', async function () {
        // Select device at start page
        // Verify select page
        // click import (no variant)
        // verify import done
        // verify final page
    });
    it.skip('Should go back to the start of the wizard when "start over" is selected', async function () {
        // Go directly to /wizard/end and click
    });
    it.skip('Should go back to the select page if "import another example" is selected', async function () {
        // Need to do the full thing here (since it uses history.goBack)
    });
    it.skip('Should not use last session', async function () {
        // load a page with last session turned on in /explore
        // visit start page and verify no query loaded
    });
    it.skip('Should not impact last session', async function () {
        // load a page with last session turned on in /explore
        // visit start page, select filter
        // go back to /explore, verify it loads with first filter
    });
    async function setup({ urlQuery = {} }) {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            page: page_1.Page.WIZARD,
            urlQuery
        });
    }
});
