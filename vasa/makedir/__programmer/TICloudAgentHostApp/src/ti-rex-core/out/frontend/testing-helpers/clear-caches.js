"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCaches = void 0;
const util_1 = require("../component-helpers/util");
function clearCaches() {
    const appProps = window.appPropsInitial;
    if (appProps) {
        // Clear caches
        appProps.apis._getCacheInterface().clearCache();
        appProps.localApis._clearCachedData();
        // Reset any state made at the index.tsx level (add here as we need to wipe more for testing)
        appProps.autoDetect._reset();
        appProps.mountComponentTemporarily._reset();
        // Clear any globals
        (0, util_1._clearTICloudAgentObject)();
    }
}
exports.clearCaches = clearCaches;
