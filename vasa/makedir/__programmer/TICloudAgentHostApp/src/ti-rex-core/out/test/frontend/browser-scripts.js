"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCaches = exports.updateUrlForTesting = exports.getActivePromiseIndicies = exports.cleanupPromiseSyncronization = exports.setupPromiseSyncronization = exports.waitForPromisesToResolve = exports.getRexCloudAgentModuleSpies = exports.uninstallCloudAgent = exports.installCloudAgent = exports.getFakeServerRequests = exports.cleanupFakeServer = exports.setupFakeServer = void 0;
// 3rd party
const protractor_1 = require("protractor");
// our modules
const browser_scripts_helpers_1 = require("./browser-scripts-helpers");
///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////
// FakeServerHelpers
async function setupFakeServer(data, initialPage) {
    await protractor_1.browser.executeAsyncScript(browser_scripts_helpers_1.setupFakeServerScript, data, initialPage).then(err => {
        if (err) {
            throw err;
        }
    });
}
exports.setupFakeServer = setupFakeServer;
async function cleanupFakeServer() {
    await protractor_1.browser.executeScript(browser_scripts_helpers_1.cleanupFakeServerScript);
}
exports.cleanupFakeServer = cleanupFakeServer;
async function getFakeServerRequests() {
    return protractor_1.browser.executeScript(browser_scripts_helpers_1.getFakeServerRequestsScript);
}
exports.getFakeServerRequests = getFakeServerRequests;
// MockAgent
async function installCloudAgent(options) {
    await protractor_1.browser.executeScript(browser_scripts_helpers_1.installCloudAgentScript, options);
}
exports.installCloudAgent = installCloudAgent;
async function uninstallCloudAgent() {
    await protractor_1.browser.executeScript(browser_scripts_helpers_1.uninstallCloudAgentScript);
}
exports.uninstallCloudAgent = uninstallCloudAgent;
async function getRexCloudAgentModuleSpies() {
    const result = await protractor_1.browser.executeScript(browser_scripts_helpers_1.getRexCloudAgentModuleSpiesScript);
    // We serialize / de-serialize as json since as-is sending the object to protractor
    // triggers an object cycle in firefox
    // (even though the object itself can be serialized as json, meaning it doesn't have a cycle itself)
    const asObject = JSON.parse(result);
    return asObject;
}
exports.getRexCloudAgentModuleSpies = getRexCloudAgentModuleSpies;
// PromiseSyncronizationHelpers
async function waitForPromisesToResolve(indicies) {
    await protractor_1.browser.executeAsyncScript(browser_scripts_helpers_1.waitForPromisesToResolveScript, indicies).then(err => {
        if (err) {
            throw err;
        }
    });
}
exports.waitForPromisesToResolve = waitForPromisesToResolve;
async function setupPromiseSyncronization() {
    await protractor_1.browser.executeScript(browser_scripts_helpers_1.setupPromiseSyncronizationScript);
}
exports.setupPromiseSyncronization = setupPromiseSyncronization;
async function cleanupPromiseSyncronization() {
    await protractor_1.browser.executeScript(browser_scripts_helpers_1.cleanupPromiseSyncronizationScript);
}
exports.cleanupPromiseSyncronization = cleanupPromiseSyncronization;
async function getActivePromiseIndicies() {
    return protractor_1.browser.executeScript(browser_scripts_helpers_1.getActivePromiseIndiciesScript);
}
exports.getActivePromiseIndicies = getActivePromiseIndicies;
// UrlHelpers
async function updateUrlForTesting(link) {
    await protractor_1.browser.executeScript(browser_scripts_helpers_1.updateUrlForTestingScript, link);
}
exports.updateUrlForTesting = updateUrlForTesting;
// ClearCaches
async function clearCaches() {
    await protractor_1.browser.executeScript(browser_scripts_helpers_1.clearCachesScript);
}
exports.clearCaches = clearCaches;
