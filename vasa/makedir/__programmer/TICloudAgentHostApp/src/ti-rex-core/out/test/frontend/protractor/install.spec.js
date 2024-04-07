'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.E2E) {
    // @ts-ignore
    return;
}
// 3rd party
const os = require("os");
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const browser_emulator_1 = require("../browser-emulator");
const browser_scripts_1 = require("../browser-scripts");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const util_1 = require("../util");
const node_context_menu_1 = require("../page-objects/node-context-menu");
const install_1 = require("../page-objects/install");
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
packageNode2, packageNode51, packageNode52, packageNode61, 
// PackageGroups
packageGroup2, packageGroup51, packageGroup52, packageGroup61, 
// Packages
package2, package51: _package51, package52: _package52, package61 } = Data;
const packageNode81 = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '81',
    nodePublicId: 'public81',
    name: 'Folder 8',
    descriptor: {},
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
        [response_data_1.Platform.LINUX]: 'some/url81'
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
const package511 = {
    ..._package51,
    dependencies: [
        {
            packagePublicId: package2.packagePublicId,
            versionRange: package2.packageVersion,
            dependencyType: "mandatory" /* PackageDependencyType.MANDATORY */
        }
    ]
};
const package512 = {
    ..._package52,
    dependencies: [
        {
            packagePublicId: package2.packagePublicId,
            versionRange: package2.packageVersion,
            dependencyType: "mandatory" /* PackageDependencyType.MANDATORY */
        },
        {
            packagePublicId: package2.packagePublicId,
            versionRange: '20.0.0',
            dependencyType: "mandatory" /* PackageDependencyType.MANDATORY */
        },
        {
            packagePublicId: package81.packagePublicId,
            versionRange: package81.packageVersion,
            dependencyType: "mandatory" /* PackageDependencyType.MANDATORY */
        },
        {
            packagePublicId: package61.packagePublicId,
            versionRange: package61.packageVersion,
            dependencyType: "optional" /* PackageDependencyType.OPTIONAL */
        }
    ],
    licenses: ['http://google.ca/']
};
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [package2, package511, package512, package61, package81],
        packageGroups: [
            packageGroup2,
            packageGroup51,
            packageGroup52,
            packageGroup61,
            packageGroup81
        ]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [packageNode2, packageNode51, packageNode52, packageNode61, packageNode81].map(item => item.nodeDbId)
    },
    nodeData: {
        [packageNode2.nodeDbId]: packageNode2,
        [packageNode51.nodeDbId]: packageNode51,
        [packageNode52.nodeDbId]: packageNode52,
        [packageNode61.nodeDbId]: packageNode61,
        [packageNode81.nodeDbId]: packageNode81
    }
};
const displayTestOptions = {
    installInfo: ['/home/auser'],
    localPackages: [{ pkg: package2, path: '/home/auser/foo' }].map(({ pkg, path }) => Data.createInstalledPackageData(pkg, path))
};
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] Install - REX-1465#1, REX-2604#1, REX-2750#1', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    const unsupported = { [packageNode81.packagePublicUid]: os.platform() !== 'linux' };
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    describe('Confirm install - REX-1422#1, REX-2603#1, REX-2889#1', function () {
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
            await (0, browser_scripts_1.uninstallCloudAgent)();
        });
        it('Should display the correct info for a package with multiple dependencies', async function () {
            // Data
            const installNode = packageNode52;
            const installPkg = package512;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            const packages = await apis.getPackages();
            // Verify
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            await install_1.Install.verifyPackageRows(installPkg, options, packages, unsupported);
        });
        it('Should display the install paths correctly', async function () {
            // Data
            const installNode = packageNode51;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            // Verify
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            await install_1.Install.verifyInstallPaths(options);
        });
    });
    describe('Licenses', function () {
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
            await (0, browser_scripts_1.uninstallCloudAgent)();
        });
        it('Should display a license for a selected package', async function () {
            // Data
            const installNode = packageNode52;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            // Verify
            await install_1.Install.verifyInstallDialogOpen();
            await install_1.Install.next();
            await license_1.License.verifyLicense();
        });
        it('Should only display licenses for packages which are selected', async function () {
            const installNode = packageNode52;
            const installPackage = package512;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            await install_1.Install.togglePackageCheckbox(installPackage.packagePublicId, installPackage.packageVersion);
            // Verify
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await install_1.Install.next();
                await license_1.License.verifyNoLicense();
            });
        });
        it('Should proceed if user agrees', async function () {
            // Data
            const installNode = packageNode52;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            // Verify
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await install_1.Install.next();
                await license_1.License.verifyLicense();
                await license_1.License.accept();
                await install_1.Install.verifyInstallConfirmation();
            });
            // Verify call
            const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
            (0, expect_1.expect)(spies.installPackage.callCount).to.be.greaterThan(0);
        });
        it('Should not proceed if user disagrees', async function () {
            // Data
            const installNode = packageNode52;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            // Verify
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await install_1.Install.next();
                await license_1.License.decline();
                await install_1.Install.verifyNoInstallConfirmation();
            });
            // Verify call
            const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
            (0, expect_1.expect)(spies.installPackage.callCount).to.equal(0);
        });
    });
    describe('Install request', function () {
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
            await (0, browser_scripts_1.uninstallCloudAgent)();
        });
        it('Should request to install selected packages', async function () {
            // Data
            const installNode = packageNode61;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            // Verify
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await install_1.Install.next();
                await install_1.Install.verifyInstallConfirmation();
                await verifyCall([installNode.packagePublicUid]);
            });
        });
        it.skip('Should handle a different install location', async function () { });
        it('Should handle no packages selected', async function () {
            // Data
            const installNode = packageNode61;
            const installPackage = package61;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            await install_1.Install.togglePackageCheckbox(installPackage.packagePublicId, installPackage.packageVersion);
            // Verify
            await install_1.Install.verifyNoNext();
        });
        it('Should not request to install unselected packages', async function () {
            // Data
            const installNode = packageNode52;
            const installPackage = package512;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            await install_1.Install.togglePackageCheckbox(installPackage.packagePublicId, installPackage.packageVersion);
            // Verify
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await install_1.Install.next();
                await install_1.Install.verifyInstallConfirmation();
            });
            const expectedPackages = [packageNode61.packagePublicUid];
            if (os.platform() === 'linux') {
                expectedPackages.push(packageNode81.packagePublicUid);
            }
            await verifyCall(expectedPackages);
        });
        it('Should not allow to install already installed packages', async function () {
            // Data
            const installNode = packageNode52;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            // Verify
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await install_1.Install.next();
                await license_1.License.accept();
                await install_1.Install.verifyInstallConfirmation();
            });
            await verifyNotCalled(packageNode2.packagePublicUid);
        });
        it('Should not allow to install unavailable packages', async function () {
            // Data
            const installNode = packageNode52;
            const options = displayTestOptions;
            // Setup
            await setup(options);
            await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
            await install_1.Install.verifyInstallDialogOpen();
            // Verify
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await install_1.Install.next();
                await license_1.License.accept();
                await install_1.Install.verifyInstallConfirmation();
            });
            const expectedPakages = [
                packageNode52.packagePublicUid,
                packageNode61.packagePublicUid
            ];
            if (os.platform() === 'linux') {
                expectedPakages.push(packageNode81.packagePublicUid);
            }
            await verifyCall(expectedPakages);
        });
        if (os.platform() !== 'linux') {
            it('Should not allow to install unsupported packages', async function () {
                // Data
                const installNode = packageNode81;
                const installPackage = package81;
                const options = displayTestOptions;
                // Setup
                await setup(options);
                await node_context_menu_1.NodeContextMenu.openInstall(installNode, apis);
                await install_1.Install.verifyInstallDialogOpen();
                await install_1.Install.togglePackageCheckbox(installPackage.packagePublicId, installPackage.packageVersion);
                // Verify
                await install_1.Install.verifyNoNext();
            });
        }
        async function verifyCall(expectedPackagePublicUids, expectedInstallLocation) {
            const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
            const args = spies.installPackage.args;
            (0, expect_1.expect)(args.length).to.equal(expectedPackagePublicUids.length);
            const packagePublicUids = args.map(item => {
                (0, expect_1.expect)(item.length).to.equal(2);
                if (expectedInstallLocation) {
                    (0, expect_1.expect)(item[1]).to.deep.equal(expectedInstallLocation);
                }
                return item[0].packagePublicUid;
            });
            (0, expect_1.expect)(packagePublicUids.sort()).to.deep.equal(expectedPackagePublicUids.sort());
        }
        async function verifyNotCalled(packagePublicUid) {
            const spies = await (0, browser_scripts_1.getRexCloudAgentModuleSpies)();
            const args = spies.installPackage.args;
            const installCall = !!args.find(item => {
                (0, expect_1.expect)(item.length).to.equal(2);
                return item[0].packagePublicUid === packagePublicUid;
            });
            (0, expect_1.expect)(installCall).to.be.false;
        }
    });
    async function setup(options) {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            urlQuery: {
                a: [`${packageGroup51.packageGroupPublicId}__${packageGroup51.packageGroupVersion}`]
            },
            additionalSetup: () => (0, browser_scripts_1.installCloudAgent)(options)
        });
    }
});
