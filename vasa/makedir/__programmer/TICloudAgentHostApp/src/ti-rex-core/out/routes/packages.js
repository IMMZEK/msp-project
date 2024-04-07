"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePackageType = exports.getPackageGroups = exports.getPackages = exports.getRoutes = void 0;
// 3rd party modules
const express_1 = require("express");
const _ = require("lodash");
const executeRoute_1 = require("./executeRoute");
const response_data_1 = require("../shared/routes/response-data");
const rexError_1 = require("../utils/rexError");
const vars_1 = require("../lib/vars");
const routes_1 = require("./routes");
///////////////////////////////////////////////////////////////////////////////
/// Types
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes() {
    const routes = (0, express_1.Router)();
    routes.get(`/${"api/packages" /* API.GET_PACKAGES */}`, (0, executeRoute_1.executeRoute)(getPackages));
    routes.get(`/${"api/packageGroups" /* API.GET_PACKAGE_GROUPS */}`, (0, executeRoute_1.executeRoute)(getPackageGroups));
    return routes;
}
exports.getRoutes = getRoutes;
async function getPackages(sqldb, reqQuery, req) {
    const groups = await getPackageGroups(sqldb, reqQuery, req);
    // the same supplemental package may occur multiple times since it could be associated with multiple main packages
    const packageRecordsUnique = _.uniqBy(sqldb.getPackageRecords(), 'packagePublicUid');
    return packageRecordsUnique.map((packageRecord) => {
        const matchingGroups = groups.filter((group) => group.packagesPublicUids.includes(packageRecord.packagePublicUid));
        let prefix = '';
        if (vars_1.Vars.REMOTE_BUNDLE_ZIPS) {
            prefix = vars_1.Vars.REMOTE_BUNDLE_ZIPS + '/';
        }
        else if (vars_1.Vars.LOCAL_BUNDLE_ZIPS) {
            prefix = `https://${req.get('host')}/${vars_1.Vars.ROLE ? vars_1.Vars.ROLE + '/' : ''}zips/`;
        }
        const installUrl = {};
        const installPathMap = packageRecord.installPath;
        if (installPathMap) {
            [response_data_1.Platform.WINDOWS, response_data_1.Platform.LINUX, response_data_1.Platform.MACOS].forEach((platform) => {
                const installPath = installPathMap[platform];
                installUrl[platform] = installPath ? prefix + installPath : installUrl[platform];
            });
        }
        return {
            name: packageRecord.name,
            packageVersion: packageRecord.packageVersion,
            packagePublicId: packageRecord.packagePublicId,
            packagePublicUid: packageRecord.packagePublicUid,
            packageGroupPublicUids: matchingGroups.map((group) => group.packageGroupPublicUid),
            packageType: decodePackageType(packageRecord.packageType),
            licenses: packageRecord.license ? [(0, routes_1.makeLink)(packageRecord.license, 'local')] : [],
            hideNodeDirPanel: packageRecord.hideNodeDirPanel,
            hideByDefault: packageRecord.hideByDefault,
            isInstallable: true,
            downloadUrl: installUrl,
            installCommand: packageRecord.installCommand || null,
            installSize: packageRecord.installSize || null,
            dependencies: packageRecord.dependencies.map((dependency) => {
                return {
                    packagePublicId: dependency.refId || '',
                    versionRange: dependency.versionRange,
                    dependencyType: dependency.require === 'optional'
                        ? "optional" /* PackageDependencyType.OPTIONAL */
                        : "mandatory" /* PackageDependencyType.MANDATORY */
                };
            }),
            modules: packageRecord.modules.map((component) => {
                return {
                    packagePublicId: component.refId || '',
                    versionRange: component.versionRange,
                    dependencyType: component.require === 'optional'
                        ? "optional" /* PackageDependencyType.OPTIONAL */
                        : "mandatory" /* PackageDependencyType.MANDATORY */
                };
            }),
            moduleOf: packageRecord.moduleOf,
            aliases: packageRecord.aliases,
            moduleGroups: (packageRecord.moduleGroups || []).map((moduleGroup) => {
                return {
                    packagePublicId: moduleGroup.refId || '',
                    versionRange: moduleGroup.versionRange,
                    dependencyType: moduleGroup.require === 'optional'
                        ? "optional" /* PackageDependencyType.OPTIONAL */
                        : "mandatory" /* PackageDependencyType.MANDATORY */
                };
            }),
            moduleGroup: packageRecord.moduleGroup,
            subType: packageRecord.subType,
            featureType: packageRecord.featureType,
            ccsVersion: packageRecord.ccsVersion,
            ccsInstallLocation: packageRecord.ccsInstallLocation
        };
    });
}
exports.getPackages = getPackages;
async function getPackageGroups(sqldb, _reqQuery, _req) {
    const deviceAndDevtoolGroups = [sqldb.getDevicePackageGroup(), sqldb.getDevtoolPackageGroup()]
        .filter((group) => group != null)
        .map((group) => ({ ...group, mainPackagePublicUid: group.mainPackagePublicUid || null }));
    const accessibleSoftwareGroups = [...sqldb.getSoftwarePackageGroups()]
        .filter((group) => group != null)
        .map((group) => ({ ...group, mainPackagePublicUid: group.mainPackagePublicUid || null }));
    return [...deviceAndDevtoolGroups, ...accessibleSoftwareGroups].map((group) => ({
        packageGroupVersion: group.packageGroupVersion,
        packageGroupPublicId: group.packageGroupPublicIdEncoded,
        packageGroupPublicUid: group.packageGroupPublicUid,
        packagesPublicUids: group.packagesPublicUids,
        mainPackagePublicUid: group.mainPackagePublicUid,
        hideByDefault: group.mainPackageHideByDefault || false,
        packagesToListVersionsFrom: group.packagesToListVersionsFrom
    }));
}
exports.getPackageGroups = getPackageGroups;
function decodePackageType(packageType) {
    switch (packageType) {
        case "softwareMain" /* PackageRecordType.SOFTWARE_MAIN */:
            return "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */;
        case "softwareSupplemental" /* PackageRecordType.SOFTWARE_SUPPLEMENTAL */:
            return "SubPackage" /* Nodes.PackageType.SUB_PACKAGE */;
        case "device" /* PackageRecordType.DEVICE */:
        case "devtool" /* PackageRecordType.DEVTOOL */:
            return "OtherPackage" /* Nodes.PackageType.OTHER */;
        default:
            throw new rexError_1.RexError({ message: `Unknown package record type: ${packageType}` });
    }
}
exports.decodePackageType = decodePackageType;
