"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicIdParts = exports.getPublicIdData = exports.getPublicIdFromMinimalIds = exports.getPublicIdFromIds = exports.getNodeDbIdFromPublicId = void 0;
const package_group_helpers_1 = require("./package-group-helpers");
const util_1 = require("./util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * For dealing with public ids
 *
 */
async function getNodeDbIdFromPublicId(publicId, allGroups, urlQuery, apis, masterName) {
    const data = getPublicIdData(publicId, allGroups);
    if (!data) {
        return null;
    }
    const { nodePublicId, group, packagePublicId } = data;
    const dbId = await apis.getNodeDbId(nodePublicId, group ? group.packageGroupPublicUid : null, packagePublicId, group ? (0, package_group_helpers_1.isLatest)(group, urlQuery, allGroups) : false, masterName);
    return dbId;
}
exports.getNodeDbIdFromPublicId = getNodeDbIdFromPublicId;
function getPublicIdFromIds({ nodePublicId, packageGroupPublicUid, packagePublicUid, allGroups, allPackages, urlQuery }) {
    if (!packageGroupPublicUid) {
        return nodePublicId;
    }
    else {
        const group = allGroups.find(group => group.packageGroupPublicUid === packageGroupPublicUid);
        if (!group) {
            throw new Error(`Missing group with packageGroupPublicUid ${packageGroupPublicUid}`);
        }
        const isLatestVersion = (0, package_group_helpers_1.isLatest)(group, urlQuery, allGroups);
        const version = isLatestVersion ? util_1.LATEST : group.packageGroupVersion;
        const pkg = packagePublicUid
            ? allPackages.find(pkg => pkg.packagePublicUid === packagePublicUid)
            : null;
        return getPublicIdFromMinimalIds({
            nodePublicId,
            packageGroupPublicId: group.packageGroupPublicId,
            packageGroupVersion: version,
            packagePublicId: pkg ? pkg.packagePublicId : null
        });
    }
}
exports.getPublicIdFromIds = getPublicIdFromIds;
function getPublicIdFromMinimalIds({ nodePublicId, packageGroupPublicId, packageGroupVersion, packagePublicId }) {
    if (packageGroupPublicId && packageGroupVersion) {
        return packagePublicId
            ? `A__${nodePublicId}__${packagePublicId}__${packageGroupPublicId}__${packageGroupVersion}`
            : `${nodePublicId}__${packageGroupPublicId}__${packageGroupVersion}`;
    }
    else if (packageGroupPublicId || packageGroupPublicId) {
        throw new Error(`Missing Partial packageGroup data`);
    }
    else {
        return `${nodePublicId}`;
    }
}
exports.getPublicIdFromMinimalIds = getPublicIdFromMinimalIds;
function getPublicIdData(publicId, allGroups) {
    const { nodePublicId, packagePublicId, packageGroupPublicId, packageGroupVersion } = getPublicIdParts(publicId);
    if (!packageGroupPublicId) {
        return { group: null, nodePublicId, packagePublicId: null };
    }
    const [group = null] = (0, package_group_helpers_1.getPackageGroups)([`${packageGroupPublicId}__${packageGroupVersion}`], allGroups);
    if (!group) {
        return null;
    }
    return { group, nodePublicId, packagePublicId };
}
exports.getPublicIdData = getPublicIdData;
function getPublicIdParts(publicId) {
    let nodePublicId;
    let packageGroupPublicId;
    let packageGroupVersion;
    let packagePublicId;
    const publicIdParts = publicId.split('__');
    if (publicIdParts.length < 4) {
        packagePublicId = null;
        [nodePublicId, packageGroupPublicId = null, packageGroupVersion = null] = publicIdParts;
    }
    else if (publicIdParts[0] === 'A') {
        [
            ,
            nodePublicId,
            packagePublicId,
            packageGroupPublicId = null,
            packageGroupVersion = null
        ] = publicIdParts;
    }
    else {
        // Default, invalid publicId
        [nodePublicId, packagePublicId, packageGroupPublicId, packageGroupVersion] = [
            '',
            null,
            null,
            ''
        ];
    }
    return { nodePublicId, packagePublicId, packageGroupPublicId, packageGroupVersion };
}
exports.getPublicIdParts = getPublicIdParts;
