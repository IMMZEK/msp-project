"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFakeServerRequests = exports.cleanupFakeServer = exports.setupFakeServer = void 0;
const ajax_harness_1 = require("../../test/ajax-harness/ajax-harness");
const util_1 = require("../component-helpers/util");
let ajaxHarness = null;
async function setupFakeServer(data, initialPage) {
    if (ajaxHarness) {
        throw new Error(`AjaxHarness not cleared before calling setup`);
    }
    ajaxHarness = new ajax_harness_1.AjaxHarness({
        serverType: ajax_harness_1.ServerType.FAKE_SERVER,
        role: ''
    });
    await ajaxHarness.setupTestFakeServer(data);
    if ((0, util_1.isBrowserEnvironment)()) {
        window.initialPage = initialPage;
    }
}
exports.setupFakeServer = setupFakeServer;
function cleanupFakeServer() {
    if (ajaxHarness) {
        ajaxHarness.cleanup();
    }
    ajaxHarness = null;
}
exports.cleanupFakeServer = cleanupFakeServer;
function getFakeServerRequests() {
    if (!ajaxHarness) {
        throw new Error('trying to call getFakeServerRequests before calling setup');
    }
    return ajaxHarness.getRequests();
}
exports.getFakeServerRequests = getFakeServerRequests;
