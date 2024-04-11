'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.E2E) {
    // @ts-ignore
    return;
}
const protractor_1 = require("protractor");
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const browser_emulator_1 = require("../browser-emulator");
const browser_scripts_1 = require("../browser-scripts");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const node_context_menu_1 = require("../page-objects/node-context-menu");
const response_data_1 = require("../../../shared/routes/response-data");
const license_1 = require("../page-objects/license");
const expect_1 = require("../../expect");
const import_1 = require("../page-objects/import");
const mock_rex_cloud_agent_module_1 = require("../../../frontend/mock-agent/mock-rex-cloud-agent-module");
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
packageNode2, packageNode4, packageNode52, packageNode61, 
// PackageGroups
packageGroup2, packageGroup4, packageGroup52, packageGroup61, 
// Packages
package2, package4, package52: _package52, package61, 
// Devices
device1, device2 } = Data;
const package52 = {
    ..._package52,
    licenses: ['http://google.ca/']
};
// Project folders
const folderNode1 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '01',
    nodePublicId: 'public01',
    name: 'Folder 01',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: []
    },
    packagePublicUid: package2.packagePublicUid,
    packageGroupPublicUid: packageGroup2.packageGroupPublicUid
};
const folderNode2 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '02',
    nodePublicId: 'public02',
    name: 'Folder 02',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [device1.publicId]
    },
    packagePublicUid: package2.packagePublicUid,
    packageGroupPublicUid: packageGroup2.packageGroupPublicUid
};
const folderNode3 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '03',
    nodePublicId: 'public03',
    name: 'Folder 03',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: [device1.publicId, device2.publicId]
    },
    packagePublicUid: package2.packagePublicUid,
    packageGroupPublicUid: packageGroup2.packageGroupPublicUid
};
const folderNode4 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '04',
    nodePublicId: 'public04',
    name: 'Folder 04',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: []
    },
    packagePublicUid: package52.packagePublicUid,
    packageGroupPublicUid: packageGroup52.packageGroupPublicUid
};
const folderNode5 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '05',
    nodePublicId: 'public05',
    name: 'Folder 05',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: []
    },
    packagePublicUid: package61.packagePublicUid,
    packageGroupPublicUid: packageGroup61.packageGroupPublicUid
};
const folderNode6 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '06',
    nodePublicId: 'public06',
    name: 'Folder 06',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: []
    },
    packagePublicUid: package61.packagePublicUid,
    packageGroupPublicUid: packageGroup61.packageGroupPublicUid
};
const folderNode7 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '07',
    nodePublicId: 'public07',
    name: 'Folder 07',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: []
    },
    packagePublicUid: package4.packagePublicUid,
    packageGroupPublicUid: packageGroup4.packageGroupPublicUid
};
const folderNode8 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '08',
    nodePublicId: 'public08',
    name: 'Folder 08',
    descriptor: {
        isImportable: true
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: [],
        filterDevice: []
    },
    packagePublicUid: package4.packagePublicUid,
    packageGroupPublicUid: packageGroup4.packageGroupPublicUid
};
//
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package4, package52, package61],
        packageGroups: [packageGroup2, packageGroup4, packageGroup52, packageGroup61]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode52, packageNode4, packageNode61].map(item => item.nodeDbId),
        [packageNode2.nodeDbId]: [folderNode1, folderNode2, folderNode3].map(item => item.nodeDbId),
        [packageNode52.nodeDbId]: [folderNode4.nodeDbId],
        [packageNode61.nodeDbId]: [folderNode5.nodeDbId, folderNode6.nodeDbId],
        [packageNode4.nodeDbId]: [folderNode7.nodeDbId, folderNode8.nodeDbId]
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode4.nodeDbId]: packageNode4,
        [packageNode52.nodeDbId]: packageNode52,
        [packageNode61.nodeDbId]: packageNode61,
        [folderNode1.nodeDbId]: folderNode1,
        [folderNode2.nodeDbId]: folderNode2,
        [folderNode3.nodeDbId]: folderNode3,
        [folderNode4.nodeDbId]: folderNode4,
        [folderNode5.nodeDbId]: folderNode5,
        [folderNode6.nodeDbId]: folderNode6,
        [folderNode7.nodeDbId]: folderNode7,
        [folderNode8.nodeDbId]: folderNode8
    }
};
const displayTestOptions = {
    installInfo: ['/home/auser'],
    localPackages: [
        { pkg: package2, path: '/home/auser/foo' },
        { pkg: package52, path: '/home/auser/foo' }
    ].map(({ pkg, path }) => Data.createInstalledPackageData(pkg, path))
};
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] Import - REX-2607#1', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    beforeEach(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    afterEach(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    if (protractor_1.browser.name !== 'firefox') {
        // Note: gecko driver is not returning all window handles (tabs open)
        // So we can't run these tests (tests get stuck on open tab)
        describe('ImportCloud', function () {
            describe('Import', function () {
                beforeEach(async function () {
                    await beforeEachHelper();
                });
                afterEach(async function () {
                    const testName = this.currentTest
                        ? this.currentTest.fullTitle()
                        : 'Unknown Test';
                    await (0, util_1.logBrowserConsole)(testName);
                });
                // < 2 target ids, import should close on it's own (all promises resolved)
                // > 1 target id, dialog should open
                it('Should do a basic import successfully (no target id)', async function () {
                    await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                        await node_context_menu_1.NodeContextMenu.openImport(folderNode1, apis);
                    });
                    await verifyAndCleanupCloudImport();
                });
                it('Should do a basic import successfully (single target id)', async function () {
                    await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                        await node_context_menu_1.NodeContextMenu.openImport(folderNode2, apis);
                    });
                    await verifyAndCleanupCloudImport();
                });
                it('Should handle multple target ids', async function () {
                    await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                        await node_context_menu_1.NodeContextMenu.openImport(folderNode3, apis);
                        await import_1.Import.verifySelectTargetDialog();
                        await import_1.Import.selectTargetRadio(device2.publicId);
                        await import_1.Import.apply();
                    });
                    await verifyAndCleanupCloudImport();
                });
                it('Should not import if we have multiple target ids and click cancel', async function () {
                    await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                        await node_context_menu_1.NodeContextMenu.openImport(folderNode3, apis);
                        await import_1.Import.verifySelectTargetDialog();
                        await import_1.Import.selectTargetRadio(device2.publicId);
                        await import_1.Import.cancel();
                    });
                    await verifyNoCloudImport();
                });
                it.skip('Should display a message if pop-ups are disabled', async function () { });
            });
            describe('Licenses', function () {
                beforeEach(async function () {
                    await beforeEachHelper();
                });
                afterEach(async function () {
                    const testName = this.currentTest
                        ? this.currentTest.fullTitle()
                        : 'Unknown Test';
                    await (0, util_1.logBrowserConsole)(testName);
                });
                it('Should display a license if the package has a license', async function () {
                    await node_context_menu_1.NodeContextMenu.openImport(folderNode4, apis);
                    await license_1.License.verifyLicense();
                });
                it('Should import if the user agrees', async function () {
                    await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                        await node_context_menu_1.NodeContextMenu.openImport(folderNode4, apis);
                        await license_1.License.verifyLicense();
                        await license_1.License.accept();
                    });
                    await verifyAndCleanupCloudImport();
                });
                it('Should not proceed if the user disagrees', async function () {
                    await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                        await node_context_menu_1.NodeContextMenu.openImport(folderNode4, apis);
                        await license_1.License.verifyLicense();
                        await license_1.License.decline();
                    });
                    await verifyNoCloudImport();
                });
            });
            async function beforeEachHelper() {
                await (0, util_1.lightSetupProtractorTest)({
                    apis
                });
            }
            async function verifyAndCleanupCloudImport() {
                const handles = await protractor_1.browser.getAllWindowHandles();
                try {
                    (0, expect_1.expect)(handles.length).to.equal(2);
                    await protractor_1.browser.switchTo().window(handles[1]);
                    // TODO should verify url
                    await protractor_1.browser.close();
                }
                finally {
                    await protractor_1.browser.switchTo().window(handles[0]);
                }
            }
            async function verifyNoCloudImport() {
                const handles = await protractor_1.browser.getAllWindowHandles();
                await protractor_1.browser.switchTo().window(handles[0]);
                (0, expect_1.expect)(handles.length).to.equal(1);
            }
        });
    }
    describe('ImportDesktop', function () {
        describe('Import', function () {
            beforeEach(async function () {
                await beforeEachHelper();
            });
            afterEach(async function () {
                const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
                await (0, util_1.logBrowserConsole)(testName);
                await afterEachHelper();
            });
            // < 2 target ids, import should close on it's own (all promises resolved)
            // > 1 target id, dialog should open
            it('Should do a basic import successfully (no target id)', async function () {
                await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                    await node_context_menu_1.NodeContextMenu.openImport(folderNode1, apis);
                });
                await verifyCall(folderNode1, null);
            });
            it('Should do a basic import successfully (single target id)', async function () {
                await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                    await node_context_menu_1.NodeContextMenu.openImport(folderNode2, apis);
                });
                await verifyCall(folderNode2, device1.publicId);
            });
            it('Should handle multple target ids', async function () {
                await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                    await node_context_menu_1.NodeContextMenu.openImport(folderNode3, apis);
                    await import_1.Import.verifySelectTargetDialog();
                    await import_1.Import.selectTargetRadio(device2.publicId);
                    await import_1.Import.apply();
                });
                await verifyCall(folderNode3, device2.publicId);
            });
        });
        describe('Package not installed', function () {
            beforeEach(async function () {
                await beforeEachHelper();
            });
            afterEach(async function () {
                const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
                await (0, util_1.logBrowserConsole)(testName);
                await afterEachHelper();
            });
            it('Should handle the package not installed', async function () {
                await node_context_menu_1.NodeContextMenu.openImport(folderNode5, apis);
                await import_1.Import.verifyPackageMissingDialog();
            });
            it('Should prompt for an import after installing the package', async function () {
                await node_context_menu_1.NodeContextMenu.openImport(folderNode5, apis);
                await import_1.Import.verifyPackageMissingDialog();
                await import_1.Import.install();
                // Could get the progressId, then pool on that, this is just simpler
                await protractor_1.browser.sleep(mock_rex_cloud_agent_module_1.MockRexCloudAgentModule.DELAY * 2);
                await import_1.Import.verifyImportConfirmationDialog();
            });
            it('Should make the import call once done installing', async function () {
                await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                    await node_context_menu_1.NodeContextMenu.openImport(folderNode5, apis);
                    await import_1.Import.verifyPackageMissingDialog();
                    await import_1.Import.install();
                    // Could get the progressId, then poll on that, this is just simpler
                    await protractor_1.browser.sleep(mock_rex_cloud_agent_module_1.MockRexCloudAgentModule.DELAY * 2);
                    await import_1.Import.verifyImportConfirmationDialog();
                    await import_1.Import.clickImport();
                });
                await verifyCall(folderNode5, null);
            });
            it('Should not make an import call if we cancel install', async function () {
                await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                    await node_context_menu_1.NodeContextMenu.openImport(folderNode5, apis);
                    await import_1.Import.verifyPackageMissingDialog();
                    await import_1.Import.cancelInstall();
                    // Delay, just in case install got triggered (so we catch it in this test)
                    await protractor_1.browser.sleep(mock_rex_cloud_agent_module_1.MockRexCloudAgentModule.DELAY * 2);
                });
                await verifyNotCalled();
            });
            it('Should not make an import call if we cancel at import confirmation', async function () {
                await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                    await node_context_menu_1.NodeContextMenu.openImport(folderNode5, apis);
                    await import_1.Import.verifyPackageMissingDialog();
                    await import_1.Import.install();
                    // Could get the progressId, then poll on that, this is just simpler
                    await protractor_1.browser.sleep(mock_rex_cloud_agent_module_1.MockRexCloudAgentModule.DELAY * 2);
                    await import_1.Import.verifyImportConfirmationDialog();
                    await import_1.Import.cancelImport();
                });
                await verifyNotCalled();
            });
        });
        async function verifyCall(node, targetIdExpected, idx = 0, numCalls = 1) {
            const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
            const args = spies.importProject.args;
            (0, expect_1.expect)(args.length).to.equal(numCalls);
            const params = args[idx];
            (0, expect_1.expect)(params.length).to.equal(4);
            // Server harness generates importInfo for us based on the info in node
            const [resourceType, packageUid, location, targetId] = params;
            (0, expect_1.expect)(resourceType).to.deep.equal('project.ccs');
            (0, expect_1.expect)(packageUid).to.deep.equal(node.packagePublicUid);
            (0, expect_1.expect)(location).to.deep.equal(`${node.nodeDbId}/some/path`);
            (0, expect_1.expect)(targetId).to.deep.equal(targetIdExpected);
        }
        async function verifyNotCalled() {
            const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
            const args = spies.importProject.args;
            (0, expect_1.expect)(args.length).to.equal(0);
        }
        async function beforeEachHelper() {
            await (0, util_1.lightSetupProtractorTest)({
                apis,
                additionalSetup: () => (0, browser_scripts_1.installCloudAgent)(displayTestOptions)
            });
        }
        async function afterEachHelper() {
            await (0, browser_scripts_1.uninstallCloudAgent)();
        }
    });
});
