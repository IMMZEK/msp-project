"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeMissingArrayElements = exports.isImportableResource = exports.expandDevices = exports.validateShortDescription = exports.getPackageMetadataAsync = exports.getMetadataDir = exports.splitUid = exports.formUid = exports.encodePackageGroupPublicId = exports.hexToBase64UrlSafe = exports.base64UrlSafeToHex = exports.createPublicIdFromCustomResourcePublicUid = exports.createPublicIdFromTreeNodePath = exports.isOverview = void 0;
const path = require("path");
const crypto = require("crypto");
const semver = require("semver");
const _ = require("lodash");
const vars_1 = require("../vars");
const preproc = require("./preproc");
const rexError_1 = require("../../utils/rexError");
const striptags = require("striptags");
const fs = require("fs-extra");
const custom_url_helpers_1 = require("../../shared/custom-url-helpers");
function isOverview(record) {
    return record.resourceType === 'overview' || record.resourceType === 'packageOverview';
}
exports.isOverview = isOverview;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Convert a treeNodePath string to a 128 bit public id: 8-bit type field + 120 bit sha1
 *
 * The type can be used for future extensions. This function sets the id type to 0x00
 *
 * Return as a base64 string
 *
 * @param treeNodePath: full path incl. name, e.g. "Device Documentation/IWR1XXX/IWR1443/User's Guide
 */
function createPublicIdFromTreeNodePath(treeNodePath) {
    const publicIdTypeHex = '00';
    const publicIdHex = publicIdTypeHex + // 8 bits
        crypto
            .createHash('sha1')
            .update(treeNodePath, 'utf8')
            .digest('hex')
            .substring(0, 30); // truncate to 4*30=120bits
    return hexToBase64UrlSafe(publicIdHex);
}
exports.createPublicIdFromTreeNodePath = createPublicIdFromTreeNodePath;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Convert the custom public UID of a resource  to a 128 bit public id: 8-bit type field + 120 bit sha1
 *
 * The type can be used for future extensions. This function sets the id type to 0x01
 *
 * Return as a base64 string
 *
 */
function createPublicIdFromCustomResourcePublicUid(customResourcePublicUid, resource, fullPathIndex) {
    const publicIdString = customResourcePublicUid + resource.packageId + resource.fullPathsDevId[fullPathIndex] ||
        '' + resource.fullPathsCoreTypeId[fullPathIndex] ||
        '';
    const publicIdTypeHex = '01';
    const publicIdHex = publicIdTypeHex + // 8 bits
        crypto
            .createHash('sha1')
            .update(publicIdString, 'utf8')
            .digest('hex')
            .substring(0, 30); // truncate to 4*30=120bits
    return hexToBase64UrlSafe(publicIdHex);
}
exports.createPublicIdFromCustomResourcePublicUid = createPublicIdFromCustomResourcePublicUid;
/**
 * Helper function to support SQLDB with storing base64-UrlSafe encoded data
 * @param base64UrlSafe
 */
function base64UrlSafeToHex(base64UrlSafe) {
    return Buffer.from((0, custom_url_helpers_1.undoBase64UrlSafe)(base64UrlSafe), 'base64').toString('hex');
}
exports.base64UrlSafeToHex = base64UrlSafeToHex;
/**
 * Helper function to support SQLDB with storing base64-UrlSafe encoded data
 * @param hex
 */
function hexToBase64UrlSafe(hex) {
    return (0, custom_url_helpers_1.makeBase64UrlSafe)(Buffer.from(hex, 'hex').toString('base64'));
}
exports.hexToBase64UrlSafe = hexToBase64UrlSafe;
/**
 * NEVER CHANGE THIS FUNCTION, IT WOULD BREAK PUBLIC BOOKMARKS
 *
 * Convert packageGroupPublicId to a 42 bit base64 id
 * (for 1000 hash values this is about 1 in 10 billion chance of collision)
 *
 * @param s
 *
 * TODO: Could test this during hand-off/refresh to catch collisions, but unlikely, i.e. low priority
 */
