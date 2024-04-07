'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const protractor_1 = require("protractor");
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
const browser_scripts_1 = require("../browser-scripts");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const package_manager_1 = require("../page-objects/package-manager");
const util_1 = require("../util");
const util_2 = require("../page-objects/util");
const util_3 = require("../../../shared/util");
const util_4 = require("../../../frontend/component-helpers/util");
const navbar_1 = require("../page-objects/navbar");
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
packageNode51, packageNode52, packageNode53, packageNode54, packageNode55, packageNode56, packageNode57, packageNode58, packageNode61, packageNode62, packageNode71, packageNode72, 
// PackageGroups
packageGroup51, packageGroup52, packageGroup53, packageGroup54, packageGroup55, packageGroup56, packageGroup57, packageGroup58, packageGroup61, packageGroup62, 
// Packages
package51, package52, package53, package54, package55, package56, package57, package58, package61, package62, package71, package72 } = Data;
const packageNodes = [
    packageNode51,
    packageNode52,
    packageNode53,
    packageNode54,
    packageNode55,
    packageNode56,
    packageNode57,
    packageNode58,
    packageNode61,
    packageNode62,
    packageNode71,
    packageNode72
];
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [
            package51,
            package52,
            package53,
            package54,
            package55,
            package56,
            package57,
            package58,
            package61,
            package62,
            package71,
            package72
        ],
        packageGroups: [
            packageGroup51,
            packageGroup52,
            packageGroup53,
            packageGroup54,
            packageGroup55,
            packageGroup56,
            packageGroup57,
            packageGroup58,
            packageGroup61,
            packageGroup62
        ]
    },
    rootNode,
    hierarchy: {
        [rootNode]: packageNodes.map(item => item.nodeDbId)
    },
    nodeData: (0, util_3.objectFromKeyValuePairs)(packageNodes.map(node => ({ key: node.nodeDbId, value: node })))
};
///////////////////////////////////////////////////////////////////////////////
// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] PackageManager', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    before(async function () {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async function () {
        await (0, util_1.cleanupProtractorTest)();
    });
    describe('Summary view', function () {
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
        });
        it('Should list all packages in the table correctly', async function () {
            await setup();
            const expectedPackages = [package58, package62, package72].map(item => ({
                expectedPkg: item
            }));
            await package_manager_1.PackageManager.verifyPackageSummaryRows(expectedPackages);
        });
    });
    describe('Detailed view', function () {
        const expectedPackages1 = generateExpectedPackagesForDetailedRows([
            { pkg: package58, isLatest: true, isSelected: true },
            { pkg: package58 },
            { pkg: package57 },
            { pkg: package56 },
            { pkg: package55 },
            { pkg: package54 },
            { pkg: package53 },
            { pkg: package52 },
            { pkg: package51 }
        ]);
        const expectedPackages2 = generateExpectedPackagesForDetailedRows([
            { pkg: package62, isLatest: true, isSelected: true },
            { pkg: package72, isLatest: true, hasCheckbox: false },
            { pkg: package62 },
            { pkg: package72, hasCheckbox: false },
            { pkg: package61 },
            { pkg: package71, hasCheckbox: false }
        ]);
        const expectedPackages3 = generateExpectedPackagesForDetailedRows([
            { pkg: package62, isLatest: true },
            { pkg: package72, isLatest: true, hasCheckbox: false },
            { pkg: package62 },
            { pkg: package72, hasCheckbox: false },
            { pkg: package61 },
            { pkg: package71, hasCheckbox: false }
        ]);
        const expectedPackages4 = generateExpectedPackagesForDetailedRows([
            { pkg: package62, isLatest: true, isSelected: true },
            { pkg: package72, isLatest: true, hasCheckbox: false },
            { pkg: package62 },
            { pkg: package72, hasCheckbox: false },
            { pkg: package61, isSelected: true },
            { pkg: package71, hasCheckbox: false }
        ]);
        const expectedPackages5 = generateExpectedPackagesForDetailedRows([
            { pkg: package62, isLatest: true },
            { pkg: package72, isLatest: true, hasCheckbox: false },
            { pkg: package62, isSelected: true },
            { pkg: package72, hasCheckbox: false },
            { pkg: package61 },
            { pkg: package71, hasCheckbox: false }
        ]);
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
        });
        it('Should list all versions of a package group in the table correctly', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package58.packagePublicId);
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages1);
        });
        it('Should handle groups with multiple packages (i.e different packageIds, multiple versions of each)', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages2);
        });
        it('Should handle a non-default initial selection', async function () {
            await setup({
                a: [`${packageGroup61.packageGroupPublicId}__${packageGroup61.packageGroupVersion}`]
            });
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages4);
        });
        it('Should be able to toggle a checkbox', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode62.packagePublicUid, true);
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages3);
        });
        it('Should not allow selected latest & latest specific version at the same time', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            // Go to specific
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode62.packagePublicUid, false);
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages5);
            // Go back to latest
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode62.packagePublicUid, true);
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages2);
        });
        it('Should have show all checkbox unchecked if not all are selected initially', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.verifySelectAll(false);
        });
        it('Should have show all checkbox selected if all versions are selected initially', async function () {
            await setup({
                a: [`${packageGroup61.packageGroupPublicId}__${packageGroup61.packageGroupVersion}`]
            });
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.verifySelectAll(true);
        });
        it('Should have show all checkbox depending on the updated selection', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            // Initial
            await package_manager_1.PackageManager.verifySelectAll(false);
            // Unselected
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode61.packagePublicUid, false);
            await package_manager_1.PackageManager.verifySelectAll(true);
            // Select again
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode61.packagePublicUid, false);
            await package_manager_1.PackageManager.verifySelectAll(false);
        });
        it('Should be able to select all versions, by toggling show all, if show all is unselected initially', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.toggleAll();
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages4);
        });
        it('Should be able to deselect all versions, by toggling show all, if show all is selected intially', async function () {
            await setup({
                a: [`${packageGroup61.packageGroupPublicId}__${packageGroup61.packageGroupVersion}`]
            });
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.toggleAll();
            await package_manager_1.PackageManager.verifyPackageDetailedRows(expectedPackages3);
        });
    });
    describe('Apply', function () {
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
        });
        it('Should handle adding a version', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode61.packagePublicUid, false);
            await package_manager_1.PackageManager.apply();
            await package_manager_1.PackageManager.verifyApply({
                a: [
                    `${packageGroup61.packageGroupPublicId}__${packageGroup61.packageGroupVersion}`
                ]
            }, apis);
        });
        it('Should handle removing a version', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode62.packagePublicUid, true);
            await package_manager_1.PackageManager.apply();
            await package_manager_1.PackageManager.verifyApply({
                r: [`${packageGroup62.packageGroupPublicId}__${util_4.LATEST}`]
            }, apis);
        });
        it('Should handle changing the selection across different groups', async function () {
            await setup();
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode61.packagePublicUid, false);
            await package_manager_1.PackageManager.openSummaryView();
            await package_manager_1.PackageManager.openDetailedView(package58.packagePublicId);
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode58.packagePublicUid, true);
            await package_manager_1.PackageManager.openSummaryView();
            await package_manager_1.PackageManager.apply();
            await package_manager_1.PackageManager.verifyApply({
                a: [
                    `${packageGroup61.packageGroupPublicId}__${packageGroup61.packageGroupVersion}`
                ],
                r: [`${packageGroup58.packageGroupPublicId}__${util_4.LATEST}`]
            }, apis);
        });
    });
    describe('Cancel', function () {
        afterEach(async function () {
            const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
            await (0, util_1.logBrowserConsole)(testName);
        });
        it('Should allow cancelling a set of changes made', async function () {
            const urlQuery = {
                r: [`${packageGroup62.packageGroupPublicId}__${util_4.LATEST}`]
            };
            await setup(urlQuery);
            await package_manager_1.PackageManager.openDetailedView(package62.packagePublicId);
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode61.packagePublicUid, false);
            await package_manager_1.PackageManager.openSummaryView();
            await package_manager_1.PackageManager.openDetailedView(package58.packagePublicId);
            await package_manager_1.PackageManager.toggleVersionCheckbox(packageNode58.packagePublicUid, true);
            await package_manager_1.PackageManager.openSummaryView();
            await package_manager_1.PackageManager.cancel();
            await package_manager_1.PackageManager.verifyCancel(urlQuery, apis);
        });
    });
    // Helpers
    async function setup(urlQuery) {
        // Setup page
        await (0, util_1.lightSetupProtractorTest)({ apis, urlQuery: urlQuery || {} });
        // Open package manager
        await navbar_1.Navbar.openMenu();
        await (0, util_2.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.navbarMenuPackageManager)));
        await protractor_1.browser.wait(protractor_1.ExpectedConditions.visibilityOf((0, protractor_1.element)(protractor_1.by.id(util_4.TEST_ID.packageManagerTable))), 500, 'Package manager did not open');
        const indicies = await (0, browser_scripts_1.getActivePromiseIndicies)();
        await (0, browser_scripts_1.waitForPromisesToResolve)(indicies);
    }
    function generateExpectedPackagesForDetailedRows(expected) {
        return expected.map(({ pkg, isLatest = false, isSelected = false, hasCheckbox = true }) => ({
            expectedPkg: pkg,
            isLatest,
            isSelected,
            hasCheckbox
        }));
    }
});
