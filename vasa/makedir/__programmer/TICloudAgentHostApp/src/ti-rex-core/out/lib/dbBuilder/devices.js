"use strict";
/**
 *
 * Device Database schema
 * ======================
 * @property {String} name (mandatory) (forced to uppercase, '/' converted to '_')
 * @property {String} parent (forced to uppercase, '/' converted to '_')
 * @property {String} description
 * @property {String} image
 * @property {Array} coreTypes: input only; flattened to coreTypes_name and coreTypes_id and then
 * deleted
 *
 * the following fields will be added by the DB builder:
 * @property {Array} ancestors
 * @property {Array} children
 * @property {Array} coreTypes_name
 * @property {Array} coreTypes_id
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNames = exports._process = exports.refresh = void 0;
// tslint:disable:prefer-for-of
// Disabling for whole file until we refactor
const path = require("path");
const semver = require("semver");
const vars_1 = require("../vars");
const idHelperTirex3 = require("./idHelperTirex3");
const preproc = require("./preproc");
const utils = require("./dbBuilderUtils");
const rexError_1 = require("../../utils/rexError");
const schema_types_1 = require("../../schema-validator/schema-types");
/**
 * Refresh device database
 *
 */
async function refresh(packagePath, dbDevices, packageMacros, contentBasePath, modulePrefix, logger) {
    const metadataDir = await utils.getMetadataDir(contentBasePath, packagePath);
    let result = null;
    try {
        result = await utils.getPackageMetadataAsync(contentBasePath, packagePath, metadataDir, packageMacros, modulePrefix, vars_1.Vars.PACKAGE_AUX_DATA_FILE, logger);
    }
    catch (err) {
        logger.error('Unable to get package metadata');
        throw err;
    }
    const { vID, packageMetadata } = result;
    if (packageMetadata.type !== vars_1.Vars.TOP_CATEGORY.devices.id) {
        return 0 /* RefreshMessageLevel.NONE */;
    }
    const deviceFile = path.join(contentBasePath, packagePath, metadataDir, 'devices.tirex.json');
    let preprocResult;
    try {
        preprocResult = await preproc.processFile(deviceFile, packageMacros, logger);
    }
    catch (e) {
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
            message: 'Aborting refresh for all packages',
            causeError: e
        });
    }
    if (preprocResult) {
        await _process(preprocResult.records, dbDevices, packagePath, metadataDir, vID, logger);
    }
    return 0 /* RefreshMessageLevel.NONE */;
}
exports.refresh = refresh;
let msgLevel;
/**
 * Update device database: process device metadata and insert into device DB
 *
 */
async function _process(deviceList, dbDevices, packagePath, metadataDir, header, logger) {
    msgLevel = 0 /* RefreshMessageLevel.NONE */;
    // 1st pass
    // force all device names to upper case (to allow some latitude in how content providers specify
    // them across device tree and content db's)
    for (const deviceRecord of deviceList) {
        // logger.info('DEBUG: Processing device record' + deviceRecord.name);
        deviceRecord.packageVersion = header.packageVersion;
        deviceRecord._id = idHelperTirex3.createUuid(deviceRecord).idVal;
        deviceRecord.packageId = header.packageId;
        deviceRecord.packageUId = utils.formUid(header.packageId, header.packageVersion);
        if (deviceRecord.name == null) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: `Device has no name field: ${JSON.stringify(deviceRecord)}.`
            });
        }
        if (deviceRecord.id == null) {
            if (!header.metadataVersion) {
                header.metadataVersion = '1.0.0';
            }
            if (semver.gte(header.metadataVersion, '2.1.0')) {
                deviceRecord.id = deviceRecord.name;
            }
        }
        deviceRecord.name = deviceRecord.name.toUpperCase().replace('/', '_');
        if (deviceRecord.parent) {
            deviceRecord.parent = deviceRecord.parent.toUpperCase().replace('/', '_');
        }
        const errShortDescription = utils.validateShortDescription(deviceRecord);
        if (errShortDescription) {
            // log an error, but don't skip the record
            logger.error(errShortDescription);
            msgLevel = 2 /* RefreshMessageLevel.ERROR_CONTINUE */;
        }
    }
    // 2nd pass: ancestors, children, image path
    for (const deviceRecord of deviceList) {
        // add in all device ancestors
        deviceRecord.ancestors = findDeviceAncestors(deviceRecord, deviceList, []);
        // add in all the device's immediate children
        deviceRecord.children = findDeviceChildren(deviceRecord, deviceList);
        // prefix image path
        if ('image' in deviceRecord) {
            if (deviceRecord.image) {
                // Metadata_2.1 : files are relative to the metadata
                deviceRecord.image = path.join(packagePath, metadataDir, deviceRecord.image);
            }
            else {
                delete deviceRecord.image; // null or empty string
            }
        }
        // [ REX-1061
        // prefix description link path
        if (deviceRecord.descriptionLocation) {
            // Metadata_2.1 : files are relative to the metadata
            deviceRecord.descriptionLocation = path.join(packagePath, metadataDir, deviceRecord.descriptionLocation);
        }
        // ]
        // flatten coreTypes (since rexdb can't query embedded objects)
        if (deviceRecord.coreTypes != null) {
            deviceRecord.coreTypes_name = [];
            deviceRecord.coreTypes_id = [];
            for (let i = 0; i < deviceRecord.coreTypes.length; i++) {
                const coreType = deviceRecord.coreTypes[i];
                deviceRecord.coreTypes_name.push(coreType.name);
                deviceRecord.coreTypes_id.push(coreType.id);
            }
            delete deviceRecord.coreTypes;
        }
        else {
            // if no coreTypes sepcifies assume a single or homogeneous device with core id/name
            // being the same as device id/name
            // TODO: introduce device id
            deviceRecord.coreTypes_name = [deviceRecord.name];
            deviceRecord.coreTypes_id = [deviceRecord.name];
        }
        // add to database
        await dbDevices.insertAsync(deviceRecord);
    }
    return msgLevel;
}
exports._process = _process;
/**
 * Build array of ancestors recursively
 * @param {Object} deviceRecord - The device object
 * @param {Array} deviceList - The device list
 * @param {Array} ancestorNames - Ancestors already known
 * @return {Array} - List of ancestor names reflecting the hierarchy in the tree
 */
