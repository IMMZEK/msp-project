"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFilter = exports.getPackageGroupsLists = exports.getNodeLabel = exports.getNodePackageAndGroupData = exports.getNodeData = void 0;
const errors_1 = require("../../shared/errors");
const filter_helpers_1 = require("./filter-helpers");
const get_package_groups_from_browser_url_query_1 = require("./get-package-groups-from-browser-url-query");
const response_data_1 = require("../../shared/routes/response-data");
const RoutingHelpers = require("./routing-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Simplifies interacting with props and other helper files in this folder. Focus is on common patterns.
 *
 */
/**
 * Get the node and node extended data for a node, return null if the node does not exist
 *
 * @param id
 * @param apis
 * @param masterName
 *
 * @returns nodeData
 */
function getNodeData(id, apis, masterName) {
    if (!id) {
        return Promise.resolve(null);
    }
    return Promise.all([
        apis.getExtendedNodes(id, masterName),
        apis.getNodes([id], masterName)
    ]).then(([nodeExtended, [node]]) => {
        return { node, nodeExtended };
    }, (err) => {
        if (err instanceof errors_1.NetworkError && parseInt(err.statusCode) === 404) {
            return null;
        }
        else {
            throw err;
        }
    });
}
exports.getNodeData = getNodeData;
function getNodePackageAndGroupData(node, appProps) {
    const { packageGroups: allGroups, packages: allPackages } = appProps;
    if (!node.packageGroupPublicUid || !node.packagePublicUid) {
        throw new Error(`node ${node.nodeDbId} has no packageGroupPublicUid or packagePublicUid`);
    }
    const groupData = allGroups.find(group => group.packageGroupPublicUid === node.packageGroupPublicUid);
    const packageData = allPackages.find(pkg => pkg.packagePublicUid === node.packagePublicUid);
    if (!groupData) {
        throw new Error(`Cannot find group for package node ${node}`);
    }
    else if (!packageData) {
        throw new Error(`Cannot find package for package node ${node}`);
    }
    return { groupData, packageData };
}
exports.getNodePackageAndGroupData = getNodePackageAndGroupData;
/**
 * Get the node name and package version, return node name if package version does not exist
 *
 * @param appProps
 * @param node
 *
 * @returns string
 */
function getNodeLabel(appProps, node) {
    if (node.nodeType === response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE && appProps.packages) {
        const pkgData = appProps.packages.find(pkg => pkg.packagePublicUid === node.packagePublicUid);
        if (!pkgData) {
            throw new Error(`PackageUid not found in packages ${node.packagePublicUid}`);
        }
        return `${node.name} (${pkgData.packageVersion})`;
    }
    else {
        return node.name;
    }
}
exports.getNodeLabel = getNodeLabel;
/**
 * Get some useful lists of groups based on appProps. This list holds
 * - selectedGroups: the list of selected groups based on the urlQuery (sorted)
 * - unSelectedGroups: the list of un-selected groups based on the urlQuery (sorted)
 * - latestGroups: this list of groups with the highest version for each group (sorted)
 *
 * Note this function and it's helpers assumes appProps.packageGroups is grouped by
 * groupId and sorted in descending version order.
 *
 * @param appProps
 *
 * @returns groupLists
 */
function getPackageGroupsLists(appProps) {
    const { packageGroups: allGroups, urlQuery, filterOptions } = appProps;
    const addedPackages = urlQuery.a ? urlQuery.a : [];
    const removedPackages = urlQuery.r ? urlQuery.r : [];
    const selectedGroups = getSelectedGroups(addedPackages, removedPackages, allGroups, filterOptions);
    const latestGroups = getLatestGroups(allGroups);
    const unSelectedGroups = allGroups.filter(group => {
        return !selectedGroups.some(group2 => group2.packageGroupPublicUid === group.packageGroupPublicUid);
    });
    return {
        selectedGroups,
        unSelectedGroups,
        latestGroups
    };
}
exports.getPackageGroupsLists = getPackageGroupsLists;
/**
 * Update the filter; along with the url.
 * Note: to delete a key from the filter set the value of an updatedItem to null.
 *
 */
function updateFilter(updatedItems, urlQuery, history) {
    const urlQueryUpdated = (0, filter_helpers_1.getBrowserUrlQueryFromUpdatedFilterItems)(updatedItems, urlQuery);
    RoutingHelpers.updateUrl({
        urlQuery: urlQueryUpdated,
        history
    });
}
exports.updateFilter = updateFilter;
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
function getSelectedGroups(addedPackages, removedPackages, allGroups, filterOptions) {
    let selectedGroups = (0, get_package_groups_from_browser_url_query_1.getPackagesGroupsFromBrowserUrlQuery)(addedPackages, removedPackages, allGroups, filterOptions);
    // Make selectedGroups sorted based on the allGroups order (grouped by groupId sorted by version)
    // Note this assumes allGroups is sorted already
    selectedGroups = allGroups.filter(group => selectedGroups.find(group2 => group2.packageGroupPublicUid === group.packageGroupPublicUid));
    return selectedGroups;
}
function getLatestGroups(allGroups) {
    const latestGroups = {};
    allGroups.forEach(({ packageGroupPublicUid, packageGroupPublicId }) => {
        // Note this assumes packages are sorted newest to oldest
        if (!latestGroups[packageGroupPublicId]) {
            latestGroups[packageGroupPublicId] = packageGroupPublicUid;
        }
    });
    return latestGroups;
}
