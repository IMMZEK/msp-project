"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareContentAndZips = exports.preparePackageManager = exports.createPackageEntryStaged = exports.createPackageEntryValid = exports.createPackages = exports.verifyContentAndZipsPresent = exports.verifyContentAndZipsGone = void 0;
// 3rd party
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
// our modules
const vars_1 = require("../lib/vars");
const expect_1 = require("../test/expect");
const verification_helpers_1 = require("./verification-helpers");
const package_manager_1 = require("./package-manager");
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
let submissionIdCounter = 0;
/**
 * Verify the content folders and zip files no longer exist.
 *
 * @param args
 *  @param args.contentFolder
 *  @param args.zipsFolder
 *  @param args.zips - relative to the content folder.
 *  @param args.content - relative to the zips folder.
 *
 * @returns {Promise} void
 */
async function verifyContentAndZipsGone({ contentFolder, zipsFolder, zips, content }) {
    const zipItems = zips.map((item) => path.join(zipsFolder, item));
    const contentItems = content.map((item) => path.join(contentFolder, item));
    const items = zipItems.concat(contentItems);
    try {
        await verification_helpers_1.VerificationHelpers.verifyItemsDoNotExist(items);
    }
    catch (e) {
        (0, expect_1.expect)(e).to.not.exist;
    }
}
exports.verifyContentAndZipsGone = verifyContentAndZipsGone;
/**
 * Verify the content folders and zip files exist.
 *
 * @param args
 *  @param args.contentFolder
 *  @param args.zipsFolder
 *  @param args.zips - relative to the content folder.
 *  @param args.content - relative to the zips folder.
 *
 * @returns {Promise} void
 */
async function verifyContentAndZipsPresent({ contentFolder, zipsFolder, zips, content }) {
    const zipItems = zips.map((item) => path.join(zipsFolder, item));
    const contentItems = content.map((item) => path.join(contentFolder, item));
    const items = zipItems.concat(contentItems);
    try {
        await verification_helpers_1.VerificationHelpers.verifyItemsExist(items);
    }
    catch (e) {
        (0, expect_1.expect)(e).to.not.exist;
    }
}
exports.verifyContentAndZipsPresent = verifyContentAndZipsPresent;
/**
 * Create the packages
 *
 * @param args
 *  @param packages - Absolute paths to the package folders.
 *  @param packagesJson - Each element is the json to add to the packgaes package.tirex.json.
 *
 * @returns {Promise} void
 */
function createPackages({ packages, packagesJson, packageJsonPrefix }) {
    if (packagesJson && packages.length !== packagesJson.length) {
        throw new Error(`Length mismatch packages: ${packages.length} packagesJson: ${packagesJson.length}`);
    }
    let dataMapping;
    if (packagesJson) {
        dataMapping = packages.map((pkg, idx) => {
            return { pkg, data: packagesJson[idx] };
        });
    }
    else {
        dataMapping = packages.map((pkg) => {
            return { pkg, data: null };
        });
    }
    return Promise.all(dataMapping.map(({ pkg, data }) => fs.outputJson(path.join(pkg, packageJsonPrefix
        ? `${packageJsonPrefix}_${vars_1.Vars.PACKAGE_TIREX_JSON}`
        : vars_1.Vars.PACKAGE_TIREX_JSON), [data] || '')));
}
exports.createPackages = createPackages;
function createPackageEntryValid(subEntry) {
    const entry = {
        ...subEntry,
        submissionId: (submissionIdCounter++).toString(),
        email: '',
        showEntry: true,
        state: "valid" /* PackageEntryState.VALID */
    };
    return entry;
}
exports.createPackageEntryValid = createPackageEntryValid;
function createPackageEntryStaged(subEntry) {
    const entry = {
        ...subEntry,
        submissionId: (submissionIdCounter++).toString(),
        email: '',
        showEntry: true,
        state: "staged" /* PackageEntryState.STAGED */,
        backupContent: [],
        backupZips: [],
        backupFolder: '',
        backupEntry: {
            submissionId: '',
            email: '',
            showEntry: true
        }
    };
    return entry;
}
exports.createPackageEntryStaged = createPackageEntryStaged;
/**
 * Prepare the PackageManager - its files / folders, and the object itself
 *
 * @param args
 *
 * @returns {Promise} result
 */
async function preparePackageManager({ packageManagerFileJson, contentFolder = (0, test_helpers_1.getUniqueFolderName)(), zipsFolder = (0, test_helpers_1.getUniqueFolderName)() }) {
    // Initialize the package manager file
    const packageManagerFile = path.join(scriptsUtil.generatedDataFolder, (0, test_helpers_1.getUniqueFileName)());
    if (packageManagerFileJson) {
        packageManagerFileJson.packages = packageManagerFileJson.packages || [];
    }
    else {
        packageManagerFileJson = { packages: [] };
    }
    // Prepare the file system (zips, content, packageManagerFile)
    const { zips, content } = packageManagerFileJson.packages.reduce((item1, item2) => {
        return {
            content: item1.content.concat(item2.content),
            zips: item1.zips.concat(item2.zips)
        };
    }, { content: [], zips: [] });
    // Note: the contentJson needs to be ordered with respect to the content array
    const contentJson = _.flatten(packageManagerFileJson.packages.map((item) => {
        return item.content.map(() => {
            // Note: we are make a package with the same id / version for all
            // content items in the package.
            return {
                name: item.id,
                id: item.id,
                version: item.version,
                type: 'software'
            };
        });
    }));
    await Promise.all([
        fs.outputJson(packageManagerFile, packageManagerFileJson),
        prepareContentAndZips({ contentFolder, zipsFolder, zips, content, contentJson })
    ]);
    // Return the results
    const pm = new package_manager_1.PackageManager(packageManagerFile, contentFolder, zipsFolder);
    return {
        packageManagerFile,
        pm,
        contentFolder,
        zipsFolder
    };
}
exports.preparePackageManager = preparePackageManager;
/**
 * Create the content folders and zip files.
 *
 * @param args
 *  @param args.contentFolder
 *  @param args.zips - relative to the zips folder.
 *  @param args.content - relative to the content folder.
 *  @param args.contentJson
 *
 * @param {Promise} void
 */
function prepareContentAndZips({ contentFolder, zipsFolder, zips, content, contentJson }) {
    return Promise.all([
        createPackages({
            packages: content.map((content) => path.join(contentFolder, content)),
            packagesJson: contentJson
        }),
        Promise.all(zips.map((zip) => fs.outputFile(path.join(zipsFolder, zip), '')))
    ]);
}
exports.prepareContentAndZips = prepareContentAndZips;