function findDeviceAncestors(deviceRecord, deviceList, ancestorNames) {
    if (deviceRecord.parent) {
        const parentRecord = findDeviceRecordByName(deviceRecord.parent, deviceList);
        if (parentRecord != null) {
            ancestorNames.splice(0, 0, parentRecord.name);
            ancestorNames = findDeviceAncestors(parentRecord, deviceList, ancestorNames);
        }
        else {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: `Device parent ${deviceRecord.parent} not found in device tree`
            });
        }
    }
    return ancestorNames;
}
/**
 * Build array of device children for a given device
 * @param {Object} deviceRecord - The device object
 * @param {Array} deviceList - The device list
 * @return {Array} - List of children names
 */
function findDeviceChildren(deviceRecord, deviceList) {
    const childrenNames = [];
    for (let i = 0; i < deviceList.length; i++) {
        const childCandidate = deviceList[i];
        if (childCandidate.parent === deviceRecord.name) {
            childrenNames.push(childCandidate.name);
        }
    }
    if (childrenNames.length === 0) {
        return null;
    }
    else {
        return childrenNames;
    }
}
/**
 * Find a device record by device name
 * @param {String} deviceName - The device name
 * @param {Array} deviceList - The device list
 * @return {Object} - The found device object or null if not found
 */
function findDeviceRecordByName(deviceName, deviceList) {
    for (let i = 0; i < deviceList.length; i++) {
        if (deviceList[i].name === deviceName) {
            return deviceList[i];
        }
    }
    return null;
}
/**
 *
 * @param dbDevices
 * @param deviceIds
 */
async function getNames(dbDevices, deviceIds, metaDataVer) {
    const deviceNames = [];
    const devices = await dbDevices.findAsync({ id: { $in: deviceIds } });
    if (devices == null) {
        return null;
    }
    for (let i = 0; i < devices.length; i++) {
        deviceNames.push(devices[i].name);
    }
    // TINA: Only check when metadata version is greater than 3.1.0
    if (metaDataVer !== undefined &&
        semver.gte(metaDataVer, `${schema_types_1.cfgMetaVer.major}.${schema_types_1.cfgMetaVer.minor}.${schema_types_1.cfgMetaVer.patch}`)) {
        if (deviceNames.length !== deviceIds.length) {
            const missedDeviceIds = [];
            for (const deviceId of deviceIds) {
                const deviceRecord = await dbDevices.findOneAsync({ id: deviceId });
                if (deviceRecord == null) {
                    missedDeviceIds.push(deviceId);
                }
            }
            throw new Error(`Missing device records with id(s) [${missedDeviceIds.toString()}] in corresponding devices.tirex.json`);
        }
    }
    return deviceNames;
}
exports.getNames = getNames;
