"use strict";
/**
 *
 * Devtool Database schema
 * ======================
 * @property {String} name (mandatory)
 * @property {String} description
 * @property {String} descriptionLocation: path to html file containing description
 * @property {String} image
 * @property {Array} devices: list of devices that can be used with this devtool
 * @property {Array} connections: list of names of the connection XML files, as it appears in the
 *                   <ccs>\ccsv6\ccs_base\common\targetdb\connections\ directory. The first entry
 *                   will be used as the default.
 * @property {Array} energiaBoards
 *      @property {String} id
 *      @property {String} description
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNames = exports._process = exports.refresh = void 0;
const fs = require("fs");
const path = require("path");
const semver = require("semver");
const vars_1 = require("../vars");
const idHelperTirex3 = require("./idHelperTirex3");
const preproc = require("./preproc");
const utils = require("./dbBuilderUtils");
const devices = require("./devices");
const rexError_1 = require("../../utils/rexError");
const util_1 = require("../../shared/util");
const schema_types_1 = require("../../schema-validator/schema-types");
/**
 * Refresh devtools database - IMPORTANT: Any main files MUST BE parsed FIRST, followed by the aux
 * files.
 *
 * @param mainOrAux: main devtool tree files add new records whereas aux files only can update
 * existing records with new fields.
 *  Aux files restrictions:
 *      - an aux file cannot add records
 *      - an aux file cannot contain fields that are already specified in another main or aux json
 *        file.
 *  Any entry and/or field that doesn’t conform will be rejected.
 * @param packagePath
 * @param dbDevtools - the dev tools database.
 * @param dbDevices
 * @param packageMacros
 * @param contentBasePath
 * @param logger
 */
