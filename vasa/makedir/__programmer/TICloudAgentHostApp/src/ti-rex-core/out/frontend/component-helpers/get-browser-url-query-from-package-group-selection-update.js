"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrowserUrlQueryFromPackageGroupSelectionUpdate = void 0;
// our modules
const filter_helpers_1 = require("./filter-helpers");
const package_group_helpers_1 = require("./package-group-helpers");
const util_1 = require("../../shared/util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Get the updated url after applying the package group selection update
 *
 * @param query
 * @param pkgGroup
 * @param update
 * @param useLatest - use the special 'latest' pointer
 * @param allGroups
 *
 * returns urlQuery
 */
function getBrowserUrlQueryFromPackageGroupSelectionUpdate(query, pkgGroup, update, useLatest, allGroups, _filterOptions) {
    // Validation
    const isHighestGroupVersion = (0, package_group_helpers_1.isHighestVersion)(pkgGroup, allGroups);
    if (useLatest && !isHighestGroupVersion) {
        throw new Error(`Trying to useLatest for non-latest group ${pkgGroup}`);
    }
    // Get the starting added / removed packages
    const addedPackageGroups = (0, package_group_helpers_1.getPackageGroups)(query.a || [], allGroups);
    const removedPackageGroups = (0, package_group_helpers_1.getPackageGroups)(query.r || [], allGroups);
    // Latest handling
    const groupVersionExact = pkgGroup.packageGroupVersion;
    const newGroup = { ...pkgGroup, isLatest: useLatest };
    // Generate the new added / removed packages
    const sameExisitngFieldsUpdate = applyPackageSelectionUpdateToSameExistingFields(newGroup, update, addedPackageGroups, removedPackageGroups);
    const otherExistingFieldsUpdate = applyPackageSelectionUpdateToOtherExistingFields(newGroup, groupVersionExact, isHighestGroupVersion, update, addedPackageGroups, removedPackageGroups);
    const updatedFilterItems = {};
    switch (update) {
        case "Added" /* PackageGroupSelectionUpdate.Added */: {
            const { addedPackageGroups: newAddedPackagesInner } = sameExisitngFieldsUpdate;
            const { removedPackageGroups: newRemovedPackagesInner } = otherExistingFieldsUpdate;
            updatedFilterItems.addedPackageGroups = newAddedPackagesInner;
            updatedFilterItems.removedPackageGroups = newRemovedPackagesInner;
            break;
        }
        case "Removed" /* PackageGroupSelectionUpdate.Removed */:
            const { addedPackageGroups: newAddedPackagesInner } = otherExistingFieldsUpdate;
            const { removedPackageGroups: newRemovedPackagesInner } = sameExisitngFieldsUpdate;
            updatedFilterItems.addedPackageGroups = newAddedPackagesInner;
            updatedFilterItems.removedPackageGroups = newRemovedPackagesInner;
            break;
        default:
            (0, util_1.assertNever)(update);
            throw new Error(`Unknown update ${update}`);
    }
    if (updatedFilterItems.addedPackageGroups &&
        updatedFilterItems.addedPackageGroups.length === 0) {
        updatedFilterItems.addedPackageGroups = null;
    }
    if (updatedFilterItems.removedPackageGroups &&
        updatedFilterItems.removedPackageGroups.length === 0) {
        updatedFilterItems.removedPackageGroups = null;
    }
    // Apply the update to the query
    const urlQuery = (0, filter_helpers_1.getBrowserUrlQueryFromUpdatedFilterItems)(updatedFilterItems, query);
    return urlQuery;
}
exports.getBrowserUrlQueryFromPackageGroupSelectionUpdate = getBrowserUrlQueryFromPackageGroupSelectionUpdate;
/**
 * Create the new updatedFilterItems.addedPackageGroups based on the effects of adding a group or the new
 * updatedFilterItems.removedPackageGroups based on the effects of removing a group.
 *
 * @param newGroup - The new group being added / removed.
 * @param update - The package selection update
 * @param addedPackageGroups - The current set of add packages
 * @param removedPackageGroups - The current set of removed packages
 *
 * @returns updatedFilterItems
 */
function applyPackageSelectionUpdateToSameExistingFields(newGroup, update, addedPackageGroups, removedPackageGroups) {
    const updatedFilterItems = {};
    const addedPackageHasNewPkg = addedPackageGroups.some(addedGroup => addedGroup.packageGroupPublicUid === newGroup.packageGroupPublicUid && addedGroup.isLatest === newGroup.isLatest);
    const removedPackageHasNewPkg = removedPackageGroups.some(removedGroup => removedGroup.packageGroupPublicUid === newGroup.packageGroupPublicUid && removedGroup.isLatest === newGroup.isLatest);
    if (update === "Added" /* PackageGroupSelectionUpdate.Added */) {
        if (newGroup.isLatest) {
            // We are adding a 'latest', remove it from addedPackageGroups if it exists (to prevent staying on non-latest)
            updatedFilterItems.addedPackageGroups = addedPackageGroups.filter(addedGroup => addedGroup.packageGroupPublicUid !== newGroup.packageGroupPublicUid);
        }
        else if (!addedPackageHasNewPkg) {
            // Don't add something twice
            updatedFilterItems.addedPackageGroups = addedPackageGroups.concat(newGroup);
        }
    }
    else if (update === "Removed" /* PackageGroupSelectionUpdate.Removed */ &&
        // don't remove something twice
        !removedPackageHasNewPkg) {
        updatedFilterItems.removedPackageGroups = removedPackageGroups.concat(newGroup);
    }
    return updatedFilterItems;
}
/**
 * Create the new updatedFilterItmes.removedPackages based on the effects of adding a group and vise versa.
 *
 * @param newGroup - The new group being added / removed. The version will be 'latest' if we want to set it to latest
 * @param newGroupVersionExact - The package version (will not hold 'latest')
 * @param isHighestVersion - The result of calling isHighestVersion on the original newPackage
 * @param update - The package selection update
 * @param addedPackageGroups - The current set of add packages
 * @param removedPackageGroups - The current set of removed packages
 *
 * @returns updatedFilterItems
 */
function applyPackageSelectionUpdateToOtherExistingFields(newGroup, newGroupVersionExact, isHighestVersion, update, addedPackageGroups, removedPackageGroups) {
    const updatedFilterItems = {};
    switch (update) {
        case "Added" /* PackageGroupSelectionUpdate.Added */:
            // Remove pkg from the removed packages
            const newRemovedPackages = removedPackageGroups.filter(removedGroup => {
                return !(removedGroup.packageGroupPublicId === newGroup.packageGroupPublicId &&
                    ((isHighestVersion && removedGroup.isLatest) ||
                        removedGroup.packageGroupVersion === newGroupVersionExact));
            });
            if (newRemovedPackages.length !== removedPackageGroups.length) {
                // There is an update to removedPackages
                updatedFilterItems.removedPackageGroups = newRemovedPackages;
            }
            break;
        case "Removed" /* PackageGroupSelectionUpdate.Removed */:
            // Remove from the added packages (if it was added explicitly)
            const newAddedPackages = addedPackageGroups.filter(addedGroup => {
                return !(addedGroup.packageGroupPublicId === newGroup.packageGroupPublicId &&
                    ((isHighestVersion && addedGroup.isLatest) ||
                        addedGroup.packageGroupVersion === newGroupVersionExact));
            });
            if (newAddedPackages.length !== addedPackageGroups.length) {
                // There is an update to addedPackageGroups
                updatedFilterItems.addedPackageGroups = newAddedPackages;
            }
            break;
        default:
            (0, util_1.assertNever)(update);
            throw new Error(`Unknown update ${update}`);
    }
    return updatedFilterItems;
}
