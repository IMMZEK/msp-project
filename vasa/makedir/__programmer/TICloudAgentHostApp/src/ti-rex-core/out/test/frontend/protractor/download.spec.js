'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const protractor_1 = require("protractor");
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.E2E || protractor_1.browser.name === 'firefox') {
    // Note: gecko driver is not returning all window handles (tabs open)
    // So we can't run these tests (tests get stuck on open tab)
    // @ts-ignore
    return;
}
// 3rd party
const os = require("os");
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const browser_emulator_1 = require("../browser-emulator");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const node_context_menu_1 = require("../page-objects/node-context-menu");
const response_data_1 = require("../../../shared/routes/response-data");
const license_1 = require("../page-objects/license");
const expect_1 = require("../../expect");
const util_2 = require("../page-objects/util");
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
// Package Nodes
packageNode52: _packageNode52, packageNode61: _packageNode61, 
// PackageGroups
packageGroup52, packageGroup61, 
// Packages
package2, package52: _package52, package61: _package61 } = Data;
const packageNode61 = {
    ..._packageNode61,
    descriptor: {
        ..._packageNode61.descriptor,
        isDownloadable: true
    },
    downloadUrl: {
        [response_data_1.Platform.LINUX]: `${test_helpers_1.testingGlobals.remoteserverUrl}/content/liveAction/Documentation_Overview.html`,
        [response_data_1.Platform.WINDOWS]: `${test_helpers_1.testingGlobals.remoteserverUrl}/content/liveAction/Documentation_Overview.html`,
        [response_data_1.Platform.MACOS]: `${test_helpers_1.testingGlobals.remoteserverUrl}/content/liveAction/Documentation_Overview.html`
    }
};
const package61 = Data.getPackageData(packageNode61, {
    packagePublicId: _package61.packagePublicId,
    packageVersion: _package61.packageVersion
});
// Package52 data
const packageNode52 = {
    ..._packageNode52,
    descriptor: {
        ..._packageNode52.descriptor,
        isDownloadable: true
    },
    downloadUrl: {
        [response_data_1.Platform.LINUX]: `${test_helpers_1.testingGlobals.remoteserverUrl}/content/liveAction/Documentation_Overview.html`,
        [response_data_1.Platform.WINDOWS]: `${test_helpers_1.testingGlobals.remoteserverUrl}/content/liveAction/Documentation_Overview.html`,
        [response_data_1.Platform.MACOS]: `${test_helpers_1.testingGlobals.remoteserverUrl}/content/liveAction/Documentation_Overview.html`
    }
};
const package52 = {
    ...Data.getPackageData(packageNode52, {
        packagePublicId: _package52.packagePublicId,
        packageVersion: _package52.packageVersion
    }),
    licenses: ['http://google.ca/']
};
// Package81 data
const packageNode81 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '81',
    nodePublicId: 'public81',
    name: 'Folder 8',
    descriptor: {
        isDownloadable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: ['pgrp_fizz81']
    },
    packagePublicUid: 'fizz81',
    packageGroupPublicUid: 'pgrp_fizz81',
    dependencies: [
        {
            packagePublicId: package2.packagePublicId,
            versionRange: package2.packageVersion,
            dependencyType: "mandatory" /* PackageDependencyType.MANDATORY */
        }
    ],
    downloadUrl: {
        [response_data_1.Platform.LINUX]: `${test_helpers_1.testingGlobals.remoteserverUrl}/content/liveAction/Documentation_Overview.html`
    }
};
const packageGroup81 = Data.getPackageGroupData(packageNode81, {
    packageGroupVersion: '0.0.1',
    packageGroupPublicId: 'packageGroup8'
});
const package81 = Data.getPackageData(packageNode81, {
    packageVersion: '1.7.1',
    packagePublicId: '8'
});
//
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package52, package61, package81],
        packageGroups: [packageGroup52, packageGroup61, packageGroup81]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode52, packageNode61, packageNode81].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode52.nodeDbId]: packageNode52,
        [packageNode61.nodeDbId]: packageNode61,
        [packageNode81.nodeDbId]: packageNode81
    }
};
///////////////////////////////////////////////////////////////////////////
describe('[frontend] Download', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    beforeEach(async function () {
        await setup();
    });
    afterEach(async function () {
        const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
        await (0, util_1.logBrowserConsole)(testName);
    });
    it('Should download a package successfully', async function () {
        await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
            await node_context_menu_1.NodeContextMenu.openDownload(packageNode61, apis);
        });
        await verifyAndCleanupExternalDownload();
    });
    it('Should display a license for the item to download', async function () {
        await node_context_menu_1.NodeContextMenu.openDownload(packageNode52, apis);
        await license_1.License.verifyLicense();
    });
    it('Should proceed if user agrees to license', async function () {
        await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
            await node_context_menu_1.NodeContextMenu.openDownload(packageNode52, apis);
            await license_1.License.verifyLicense();
            await license_1.License.accept();
        });
        await verifyAndCleanupExternalDownload();
    });
    it('Should not proceed if user dis-agrees to license', async function () {
        await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
            await node_context_menu_1.NodeContextMenu.openDownload(packageNode52, apis);
            await license_1.License.verifyLicense();
            await license_1.License.decline();
        });
        await verifyNoExternalDownload();
    });
    it.skip('Should display a message if pop-ups are disabled', async function () { });
    if (os.platform() !== 'linux') {
        it('Should not allow to download unsupported packages', async function () {
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await node_context_menu_1.NodeContextMenu.openDownload(packageNode81, apis);
            });
            await verifyNoExternalDownload();
        });
    }
    async function setup() {
        await (0, util_1.lightSetupProtractorTest)({
            apis
        });
    }
    async function verifyAndCleanupExternalDownload() {
        const handles = await protractor_1.browser.getAllWindowHandles();
        try {
            (0, expect_1.expect)(handles.length).to.equal(2);
            await protractor_1.browser.switchTo().window(handles[1]);
            await protractor_1.browser.close();
        }
        finally {
            await protractor_1.browser.switchTo().window(handles[0]);
        }
    }
    async function verifyNoExternalDownload() {
        const handles = await protractor_1.browser.getAllWindowHandles();
        await protractor_1.browser.switchTo().window(handles[0]);
        (0, expect_1.expect)(handles.length).to.equal(1);
    }
});
