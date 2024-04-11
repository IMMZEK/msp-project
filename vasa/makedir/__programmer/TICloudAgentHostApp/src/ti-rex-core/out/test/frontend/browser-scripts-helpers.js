'use strict';
/*
  These are the scripts which run on the browser, these are not transpilied down (no dependencies, no es6, etc)
*/
// FakeServerHelpers
exports.setupFakeServerScript = function (data, initialPage, callback) {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.FakeServerHelpers.setupFakeServer(data, initialPage)
        .then(function () {
        callback();
    })
        .catch(function (e) {
        callback(e);
    });
};
exports.cleanupFakeServerScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.FakeServerHelpers.cleanupFakeServer();
};
exports.getFakeServerRequestsScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    return window.testingHelpers.FakeServerHelpers.getFakeServerRequests();
};
// MockAgent
exports.installCloudAgentScript = function (options) {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.MockAgent.installCloudAgent(options);
};
exports.uninstallCloudAgentScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.MockAgent.uninstallCloudAgent();
};
exports.getRexCloudAgentModuleSpiesScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    return JSON.stringify(window.testingHelpers.MockAgent.getRexCloudAgentModuleSpies());
};
// PromiseSyncronizationHelpers
exports.waitForPromisesToResolveScript = function (indicies, callback) {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.PromiseSyncronizationHelpers.waitForPromisesToResolve(indicies, callback);
};
exports.setupPromiseSyncronizationScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.PromiseSyncronizationHelpers.setupPromiseSyncronization();
};
exports.cleanupPromiseSyncronizationScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.PromiseSyncronizationHelpers.cleanupPromiseSyncronization();
};
exports.getActivePromiseIndiciesScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    return window.testingHelpers.PromiseSyncronizationHelpers.getActivePromiseIndicies();
};
// UrlHelpers
exports.updateUrlForTestingScript = function (link) {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.UrlHelpers.updateUrlForTesting(link);
};
// ClearCaches
exports.clearCachesScript = function () {
    if (!window.testingHelpers) {
        throw new Error('Missing testing helpers, make sure you called setTestingHelpers');
    }
    window.testingHelpers.ClearCaches.clearCaches();
};
