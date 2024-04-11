"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalledPackagesNoQ = void 0;
const util_1 = require("../../shared/util");
/**
 * Get package info of installed packages sorted by version
 *
 */
async function getInstalledPackagesNoQ(dbOverviews) {
    const packageOverviews = await dbOverviews.findAsync({
        resourceType: 'packageOverview'
    });
    return sortOverviews(packageOverviews).map(o => {
        return {
            name: o.name,
            packageVersion: o.packageVersion,
            packagePublicId: o.packageId,
            packagePublicUid: o.packageUId,
            licenses: o.license ? [o.license] : undefined,
            dependencies: o.dependencies.map(dep => {
                // Note: it would be nice if we had a separation of what BU specifies in their metadata and what we read
                if (!dep.refId) {
                    throw new Error(`Missing refId in dep for packageOverview ${o.packageUId}`);
                }
                else if (dep.require &&
                    dep.require !== "mandatory" /* PackageDependencyType.MANDATORY */ &&
                    dep.require !== "optional" /* PackageDependencyType.OPTIONAL */) {
                    throw new Error(`${dep.require} not a valid value for dependency ${dep.refId} in ${o.packageUId}`);
                }
                const dependency = {
                    packagePublicId: dep.refId,
                    versionRange: dep.versionRange,
                    dependencyType: dep.require === "mandatory" /* PackageDependencyType.MANDATORY */
                        ? "mandatory" /* PackageDependencyType.MANDATORY */
                        : "optional" /* PackageDependencyType.OPTIONAL */
                };
                return dependency;
            }),
            localPackagePath: o.localPackagePath,
            isInstallable: true,
            subType: o.subType || null,
            featureType: o.featureType || null,
            ccsVersion: o.ccsVersion || null
        };
    });
}
exports.getInstalledPackagesNoQ = getInstalledPackagesNoQ;
/**
 * Sort overviews by package version
 * @param overviews
 */
function sortOverviews(overviews) {
    return (0, util_1.sortVersionedItems)(overviews, 'packageId', 'packageVersion');
}