function encodePackageGroupPublicId(s) {
    return (0, custom_url_helpers_1.makeBase64UrlSafe)(crypto
        .createHash('sha1')
        .update(s, 'utf8')
        .digest('base64')
        .substring(0, 7) // truncate to 7*6=42bits
    // Notes:
    // (1) per base64 spec coding is done in groups of 4 characters (24 bits), and the
    // last group has to have at least 2 chars, e.g. ABCD E would be an illegal base64 string
    // (some decoders may simply drop the last char in this case)
    // In our case we have 7 chars, ABCD EFG, i.e. the last group has 3 chars which is legal.
    // (2) padding is not needed, see note in makeBase64UrlSafe()
    );
}
exports.encodePackageGroupPublicId = encodePackageGroupPublicId;
const ID_VERSION_DELIMITER = '__';
function formUid(id, version) {
    return id + ID_VERSION_DELIMITER + version;
}
exports.formUid = formUid;
function splitUid(uid) {
    const [id, version] = uid.split(ID_VERSION_DELIMITER);
    return { id, version };
}
exports.splitUid = splitUid;
/**
 * Get the dir the metadata folder is located relative to the package folder.
 *
 * We expect all the .tirex.json files to be located
 * in the METADATA_DIR folder if it exists, otherwise they will all be
 * in the root of the package directory.
 *
 * @param contentBasePath
 * @param {string} packagePath - the package's path relative to the content folder.
 */
async function getMetadataDir(contentBasePath, packagePath) {
    const packageRoot = path.join(contentBasePath, packagePath);
    const metadataPath = path.join(packageRoot, vars_1.Vars.METADATA_DIR);
    try {
        await fs.stat(metadataPath);
        return vars_1.Vars.METADATA_DIR;
    }
    catch (err) {
        return '';
    }
}
exports.getMetadataDir = getMetadataDir;
/**
 * Get the package metadata from package.tirex.json and resolve macros
 *
 */
async function getPackageMetadataAsync(contentBasePath, packagePath, metadataDir, packageMacros, modulePrefix, packageAuxDataFile, logger) {
    const packageFile = path.join(contentBasePath, packagePath, metadataDir, `${modulePrefix || ''}${vars_1.Vars.PACKAGE_TIREX_JSON}`);
    const packageMetadata = await getPackageDataWithAux(packageFile, packageAuxDataFile, packageMacros, logger);
    if (packageMetadata.metaDataVer == null) {
        // set to default version
        packageMetadata.metaDataVer = '1.0.0';
    }
    if (semver.lt(packageMetadata.metaDataVer, '2.1.0')) {
        // convert to new version
        packageMetadata.metaDataVer = '2.1.0';
        if (packageMetadata.type == null) {
            packageMetadata.type = 'software'; // legacy full package
        }
    }
    const vID = {
        packageVersion: packageMetadata.version,
        packageId: packageMetadata.id
    };
    // default display name for packageType
    if (packageMetadata.type === vars_1.Vars.TOP_CATEGORY.software.id) {
        packageMetadata.typeName = vars_1.Vars.TOP_CATEGORY.software.text;
    }
    else if (packageMetadata.type === vars_1.Vars.TOP_CATEGORY.softwareTools.id) {
        packageMetadata.typeName = vars_1.Vars.TOP_CATEGORY.softwareTools.text;
    }
    else if (packageMetadata.type === vars_1.Vars.TOP_CATEGORY.devices.id) {
        packageMetadata.typeName = vars_1.Vars.TOP_CATEGORY.devices.text;
    }
    else if (packageMetadata.type === vars_1.Vars.TOP_CATEGORY.devtools.id) {
        packageMetadata.typeName = vars_1.Vars.TOP_CATEGORY.devtools.text;
    }
    return { vID, packageMetadata };
}
exports.getPackageMetadataAsync = getPackageMetadataAsync;
async function getPackageDataWithAux(packageFile, packageAuxDataFile, packageMacros, logger) {
    const packageMetadataInital = await preproc.processFile(packageFile, packageMacros, logger);
    let auxMetadata = null;
    try {
        if (packageAuxDataFile) {
            auxMetadata = await fs.readJson(packageAuxDataFile);
        }
    }
    catch (e) {
        logger.error(e);
        throw new rexError_1.RexError({
            message: `Invalid package aux file, please verify the json is valid ${packageAuxDataFile}`
        });
    }
    if (!packageMetadataInital || packageMetadataInital.records.length === 0) {
        throw new rexError_1.RexError({
            message: 'Invalid package.tirex.json'
        });
    }
    const packageMetadata = packageMetadataInital.records[0];
    packageMetadata.modifiedValues = {};
    if (packageMetadata.moduleOf) {
        // Do nothing
    }
    else if (auxMetadata && auxMetadata[packageMetadata.id]) {
        const auxData = auxMetadata[packageMetadata.id];
        let rootCategory = null;
        const { rootCategory: _rootCategory = null, name = null, addDependences = [], removeSupplements = false, hideByDefault = false, packageIdAliases = [], defaultModuleGroup = null } = auxData;
        rootCategory = _rootCategory;
        if (rootCategory) {
            if (!packageMetadata.type ||
                packageMetadata.type === vars_1.Vars.TOP_CATEGORY.software.id ||
                packageMetadata.type === vars_1.Vars.TOP_CATEGORY.softwareTools.id) {
                rootCategory = [...rootCategory, name || packageMetadata.name];
            }
            packageMetadata.rootCategory = rootCategory;
        }
        if (name) {
            packageMetadata.name = name;
        }
        if (addDependences) {
            packageMetadata.dependencies = (packageMetadata.dependencies || []).concat(addDependences);
        }
        if (removeSupplements) {
            delete packageMetadata.supplements;
        }
        if (hideByDefault) {
            packageMetadata.hideByDefault = true;
        }
        if (!_.isEmpty(packageIdAliases)) {
            packageMetadata.packageIdAliases = packageIdAliases;
        }
        if (defaultModuleGroup !== null && packageMetadata.moduleGroup) {
            packageMetadata.moduleGroup.defaultModuleGroup = defaultModuleGroup;
        }
    }
    else {
        throw new rexError_1.RefreshError({
            message: `Package id ${packageMetadata.id} is missing from the package registry. ` +
                `If this is a new package that has not yet been registered, please follow our ` +
                `instructions on registering new packages ` +
                `<a href='` +
                `https://confluence.itg.ti.com/x/We_LIQ#ResourceExplorerrules,bestpracticesandtips-Packageregistration` +
                `'>here</a> ` +
                `(under section 'Package Registration'). ` +
                `Otherwise, please contact the TIREX team at tirex-team@list.ti.com for assistance ` +
                `as there may be an issue on our side such as an outdated registry on the server.`,
            refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */
        });
    }
    return packageMetadata;
}
function validateShortDescription(record) {
    const SHORT_DESCRIPTION_MAX_LENGTH = 255;
    // if no short description provided, use truncated and html-cleaned description
    if (record.shortDescription == null && record.description != null) {
        if (record.description.length <= SHORT_DESCRIPTION_MAX_LENGTH) {
            record.shortDescription = record.description;
        }
        else {
            record.shortDescription =
                record.description.substring(0, SHORT_DESCRIPTION_MAX_LENGTH - 3).trim() + '...';
        }
        record.shortDescription = striptags(record.shortDescription);
    }
    if (record.shortDescription && record.shortDescription.length > SHORT_DESCRIPTION_MAX_LENGTH) {
        const err = `Field shortDescription exceeds maximum length of ${SHORT_DESCRIPTION_MAX_LENGTH}: ${JSON.stringify(record)}`;
        return err;
    }
    return;
}
exports.validateShortDescription = validateShortDescription;
/**
 * 1. expand devices specified as regex
 * 2. expand any device family/sub-family/ect into variants
 *
 */
