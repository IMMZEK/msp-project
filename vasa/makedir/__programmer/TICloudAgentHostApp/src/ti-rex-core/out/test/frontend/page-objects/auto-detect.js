'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDetect = void 0;
// 3rd party
const protractor_1 = require("protractor");
// our modules
const auto_detect_1 = require("../../../frontend/components/auto-detect");
const expect_1 = require("../../expect");
const mock_device_detector_module_1 = require("../../../frontend/mock-agent/mock-device-detector-module");
const open_close_helpers_1 = require("./open-close-helpers");
const util_1 = require("./util");
const util_2 = require("../../../frontend/component-helpers/util");
const browser_scripts_1 = require("../browser-scripts");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
const detectedDevices = mock_device_detector_module_1.attachedDevices.filter(d => d.name);
const initialFilteredDevices = mock_device_detector_module_1.attachedDevices.slice(0, mock_device_detector_module_1.initialDevices).filter(d => d.name).length;
var AutoDetect;
(function (AutoDetect) {
    // Actions
    async function clickButton() {
        await (0, util_1.clickElement)((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.autoDetectButton)));
    }
    AutoDetect.clickButton = clickButton;
    async function closeDialog() {
        await (0, open_close_helpers_1.closeItem)(util_2.TEST_ID.autoDetectDialogClose, util_2.TEST_ID.autoDetectDialogContent);
    }
    AutoDetect.closeDialog = closeDialog;
    async function openDetectedDevicesMenu() {
        await (0, open_close_helpers_1.openItem)(util_2.TEST_ID.autoDetectButton, util_2.TEST_ID.autoDetectDetectedMenu);
    }
    AutoDetect.openDetectedDevicesMenu = openDetectedDevicesMenu;
    async function selectDetectedDevice(id) {
        await AutoDetect.verifyButton(auto_detect_1.SELECT_TEXT, true);
        await AutoDetect.openDetectedDevicesMenu();
        const items = await AutoDetect.getDetectedDevices();
        await (0, util_1.clickElement)(await (0, util_1.getItemById)(items, util_2.TEST_ID.autoDetectDetectedMenuItem(id)));
    }
    AutoDetect.selectDetectedDevice = selectDetectedDevice;
    // Verify
    async function verifyButton(expectedText = auto_detect_1.BEGIN_TEXT, allowSubstring = false) {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_2.TEST_ID.autoDetectButton);
        // Make sure we resolve all cloud agent communication before testing
        await (0, browser_scripts_1.waitForPromisesToResolve)(await (0, browser_scripts_1.getActivePromiseIndicies)());
        const text = await (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.autoDetectButton)).getText();
        compareText(text, expectedText, allowSubstring);
    }
    AutoDetect.verifyButton = verifyButton;
    async function verifyDialogOpen(expectedText, allowSubstring = false) {
        await (0, open_close_helpers_1.waitUntilItemOpen)(util_2.TEST_ID.autoDetectDialogContent);
        const text = await (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.autoDetectDialogContent)).getText();
        compareText(text, expectedText, allowSubstring);
    }
    AutoDetect.verifyDialogOpen = verifyDialogOpen;
    async function verifyDialogClosed() {
        await (0, open_close_helpers_1.waitUntilItemClosed)(util_2.TEST_ID.autoDetectDialogContent);
    }
    AutoDetect.verifyDialogClosed = verifyDialogClosed;
    async function verifyDetectedDevices(numDevices = initialFilteredDevices) {
        const listItems = await getDetectedDevices();
        (0, expect_1.expect)(listItems).to.have.lengthOf(numDevices);
        await Promise.all(listItems.map(async (listItem, i) => {
            const expectedText = detectedDevices[i].name || '';
            compareText(await listItem.getText(), expectedText, false);
        }));
    }
    AutoDetect.verifyDetectedDevices = verifyDetectedDevices;
    // Helpers
    async function getDetectedDevices() {
        const items = (await protractor_1.element.all(protractor_1.by.css('[id^=test-id-auto-detect-detected-menu-item]')));
        return items;
    }
    AutoDetect.getDetectedDevices = getDetectedDevices;
    function compareText(text1, text2, allowSubstring) {
        text1 = text1.toLowerCase();
        text2 = text2.toLowerCase();
        if (allowSubstring) {
            (0, expect_1.expect)(text1).to.contain(text2);
        }
        else {
            (0, expect_1.expect)(text1).to.deep.equal(text2);
        }
    }
})(AutoDetect || (exports.AutoDetect = AutoDetect = {}));
