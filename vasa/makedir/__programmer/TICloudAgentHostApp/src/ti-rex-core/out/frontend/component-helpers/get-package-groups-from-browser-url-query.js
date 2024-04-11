"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackagesGroupsFromBrowserUrlQuery = void 0;
// 3rd party
const _ = require("lodash");
const package_group_helpers_1 = require("./package-group-helpers");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Get the set of package groups for the given url query.
 *
 * @param addedPackageGroups
 * @param removedPackageGroups
 * @param allGroups
 * @param filterOptions
 *
 * @returns packageGroups
 */
function getPackagesGroupsFromBrowserUrlQuery(addedPackageGroups, removedPackageGroups, allGroups, filterOptions) {
    const addedGroupsData = (0, package_group_helpers_1.getPackageGroups)(addedPackageGroups, allGroups);
    const removedGroupsData = (0, package_group_helpers_1.getPackageGroups)(removedPackageGroups, allGroups);
    return getPackageSelection(addedGroupsData, removedGroupsData, allGroups, filterOptions);
}
exports.getPackagesGroupsFromBrowserUrlQuery = getPackagesGroupsFromBrowserUrlQuery;
///////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////
function getPackageSelection(addedGroups, removedGroups, allGroups, filterOptions) {
    const defaultSelection = getDefaultPackageGroupSelection(allGroups, filterOptions);
    const defaultSelectionWithAdded = applyAddedGroups(defaultSelection, addedGroups);
    const selection = applyRemovedGroups(defaultSelectionWithAdded, removedGroups);
    return selection;
}
/**
 * Get the default group selection (latest - hideByDefault).
 *
 * @param allGroups
 * @param filterOptions
 *
 * @returns groups
 */
function getDefaultPackageGroupSelection(allGroups, filterOptions) {
    const filterableGroupIds = filterOptions.packageGroups.map(item => item.publicId);
    const latestFilterableGroups = _.sortedUniqBy(allGroups.filter(group => filterableGroupIds.includes(group.packageGroupPublicUid)), group => group.packageGroupPublicId);
    return latestFilterableGroups.filter(item => !item.hideByDefault);
}
function applyAddedGroups(groupSelection, addedGroups) {
    addedGroups = addedGroups.filter(group => !groupSelection.some(group2 => group2.packageGroupPublicUid === group.packageGroupPublicUid));
    return groupSelection.concat(addedGroups);
}
function applyRemovedGroups(groupSelection, removedGroups) {
    return groupSelection.filter(group => !removedGroups.some(removedGroup => removedGroup.packageGroupPublicUid === group.packageGroupPublicUid));
}
