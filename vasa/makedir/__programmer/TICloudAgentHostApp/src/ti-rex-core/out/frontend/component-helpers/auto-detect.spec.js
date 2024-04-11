"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const auto_detect_1 = require("./auto-detect");
const expect_1 = require("../../test/expect");
const mock_device_detector_module_1 = require("../mock-agent/mock-device-detector-module");
const mock_agent_1 = require("../mock-agent/mock-agent");
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
// Allow expect({}).to.exist
// tslint:disable:no-unused-expression
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] AutoDetect', () => {
    before(() => (0, browser_emulator_1.browserEmulator)());
    afterEach(() => (0, mock_agent_1.uninstallCloudAgent)());
    it('should resolve with a detected set of devices', async () => {
        const result = await detect();
        verifySuccess(result);
    });
    it('should resolve with files needed if files must be downloaded', async () => {
        const result = await detect({ filesNeeded: 1 });
        (0, expect_1.expect)(result.type).to.be.equal("HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */);
        if (result.type === "HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */) {
            (0, expect_1.expect)(result.handler).to.exist;
        }
    });
    it('should resolve with detected devices after downloading files', async () => {
        const agent = await (0, mock_agent_1.installCloudAgent)({ filesNeeded: 1 }).Init();
        const detector = new auto_detect_1.AutoDetect();
        let progressMessages = 0;
        detector.addProgressListener(() => ++progressMessages);
        const changeDetected = new Promise(resolve => detector.addChangeListener(resolve));
        let result = await detector.detect(agent);
        (0, expect_1.expect)(result.type).to.be.equal("HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */);
        if (result.type === "HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */) {
            result.handler();
            await changeDetected;
            result = await detector.detect(agent);
            verifySuccess(result);
        }
    });
    [
        'errorGetSubModule',
        'errorFilesNeeded',
        'errorDetectDebugProbes',
        'errorDetectDeviceWithProbe'
    ].forEach((errorPoint, index) => {
        it(`should resolve with a cloud agent error at any point (${errorPoint})`, async () => {
            const result = await detect({ [errorPoint]: true });
            (0, expect_1.expect)(result.type).to.be.equal("UNKNOWN_ERROR" /* DetectionResultType.UNKNOWN_ERROR */);
            if (result.type === "UNKNOWN_ERROR" /* DetectionResultType.UNKNOWN_ERROR */) {
                (0, expect_1.expect)(result.error).to.be.equal('host communication error');
            }
        });
        if (index >= 2) {
            it(`should resolve with a cloud agent error after downloading files (${errorPoint})`, async () => {
                const agent = await (0, mock_agent_1.installCloudAgent)({
                    [errorPoint]: true,
                    filesNeeded: 3
                }).Init();
                const detector = new auto_detect_1.AutoDetect();
                const changeDetected = new Promise(resolve => detector.addChangeListener(resolve));
                let result = await detector.detect(agent);
                (0, expect_1.expect)(result.type).to.be.equal("HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */);
                if (result.type === "HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */) {
                    result.handler();
                    await changeDetected;
                    result = await detector.detect(agent);
                    (0, expect_1.expect)(result.type).to.be.equal("UNKNOWN_ERROR" /* DetectionResultType.UNKNOWN_ERROR */);
                    if (result.type === "UNKNOWN_ERROR" /* DetectionResultType.UNKNOWN_ERROR */) {
                        (0, expect_1.expect)(result.error).to.be.equal('host communication error');
                    }
                }
            });
        }
    });
    ['attach', 'detach'].forEach(change => {
        it(`should respond to a ${change} event`, async () => {
            const agent = await (0, mock_agent_1.installCloudAgent)({ [change]: 500 }).Init();
            const detector = new auto_detect_1.AutoDetect();
            const changeDetected = new Promise(resolve => detector.addChangeListener(resolve));
            let result = await detector.detect(agent);
            verifySuccess(result);
            await changeDetected;
            result = await detector.detect(agent);
            verifySuccess(result, change === 'attach' ? mock_device_detector_module_1.initialDevices + 1 : mock_device_detector_module_1.initialDevices - 1);
        });
    });
});
async function detect(options = {}) {
    const agent = await (0, mock_agent_1.installCloudAgent)(options).Init();
    const detector = new auto_detect_1.AutoDetect();
    return detector.detect(agent);
}
function verifySuccess(result, expectedDevices = mock_device_detector_module_1.initialDevices) {
    (0, expect_1.expect)(result.type).to.be.equal("SUCCESS" /* DetectionResultType.SUCCESS */);
    if (result.type === "SUCCESS" /* DetectionResultType.SUCCESS */) {
        (0, expect_1.expect)(result.detectedDevices).to.be.deep.equal(mock_device_detector_module_1.attachedDevices.slice(0, expectedDevices));
    }
}
