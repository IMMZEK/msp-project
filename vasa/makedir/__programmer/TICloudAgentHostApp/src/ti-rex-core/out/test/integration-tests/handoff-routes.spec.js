"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const sinon = require("sinon");
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
const util_1 = require("util");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const errors_1 = require("../../shared/errors");
const expect_1 = require("../../test/expect");
const helpersNode = require("../../shared/helpers-node");
const rex_1 = require("../../lib/rex");
const test_helpers_2 = require("../../handoff/test-helpers");
const util_2 = require("../../shared/util");
const util_3 = require("../../handoff/util");
const handoff_1 = require("../../routes/handoff");
const dbImportAndPublishFile = require("../../handoff/db-release-and-import");
const overrides_manager_1 = require("../../handoff/overrides-manager");
const promise_utils_1 = require("../../utils/promise-utils");
// Once we have a reusable setupTirex function use that instead of relying on these being set by the server at startup
const { vars } = (0, rex_1._getRex)();
const handoffManager = (0, handoff_1.getHandoffManagerForTesting)();
const refreshManager = handoffManager.getRefreshManager();
const sendEmail = (0, util_1.promisify)(helpersNode.sendEmail);
////////////////////////////////////////////////////////////////////////////////
/// Data - Do not change the values as the tests rely on them
////////////////////////////////////////////////////////////////////////////////
const EMAIL = 'fake@ti.com'; // Change to your email if you wish to see the different emails
const SEND_EMAIL = false; // If you actually want it to send out emails
// Assets
const asset1 = `${scriptsUtil.mochaServer}zips/handoff-route-tests/watson_cc32xx_1_10_00_04__all.zip`;
const asset11 = `${scriptsUtil.mochaServer}zips/handoff-route-tests/watson_cc32xx_1_10_00_04_copy__all.zip`;
const asset2 = `${scriptsUtil.mochaServer}zips/handoff-route-tests/watson_cc32xx_1_10_00_04__macos.zip`;
const asset3 = `${scriptsUtil.mochaServer}zips/handoff-route-tests/mmwave_devices_1_0_1__all.zip`;
const asset4 = `${scriptsUtil.mochaServer}zips/handoff-route-tests/xdctools_3_50_05_12_core__linux.zip`;
const asset5 = `${scriptsUtil.mochaServer}zips/handoff-route-tests/installer5_linux64.run`;
// Expected results
// asset1
const expectedZips1 = [
    path.join('watson_cc32xx_1_10_00_04', util_3.Platform.ALL, 'watson_cc32xx_1_10_00_04__all.zip')
];
const expectedZips11 = [
    path.join('watson_cc32xx_1_10_00_04', util_3.Platform.ALL, 'watson_cc32xx_1_10_00_04_copy__all.zip')
];
const expectedContent1 = ['watson_cc32xx_1_10_00_04'];
const expectedContentTopLevelItems1 = ['watson_cc32xx_1_10_00_04'];
const expectedZipsTopLevelItems1 = ['watson_cc32xx_1_10_00_04'];
// asset2
const expectedZips2 = [
    path.join('watson_cc32xx_1_10_00_04', util_3.Platform.OSX, 'watson_cc32xx_1_10_00_04__macos.zip')
];
const expectedContent2 = ['watson_cc32xx_1_10_00_04'];
// const expectedContentTopLevelItems2 = ['watson_cc32xx_1_10_00_04'];
// const expectedZipsTopLevelItems2 = ['watson_cc32xx_1_10_00_04'];
// asset3
const expectedZips3 = [
    path.join('tirex-product-tree', 'mmwave_devices_1_0_1', util_3.Platform.ALL, 'mmwave_devices_1_0_1__all.zip')
];
const expectedContent3 = [path.join('tirex-product-tree', 'mmwave_devices_1_0_1')];
// asset4
const expectedZips4 = [
    path.join('xdctools_3_50_05_12_core', util_3.Platform.LINUX, 'xdctools_3_50_05_12_core__linux.zip')
];
const expectedContent4 = ['xdctools_3_50_05_12_core'];
// asset5
const expectedZips5 = [
    path.join('coresdk_msp432_3_01_00_11_eng', util_3.Platform.LINUX, 'installer5_linux64.run')
];
const expectedContent5 = ['coresdk_msp432_3_01_00_11_eng', 'non_tirex_package'];
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
const app = scriptsUtil.mochaServer;
let contentFolderItems;
let zipFolderItems;
// Stubs and spies
let refreshStub;
let dbImportAndPublishStub;
let sendEmailStub;
let addPackageSpy;
let removePackageSpy;
let cleanupStagedPackagesSpy;
describe('[handoff] Handoff routes - REX-1874#1', function () {
    this.timeout(30000);
    before(async function () {
        await fs.copy(path.join(scriptsUtil.mochaServerDataFolder, 'zips', 'handoff-route-tests'), path.join(vars.zipsFolder, 'handoff-route-tests'));
    });
    afterEach(async function () {
        // Verify the server is not in maintenance mode
        const apiResult = await expect_1.chai.request(app).get(`${"api/get-maintenance-mode" /* API.GET_GET_MAINTENACE_MODE */}`);
        (0, expect_1.expect)(apiResult.text).to.deep.equal('off');
    });
    describe(`${"api/add-package" /* API.POST_ADD_PACKAGE */} (no backup / package to be replaced)`, function () {
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
        it('Should be able to add a package to the server', async function () {
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
        });
        it('Should handle a bulk request', async function () {
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            const result = await addZipPackages([
                { assets: { [util_3.Platform.ALL]: asset1 } },
                { assets: { [util_3.Platform.ALL]: asset3 } }
            ]);
            const { submissionId } = result.body;
            // Get the promise to tell us when handoff is done
            const addPackagePromise = getFirstCall(addPackageSpy);
            // Validate
            let err = null;
            try {
                await addPackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.null;
            (0, expect_1.expect)(refreshStub.calledOnce).to.be.true;
            // Verify the expected zips and package folders exist
            await (0, test_helpers_2.verifyContentAndZipsPresent)({
                contentFolder: vars.contentBasePath,
                content: [...expectedContent1, ...expectedContent3],
                zipsFolder: vars.zipsFolder,
                zips: [...expectedZips1, ...expectedZips3]
            });
            {
                // Check the package manager file
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                (0, expect_1.expect)(packages).to.have.length(2);
                packages.map(entry => {
                    (0, expect_1.expect)(entry).to.deep.equal({
                        ...entry,
                        state: "valid" /* PackageEntryState.VALID */,
                        submissionId
                    });
                });
            }
        });
        it('Should handle a non tirex package (as a secondary package in an installer)', async function () {
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            const result = await addInstallerPackages([
                {
                    assets: { [util_3.Platform.LINUX]: asset5 },
                    installCommand: {
                        [util_3.Platform.LINUX]: './installer5_linux64.run --prefix @install-location --mode unattended'
                    },
                    submittedPackage: { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' }
                }
            ]);
            const { submissionId } = result.body;
            // Get the promise to tell us when handoff is done
            const addPackagePromise = getFirstCall(addPackageSpy);
            // Validate
            let err = null;
            try {
                await addPackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.null;
            (0, expect_1.expect)(refreshStub.calledOnce).to.be.true;
            // Verify the expected zips and package folders exist
            await (0, test_helpers_2.verifyContentAndZipsPresent)({
                contentFolder: vars.contentBasePath,
                content: expectedContent5,
                zipsFolder: vars.zipsFolder,
                zips: expectedZips5
            });
            {
                // Check the package manager file
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                // installer is producing install_logs and uninstall folders
                // these also get registered as non tirex packages
                (0, expect_1.expect)(packages).to.have.length(4);
                packages.map((entry, idx) => {
                    (0, expect_1.expect)(entry).to.deep.equal({
                        ...entry,
                        state: "valid" /* PackageEntryState.VALID */,
                        submissionId,
                        showEntry: idx === 0
                    });
                });
            }
        });
        it('Should handle a graceful error before package processing occurs', async function () {
            // We are missing the __linux and __all zip so it should reject before processing
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await addZipPackages([{ assets: { [util_3.Platform.OSX]: asset2 } }]);
            // Get the promise to tell us when handoff is done
            const addPackagePromise = getFirstCall(addPackageSpy);
            // Validate
            await (0, expect_1.expect)(addPackagePromise).to.be.rejectedWith(errors_1.GracefulError);
            {
                const expectedZips = expectedZips2;
                const expectedContent = expectedContent2;
                {
                    // Verify the expected zips and package folders do not exist
                    await (0, test_helpers_2.verifyContentAndZipsGone)({
                        contentFolder: vars.contentBasePath,
                        content: expectedContent,
                        zipsFolder: vars.zipsFolder,
                        zips: expectedZips
                    });
                }
                {
                    // Verify nothing additional was added to the content and zips folder
                    // (including the content & zip folder items).
                    await verifyNothingExtraAddedOrRemoved({ add: [], remove: [] }, { add: [], remove: [] });
                }
                {
                    // Check the package manager file
                    const { packages } = (await fs.readJson(vars.packageManagerFile));
                    (0, expect_1.expect)(packages).to.have.length(0);
                }
                (0, expect_1.expect)(refreshStub.called).to.be.false;
            }
        });
        it('Should handle a graceful error during package processing', async function () {
            await AddPackageValidation.testResultDuringProcessing("GracefulError" /* HandoffResult.GRACEFUL_ERROR */, false);
        });
        it.skip('TODO Should handle a graceful error after package processing', async function () {
            // Currently no use case for this
        });
        it('Should handle a fatal error before package processing occurs', async function () {
            // Remove the package manager file to cause the fatal error
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await fs.remove(vars.packageManagerFile);
            await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
            // Get the promise to tell us when handoff is done
            const addPackagePromise = getFirstCall(addPackageSpy);
            // Validate
            let err = null;
            try {
                await addPackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.not.null;
            (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.false;
            (0, expect_1.expect)(refreshStub.called).to.be.false;
        });
        it('Should handle a fatal error during package processing', async function () {
            await AddPackageValidation.testResultDuringProcessing("FatalError" /* HandoffResult.FATAL_ERROR */, false);
        });
        it('Should handle a fatal error after package processing', async function () {
            const cleanupAddPackagesStub = sinon.stub(
            // @ts-ignore - TODO remove after 10.3 (no more legacy handoff)
            handoffManager._getAddPackageHelper(), '_postProcessingPlaceholderForTesting');
            cleanupAddPackagesStub.callsFake(async () => {
                throw new Error('Fatal error from cleanup add');
            });
            let err = null;
            try {
                // Setup
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
                // Get the promise to tell us when handoff is done
                const addPackagePromise = getFirstCall(addPackageSpy);
                // Validate
                let err = null;
                try {
                    await addPackagePromise;
                }
                catch (e) {
                    err = err || e;
                }
                (0, expect_1.expect)(err).to.be.not.null;
                (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.false;
                (0, expect_1.expect)(refreshStub.called).to.be.true;
            }
            catch (e) {
                err = err || e;
            }
            cleanupAddPackagesStub.restore();
            if (err) {
                throw err;
            }
        });
        it.skip('TODO Should handle a graceful error followed by a fatal error (should end up with a fatal error)', async function () { });
        it.skip('TODO Should handle a fatal error followed by a graceful error (should end up with a fatal error)', async function () { });
        it('Should handle missing fields in the request', async function () {
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            // Missing assets & zipUpload (rest are optional)
            await addZipPackages([], 400);
        });
    });
    describe(`${"api/add-package" /* API.POST_ADD_PACKAGE */} (with a backup / package to be replaced)`, function () {
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
        it('Should be able to add a package to the server', async function () {
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
            resetStubsAndSpies();
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, true);
        });
        it('Should handle a graceful error before package processing occurs', async function () {
            // Add the original
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
            resetStubsAndSpies();
            // We are missing the __linux and __all zip so it should reject before processing
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            const result = await addZipPackages([{ assets: { [util_3.Platform.OSX]: asset2 } }]);
            const { submissionId } = result.body;
            // Get the promise to tell us when handoff is done
            const addPackagePromise = getFirstCall(addPackageSpy);
            // Validate - behaves the same as a graceful error during processing
            {
                let err = null;
                try {
                    await addPackagePromise;
                }
                catch (e) {
                    err = err || e;
                }
                (0, expect_1.expect)(err).to.be.not.null;
                (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.true;
            }
            await AddPackageValidation.postValidateAddPackageResultDuringProcessing({
                result: "GracefulError" /* HandoffResult.GRACEFUL_ERROR */,
                submissionId,
                expectedZips: expectedZips1,
                expectedContent: expectedContent1,
                expectedZipsTopLevelItems: expectedZipsTopLevelItems1,
                expectedContentTopLevelItems: expectedContentTopLevelItems1,
                replace: true
            });
            (0, expect_1.expect)(refreshStub.called).to.be.false;
        });
        it('Should handle a graceful error during package processing', async function () {
            // Add the original
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
            resetStubsAndSpies();
            await AddPackageValidation.testResultDuringProcessing("GracefulError" /* HandoffResult.GRACEFUL_ERROR */, true);
        });
        it.skip('TODO Should handle a graceful error after package processing', async function () {
            // Currently no use case for this
        });
        it('Should handle a fatal error before package processing occurs', async function () {
            // Add the original
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
            resetStubsAndSpies();
            // Remove the package manager file to cause the fatal error
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await fs.remove(vars.packageManagerFile);
            await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
            // Get the promise to tell us when handoff is done
            const addPackagePromise = getFirstCall(addPackageSpy);
            // Validate
            let err = null;
            try {
                await addPackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.not.null;
            (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.false;
            (0, expect_1.expect)(refreshStub.called).to.be.false;
        });
        it('Should handle a fatal error during package processing', async function () {
            // Add the original
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
            resetStubsAndSpies();
            await AddPackageValidation.testResultDuringProcessing("FatalError" /* HandoffResult.FATAL_ERROR */, true);
        });
        it('Should handle a fatal error after package processing', async function () {
            // Add the original
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
            resetStubsAndSpies();
            const cleanupAddPackagesStub = sinon.stub(
            // @ts-ignore - TODO remove after 10.3 (no more legacy handoff)
            handoffManager._getAddPackageHelper(), '_postProcessingPlaceholderForTesting');
            cleanupAddPackagesStub.callsFake(() => {
                throw new Error('Fatal error from cleanup add');
            });
            let err = null;
            try {
                // Setup
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
                // Get the promise to tell us when handoff is done
                const addPackagePromise = getFirstCall(addPackageSpy);
                // Validate
                {
                    let err = null;
                    try {
                        await addPackagePromise;
                    }
                    catch (e) {
                        err = err || e;
                    }
                    (0, expect_1.expect)(err).to.be.not.null;
                    (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.false;
                }
                (0, expect_1.expect)(refreshStub.called).to.be.true;
            }
            catch (e) {
                err = err || e;
            }
            cleanupAddPackagesStub.restore();
            if (err) {
                throw err;
            }
        });
    });
    describe(`${"api/add-package" /* API.POST_ADD_PACKAGE */} overridesFiles and showEntry handling`, function () {
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
        it('Should keep the overrides file in sync with the showEntry values', async function () {
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            {
                // Add an overrides file for the submitted package, this way we can verify it was removed
                const overridesFile = overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent5[0], vars.overridesDir);
                await fs.ensureFile(overridesFile);
            }
            await addInstallerPackages([
                {
                    assets: { [util_3.Platform.LINUX]: asset5 },
                    installCommand: {
                        [util_3.Platform.LINUX]: './installer5_linux64.run --prefix @install-location --mode unattended'
                    },
                    submittedPackage: { id: 'com.ti.CORE_MSP432_SDK', version: '3.01.00.11_eng' }
                }
            ]);
            // Get the promise to tell us when handoff is done
            const addPackagePromise = getFirstCall(addPackageSpy);
            // Validate
            let err = null;
            try {
                await addPackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.null;
            (0, expect_1.expect)(refreshStub.calledOnce).to.be.true;
            {
                // Check the package manager file
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                // installer is producing install_logs and uninstall folders
                // these also get registered as non tirex packages
                (0, expect_1.expect)(packages).to.have.length(4);
                await Promise.all(packages.map(async (entry) => {
                    await Promise.all(entry.content.map(async (item) => {
                        const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(item, vars.overridesDir));
                        (0, expect_1.expect)(overridesExists).to.equal(!entry.showEntry);
                    }));
                }));
            }
        });
        it('Should revert the overrides files to the previous showEntry states, and call refresh correctly - if we had a gracefull error during processing', async function () {
            this.timeout(60000);
            // Add the items
            const items = [
                {
                    // Use asset1 renamed so we ensure when we rollback we are calling it with the correct zip name
                    asset: asset11,
                    handoffResult: ["GracefulError" /* HandoffResult.GRACEFUL_ERROR */, "Success" /* HandoffResult.SUCCESS */],
                    platform: util_3.Platform.ALL
                },
                {
                    asset: asset3,
                    handoffResult: ["GracefulError" /* HandoffResult.GRACEFUL_ERROR */, "Success" /* HandoffResult.SUCCESS */],
                    platform: util_3.Platform.ALL
                },
                {
                    asset: asset4,
                    handoffResult: ["GracefulError" /* HandoffResult.GRACEFUL_ERROR */, "Success" /* HandoffResult.SUCCESS */],
                    platform: util_3.Platform.LINUX
                }
            ];
            const itemsStart = [
                {
                    asset: asset1,
                    handoffResult: "Success" /* HandoffResult.SUCCESS */,
                    platform: util_3.Platform.ALL
                },
                {
                    asset: asset4,
                    handoffResult: "Success" /* HandoffResult.SUCCESS */,
                    platform: util_3.Platform.LINUX
                }
            ];
            await (0, promise_utils_1.mapSerially)([...itemsStart, ...items], async (item, idx) => {
                if (idx === itemsStart.length) {
                    // Set show entry values & setup overrides files so we can verify we
                    // correct the state properly during rollback
                    const { packages } = (await fs.readJson(vars.packageManagerFile));
                    await Promise.all(packages.map(async (item) => {
                        if (_.isEmpty(_.difference(item.zips, expectedZips1))) {
                            item.showEntry = true;
                            const overridesFile = overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir);
                            await fs.ensureFile(overridesFile);
                            return;
                        }
                        else if (_.isEmpty(_.difference(item.zips, expectedZips3))) {
                            const overridesFile = overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent3[0], vars.overridesDir);
                            await fs.ensureFile(overridesFile);
                            return;
                        }
                        else if (_.isEmpty(_.difference(item.zips, expectedZips4))) {
                            item.showEntry = false;
                            return;
                        }
                        throw new Error(`Expected item to be staged and with zips 1 or 4 ${JSON.stringify(item)}`);
                    }));
                    await fs.writeJson(vars.packageManagerFile, { packages });
                }
                const { asset, handoffResult, platform } = item;
                // Setup
                if (Array.isArray(handoffResult)) {
                    let idx = 0;
                    refreshStub.callsFake(async (...params) => {
                        return refreshStubFn(params, {
                            result: handoffResult[idx++]
                        });
                    });
                }
                else {
                    setupRefreshStubFn({ result: handoffResult });
                }
                await addZipPackages([{ assets: { [platform]: asset } }]);
                // Get the promise to tell us when handoff is done
                const addPackagePromise = getFirstCall(addPackageSpy);
                try {
                    await addPackagePromise;
                }
                catch (e) {
                    if (handoffResult === "Success" /* HandoffResult.SUCCESS */) {
                        throw e;
                    }
                }
                if (idx >= itemsStart.length) {
                    // Verify;
                    (0, expect_1.expect)(refreshStub.args.length).to.equal(2);
                    const refreshItems = refreshStub.args[1][0].filter(item => item.operation !== "doNothing" /* RefreshOperation.DO_NOTHING */);
                    (0, expect_1.expect)(refreshItems.length).to.equal(1);
                    const entry = refreshItems[0];
                    if (entry.content === expectedContent1[0]) {
                        // Verify refresh called correctly (add / remove is correct and
                        // content / zips is correct - important for installCommand and
                        // installPath)
                        (0, expect_1.expect)(entry.operation).to.equal("replacePackage" /* RefreshOperation.REPLACE_PACKAGE */);
                        (0, expect_1.expect)(entry.installPath.linux).to.deep.equal(expectedZips1[0]);
                        // Verify overrides file state
                        const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir));
                        (0, expect_1.expect)(overridesExists).to.be.false;
                    }
                    else if (entry.content === expectedContent3[0]) {
                        // Verify refresh called correctly (add / remove is correct and
                        // content / zips is correct - important for installCommand and
                        // installPath)
                        (0, expect_1.expect)(entry.operation).to.equal("removePackage" /* RefreshOperation.REMOVE_PACKAGE */);
                        (0, expect_1.expect)(entry.installPath.linux).to.deep.equal(expectedZips3[0]);
                        // Verify overrides file state
                        const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent3[0], vars.overridesDir));
                        (0, expect_1.expect)(overridesExists).to.be.false;
                    }
                    else if (entry.content === expectedContent4[0]) {
                        // Verify refresh called correctly (add / remove is correct and
                        // content / zips is correct - important for installCommand and
                        // installPath)
                        (0, expect_1.expect)(entry.operation).to.equal("removePackage" /* RefreshOperation.REMOVE_PACKAGE */);
                        (0, expect_1.expect)(entry.installPath.linux).to.deep.equal(expectedZips4[0]);
                        // Verify overrides file state
                        const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent4[0], vars.overridesDir));
                        (0, expect_1.expect)(overridesExists).to.be.true;
                    }
                    else {
                        throw new Error(`Unexpected content value ${entry.content} for ${JSON.stringify(entry)}`);
                    }
                }
                // Cleanup
                resetStubsAndSpies();
                await expect_1.chai.request(app).get(`${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}?switch=off`);
            });
        });
    });
    describe(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}`, function () {
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
        it('Should be able to delete a package from the server', async function () {
            await RemovePackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */);
        });
        it('Should handle a graceful error before package processing occurs', async function () {
            let err = null;
            let getPackageEntryStub = null;
            try {
                {
                    // Add the package to the server
                    setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                    await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
                    const addPackagePromise = getFirstCall(addPackageSpy);
                    await addPackagePromise;
                    resetStubsAndSpies();
                }
                {
                    // No good graceful error to use at time of writing,
                    // make getDeleteEntries throw a graceful error
                    getPackageEntryStub = sinon.stub(handoffManager._getPackageManagerAdapter()._getPackageManager(), 'getDeleteEntries');
                    getPackageEntryStub.callsFake(async () => {
                        throw new errors_1.GracefulError('Graceful error from getDeleteEntries');
                    });
                }
                // Setup
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                const result = await expect_1.chai
                    .request(app)
                    .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=com.ti.WATSON_CC32XX&version=1.10.00.04`);
                (0, expect_1.expect)(result.status).to.equal(200);
                const { submissionId } = result.body;
                // Get the promise to tell us when the delete is done
                const removePackagePromise = getFirstCall(removePackageSpy);
                // Validate - Behaves the same as a graceful error during processing
                {
                    let err = null;
                    try {
                        await removePackagePromise;
                    }
                    catch (e) {
                        err = err || e;
                    }
                    (0, expect_1.expect)(err).to.be.not.null;
                    (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.true;
                }
                await RemovePackageValidation.postValidateRemovePackageResultDuringProcessing({
                    result: "GracefulError" /* HandoffResult.GRACEFUL_ERROR */,
                    submissionId,
                    expectedZips: expectedZips1,
                    expectedContent: expectedContent1,
                    expectedZipsTopLevelItems: expectedZipsTopLevelItems1,
                    expectedContentTopLevelItems: expectedContentTopLevelItems1,
                    replace: true
                });
            }
            catch (e) {
                err = err || e;
            }
            if (getPackageEntryStub) {
                getPackageEntryStub.restore();
            }
            if (err) {
                throw err;
            }
        });
        it('Should handle a graceful error during package processing', async function () {
            await RemovePackageValidation.testResultDuringProcessing("GracefulError" /* HandoffResult.GRACEFUL_ERROR */);
        });
        it.skip('TODO Should handle a graceful after package processing', async function () {
            // Currently no use case for this
        });
        it('Should handle a fatal error before package processing occurs', async function () {
            // Remove the package manager file to cause the fatal error
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await fs.remove(vars.packageManagerFile);
            const result = await expect_1.chai
                .request(app)
                .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=com.ti.WATSON_CC32XX&version=1.10.00.04`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Get the promise to tell us when the delete is done
            const removePackagePromise = getFirstCall(removePackageSpy);
            // Validate
            let err = null;
            try {
                await removePackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.not.null;
            (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.false;
            (0, expect_1.expect)(refreshStub.called).to.be.false;
        });
        it('Should handle a fatal error during package processing', async function () {
            await RemovePackageValidation.testResultDuringProcessing("FatalError" /* HandoffResult.FATAL_ERROR */);
        });
        it('Should handle a fatal error after package processing', async function () {
            {
                // Add the package to the server
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
                const addPackagePromise = getFirstCall(addPackageSpy);
                await addPackagePromise;
                (0, expect_1.expect)(refreshStub.called).to.be.true;
                resetStubsAndSpies();
            }
            const cleanupRemoveStub = sinon.stub(handoffManager._getRemovePackageHelper(), '_postProcessingPlaceholderForTesting');
            cleanupRemoveStub.callsFake(async () => {
                throw new Error('Fatal error from cleanup remove');
            });
            let err = null;
            try {
                // Setup
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                const result = await expect_1.chai
                    .request(app)
                    .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=com.ti.WATSON_CC32XX&version=1.10.00.04&email=fake@ti.com`);
                (0, expect_1.expect)(result.status).to.equal(200);
                // Get the promise to tell us when the delete is done
                const removePackagePromise = getFirstCall(removePackageSpy);
                // Validate
                let err = null;
                try {
                    await removePackagePromise;
                }
                catch (e) {
                    err = err || e;
                }
                (0, expect_1.expect)(err).to.be.not.null;
                (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.false;
                (0, expect_1.expect)(refreshStub.called).to.be.true;
            }
            catch (e) {
                err = err || e;
            }
            cleanupRemoveStub.restore();
            if (err) {
                throw err;
            }
        });
        it.skip('TODO Should handle a graceful error followed by a fatal error (should end up with a fatal error)', async function () { });
        it.skip('TODO Should handle a fatal error followed by a graceful error (should end up with a fatal error)', async function () { });
        it('Should handle missing fields in the request', async function () {
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            // Missing version
            const resultNoVersion = await expect_1.chai
                .request(app)
                .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=foo&email=bar`);
            (0, expect_1.expect)(resultNoVersion.status).to.equal(400);
            // Missing id
            const resultNoId = await expect_1.chai
                .request(app)
                .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?version=foo&email=bar`);
            (0, expect_1.expect)(resultNoId.status).to.equal(400);
        });
        it('Should remove the overrides file upon successful remove', async function () {
            {
                // Add the package to the server
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
                const addPackagePromise = getFirstCall(addPackageSpy);
                await addPackagePromise;
            }
            {
                // Add an overrides file for the submitted package, this way we can verify it was removed
                const overridesFile = overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir);
                await fs.ensureFile(overridesFile);
            }
            // Setup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            const result = await expect_1.chai
                .request(app)
                .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=com.ti.WATSON_CC32XX&version=1.10.00.04`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Get the promise to tell us when the delete is done
            const removePackagePromise = getFirstCall(removePackageSpy);
            let err = null;
            try {
                await removePackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.null;
            // Verify overrides file removed
            const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir));
            (0, expect_1.expect)(overridesExists).to.be.false;
        });
        it('Should revert the overides file to the previous show entry state if we had an error during gracefull error processing (showEntry = false)', async function () {
            {
                // Add the package to the server
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
                const addPackagePromise = getFirstCall(addPackageSpy);
                await addPackagePromise;
                // Set show entry = false
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                packages.forEach(item => (item.showEntry = false));
                await fs.writeJson(vars.packageManagerFile, { packages });
            }
            // Setup
            setupRefreshStubFn({ result: "GracefulError" /* HandoffResult.GRACEFUL_ERROR */ });
            const result = await expect_1.chai
                .request(app)
                .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=com.ti.WATSON_CC32XX&version=1.10.00.04`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Get the promise to tell us when the delete is done
            const removePackagePromise = getFirstCall(removePackageSpy);
            let err = null;
            try {
                await removePackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.not.null;
            (0, expect_1.expect)(err instanceof errors_1.GracefulError, JSON.stringify(err)).to.be.true;
            // Verify overrides file exists
            const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir));
            (0, expect_1.expect)(overridesExists).to.be.true;
        });
        it('Should revert the overides file to the previous show entry state if we had an error during gracefull error processing (showEntry = true)', async function () {
            {
                // Add the package to the server
                setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
                await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
                const addPackagePromise = getFirstCall(addPackageSpy);
                await addPackagePromise;
                // Set show entry = true
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                packages.forEach(item => (item.showEntry = true));
                await fs.writeJson(vars.packageManagerFile, { packages });
                // Add an overrides file for the submitted package, this way we can verify it was removed
                const overridesFile = overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir);
                await fs.ensureFile(overridesFile);
            }
            // Setup
            setupRefreshStubFn({ result: "GracefulError" /* HandoffResult.GRACEFUL_ERROR */ });
            const result = await expect_1.chai
                .request(app)
                .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=com.ti.WATSON_CC32XX&version=1.10.00.04`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Get the promise to tell us when the delete is done
            const removePackagePromise = getFirstCall(removePackageSpy);
            let err = null;
            try {
                await removePackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            (0, expect_1.expect)(err).to.be.not.null;
            (0, expect_1.expect)(err instanceof errors_1.GracefulError, JSON.stringify(err)).to.be.true;
            // Verify overrides file removed
            const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir));
            (0, expect_1.expect)(overridesExists).to.be.false;
        });
    });
    describe(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */} overridesFiles and showEntry handling`, function () {
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
    });
    describe(`${"api/sync-packages" /* API.GET_SYNC_PACKAGES */}`, function () {
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
        it('Should import an untracked package', async function () {
            const item = {
                id: 'foo',
                version: '1.2.3',
                content: ['foo'],
                zips: [path.join('foo', 'foo_1_2_3__all.zip')]
            };
            await (0, test_helpers_2.prepareContentAndZips)({
                contentFolder: vars.contentBasePath,
                zipsFolder: vars.zipsFolder,
                zips: item.zips,
                content: item.content,
                contentJson: [{ name: item.id, id: item.id, version: item.version, type: 'software' }]
            });
            const result = await expect_1.chai.request(app).get(`${"api/sync-packages" /* API.GET_SYNC_PACKAGES */}`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Check the package manager file
            const { packages } = (await fs.readJson(vars.packageManagerFile));
            (0, expect_1.expect)(packages).to.have.length(1);
            (0, expect_1.expect)(packages[0]).to.deep.equal({
                ...(0, test_helpers_2.createPackageEntryValid)(item),
                submissionId: ''
            });
        });
        it('Should pickup the show entry value from the fs', async function () {
            // Could be moved down to create-package-entries
            const item = {
                id: 'foo',
                version: '1.2.3',
                content: ['foo'],
                zips: [path.join('foo', 'foo_1_2_3__all.zip')]
            };
            await (0, test_helpers_2.prepareContentAndZips)({
                contentFolder: vars.contentBasePath,
                zipsFolder: vars.zipsFolder,
                zips: item.zips,
                content: item.content,
                contentJson: [{ name: item.id, id: item.id, version: item.version, type: 'software' }]
            });
            await fs.ensureFile(overrides_manager_1.OverridesManager.getOveridesFilePath(item.content[0], vars.overridesDir));
            const result = await expect_1.chai.request(app).get(`${"api/sync-packages" /* API.GET_SYNC_PACKAGES */}`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Check the package manager file
            const { packages } = (await fs.readJson(vars.packageManagerFile));
            (0, expect_1.expect)(packages).to.have.length(2); // OverridesDir gets treated like a package (so length is 2)
            (0, expect_1.expect)(packages[0]).to.deep.equal({
                ...(0, test_helpers_2.createPackageEntryValid)(item),
                submissionId: '',
                showEntry: false
            });
        });
        it('Should handle no package manager file', async function () {
            const item = {
                id: 'foo',
                version: '1.2.3',
                content: ['foo'],
                zips: [path.join('foo', 'foo_1_2_3__all.zip')]
            };
            await (0, test_helpers_2.prepareContentAndZips)({
                contentFolder: vars.contentBasePath,
                zipsFolder: vars.zipsFolder,
                zips: item.zips,
                content: item.content,
                contentJson: [{ name: item.id, id: item.id, version: item.version, type: 'software' }]
            });
            await fs.remove(vars.packageManagerFile);
            const result = await expect_1.chai.request(app).get(`${"api/sync-packages" /* API.GET_SYNC_PACKAGES */}`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Check the package manager file
            const { packages } = (await fs.readJson(vars.packageManagerFile));
            (0, expect_1.expect)(packages).to.have.length(1);
            (0, expect_1.expect)(packages[0]).to.deep.equal({
                ...(0, test_helpers_2.createPackageEntryValid)(item),
                submissionId: ''
            });
        });
        it('Should not delete items with a mix of valid and invalid package folders', async function () {
            // Setup
            // Add a package, then add a second invalid content entry
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
            const addPackagePromise = getFirstCall(addPackageSpy);
            await addPackagePromise;
            {
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                packages.forEach(item => {
                    item.content = ['invalid', ...item.content];
                });
                await fs.writeJson(vars.packageManagerFile, { packages });
            }
            const result = await expect_1.chai.request(app).get(`${"api/sync-packages" /* API.GET_SYNC_PACKAGES */}`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Validate
            {
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                (0, expect_1.expect)(packages).to.have.length(1);
                await (0, test_helpers_2.verifyContentAndZipsPresent)({
                    contentFolder: vars.contentBasePath,
                    content: expectedContent1,
                    zipsFolder: vars.zipsFolder,
                    zips: expectedZips1
                });
            }
        });
        it('Should delete an item with no valid package folders', async function () {
            // Setup
            // Add a package, then remove its content entry
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
            const addPackagePromise = getFirstCall(addPackageSpy);
            await addPackagePromise;
            await fs.remove(path.join(vars.contentBasePath, expectedContent1[0]));
            const result = await expect_1.chai.request(app).get(`${"api/sync-packages" /* API.GET_SYNC_PACKAGES */}`);
            (0, expect_1.expect)(result.status).to.equal(200);
            // Validate
            {
                const { packages } = (await fs.readJson(vars.packageManagerFile));
                (0, expect_1.expect)(packages).to.have.length(0);
                await (0, test_helpers_2.verifyContentAndZipsGone)({
                    contentFolder: vars.contentBasePath,
                    content: expectedContent1,
                    zipsFolder: vars.zipsFolder,
                    zips: expectedZips1
                });
            }
        });
    });
    describe(`${"api/cleanup-packages" /* API.GET_CLEANUP_PACKAGES */}`, function () {
        this.timeout(60000);
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
        it('Should be able to cleanup staged packages', async function () {
            // Add the items
            const items = [
                { asset: asset1, handoffResult: "Success" /* HandoffResult.SUCCESS */, platform: util_3.Platform.ALL },
                { asset: asset1, handoffResult: "FatalError" /* HandoffResult.FATAL_ERROR */, platform: util_3.Platform.ALL },
                { asset: asset3, handoffResult: "Success" /* HandoffResult.SUCCESS */, platform: util_3.Platform.ALL },
                {
                    asset: asset4,
                    handoffResult: "FatalError" /* HandoffResult.FATAL_ERROR */,
                    platform: util_3.Platform.LINUX
                }
            ];
            for (const item of items) {
                const { asset, handoffResult, platform } = item;
                // Setup
                setupRefreshStubFn({ result: handoffResult });
                await addZipPackages([{ assets: { [platform]: asset } }]);
                // Get the promise to tell us when handoff is done
                const addPackagePromise = getFirstCall(addPackageSpy);
                if (handoffResult === "Success" /* HandoffResult.SUCCESS */) {
                    await (0, expect_1.expect)(addPackagePromise).to.be.not.rejected;
                }
                else {
                    await (0, expect_1.expect)(addPackagePromise).to.be.rejected;
                }
                resetStubsAndSpies();
                await expect_1.chai.request(app).get(`${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}?switch=off`);
            }
            // Call cleanup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await (0, expect_1.expect)(expect_1.chai.request(app).get("api/cleanup-packages" /* API.GET_CLEANUP_PACKAGES */)).to.be.not.rejected;
            // Get the promise to tell us when cleanup is done
            const cleanupPromise = getFirstCall(cleanupStagedPackagesSpy);
            await cleanupPromise;
            // Check the package manager file
            const { packages } = (await fs.readJson(vars.packageManagerFile));
            (0, expect_1.expect)(packages).to.have.length(2);
            packages.map(entry => {
                (0, expect_1.expect)(entry.state).to.equal("valid" /* PackageEntryState.VALID */);
            });
        });
        it('Should handle processing failing during cleanup', async function () {
            // Add the items
            const items = [
                { asset: asset3, handoffResult: "Success" /* HandoffResult.SUCCESS */, platform: util_3.Platform.ALL },
                {
                    asset: asset4,
                    handoffResult: "FatalError" /* HandoffResult.FATAL_ERROR */,
                    platform: util_3.Platform.LINUX
                } //  will become 'staged' entry
            ];
            for (const item of items) {
                const { asset, handoffResult, platform } = item;
                // Setup
                setupRefreshStubFn({ result: handoffResult });
                await addZipPackages([{ assets: { [platform]: asset } }]);
                // Get the promise to tell us when handoff is done
                const addPackagePromise = getFirstCall(addPackageSpy);
                if (handoffResult === "Success" /* HandoffResult.SUCCESS */) {
                    await (0, expect_1.expect)(addPackagePromise).to.be.not.rejected;
                }
                else {
                    await (0, expect_1.expect)(addPackagePromise).to.be.rejected;
                }
                resetStubsAndSpies();
                await expect_1.chai.request(app).get(`${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}?switch=off`);
            }
            // Call cleanup
            setupRefreshStubFn({ result: "FatalError" /* HandoffResult.FATAL_ERROR */ });
            const response = await (0, expect_1.expect)(expect_1.chai.request(app).get("api/cleanup-packages" /* API.GET_CLEANUP_PACKAGES */)).to.be.not
                .rejected;
            (0, expect_1.expect)(response.status).to.not.equal(200);
            // Get the promise to tell us when cleanup is done
            const cleanupPromise = getFirstCall(cleanupStagedPackagesSpy);
            await (0, expect_1.expect)(cleanupPromise).to.be.rejected;
            // Check the package manager file
            const { packages } = (await fs.readJson(vars.packageManagerFile));
            (0, expect_1.expect)(packages).to.have.length(2);
            const stagedEntries = packages.filter(entry => entry.state === "staged" /* PackageEntryState.STAGED */);
            (0, expect_1.expect)(stagedEntries).to.have.length(1);
            const validEntries = packages.filter(entry => entry.state === "valid" /* PackageEntryState.VALID */);
            (0, expect_1.expect)(validEntries).to.have.length(1);
        });
        it('Should revert the overrides files to the previous show entry states, and call refresh correctly', async function () {
            this.timeout(60000);
            // Add the items
            const items = [
                {
                    // Use asset1 renamed so we ensure when we rollback we are calling it with the correct zip name
                    asset: asset11,
                    handoffResult: "FatalError" /* HandoffResult.FATAL_ERROR */,
                    platform: util_3.Platform.ALL
                },
                {
                    asset: asset3,
                    handoffResult: "FatalError" /* HandoffResult.FATAL_ERROR */,
                    platform: util_3.Platform.ALL
                },
                {
                    asset: asset4,
                    handoffResult: "FatalError" /* HandoffResult.FATAL_ERROR */,
                    platform: util_3.Platform.LINUX
                }
            ];
            const itemsStart = [
                {
                    asset: asset1,
                    handoffResult: "Success" /* HandoffResult.SUCCESS */,
                    platform: util_3.Platform.ALL
                },
                {
                    asset: asset4,
                    handoffResult: "Success" /* HandoffResult.SUCCESS */,
                    platform: util_3.Platform.LINUX
                }
            ];
            for (const item of [...itemsStart, ...items]) {
                const { asset, handoffResult, platform } = item;
                // Setup
                setupRefreshStubFn({ result: handoffResult });
                await addZipPackages([{ assets: { [platform]: asset } }]);
                // Get the promise to tell us when handoff is done
                const addPackagePromise = getFirstCall(addPackageSpy);
                if (handoffResult === "Success" /* HandoffResult.SUCCESS */) {
                    await addPackagePromise;
                }
                else {
                    await (0, expect_1.expect)(addPackagePromise).to.be.eventually.rejected;
                }
                resetStubsAndSpies();
                await expect_1.chai.request(app).get(`${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}?switch=off`);
            }
            // Set show entry values & setup overrides files so we can verify we
            // correct the state properly during cleanup
            const { packages } = (await fs.readJson(vars.packageManagerFile));
            await Promise.all(packages.map(async (item) => {
                if (item.state === "staged" /* PackageEntryState.STAGED */) {
                    if (_.isEmpty(_.difference(item.zips, expectedZips11))) {
                        item.backupEntry.showEntry = true;
                        const overridesFile = overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir);
                        await fs.ensureFile(overridesFile);
                        return;
                    }
                    else if (_.isEmpty(_.difference(item.zips, expectedZips3))) {
                        const overridesFile = overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent3[0], vars.overridesDir);
                        await fs.ensureFile(overridesFile);
                        return;
                    }
                    else if (_.isEmpty(_.difference(item.zips, expectedZips4))) {
                        item.backupEntry.showEntry = false;
                        return;
                    }
                }
                throw new Error(`Expected item to be staged and with zips 1 or 4 ${JSON.stringify(item)}`);
            }));
            await fs.writeJson(vars.packageManagerFile, { packages });
            // Call cleanup
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await (0, expect_1.expect)(expect_1.chai.request(app).get("api/cleanup-packages" /* API.GET_CLEANUP_PACKAGES */)).to.be.not.rejected;
            // Get the promise to tell us when cleanup is done
            const cleanupPromise = getFirstCall(cleanupStagedPackagesSpy);
            await cleanupPromise;
            // Verify override file state
            {
                const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent1[0], vars.overridesDir));
                (0, expect_1.expect)(overridesExists).to.be.false;
            }
            {
                const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent3[0], vars.overridesDir));
                (0, expect_1.expect)(overridesExists).to.be.false;
            }
            {
                const overridesExists = await fs.pathExists(overrides_manager_1.OverridesManager.getOveridesFilePath(expectedContent4[0], vars.overridesDir));
                (0, expect_1.expect)(overridesExists).to.be.true;
            }
            // Verify refresh called correctly (add / remove is correct and
            // content / zips is correct - important for installCommand and
            // installPath)
            const refreshItems = refreshStub.args[0][0];
            refreshItems.forEach((entry) => {
                if (entry.content === expectedContent1[0]) {
                    (0, expect_1.expect)(entry.operation).to.equal("replacePackage" /* RefreshOperation.REPLACE_PACKAGE */);
                    (0, expect_1.expect)(entry.installPath.linux).to.deep.equal(expectedZips1[0]);
                }
                else if (entry.content === expectedContent3[0]) {
                    (0, expect_1.expect)(entry.operation).to.equal("removePackage" /* RefreshOperation.REMOVE_PACKAGE */);
                    (0, expect_1.expect)(entry.installPath.linux).to.deep.equal(expectedZips3[0]);
                }
                else if (entry.content === expectedContent4[0]) {
                    (0, expect_1.expect)(entry.operation).to.equal("removePackage" /* RefreshOperation.REMOVE_PACKAGE */);
                    (0, expect_1.expect)(entry.installPath.linux).to.deep.equal(expectedZips4[0]);
                }
                else {
                    throw new Error(`Unexpected content value ${entry.content} for ${JSON.stringify(entry)}`);
                }
            });
        });
    });
    describe('Maintenance mode', function () {
        beforeEach(beforeEachHandoffRouteTest);
        afterEach(afterEachHandoffRouteTest);
        it('Should reject submissions when in maintenance mode', async function () {
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            {
                const result = await turnOnMaintenanceMode();
                (0, expect_1.expect)(result.status).to.equal(200);
            }
            {
                await addZipPackages([{ assets: { [util_3.Platform.OSX]: asset3 } }], 503);
            }
        });
        it.skip('TODO Should complete any ongoing submissions when requested to go into maintenance mode (but reject any new requests)', async function () { });
        it.skip('TODO Should not process multiple submissions in parallel', async function () { });
        it('Should be able to get out of maintenance mode (resume service)', async function () {
            {
                const result = await turnOnMaintenanceMode();
                (0, expect_1.expect)(result.status).to.deep.equal(200);
            }
            {
                const result = await expect_1.chai
                    .request(app)
                    .get(`${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}?switch=off`);
                (0, expect_1.expect)(result.status).to.deep.equal(200);
            }
            await AddPackageValidation.testResultDuringProcessing("Success" /* HandoffResult.SUCCESS */, false);
        });
    });
});
///////////////////////////////////////////////////////////////////////////////
/// Validation
///////////////////////////////////////////////////////////////////////////////
var AddPackageValidation;
(function (AddPackageValidation) {
    async function testResultDuringProcessing(handoffResultToInject, replace) {
        // Setup
        if (handoffResultToInject === "GracefulError" /* HandoffResult.GRACEFUL_ERROR */) {
            // Make rollback refresh pass
            // TODO should test rollback refresh failure
            const results = [handoffResultToInject, "Success" /* HandoffResult.SUCCESS */];
            let idx = 0;
            refreshStub.callsFake(async (...params) => {
                return refreshStubFn(params, {
                    result: results[idx++]
                });
            });
        }
        else {
            setupRefreshStubFn({ result: handoffResultToInject });
        }
        const result = await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
        const { submissionId } = result.body;
        // Get the promise to tell us when handoff is done
        const addPackagePromise = getFirstCall(addPackageSpy);
        // Validate
        let err = null;
        try {
            await addPackagePromise;
        }
        catch (e) {
            err = err || e;
        }
        switch (handoffResultToInject) {
            case "Success" /* HandoffResult.SUCCESS */:
                (0, expect_1.expect)(err).to.be.null;
                break;
            case "GracefulError" /* HandoffResult.GRACEFUL_ERROR */:
                (0, expect_1.expect)(err).to.be.not.null;
                (0, expect_1.expect)(err instanceof errors_1.GracefulError, JSON.stringify(err)).to.be.true;
                break;
            case "FatalError" /* HandoffResult.FATAL_ERROR */:
                (0, expect_1.expect)(err).to.be.not.null;
                (0, expect_1.expect)(err instanceof errors_1.GracefulError, JSON.stringify(err)).to.be.false;
                break;
        }
        await postValidateAddPackageResultDuringProcessing({
            submissionId,
            expectedZips: expectedZips1,
            expectedContent: expectedContent1,
            result: handoffResultToInject,
            expectedContentTopLevelItems: expectedContentTopLevelItems1,
            expectedZipsTopLevelItems: expectedZipsTopLevelItems1,
            replace
        });
        (0, expect_1.expect)(refreshStub.called).to.be.true;
    }
    AddPackageValidation.testResultDuringProcessing = testResultDuringProcessing;
    async function postValidateAddPackageResultDuringProcessing({ result, replace, submissionId, expectedZips, expectedContent, expectedContentTopLevelItems, expectedZipsTopLevelItems }) {
        // Assume if we are replacing the new / old content & zips are the same
        switch (result) {
            case "Success" /* HandoffResult.SUCCESS */: {
                // Verify the expected zips and package folders exist
                await (0, test_helpers_2.verifyContentAndZipsPresent)({
                    contentFolder: vars.contentBasePath,
                    content: expectedContent,
                    zipsFolder: vars.zipsFolder,
                    zips: expectedZips
                });
                // Verify nothing additional was added / removed to the content and zips folder.
                await verifyNothingExtraAddedOrRemoved({ add: expectedContentTopLevelItems, remove: [] }, { add: expectedZipsTopLevelItems, remove: [] });
                {
                    // Check the package manager file
                    const { packages } = (await fs.readJson(vars.packageManagerFile));
                    (0, expect_1.expect)(packages).to.have.length(1);
                    const [entry] = packages;
                    (0, expect_1.expect)(entry).to.deep.equal({
                        ...entry,
                        state: "valid" /* PackageEntryState.VALID */,
                        submissionId
                    });
                }
                break;
            }
            case "GracefulError" /* HandoffResult.GRACEFUL_ERROR */:
                if (replace) {
                    // Verify the expected zips and package folders exist
                    await (0, test_helpers_2.verifyContentAndZipsPresent)({
                        contentFolder: vars.contentBasePath,
                        content: expectedContent,
                        zipsFolder: vars.zipsFolder,
                        zips: expectedZips
                    });
                }
                else {
                    // Verify the expected zips and package folders do not exist
                    await (0, test_helpers_2.verifyContentAndZipsGone)({
                        contentFolder: vars.contentBasePath,
                        content: expectedContent,
                        zipsFolder: vars.zipsFolder,
                        zips: expectedZips
                    });
                }
                if (replace) {
                    await verifyNothingExtraAddedOrRemoved({ add: expectedContentTopLevelItems, remove: [] }, { add: expectedZipsTopLevelItems, remove: [] });
                    {
                        // Check the package manager file
                        const { packages } = (await fs.readJson(vars.packageManagerFile));
                        (0, expect_1.expect)(packages).to.have.length(1);
                        const [entry] = packages;
                        (0, expect_1.expect)(entry).to.deep.equal({
                            ...entry,
                            state: "valid" /* PackageEntryState.VALID */
                        });
                        (0, expect_1.expect)(entry.submissionId).to.not.equal(submissionId);
                    }
                }
                else {
                    // Verify nothing additional was added to the content and zips folder
                    // (including the content & zip folder items).
                    await verifyNothingExtraAddedOrRemoved({ add: [], remove: [] }, { add: expectedZipsTopLevelItems, remove: [] });
                    {
                        // Check the package manager file
                        const { packages } = (await fs.readJson(vars.packageManagerFile));
                        (0, expect_1.expect)(packages).to.have.length(0);
                    }
                }
                break;
            case "FatalError" /* HandoffResult.FATAL_ERROR */:
                {
                    // Verify the expected zips and package folders exist
                    await (0, test_helpers_2.verifyContentAndZipsPresent)({
                        contentFolder: vars.contentBasePath,
                        content: expectedContent,
                        zipsFolder: vars.zipsFolder,
                        zips: expectedZips
                    });
                }
                {
                    // Check the package manager file
                    const { packages } = (await fs.readJson(vars.packageManagerFile));
                    (0, expect_1.expect)(packages).to.have.length(1);
                    const [entry] = packages;
                    (0, expect_1.expect)(entry).to.deep.equal({
                        ...entry,
                        state: "staged" /* PackageEntryState.STAGED */,
                        submissionId
                    });
                    if (replace && entry.state === "staged" /* PackageEntryState.STAGED */) {
                        // Verify the backup exists
                        await (0, test_helpers_2.verifyContentAndZipsPresent)({
                            contentFolder: vars.contentBasePath,
                            content: [...entry.backupContent, ...entry.backupZips],
                            zipsFolder: vars.zipsFolder,
                            zips: []
                        });
                    }
                }
                break;
            default:
                (0, util_2.assertNever)(result);
                throw new Error(`Unknown result ${result}`);
        }
    }
    AddPackageValidation.postValidateAddPackageResultDuringProcessing = postValidateAddPackageResultDuringProcessing;
})(AddPackageValidation || (AddPackageValidation = {}));
var RemovePackageValidation;
(function (RemovePackageValidation) {
    async function testResultDuringProcessing(handoffResult) {
        {
            // Add the package to the server
            setupRefreshStubFn({ result: "Success" /* HandoffResult.SUCCESS */ });
            await addZipPackages([{ assets: { [util_3.Platform.ALL]: asset1 } }]);
            const addPackagePromise = getFirstCall(addPackageSpy);
            await addPackagePromise;
        }
        // Setup
        setupRefreshStubFn({ result: handoffResult });
        const result = await expect_1.chai
            .request(app)
            .del(`${"api/remove-package" /* API.DELETE_REMOVE_PACKAGE */}?id=com.ti.WATSON_CC32XX&version=1.10.00.04`);
        (0, expect_1.expect)(result.status).to.equal(200);
        const { submissionId } = result.body;
        // Get the promise to tell us when the delete is done
        const removePackagePromise = getFirstCall(removePackageSpy);
        // Validate
        {
            let err = null;
            try {
                await removePackagePromise;
            }
            catch (e) {
                err = err || e;
            }
            switch (handoffResult) {
                case "Success" /* HandoffResult.SUCCESS */:
                    (0, expect_1.expect)(err).to.be.null;
                    break;
                case "GracefulError" /* HandoffResult.GRACEFUL_ERROR */:
                    (0, expect_1.expect)(err).to.be.not.null;
                    (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.true;
                    break;
                case "FatalError" /* HandoffResult.FATAL_ERROR */:
                    (0, expect_1.expect)(err).to.be.not.null;
                    (0, expect_1.expect)(err instanceof errors_1.GracefulError).to.be.false;
                    break;
            }
        }
        await postValidateRemovePackageResultDuringProcessing({
            submissionId,
            expectedZips: expectedZips1,
            expectedContent: expectedContent1,
            result: handoffResult,
            expectedContentTopLevelItems: expectedContentTopLevelItems1,
            expectedZipsTopLevelItems: expectedZipsTopLevelItems1,
            replace: true
        });
    }
    RemovePackageValidation.testResultDuringProcessing = testResultDuringProcessing;
    async function postValidateRemovePackageResultDuringProcessing({ result, expectedZips, expectedContent, expectedContentTopLevelItems, expectedZipsTopLevelItems }) {
        switch (result) {
            case "Success" /* HandoffResult.SUCCESS */: {
                {
                    // Verify the expected zips and package folders removed
                    await (0, test_helpers_2.verifyContentAndZipsGone)({
                        contentFolder: vars.contentBasePath,
                        content: expectedContent,
                        zipsFolder: vars.zipsFolder,
                        zips: expectedZips
                    });
                }
                {
                    // Verify nothing else was removed from the content and zips folder
                    await verifyNothingExtraAddedOrRemoved({ remove: expectedContentTopLevelItems, add: [] }, { remove: [], add: expectedZipsTopLevelItems });
                }
                {
                    // Check the package manager file
                    const { packages } = (await fs.readJson(vars.packageManagerFile));
                    (0, expect_1.expect)(packages).to.have.length(0);
                }
                break;
            }
            case "GracefulError" /* HandoffResult.GRACEFUL_ERROR */:
                {
                    // Verify the expected zips and package folders exist
                    await (0, test_helpers_2.verifyContentAndZipsPresent)({
                        contentFolder: vars.contentBasePath,
                        content: expectedContent,
                        zipsFolder: vars.zipsFolder,
                        zips: expectedZips
                    });
                }
                {
                    // Verify nothing was added / removed to the content and zips folder.
                    await verifyNothingExtraAddedOrRemoved({ remove: [], add: expectedContentTopLevelItems }, { remove: [], add: expectedZipsTopLevelItems });
                }
                {
                    // Check the package manager file
                    const { packages } = (await fs.readJson(vars.packageManagerFile));
                    (0, expect_1.expect)(packages).to.have.length(1);
                    const [entry] = packages;
                    (0, expect_1.expect)(entry).to.deep.equal({
                        ...entry,
                        state: "valid" /* PackageEntryState.VALID */
                    });
                }
                break;
            case "FatalError" /* HandoffResult.FATAL_ERROR */:
                {
                    // Verify the expected zips and package folders exist
                    await (0, test_helpers_2.verifyContentAndZipsPresent)({
                        contentFolder: vars.contentBasePath,
                        content: expectedContent,
                        zipsFolder: vars.zipsFolder,
                        zips: expectedZips
                    });
                }
                {
                    // Check the package manager file
                    const { packages } = (await fs.readJson(vars.packageManagerFile));
                    (0, expect_1.expect)(packages).to.have.length(1);
                    const [entry] = packages;
                    (0, expect_1.expect)(entry).to.deep.equal({
                        ...entry,
                        state: "staged" /* PackageEntryState.STAGED */
                    });
                }
                break;
            default:
                (0, util_2.assertNever)(result);
                throw new Error(`Unknown result ${result}`);
        }
    }
    RemovePackageValidation.postValidateRemovePackageResultDuringProcessing = postValidateRemovePackageResultDuringProcessing;
})(RemovePackageValidation || (RemovePackageValidation = {}));
///////////////////////////////////////////////////////////////////////////////
/// Helper Functions
///////////////////////////////////////////////////////////////////////////////
async function addZipPackages(items, expectedStatus = 200) {
    const resultPost = await expect_1.chai
        .request(app)
        .post("api/add-package" /* API.POST_ADD_PACKAGE */)
        .type('form')
        .send({
        entries: JSON.stringify(items.map(({ assets, localAssets }) => ({
            email: EMAIL,
            assets,
            localAssets,
            submissionType: 'zip'
        }))),
        version: '4.8.0'
    });
    (0, expect_1.expect)(resultPost.status).to.equal(expectedStatus);
    return resultPost;
}
async function addInstallerPackages(items, expectedStatus = 200) {
    const resultPost = await expect_1.chai
        .request(app)
        .post("api/add-package" /* API.POST_ADD_PACKAGE */)
        .type('form')
        .send({
        entries: JSON.stringify(items.map(({ assets, localAssets, installCommand, submittedPackage }) => ({
            email: EMAIL,
            assets,
            localAssets,
            submissionType: 'installer',
            installCommand,
            submittedPackage
        }))),
        version: '4.8.0'
    });
    (0, expect_1.expect)(resultPost.status).to.equal(expectedStatus);
    return resultPost;
}
// beforeEach, afterEach
async function beforeEachHandoffRouteTest() {
    refreshStub = sinon.stub(refreshManager, 'individualRefresh');
    dbImportAndPublishStub = sinon.stub(dbImportAndPublishFile, 'dbImportAndPublish');
    sendEmailStub = sinon.stub(helpersNode._object, 'sendEmail');
    addPackageSpy = sinon.spy(handoffManager, 'addPackage');
    removePackageSpy = sinon.spy(handoffManager, 'removePackage');
    cleanupStagedPackagesSpy = sinon.spy(handoffManager, 'cleanupStagedPackages');
    dbImportAndPublishStub.resolves(); // not tested as part of this suite
    sendEmailStub.callsFake(sendEmailStubFn);
    await fs.ensureDir(path.dirname(vars.packageManagerFile));
    await fs.writeJSON(vars.packageManagerFile, { packages: [] });
    await preCleanupContentAndZips();
}
async function afterEachHandoffRouteTest() {
    refreshStub.restore();
    dbImportAndPublishStub.restore();
    sendEmailStub.restore();
    addPackageSpy.restore();
    removePackageSpy.restore();
    cleanupStagedPackagesSpy.restore();
    await cleanupContentAndZips();
    await (0, util_3.ignoreError)(() => fs.remove(vars.overridesDir));
    await (0, util_3.ignoreError)(() => fs.remove(vars.packageManagerFile));
    await expect_1.chai.request(app).get(`${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}?switch=off`);
}
async function preCleanupContentAndZips() {
    await fs.ensureDir(vars.contentBasePath);
    await fs.ensureDir(vars.zipsFolder);
    contentFolderItems = await fs.readdir(vars.contentBasePath);
    zipFolderItems = await fs.readdir(vars.zipsFolder);
}
async function cleanupContentAndZips() {
    await fs.ensureDir(vars.contentBasePath);
    await fs.ensureDir(vars.zipsFolder);
    const newContentItems = await fs.readdir(vars.contentBasePath);
    const toRemoveContent = newContentItems
        .filter(item => contentFolderItems.indexOf(item) === -1)
        .map(item => path.join(vars.contentBasePath, item));
    const newZipItems = await fs.readdir(vars.zipsFolder);
    const toRemoveZips = newZipItems
        .filter(item => zipFolderItems.indexOf(item) === -1)
        .map(item => path.join(vars.zipsFolder, item));
    await Promise.all([...toRemoveContent, ...toRemoveZips].map(item => fs.remove(item)));
}
// Stubs
async function refreshStubFn(params, config) {
    const [rpl] = params;
    if (config.result === "FatalError" /* HandoffResult.FATAL_ERROR */) {
        throw new Error('Fatal refresh error');
    }
    return {
        result: [...rpl],
        success: config.result === "Success" /* HandoffResult.SUCCESS */
    };
}
async function sendEmailStubFn(args) {
    if (SEND_EMAIL) {
        await sendEmail(args);
    }
}
// Misc
/**
 * Reset all the stubs and spies. Useful if you want to make multiple calls to these APIs
 *
 */
function resetStubsAndSpies() {
    refreshStub.resetHistory();
    dbImportAndPublishStub.resetHistory();
    sendEmailStub.resetHistory();
    addPackageSpy.resetHistory();
    removePackageSpy.resetHistory();
    cleanupStagedPackagesSpy.resetHistory();
}
function setupRefreshStubFn(config) {
    refreshStub.callsFake(async (...params) => refreshStubFn(params, config));
}
async function getFirstCall(spy) {
    while (!spy.called) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return spy.getCall(0).returnValue;
}
async function turnOnMaintenanceMode() {
    const getMaintenanceMode = () => expect_1.chai.request(app).get(`${"api/maintenance-mode" /* API.GET_MAINTENANCE_MODE */}?switch=on`);
    let result = await getMaintenanceMode();
    while (result.status === 202) {
        result = await getMaintenanceMode();
    }
    return result;
}
async function verifyNothingExtraAddedOrRemoved(expectedContentTopLevelItems, expectedZipsTopLevelItems) {
    const contentItems = await fs.readdir(vars.contentBasePath);
    const zipItems = await fs.readdir(vars.zipsFolder);
    const expectedContentFolder = _.uniq(contentFolderItems
        .filter(item => expectedContentTopLevelItems.remove.indexOf(item) === -1)
        .concat(expectedContentTopLevelItems.add));
    const expectedZipFolder = _.uniq(zipFolderItems
        .filter(item => expectedZipsTopLevelItems.remove.indexOf(item) === -1)
        .concat(expectedZipsTopLevelItems.add));
    (0, expect_1.expect)(expectedContentFolder).to.deep.equal(contentItems.sort());
    (0, expect_1.expect)(expectedZipFolder).to.deep.equal(zipItems.sort());
}