async function expandDevices(dbDevices, record, deviceName, logger) {
    const regex = /^\/(.*?)\/$/; // check if device is specified as regex, e.g.: '/msp43?/'
    let _deviceName;
    if (regex.test(deviceName)) {
        const r = regex.exec(deviceName);
        r[1] = r[1].replace(/\//g, '_'); // '/' not allowed, TODO: can restriction be lifted once
        // client encodes URLs?
        _deviceName = new RegExp(r[1], 'i'); // device tags are stored uppercase and we can't
        // uppercase the regex, i.e. use 'i'
    }
    else {
        _deviceName = deviceName
            .toUpperCase()
            // force all device tags to upper case (to allow some latitude in how content providers
            // specify them across device tree and content db's)
            .replace(/\//g, '_');
        // '/' not allowed, TODO: can restriction be lifted once client encodes URLs?
    }
    let deviceRecords;
    try {
        deviceRecords = await dbDevices.findAsync({
            // packageUid: record.packageUId, // Metadata_2.1 : global H/W packages
            name: _deviceName
        });
    }
    catch (err) {
        logger.error('Query error: ' + JSON.stringify(err));
        throw err;
    }
    if (deviceRecords === null) {
        logger.error('Device not found in the device db: ' + deviceName + '. Skipping.');
        return;
    }
    // expand any device family/sub-family/ect into variants
    for (const deviceRecord of deviceRecords) {
        if (deviceRecord.children == null || deviceRecord.children.length === 0) {
            record.devicesVariants.push(deviceRecord.name);
        }
        else {
            for (const child of deviceRecord.children) {
                await expandDevices(dbDevices, record, child, logger);
            }
        }
    }
}
exports.expandDevices = expandDevices;
function isImportableResource(resourceRecord) {
    return ([
        'project.ccs',
        'projectSpec',
        'project.energia',
        'file.importable',
        'folder.importable'
    ].indexOf(resourceRecord.resourceType) !== -1);
}
exports.isImportableResource = isImportableResource;
function mergeMissingArrayElements(array1, array2) {
    return array1.concat(array2.filter(val2 => array1.indexOf(val2) === -1));
}
exports.mergeMissingArrayElements = mergeMissingArrayElements;
