"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageGroups = exports.isHighestVersion = exports.isLatest = void 0;
const util_1 = require("./util");
const Versioning = require("../../lib/versioning");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * For working with package groups. Note these functions rely on the ordering in allGroups being
 * grouped by version then from newest to oldest version
 *
 */
/**
 * Return true if the packageGroup is latest
 * (it's the highest version and not explicitly included in the url query).
 *
 * @param group
 * @param urlQuery
 * @param allGroups
 *
 * @returns isLatest
 */
function isLatest(group, urlQuery, allGroups) {
    const latestVersion = allGroups.find(group2 => group2.packageGroupPublicId === group.packageGroupPublicId);
    if (!latestVersion) {
        throw new Error(`Unknown group id ${group.packageGroupPublicId}`);
    }
    // See if group (id, version) was explicitly included in the url query
    const specificGroupInQuery = !!urlQuery.a &&
        urlQuery.a.some(addedPkg => {
            // Version may be a semver range
            const [id, version] = addedPkg.split('__');
            if (version === util_1.LATEST) {
                return false;
            }
            else if (!Versioning.validRange(version)) {
                if ((0, util_1.isBrowserEnvironment)()) {
                    console.warn(`Invalid version ${version} skipping`);
                }
                return false;
            }
            return (id === group.packageGroupPublicId &&
                Versioning.satisfies(group.packageGroupVersion, version));
        });
    const latestHidden = !!urlQuery.r &&
        urlQuery.r.some(removedPkg => {
            const [id, version] = removedPkg.split('__');
            return id === group.packageGroupPublicId && version === util_1.LATEST;
        });
    const useLatest = latestVersion.packageGroupPublicUid === group.packageGroupPublicUid &&
        !specificGroupInQuery &&
        !latestHidden;
    return useLatest;
}
exports.isLatest = isLatest;
/**
 * Return true if the packageGroup is the highest version.
 *
 * @param group
 * @param allGroups
 *
 * @returns isHighestVersion
 */
function isHighestVersion(group, allGroups) {
    const highestVersion = allGroups.find(group2 => group2.packageGroupPublicId === group.packageGroupPublicId);
    if (highestVersion) {
        return highestVersion.packageGroupVersion === group.packageGroupVersion;
    }
    else {
        throw new Error(`Unknown group id ${group.packageGroupPublicId}`);
    }
}
exports.isHighestVersion = isHighestVersion;
/**
 * BrowserUrlQuery.Packages -> PackageGroupData[]
 *
 * @param packageGroups
 * @param allGroups
 *
 * @returns packageGroups
 */
function getPackageGroups(packageGroups, allGroups) {
    return packageGroups
        .map(pkg => {
        const [id, version] = pkg.split('__');
        // Version may be a semver range
        if (version !== util_1.LATEST && !Versioning.validRange(version)) {
            if ((0, util_1.isBrowserEnvironment)()) {
                console.warn(`Invalid version ${version} skipping`);
            }
            return null;
        }
        const groupData = version === util_1.LATEST
            ? allGroups.find(pkg => pkg.packageGroupPublicId === id)
            : allGroups.find(pkg => pkg.packageGroupPublicId === id &&
                Versioning.satisfies(pkg.packageGroupVersion, version));
        if (!groupData) {
            if ((0, util_1.isBrowserEnvironment)()) {
                console.warn(`Unknown id,version ${id},${version} skipping`);
            }
            return null;
        }
        else {
            return { ...groupData, isLatest: version === util_1.LATEST };
        }
    })
        .filter((group) => !!group);
}
exports.getPackageGroups = getPackageGroups;
