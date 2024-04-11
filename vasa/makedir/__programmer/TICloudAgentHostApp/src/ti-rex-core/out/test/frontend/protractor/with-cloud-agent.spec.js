'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.E2E) {
    // @ts-ignore
    return;
}
// our modules
const apis_1 = require("../../../frontend/apis/apis");
const auto_detect_1 = require("../page-objects/auto-detect");
const browser_emulator_1 = require("../browser-emulator");
const browser_scripts_1 = require("../browser-scripts");
const Data = require("../data");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const mock_device_detector_module_1 = require("../../../frontend/mock-agent/mock-device-detector-module");
const mock_agent_1 = require("../../../frontend/mock-agent/mock-agent");
const util_1 = require("../util");
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
const { rootNode, emptyFilterData } = Data;
const detectedDevices = mock_device_detector_module_1.attachedDevices.filter(d => d.name);
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        devices: detectedDevices.map(({ id, name }, idx) => {
            if (!name) {
                throw new Error('No name');
            }
            return {
                name,
                publicId: id || `Unknown-${idx}`
            };
        })
    },
    rootNode,
    hierarchy: {
        [rootNode]: []
    },
    nodeData: {}
};
///////////////////////////////////////////////////////////////////////////////
// Tests
///////////////////////////////////////////////////////////////////////////////
// Tests withCloudAgent functionality using AutoDetect
describe('[frontend] withCloudAgent', function () {
    this.timeout(util_1.PROTRACTOR_TEST_TIMEOUT);
    const apis = new apis_1.APIs();
    before(async () => {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupProtractorTest)({ data: data1, apis, urlQuery: {} });
    });
    after(async () => {
        await (0, util_1.cleanupProtractorTest)();
    });
    afterEach(async function () {
        const testName = this.currentTest ? this.currentTest.fullTitle() : 'Unknown Test';
        await (0, browser_scripts_1.uninstallCloudAgent)();
        await (0, util_1.logBrowserConsole)(testName);
    });
    it('Should show a button that presents an error dialog if the ticloudagent service is not running', async function () {
        await auto_detect_1.AutoDetect.verifyButton();
        await auto_detect_1.AutoDetect.clickButton();
        await auto_detect_1.AutoDetect.verifyDialogOpen('The ticloudagent service is not running', true);
        await auto_detect_1.AutoDetect.closeDialog();
        await auto_detect_1.AutoDetect.verifyDialogClosed();
    });
    it('Should show a button with install-wizard if cloud agent is not installed', async function () {
        await setup({ agentNotInstalled: true });
        await auto_detect_1.AutoDetect.verifyButton();
        await auto_detect_1.AutoDetect.clickButton();
        await auto_detect_1.AutoDetect.verifyDialogOpen(mock_agent_1.mockInstallWizard.description, true);
        await auto_detect_1.AutoDetect.closeDialog();
        await auto_detect_1.AutoDetect.verifyDialogClosed();
    });
    // Note: these error tests are focused on auto-detect but test the general error handling
    [
        'errorGetSubModule',
        'errorFilesNeeded',
        'errorDetectDebugProbes',
        'errorDetectDeviceWithProbe'
    ].forEach((errorPoint, index) => {
        it(`Should show a button that presents an error dialog (${errorPoint})`, async function () {
            await setup({ [errorPoint]: true });
            await auto_detect_1.AutoDetect.verifyButton();
            await auto_detect_1.AutoDetect.clickButton();
            await auto_detect_1.AutoDetect.verifyDialogOpen('host communication error', true);
            await auto_detect_1.AutoDetect.closeDialog();
            await auto_detect_1.AutoDetect.verifyDialogClosed();
        });
        if (index < 2) {
            return;
        }
        it(`Should pop up a cloud agent error after downloading files (${errorPoint})`, async function () {
            await setup({ [errorPoint]: true, filesNeeded: 1 });
            await auto_detect_1.AutoDetect.verifyButton();
            // First click to start the file download, second to open the dialog with the error
            await (0, util_2.waitForPromisesAfterActionToResolve)(async () => {
                await auto_detect_1.AutoDetect.clickButton();
            });
            await auto_detect_1.AutoDetect.clickButton();
            await auto_detect_1.AutoDetect.verifyDialogOpen('host communication error', true);
            await auto_detect_1.AutoDetect.closeDialog();
            await auto_detect_1.AutoDetect.verifyDialogClosed();
        });
    });
    async function setup(options) {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            urlQuery: {},
            additionalSetup: () => (0, browser_scripts_1.installCloudAgent)(options)
        });
    }
});