async function refresh(mainOrAux, packagePath, dbDevtools, dbDevices, packageMacros, contentBasePath, modulePrefix, logger) {
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
    if (packageMetadata.type !== vars_1.Vars.TOP_CATEGORY.devtools.id) {
        return 0 /* RefreshMessageLevel.NONE */;
    }
    const devtoolsFileName = mainOrAux === 'main' ? 'devtools.tirex.json' : 'devtools-aux.tirex.json';
    const devtoolsFile = path.join(contentBasePath, packagePath, metadataDir, devtoolsFileName);
    let preprocResult;
    try {
        preprocResult = await preproc.processFile(devtoolsFile, packageMacros, logger);
    }
    catch (e) {
        // sending RefreshMessageLevel.REFRESH_MSG_NONE since this is some legacy stuff we don't want to get into
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
            message: `unable to process ${devtoolsFile}, abort refresh for all packages`,
            causeError: e
        });
    }
    if (preprocResult) {
        await _process(devtoolsFile, preprocResult.records, packagePath, metadataDir, dbDevtools, dbDevices, mainOrAux, vID, contentBasePath, logger);
    }
    return 0 /* RefreshMessageLevel.NONE */;
}
exports.refresh = refresh;
async function _process(devtoolsFile, devtoolList, packagePath, metadataDir, dbDevtools, dbDevices, mainOrAux, header, contentBasePath, logger) {
    let msgLevel = 0 /* RefreshMessageLevel.NONE */;
    for (const devtoolRecord of devtoolList) {
        if (mainOrAux === 'main') {
            devtoolRecord.packageVersion = header.packageVersion;
            devtoolRecord._id = idHelperTirex3.createUuid(devtoolRecord).idVal;
            devtoolRecord.packageId = header.packageId;
            devtoolRecord.packageUId = utils.formUid(header.packageId, header.packageVersion);
        }
        if (devtoolRecord.id == null) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: `Devtool has no id field: ${JSON.stringify(devtoolRecord)}.`
            });
        }
        if (devtoolRecord.name == null && mainOrAux === 'main') {
            logger.warning(`No devtool name specified, using id instead: ${JSON.stringify(devtoolRecord)}`);
            msgLevel = Math.max(msgLevel, 1 /* RefreshMessageLevel.WARNING */);
            devtoolRecord.name = devtoolRecord.id;
        }
        // prefix image path or remove if file doesn't exist (UI should display a default image in
        // this case)
        if (devtoolRecord.image) {
            devtoolRecord.image = path.join(packagePath, metadataDir, devtoolRecord.image);
            if (!fs.existsSync(path.join(contentBasePath, devtoolRecord.image))) {
                logger.error(`File not found. Skipping property 'image'. File: ${devtoolRecord.image}`);
                msgLevel = Math.max(msgLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                delete devtoolRecord.image;
            }
        }
        // prefix descriptionLocation or remove if file doesn't exist
        if (devtoolRecord.descriptionLocation) {
            devtoolRecord.descriptionLocation = path.join(packagePath, metadataDir, devtoolRecord.descriptionLocation);
            if (!fs.existsSync(path.join(contentBasePath, devtoolRecord.descriptionLocation))) {
                logger.error('File not found. Skipping property ' +
                    `'descriptionLocation'. File: ${devtoolRecord.descriptionLocation}`);
                msgLevel = Math.max(msgLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                delete devtoolRecord.descriptionLocation;
            }
        }
        const errShortDescription = utils.validateShortDescription(devtoolRecord);
        if (errShortDescription) {
            // log an error, but don't skip the record
            logger.error(errShortDescription);
            msgLevel = Math.max(msgLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
        }
        if (devtoolRecord.devices != null) {
            // look up device names based on IDs
            try {
                devtoolRecord.devices = await devices.getNames(dbDevices, devtoolRecord.devices, header.metadataVersion);
            }
            catch (err) {
                const idx = Math.max(0, devtoolsFile.indexOf(packagePath));
                const filePath = devtoolsFile.slice(idx);
                throw new rexError_1.RefreshError({
                    refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                    message: `[${filePath}] Required device record(s) cannot be found. Offending devtool record Id: [${devtoolRecord.id}].`,
                    causeError: err
                });
            }
        }
        if (devtoolRecord.devices != null) {
            // expand family/subfamily/etc in 'devices' into its variants (leafs) and
            // move family/subfamily/etc out into 'devicesAncestors'
            devtoolRecord.devicesVariants = [];
            for (const deviceName of devtoolRecord.devices) {
                await utils.expandDevices(dbDevices, devtoolRecord, deviceName, logger);
            }
            devtoolRecord.devices = devtoolRecord.devicesVariants;
            delete devtoolRecord.devicesVariants;
            delete devtoolRecord.devicesAncestors;
        }
        // Check if there's an existing record for this devtool
        const existingDevtoolRecord = await dbDevtools.findOneAsync({ id: devtoolRecord.id });
        // process main devtool tree files
        if (mainOrAux === 'main') {
            if (existingDevtoolRecord == null) {
                // add to database
                await dbDevtools.insertAsync(devtoolRecord); // Let insertAsync() handle error
            }
            else {
                throw new rexError_1.RefreshError({
                    refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                    message: `A main tree file cannot override existing records. Offending record: ${JSON.stringify(devtoolRecord)}`
                });
            }
        }
        else if (mainOrAux === 'aux') {
            if (existingDevtoolRecord == null) {
                throw new rexError_1.RefreshError({
                    refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                    message: `An aux tree file cannot add new records. Offending record: ${JSON.stringify(devtoolRecord)}`
                });
            }
            else {
                // add the new properties from the aux file; only property 'energiaBoards'
                // is allowed to not pollute/corrupt the global product tree
                (0, util_1.getObjectKeys)(devtoolRecord).forEach((newProp) => {
                    // id needs to be in aux, but is never copied over
                    if (newProp !== 'id') {
                        if (existingDevtoolRecord[newProp] != null) {
                            throw new rexError_1.RefreshError({
                                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                                message: `An aux file cannot override existing properties. File: ${devtoolsFile}, record: ${JSON.stringify(devtoolRecord)}, offending property: ${newProp}`
                            });
                            // TODO need to stop, mark, and abort loop
                        }
                        else if (newProp !== 'energiaBoards') {
                            throw new rexError_1.RefreshError({
                                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                                message: `An aux file can only add the property 'energiaBoards'. File: ${devtoolsFile}, record: ${JSON.stringify(devtoolRecord)}, offending property: ${newProp}`
                            });
                            // TODO need to stop, mark, and abort loop
                        }
                        else {
                            existingDevtoolRecord[newProp] = devtoolRecord[newProp];
                        }
                    }
                });
                // update database
                await dbDevtools.updateAsync({ _id: existingDevtoolRecord._id }, existingDevtoolRecord);
            }
        }
        else {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: `devtool file must be either main or aux. Not recognized: ${mainOrAux}`
            });
        }
    }
    // logger.debug('Created devtool database');
    return msgLevel;
}
exports._process = _process;
async function getNames(dbDevtool, devtoolIds, metaDataVer) {
    const devtoolNames = [];
    const devtools = await dbDevtool.findAsync({ id: { $in: devtoolIds } });
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < devtools.length; i++) {
        devtoolNames.push(devtools[i].name);
    }
    // TINA: Only check when metadata version is greater than 3.1.0
    if (semver.gte(metaDataVer, `${schema_types_1.cfgMetaVer.major}.${schema_types_1.cfgMetaVer.minor}.${schema_types_1.cfgMetaVer.patch}`) &&
        devtoolIds !== undefined &&
        devtoolNames.length !== devtoolIds.length) {
        const missedDeviceIds = [];
        for (const devtoolId of devtoolIds) {
            const deviceRecord = await dbDevtool.findOneAsync({ id: devtoolId });
            if (deviceRecord == null) {
                missedDeviceIds.push(devtoolId);
            }
        }
        throw new Error(`Missing devtool records with id(s) [${missedDeviceIds.toString()}]`);
    }
    return devtoolNames;
}
exports.getNames = getNames;
