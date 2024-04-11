"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIsPackageInstalled = void 0;
const use_local_apis_1 = require("./use-local-apis");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function useIsPackageInstalled(args) {
    const { appProps, errorCallback, packageUid, allowNoAgent } = args;
    const { result: installedPackages, ...rest } = (0, use_local_apis_1.useGetInstalledPackages)({
        appProps,
        errorCallback,
        allowNoAgent
    });
    if (!installedPackages) {
        return { result: null, ...rest };
    }
    if (installedPackages.find((item) => item.packagePublicUid === packageUid)) {
        return { result: "INSTALLED" /* PackageInstalled.INSTALLED */, ...rest };
    }
    return { result: "NOT_INSTALLED" /* PackageInstalled.NOT_INSTALLED */, ...rest };
}
exports.useIsPackageInstalled = useIsPackageInstalled;
