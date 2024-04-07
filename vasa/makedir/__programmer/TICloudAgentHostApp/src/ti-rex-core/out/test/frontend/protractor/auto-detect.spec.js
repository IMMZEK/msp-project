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
const auto_detect_1 = require("../page-objects/auto-detect");
const browser_emulator_1 = require("../browser-emulator");
const browser_scripts_1 = require("../browser-scripts");
const Data = require("../data");
const expect_1 = require("../../expect");
const initialize_server_harness_data_1 = require("../../server-harness/initialize-server-harness-data");
const mock_device_detector_module_1 = require("../../../frontend/mock-agent/mock-device-detector-module");
const util_1 = require("../util");
const util_2 = require("../page-objects/util");
const util_3 = require("../../../frontend/component-helpers/util");
// our components
const auto_detect_2 = require("../../../frontend/components/auto-detect");
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
const initialFilteredDevices = mock_device_detector_module_1.attachedDevices.slice(0, mock_device_detector_module_1.initialDevices).filter(d => d.name).length;
const ATTACH_DETACH_DELAY_MS = 1000;
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
describe('[frontend] AutoDetect', function () {
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
    it('Should display a button to get a list of auto-detected devices', async function () {
        await setup({});
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
    });
    it('Should display the list of detected devices when the button is clicked', async function () {
        await setup({});
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
        await auto_detect_1.AutoDetect.openDetectedDevicesMenu();
        await auto_detect_1.AutoDetect.verifyDetectedDevices();
    });
    it('Should update the selection when an auto-detected device is clicked', async function () {
        (0, expect_1.expect)(data1.filterData.devices.length).to.be.greaterThan(0);
        const device = data1.filterData.devices[0];
        await setup({});
        await auto_detect_1.AutoDetect.selectDetectedDevice(device.publicId);
        await (0, util_2.verifyUrl)({ apis, urlQuery: { devices: [device.publicId] } });
    });
    it('Should resolve with detected devices after downloading files', async function () {
        await setup({ filesNeeded: 1 });
        await auto_detect_1.AutoDetect.verifyButton();
        await auto_detect_1.AutoDetect.clickButton();
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
        await auto_detect_1.AutoDetect.openDetectedDevicesMenu();
        await auto_detect_1.AutoDetect.verifyDetectedDevices();
    });
    it('Should respond to an attach event', async function () {
        await setup({ attach: ATTACH_DETACH_DELAY_MS });
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
        await auto_detect_1.AutoDetect.openDetectedDevicesMenu();
        await auto_detect_1.AutoDetect.verifyDetectedDevices();
        await protractor_1.browser.sleep(ATTACH_DETACH_DELAY_MS * 2);
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
        await auto_detect_1.AutoDetect.openDetectedDevicesMenu();
        await auto_detect_1.AutoDetect.verifyDetectedDevices(initialFilteredDevices + 1);
    });
    it('Should respond to a detach event (removing the device from the list of detected devices)', async function () {
        await setup({ detach: ATTACH_DETACH_DELAY_MS });
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
        await auto_detect_1.AutoDetect.openDetectedDevicesMenu();
        await auto_detect_1.AutoDetect.verifyDetectedDevices();
        await protractor_1.browser.sleep(ATTACH_DETACH_DELAY_MS * 2);
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
    });
    it('Should select the device via clicking the auto-detect button when there is only one device to choose (instead of showing a dropdown when there are multiple', async function () {
        (0, expect_1.expect)(data1.filterData.devices.length).to.be.greaterThan(0);
        const device = data1.filterData.devices[0];
        await setup({ detach: ATTACH_DETACH_DELAY_MS });
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
        await auto_detect_1.AutoDetect.openDetectedDevicesMenu();
        await auto_detect_1.AutoDetect.verifyDetectedDevices();
        await protractor_1.browser.sleep(ATTACH_DETACH_DELAY_MS * 2);
        await auto_detect_1.AutoDetect.verifyButton(auto_detect_2.SELECT_TEXT, true);
        await auto_detect_1.AutoDetect.clickButton();
        await (0, util_2.verifyUrl)({ apis, urlQuery: { devices: [device.publicId] } });
    });
    it('Should resolve with the files needed if files must be downloaded', async function () {
        await setup({ filesNeeded: util_3.LOADING_DELAY_MS });
        await auto_detect_1.AutoDetect.verifyButton();
        // Don't wait on the click promises to resolve so we can see the progress (if we use clickElement we would do this)
        await (0, protractor_1.element)(protractor_1.by.id(util_3.TEST_ID.autoDetectButton)).click();
        // Clicking should have caused us to start downloading five files, once per LOADING_DELAY_MS ms
        // Wait twice to ensure we've had time for the promise to kick off, and the loading delay to
        // say "ok to show progress"
        await protractor_1.browser.sleep(util_3.LOADING_DELAY_MS * 2);
        // Now we should see progress messages
        await (0, expect_1.expect)((0, protractor_1.element)(protractor_1.by.id(util_3.TEST_ID.autoDetectDownloadProgressBar)).isPresent()).to
            .eventually.be.true;
        // Let the download finish
        const indicies = await (0, browser_scripts_1.getActivePromiseIndicies)();
        await (0, browser_scripts_1.waitForPromisesToResolve)(indicies);
        // Now progress should go away
        await (0, expect_1.expect)((0, protractor_1.element)(protractor_1.by.id(util_3.TEST_ID.autoDetectDownloadProgressBar)).isPresent()).to
            .eventually.be.false;
    });
    async function setup(options) {
        await (0, util_1.lightSetupProtractorTest)({
            apis,
            urlQuery: {},
            additionalSetup: () => (0, browser_scripts_1.installCloudAgent)(options)
        });
    }
});
