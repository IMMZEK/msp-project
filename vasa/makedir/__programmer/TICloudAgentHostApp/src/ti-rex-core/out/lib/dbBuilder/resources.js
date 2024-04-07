"use strict";
// tslint:disable:prefer-for-of
// I'm disabling these rules for this whole file - really, we need to refactor this into smaller
// chunks, and then this won't be such a pain...
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFiles = exports._processIncludedFiles = exports._process = exports.refresh = void 0;
/**
 *
 * Resource Database schema
 * ========================
 * @property {String} name (mandatory) ('/' converted to '_')
 * @property {String} description
 * @property {Array}  categories (mandatory) : an array of paths ('/' converted to '_')
 * @property {String} location/link: link to the resource content (relative to the json file if
 *      local path) (the type of the link target is specified in resourceType)
 * @property {String} locationForDownload/linkForDownload: if a different link is to be used for
 *      OS-specific download: any, win, win32, win64, linux, linux32, linux64, macos (relative to
 *      the json file if local path)
 * @property {String} resourceType (mandatory): folder, folder.importable, file, file.importable,
 *     file.executable, project.ccs, project.energia, web.app, web.page, other, categoryInfo (aka
 *     w), packageOverview, bundle
 * @property {Array}  devices: an array of references to an item in the 'device' tree table (forced
 *     to uppercase, '/' converted to '_') NOTE: metadataVersion >= 2.1: user specifies device ids,
 *     which is then replaced with device names during refresh metadataVersion = 2.0:  user
 *     specifies device names
 * @property {Array}  devtools: an array of references to an item in the 'devtool' tree table
 *     NOTE: metadataVersion >= 2.1: user specifies devtool ids, which is then replaced with
 *     devtool names during refresh metadataVersion = 2.0:  user specifies devtool names
 * @property {Array}  devtools_category: if present used for injection instead of devtools, then
 *     merged with devtools
 * @property {Array}  tags: array of strings
 * @property {String} image: path to image (relative to the json file if local path)
 * @property {String} language
 * @property {String} ide: "CCS 5.4", "CCS 5", "Energia", "IAR 2.2", etc
 *
 * resourceType 'categoryInfo/overview'
 * @property {String} name (mandatory) ('/' converted to '_')
 * @property {String} description: html
 * @property {String} shortDescription: text of max 255 chars (defaults to truncated 'description')
 * @property {Array}  categories (mandatory) : an array of paths ('/' converted to '_')
 * @property {String} resourceType: categoryInfo/overview
 * @property {String} image: path to image (relative to the json file if local path)
 *
 * Package header: (converted to 'packageOverview internally):
 * @property {String} name (-> package) (mandatory)
 * @property {String} id (mandatory): globally unique package id
 * @property {String} description
 * @property {String} shortDescription: text of max 255 chars (defaults to truncated 'description')
 * @property {String} version
 * @property {Array}  rootCategory (defaults to name; but can also be empty): the mount point (each
 *     resource's category paths will be prefixed with the root category)
 * @property {Array}  devices: devices this package applies to
 * @property {String} supplements
 * @property {String} image (relative to the json file if local path)
 * @property {String} license: path to the license file (relative to the json file if local path)
 * @property {String} hideNodeDirPanel: hide node children in the content panel
 * @property {String} tags
 * @property {Boolean} allowPartialDownload (defaults to false): if false the download request to
 *     any resource results in the download of the entire package
 * @property {String} subType: software component subtype
 * @property {String} featureType: installation package feature type
 * @property {String} ccsVersion: targeted CCS version
 * @property {String} ccsInstallLocation: relative CCS install location
 *
 * resourceType 'bundle', and packages (packageOverview), categoryInfos (overview) and resources
 *     (all types)
 * @property {String} id
 * @property {String} name
 * @property {String} description: html
 * @property {String} shortDescription: text of max 255 chars (defaults to truncated 'description')
 * @property {String} version
 * @property {String} includedResources (aka resources)
 * @property {String, or Array} includedFiles (aka files):
 * @property {String} includedUrls (aka urls)
 * @property {String} require: 'optional', 'mandatory', 'implicit'}
 * @property {String} INTERNAL ONLY FOR NOW (how to deal with multiple messages for the same
 *     bundle?) message {String}: may be shown to the end user explaining why this bundle is
 *     optional or mandatory (not shown if implicit)
 * @property {Boolean} canBePartial
 * @property {String} resourceType: bundle
 *
 * the following fields will be added by the DB builder:
 * @property {String} linkType: local, external
 * @property {String} projectSpec: if resourceType is project.ccs and extension is .projectSpec
 * @property {String} fullPaths: array of all full paths for this resource item; a resource item's
 *     full path is made up of: device path + package + category path, e.g. msp430 / msp430f2xx /
 *     msp430f212 / msp430ware / documents / datasheets / ds.pdf
 * @property {String} root0
 * @property {String} importProject
 * @property {String} generateProject
 * @property {Number} order
 */
const fs = require("fs-extra");
const path = require("path");
const semver = require("semver");
const _ = require("lodash");
const versioning = require("../versioning");
const vars_1 = require("../vars");
const idHelperTirex3 = require("./idHelperTirex3");
const preproc = require("./preproc");
const utils = require("./dbBuilderUtils");
const devices = require("./devices");
const devtools = require("./devtools");
const fsutils = require("../../utils/fsutils");
const dbBuilder_1 = require("./dbBuilder");
const rexError_1 = require("../../utils/rexError");
const path_helpers_1 = require("../../shared/path-helpers");
const package_helpers_1 = require("../../handoff/package-helpers");
/**
 * Refresh the resource database
 */
async function refresh(packagePath, packageOrder, installPath, installCommand, installSize, modulePrefix, packageAuxDataFile, dbResources, dbOverviews, dbPureBundles, dbDevices, dbDevtools, packageMacros, contentBasePath, logger) {
    const metadataDir = await utils.getMetadataDir(contentBasePath, packagePath);
    let result;
    try {
        result = await utils.getPackageMetadataAsync(contentBasePath, packagePath, metadataDir, packageMacros, modulePrefix, packageAuxDataFile, logger);
    }
    catch (err) {
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
            message: err.message,
            causeError: err
        });
    }
    const packageMetadata = result.packageMetadata;
    const files = await getFiles(metadataDir, contentBasePath, packagePath, modulePrefix);
    // data structures that are carried over from each processFile to the next
    let packageHeader = null;
    const resources = [];
    const overviews = [];
    const pureBundles = [];
    const fullPathsMapFolders = {};
    if (files.length === 1 &&
        files[0].endsWith(vars_1.Vars.PACKAGE_TIREX_JSON) &&
        packageMetadata.type === vars_1.Vars.TOP_CATEGORY.software.id) {
        // Software package with no content -> make it a Software Tools package
        packageMetadata.type = vars_1.Vars.TOP_CATEGORY.softwareTools.id;
        packageMetadata.typeName = vars_1.Vars.TOP_CATEGORY.softwareTools.text;
    }
    let worstMessageLevel = 0 /* RefreshMessageLevel.NONE */;
    // loop over content files (with package.tirex.json as the first)
    // once all files processed, fix up some stuff and insert into DBs
    for (const file of files) {
        // NOTE: Since the type of newHeader returned by processFile can be either PackageHeader or null,
        // we cannot deconstruct it directly from processFile, that's why we create a processFileResult
        // variable and declare it's type here
        let processFileResult;
        processFileResult = await processFile(file, packageHeader, packageMetadata, resources, overviews, pureBundles, fullPathsMapFolders);
        const { messageLevel, newHeader } = processFileResult;
        worstMessageLevel = messageLevel;
        if (!newHeader) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: `No package header found in ${packagePath}. Aborting...`
            });
        }
        else {
            packageHeader = newHeader;
        }
    }
    removeExtraneousOverviews(fullPathsMapFolders, overviews);
    if (packageMetadata.type === 'devices' || packageMetadata.type === 'devtools') {
        try {
            await addDeviceAndDevtoolOverviews(fullPathsMapFolders, packageHeader, overviews);
        }
        catch (err) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: err.message,
                causeError: err
            });
        }
    }
    /* WORKAROUND for REX-2286 don't generate overviews for categories shared between
    packages - STILL NEEDED - DO NOT DELETE For now public ids are generated in SQLD BB
    manage.ts on import by calling back into createPublicId() function here
    generateCategoryRecords(
        fullPathsMapFolders,
        overviews,
        packagePath,
        packageHeader
    );
    */
    removeExtraneousResources(resources);
    // discover readme files and improve resource's description
    for (const resource of resources) {
        // add readme file's publicId to parent resource
        await addReadmePublicId(resource);
        // now since we may have a readme parse it to improve the description
        await improveDescription(resource);
        // now validate shortDescription: always derived from description if not provided
        const errShortDescription = utils.validateShortDescription(resource);
        if (errShortDescription) {
            // log an error, but don't skip the record
            logger.error(makeLogMsg(errShortDescription));
        }
    }
    tagResourcesWithHeaderAndOverviewTags(resources, overviews, packageHeader);
    // finally put the resource record into the resources and overviews DB
    try {
        await insertToDbAsync(resources, overviews, pureBundles, dbResources, dbOverviews, dbPureBundles);
        logger.info(`Created resource database for ${packagePath}: ${resources.length} entries.`);
    }
    catch (err) {
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
            message: err.message,
            causeError: err
        });
    }
    return worstMessageLevel;
    //
    // Private Functions
    //
    /**
     * add readme file's publicId to parent resource (e.g. for use in the table view)
     */
    async function addReadmePublicId(resource) {
        let readmeInfo;
        if (resource.fullPaths.length > 0) {
            // check if there's readme file leaf under this resource's fullpath+name
            // (only need to check one fullPath since the others are duplicated)
            const treeNodePath = resource.fullPaths[0].concat(resource.name).join('/');
            const fullPathInfo = fullPathsMapFolders[treeNodePath];
            if (fullPathInfo && fullPathInfo.leafs) {
                const readmeLeafs = Object.entries(fullPathInfo.leafs)
                    .filter(([key]) => 
                /* key.toLowerCase() === 'readme.html' || */
                key.toLowerCase() === 'readme.md')
                    // put the preferred readme at index 0 (readme.html preferred over readme.md)
                    .sort(([keyA], [keyB]) => (keyA < keyB ? -1 : 1));
                if (readmeLeafs.length > 0) {
                    const preferredReadmeLeafEntry = readmeLeafs[0];
                    readmeInfo = preferredReadmeLeafEntry[1]; // the value of the (key,value) pair
                }
            }
        }
        if (readmeInfo) {
            resource.hasReadme = true; // needed by SQLDB; TODO: SQLDB to check readmeInfo instead
            resource.readmeInfo = readmeInfo;
            // replicate readmeFullPathPublicId for the SQLDB; same order as fullPaths; TODO: maybe DB should do this internally
            resource.readmeFullPathsPublicIds = [];
            for (const _fullPath of resource.fullPaths) {
                resource.readmeFullPathsPublicIds.push(readmeInfo.defaultPublicId);
            }
        }
    }
    /**
     * Improve a resource's description
     *
     */
    async function improveDescription(resource) {
        // if description is the same as name it's deemed not useful
        if (resource.description === resource.name) {
            resource.description = undefined;
        }
        if (resource.shortDescription === resource.name) {
            resource.shortDescription = undefined;
        }
        const readmeLink = resource.readmeInfo ? resource.readmeInfo.resourceLink : undefined;
        // if no description provided, derive from readme file
        if (!resource.description && readmeLink && path.extname(readmeLink) === '.md') {
            const readmeText = await fs.readFile(path.join(contentBasePath, readmeLink), 'utf8');
            /* Expected readme.md pattern:
             * Example Summary          [required]
             * ---------------          [optional]
             *                          [optional]
             * Here is the description  [optional]
             * we want which may have   [optional]
             * line breaks              [optional]
             *                          [required]
             * Some other section
             * ------------------
             */
            const regexHeadingGroup1 = '(Example Summary\\s*-*\\s*)';
            const regexDescriptionGroup2 = '((.*\\s)+?)\\n'; // match as many line as possible up to the next empty line
            const regex = new RegExp(regexHeadingGroup1 + regexDescriptionGroup2);
            const regexResult = regex.exec(readmeText);
            if (regexResult && regexResult[2]) {
                resource.description = regexResult[2].replace(/\n/g, ' ');
            }
        }
    }
    /**
     * Find resources that map to the same fullPath + name and delete them
     */
    function removeExtraneousResources(resources) {
        const publicIdMap = {};
        const idsOfResourcesRemoved = [];
        // iterate in reverse so that we can remove array elements in the loop
        for (let r = resources.length - 1; r >= 0; r--) {
            const resource = resources[r];
            if (resource.parentID) {
                // deal with source files resources at the end
                continue;
            }
            for (const publicId of resource.fullPathsPublicIds) {
                if (!publicIdMap[publicId]) {
                    publicIdMap[publicId] = true;
                }
                else {
                    resources.splice(r, 1); // delete the resource
                    idsOfResourcesRemoved.push(resource._id);
                    // TODO TV: properly log in and also write to a file that can be passed to
                    // the BUs for fixing up these duplicates
                    // TODO: note that conflicting UIDs check will be expanded and re-worked
                    // as part of teh BU UID work item
                    // console.error(`Resource with duplicate publicId: ${resource._id}`);
                }
            }
        }
        // now also delete source file resources of projects that were deleted above
        if (idsOfResourcesRemoved.length > 0) {
            for (let r = resources.length - 1; r >= 0; r--) {
                const resource = resources[r];
                if (resource.parentID && idsOfResourcesRemoved.includes(resource.parentID)) {
                    resources.splice(r, 1);
                }
            }
        }
    }
    function removeExtraneousOverviews(fullPathsMap, overviews) {
        for (let { hasOverview, fromResource, _idOverview, defaultPublicId } of Object.values(fullPathsMap)) {
            if (hasOverview) {
                // full path has multiple overviews, only keep the first one we found
                const _idOverviewMain = _idOverview[0];
                if (_idOverview.length > 1) {
                    for (let i = _idOverview.length - 1; i >= 1; i--) {
                        removeFullPathFromOverview(overviews, _idOverview[i], defaultPublicId);
                    }
                    _idOverview = [_idOverviewMain];
                }
                // full path has no resource underneath it, remove it
                if (!fromResource) {
                    removeFullPathFromOverview(overviews, _idOverviewMain, defaultPublicId);
                }
            }
        }
    }
    /**
     * Removes a fullPath with specified fullPathPublicId from the overview identified by _idOverview
     * If overview wouldn't have any full paths left it is removed completely
     * @param _idOverview
     * @param fullPathPublicId
     */
    function removeFullPathFromOverview(overviews, _idOverview, fullPathPublicId) {
        const indexOverview = overviews.findIndex(overview => {
            return overview._id === _idOverview;
        });
        const overview = overviews[indexOverview];
        if (overview.resourceType !== 'packageOverview') {
            if (overview.fullPaths.length === 1) {
                overviews.splice(indexOverview, 1);
            }
            else {
                const indexFullPath = overview.fullPathsPublicIds.findIndex(id => {
                    return id === fullPathPublicId;
                });
                overview.fullPathsPublicIds.splice(indexFullPath, 1);
                overview.fullPaths.splice(indexFullPath, 1);
            }
        }
    }
    // only do for device or devtool packages
    async function addDeviceAndDevtoolOverviews(fullPathsMap, packageHeader, overviews) {
        let fullPathStr;
        let fullPathMapValue;
        for ([fullPathStr, fullPathMapValue] of Object.entries(fullPathsMap)) {
            const fullPathArr = fullPathStr.split('/');
            const name = fullPathArr[fullPathArr.length - 1];
            const { hasOverview, defaultPublicId, overviewRef } = fullPathMapValue;
            for (const dbDev of [dbDevices, dbDevtools]) {
                const { devRecordMatchingName, devRecordWithDescription } = await findDeviceOrDevtoolWithDescription(dbDev, name);
                if (devRecordMatchingName) {
                    let overview = overviewRef;
                    if (!hasOverview) {
                        const overviewRecord = makeMinimumOverviewRecord(name, fullPathArr.slice(0, fullPathArr.length - 1), defaultPublicId, 'overview', packagePath, packageHeader);
                        if (devRecordWithDescription) {
                            overviewRecord.description = devRecordWithDescription.description;
                            overviewRecord.link = devRecordWithDescription.descriptionLocation;
                            overviewRecord.shortDescription =
                                devRecordWithDescription.shortDescription;
                            overviewRecord.image = devRecordWithDescription.image;
                        }
                        overviews.push(overviewRecord);
                        overview = overviewRecord;
                    }
                    devRecordMatchingName.idAliases = devRecordMatchingName.aliases;
                    if (overview) {
                        // Add the aliases values to the overview
                        overview.customGlobalResourceUids =
                            overview.customGlobalResourceUids && devRecordMatchingName.aliases
                                ? overview.customGlobalResourceUids.concat(devRecordMatchingName.aliases)
                                : devRecordMatchingName.idAliases;
                        // Add the dev id as an alias
                        overview.customGlobalResourceUids = overview.customGlobalResourceUids
                            ? overview.customGlobalResourceUids.concat(devRecordMatchingName.id)
                            : [devRecordMatchingName.id];
                    }
                    // create a reference to this overview in the device record
                    devRecordMatchingName.overviewPublicId = defaultPublicId;
                    await dbDev.updateAsync({ _id: devRecordMatchingName._id }, 
                    // @ts-ignore: ts wrongly expects devRecord to be Device & Devtool
                    // instead of Device | Devtool
                    devRecordMatchingName);
                    // NOTE: the break would just avoid checking dbDevtools if a devRecordMatchingName was found already
                    // in dbDevices since a matching name cannot be found in both databases
                    break; // Micmic the EARLY_EXIT in the old code.
                }
            }
        }
    }
    /**
     * Recursively going up the device/devtool hierarchy, find the first dev* that has a description
     * or image. In addition also return the device/devtool that matched the actual name.
     * Note: hierarchy for devtools is not yet fully supported today by the dbBuilder
     *
     * @param dbDev
     * @param devName
     * @param findMatchingName
     */
    async function findDeviceOrDevtoolWithDescription(dbDev, devName) {
        let devRecordMatchingName;
        let devRecordWithDescription;
        let devRecord;
        devRecord = await dbDev.findOneAsync({ name: devName });
        if (!devRecord) {
            devRecordMatchingName = null;
            devRecordWithDescription = null;
        }
        else if (devRecord.description != null ||
            devRecord.descriptionLocation != null ||
            devRecord.image != null) {
            devRecordMatchingName = devRecord;
            devRecordWithDescription = devRecord;
        }
        else if (devRecord.parent != null) {
            let result;
            result = await findDeviceOrDevtoolWithDescription(dbDev, devRecord.parent);
            devRecordMatchingName = devRecord;
            devRecordWithDescription = result.devRecordWithDescription;
        }
        else {
            devRecordMatchingName = devRecord;
            devRecordWithDescription = null;
        }
        return {
            devRecordMatchingName,
            devRecordWithDescription
        };
    }
    /**
     * Generate a record for each category that doesn't have an oveview for the purpose
     * of attaching a publicId to its fullPath.
     *
     * Note: Records for categories outside the package are still generated here since they may
     * come from rootCategory defined in the package header. But since the refresh processing is
     * done on a package basis we don't have visibility beyond this package and we may generate
     * a record for the same root category again in other packages. This is intended so that
     * packages stay self-contained and can be deleted individually.
     *
     * @param fullPathsMap
     * @param overviews
     * @param packagePath
     * @param packageHeader
     */
    /* WORKAROUND for REX-2286 don't generate overviews for categories shared between packages
       STILL NEEDED - DO NOT DELETE
       For now public ids are generated in SQLD BB manage.ts on import by calling back
       into createPublicId() function here

    function generateCategoryRecords(
        fullPathsMapFolders: FullPathsMapFolders,
        overviews: Overview[],
        packagePath: string,
        packageHeader: PackageHeader | null
    ) {
        for (const [fullPathStr, { hasOverview, publicId }] of Object.entries(fullPathsMapFolders)) {
            if (!hasOverview) {
                const fullPathArr = fullPathStr.split('/');
                const categoryRecord: Overview = makeMinimumOverviewRecord(
                    fullPathArr[fullPathArr.length - 1],
                    fullPathArr.slice(0, fullPathArr.length - 1),
                    publicId,
                    'category',
                    packagePath,
                    packageHeader
                );
                overviews.push(categoryRecord);
            }
        }
    }
   */
    function makeMinimumOverviewRecord(name, fullPath, publicId, resourceType, packagePath, packageHeader) {
        const overviewRecord = {
            _id: '',
            name,
            categories: [fullPath],
            fullPaths: [fullPath],
            fullPathsPublicIds: [publicId],
            resourceType,
            package: packageHeader.packageId,
            packageId: packageHeader.packageId,
            packageUId: packageHeader.packageUId,
            packageVersion: packageHeader.packageVersion,
            packagePath,
            dependencies: [],
            modules: [],
            semver: '0.0.0',
            version: 'UNVERSIONED',
            advanced: {},
            allowPartialDownload: false,
            moduleGroups: []
        };
        overviewRecord._id = idHelperTirex3.createUuid(overviewRecord, packageHeader).idVal;
        return overviewRecord;
    }
    /**
     * Delete unnecessary fields (not needed by rex 3 or rex 4 sqldb)
     * More files are removed by compacter.js later after the full records were indexed
     *
     * @param record
     */
    // function deleteUnecessaryFields(record: Resource & Overview) {
    //     // only needed during refresh:
    //     delete record.devtools_category;
    //     delete record.categories;
    //     delete record.implictDependencyFile;
    //     delete record.isIncludedFile;
    //     // feature no longer supported:
    //     delete record.allowPartialDownload;
    //     if (record.resourceType !== 'packageOverview') {
    //         // NOTE: removing these will effectively disable partial download
    //         // // TODO: don't add them to resources in the first place
    //         delete record.packagePath;
    //         delete record.packageVersion;
    //         delete record.packageId;
    //         delete record.package;
    //         delete record.includedFilesForDownload;
    //         delete record.license;
    //         delete record.dependencies;
    //         delete record.semver;
    //         delete record.version;
    //     }
    // }
    function tagResourcesWithHeaderAndOverviewTags(resources, overviews, packageHeader) {
        for (let r = 0; r < resources.length; r++) {
            const resource = resources[r];
            // inherit tags from the package header
            if (packageHeader.tags != null) {
                if (resource.tags == null) {
                    resource.tags = [];
                }
                resource.tags = resource.tags.concat(packageHeader.tags);
            }
            // inherit tags from overviews
            for (let o = 0; o < overviews.length; o++) {
                const overview = overviews[o];
                if (overview.tags != null) {
                    for (let rc = 0; rc < resource.categories.length; rc++) {
                        const resourceCategories = resource.categories[rc];
                        const resourceCategoriesString = resourceCategories.join(',');
                        for (let oc = 0; oc < overview.categories.length; oc++) {
                            const overviewCategories = overview.categories[oc];
                            const overviewPathString = overviewCategories.join(',') + ',' + overview.name;
                            if (resourceCategoriesString === overviewPathString) {
                                if (resource.tags == null) {
                                    resource.tags = [];
                                }
                                resource.tags = resource.tags.concat(overview.tags);
                            }
                        }
                    }
                }
            }
        }
    }
    async function insertToDbAsync(resources, overviews, pureBundles, dbResources, dbOverviews, dbPureBundles) {
        try {
            await dbResources.insertAsync(resources);
            await dbOverviews.insertAsync(overviews);
            await dbPureBundles.insertAsync(pureBundles);
        }
        catch (err) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: err.message,
                causeError: err
            });
        }
    }
    /**
     * Process a json file
     *
     * @param {string} file - The filename relative to the package directory.
     * @param packageHeader
     * @param packageMetadata
     * @param resources
     * @param overviews
     * @param pureBundles
     * @param fullPathsMapFolders
     *
     */
    async function processFile(file, packageHeader, packageMetadata, resources, overviews, pureBundles, fullPathsMapFolders) {
        const fileWithFullPath = path.join(contentBasePath, packagePath, file);
        const preprocResult = await preproc.processFile(fileWithFullPath, packageMacros, logger);
        if (!preprocResult) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: 'proprocResult is not defined'
            });
        }
        // jsonDir - relative to the json directory
        const jsonDir = path.join(packagePath, path.dirname(file));
        const result = await _process(preprocResult.records, packagePath, packageOrder, jsonDir, path.basename(file), dbOverviews, dbDevices, dbDevtools, packageHeader, packageMetadata, resources, overviews, pureBundles, fullPathsMapFolders, contentBasePath, logger, installPath, installCommand, installSize);
        return { messageLevel: result.worstMessageLevel, newHeader: result.packageHeader };
    }
}
exports.refresh = refresh;
let makeLogMsg;
async function _process(resourceList, packagePath, packageOrder, jsonDir, jsonFile, dbOverviews, dbDevices, dbDevtools, packageHeader, packageMetadata, resources, overviews, pureBundles, fullPathsMapFolders, contentBasePath, logger, installPath, installCommand, installSize) {
    makeLogMsg = (msg) => {
        return `[${path.join(jsonDir, jsonFile)}] ${msg}`;
    };
    let worstMessageLevel = 0 /* RefreshMessageLevel.NONE */;
    const duplicateInvalidIncludedFilesLogs = new Map();
    const duplicateMissingCoreTypesLogs = new Map();
    const duplicateOverviewsLogs = new Map();
    const duplicateMissingDevicesLogs = new Map();
    const result = await syncProcessing(resourceList, dbOverviews, duplicateInvalidIncludedFilesLogs);
    worstMessageLevel = await asyncProcessing(result.resourceList, duplicateMissingCoreTypesLogs, duplicateOverviewsLogs, duplicateMissingDevicesLogs);
    logSummary(duplicateInvalidIncludedFilesLogs, duplicateMissingCoreTypesLogs, duplicateOverviewsLogs, duplicateMissingDevicesLogs);
    return { worstMessageLevel, packageHeader };
    /**
     * Check if a property is pointing to a local file or not. If yes, prefix it with the json dir
     * path. Otherwise assume it's an external link and leave it alone
     * @param obj
     * @param prop
     * @param value
     */
    function prefixAndSetLinkType(obj, prop, valueInitial) {
        const value = path_helpers_1.PathHelpers.cleanFilePathWithQueryValues(valueInitial);
        const prefixedPath = path.join(jsonDir, value);
        const prefixedPathOriginal = path.join(jsonDir, valueInitial);
        if (!packageHeader.restrictions ||
            packageHeader.restrictions.indexOf(vars_1.Vars.METADATA_PKG_IMPORT_ONLY) === -1) {
            if (fs.existsSync(path.join(contentBasePath, prefixedPath))) {
                // local file
                obj[prop] = prefixedPathOriginal;
                return 'local';
            }
            else {
                // external resource
                if (value.indexOf('://') === -1) {
                    logger.warning(makeLogMsg('Not a local file and not a URL either: ' + obj[prop]));
                    worstMessageLevel = Math.max(1 /* RefreshMessageLevel.WARNING */, worstMessageLevel);
                }
                return 'external';
            }
        }
        else {
            // Import Only:
            // The package in the cloud may be metadata only; so the local links
            // may point to files that don't exist.
            const isLocal = value.indexOf('://') === -1;
            if (isLocal) {
                obj[prop] = prefixedPathOriginal;
            }
            return isLocal ? 'local' : 'external';
        }
    }
    /*
        determine resourceSubClass value for resources that have resourceClass of type 'example'
        Looking to set them to example.[empty/helloworld/outofbox/gettingstarted/general]
    */
    function formResourceSubClass(resourceRecord) {
        if (resourceRecord.resourceClass && resourceRecord.resourceClass.includes('example')) {
            const rname = resourceRecord.name.toLowerCase();
            if (rname.includes('empty')) {
                resourceRecord.resourceSubClass = ['example.empty'];
            }
            else if (rname.includes('hello')) {
                resourceRecord.resourceSubClass = ['example.helloworld'];
            }
            else if (rname.includes('outofbox')) {
                resourceRecord.resourceSubClass = ['example.outofbox'];
            }
            else if (rname.includes('gettingstarted')) {
                resourceRecord.resourceSubClass = ['example.gettingstarted'];
            }
            else {
                if (resourceRecord.resourceType === 'project.energia' && rname === 'bareminimum') {
                    resourceRecord.resourceSubClass = ['example.empty'];
                }
                else {
                    resourceRecord.resourceSubClass = ['example.general'];
                }
            }
        }
    }
    function getDuplicatedLogsCount(duplicateType, messageKeywords, messageLevel) {
        let errSummary = duplicateType.get(messageKeywords);
        if (errSummary === undefined) {
            errSummary = { messageLevel, count: 1 };
            duplicateType.set(messageKeywords, errSummary);
        }
        else {
            errSummary.count += 1;
            duplicateType.set(messageKeywords, errSummary);
        }
        return errSummary.count;
    }
    function logSummary(duplicateInvalidIncludedFilesLogs, duplicateMissingCoreTypesLogs, duplicateOverviewsLogs, duplicateMissingDevicesLogs) {
        // throttle duplicate messages for duplicate invalid included files for display
        duplicateInvalidIncludedFilesLogs.forEach(({ messageLevel, count }, errorMessage) => {
            if (count > 1) {
                logger[dbBuilder_1.refreshMessageLevel[messageLevel]](makeLogMsg(`${count - 1} ` +
                    `more records could not get created for includedFile: ${errorMessage}`));
            }
        });
        // throttle messages for duplicate missing core types
        duplicateMissingCoreTypesLogs.forEach(({ messageLevel, count }, coreTypes) => {
            if (count > 1) {
                logger[dbBuilder_1.refreshMessageLevel[messageLevel]](makeLogMsg(`All or some core types for ${count - 1} ` +
                    `resource records not found in device db: ${JSON.stringify(coreTypes)}`));
            }
        });
        // throttle messages for duplicate overviews
        duplicateOverviewsLogs.forEach(({ messageLevel, count }, treeNodePath) => {
            if (count > 1) {
                logger[dbBuilder_1.refreshMessageLevel[messageLevel]](makeLogMsg(`Ignoring ${count - 1} more duplicate overviews for ${treeNodePath}`));
            }
        });
        // throttle messages for duplicate missing device in device db
        duplicateMissingDevicesLogs.forEach(({ messageLevel, count }, deviceName) => {
            if (count > 1) {
                logger[dbBuilder_1.refreshMessageLevel[messageLevel]](makeLogMsg(`device ${deviceName} referenced by ${count - 1} ` +
                    `more resource records not found in the device db. Skipping.`));
            }
        });
    }
    /**
     * SYNC PROCESSING STEP (order is important!)
     */
    async function syncProcessing(resourceList, dbOverviews, duplicateInvalidIncludedFilesLogs) {
        const includedFileResources = [];
        const folderResources = [];
        let implictDepedenciesMapping;
        let z = -1;
        for (const resourceRecord of resourceList) {
            z++;
            // logger.info(makeLogMsg('DEBUG: Processing ' + resourceRecord.name));
            // create uuid for record - IMPORTANT: do this before and without making any
            // modifications to the record!
            const resourceHashObj = idHelperTirex3.createUuid(resourceRecord, packageHeader);
            resourceRecord._id = resourceHashObj.idVal;
            initalizeResourceRecordProperties(resourceRecord, z);
            renameResourceRecordProperties(resourceRecord);
            processCategories(resourceRecord, packageMetadata);
            if (semver.lt(packageMetadata.metaDataVer, '4.0.0')) {
                extractFilterFieldsFromCategories(resourceRecord, packageHeader);
            }
            if (!resourceRecord.resourceSubClass) {
                formResourceSubClass(resourceRecord);
            }
            // validation: check for missing or empty fields
            //    note on possible enhancement: could skip these resources here to allow refresh
            //    to continue but this requires also skipping in later processing which is not
            //    in place yet
            if (resourceRecord.package == null && resourceRecord.resourceType !== 'bundle') {
                // don't do this for package headers or bundles
                if (resourceRecord.name == null || resourceRecord.name === '') {
                    logger.info(`jsonFile ${jsonFile} i = ${z}`);
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: "Mandatory field 'name' is missing or empty: " +
                            JSON.stringify(resourceRecord)
                    });
                }
                if (resourceRecord.resourceType == null ||
                    resourceRecord.resourceType === '') {
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: "Mandatory field 'resourceType' is missing or empty: " +
                            JSON.stringify(resourceRecord)
                    });
                }
                if (resourceRecord.categories == null &&
                    Array.isArray(resourceRecord.categories) === false) {
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: "Mandatory field 'categories' is missing or empty: " +
                            JSON.stringify(resourceRecord)
                    });
                }
                if (resourceRecord.resourceType !== 'overview' &&
                    (resourceRecord.link == null || resourceRecord.link === '')) {
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: "Mandatory field 'link' is missing or empty: " +
                            JSON.stringify(resourceRecord)
                    });
                }
                // handle backward compatibility:
                // multiple category paths are deprecated (wrap single path in another array and
                // keep multiple paths in the code just in case...)
                if (Array.isArray(resourceRecord.categories[0]) === false) {
                    resourceRecord.categories = [resourceRecord.categories];
                }
            }
            if (resourceRecord.package && !resourceRecord.id) {
                resourceRecord.id = resourceRecord.package; // TODO: This is temporary only
                // TODO: id will be made mandatory, i.e. fail and exit here then
                // loggerResources.log('error', 'Field \'id\' is missing in package info. Skipping
                // package: ' + JSON.stringify(resourceRecord));
            }
            if (resourceRecord.supplements) {
                if (!resourceRecord.supplements.versionRange ||
                    !resourceRecord.supplements.packageId) {
                    const msg = `Missing field for supplements - package ${resourceRecord.id}`;
                    logger.error(makeLogMsg(msg));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
                else if (!semver.validRange(resourceRecord.supplements.versionRange)) {
                    const msg = `Invalid semver range ${resourceRecord.supplements.versionRange} for ${resourceRecord.id}`;
                    logger.error(makeLogMsg(msg));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
            }
            if (resourceRecord.moduleOf) {
                if (!resourceRecord.moduleOf.versionRange || !resourceRecord.moduleOf.packageId) {
                    const msg = `Missing field for moduleOf - package ${resourceRecord.id}`;
                    logger.error(makeLogMsg(msg));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
                else if (!semver.validRange(resourceRecord.moduleOf.versionRange)) {
                    const msg = `Invalid semver range ${resourceRecord.moduleOf.versionRange} for ${resourceRecord.id}`;
                    logger.error(makeLogMsg(msg));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
            }
            if (resourceRecord.moduleGroup) {
                if (!resourceRecord.moduleGroup.corePackage.versionRange ||
                    !resourceRecord.moduleGroup.corePackage.packageId) {
                    const msg = `Missing field for moduleGroup.corePackage - package ${resourceRecord.id}`;
                    logger.error(makeLogMsg(msg));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
                else if (!semver.validRange(resourceRecord.moduleGroup.corePackage.versionRange)) {
                    const msg = `Invalid semver range ${resourceRecord.moduleGroup.corePackage.versionRange} for ${resourceRecord.id}`;
                    logger.error(makeLogMsg(msg));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
            }
            // Bundle Support: note that packages, categoryInfos, resources are all considered
            // bundles, but for any explicitly defined pure bundles (as separate record or inlined)
            // we just generate the id and skip the rest of the processing
            if (resourceRecord.resourceType === 'bundle') {
                if (resourceRecord.id != null) {
                    // remember in which package this bundle was defined
                    resourceRecord.packageId = packageHeader.packageId;
                    resourceRecord.packageVersion = packageHeader.packageVersion;
                    resourceRecord.packageUId = packageHeader.packageUId;
                    // add the full, unrecursed list to the record (i.e unfiltered, not recursed
                    // into dirs and which is to be used for downloading)
                    // TODO do actual error checking so the ts cast is not necessary
                    try {
                        resourceRecord.includedFilesForDownload = _processIncludedFiles(resourceRecord, packageHeader, contentBasePath, logger, makeLogMsg).forDownload;
                    }
                    catch (err) {
                        logger.error(makeLogMsg('Failed processing included files: ' + err.message));
                        worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    }
                    pureBundles.push(resourceRecord);
                }
                else {
                    // w/o id they can't be referenced
                    logger.error(makeLogMsg('Pure bundles must have a id. Skipping: ' +
                        JSON.stringify(resourceRecord)));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                }
                continue;
            }
            // if there's a 'package' record as the very first record get the rootCategory for
            // where the records are to be mounted
            if (z === 0 && packageHeader == null) {
                if (resourceRecord.package != null) {
                    await processRootCategory(resourceRecord, packageMetadata);
                    resourceRecord.allowPartialDownload =
                        resourceRecord.allowPartialDownload === 'true';
                    // package header is passed on to all content json files
                    {
                        // save modified values
                        packageMetadata.modifiedValues = {};
                        if (resourceRecord.package !== packageMetadata.name) {
                            packageMetadata.modifiedValues.name = resourceRecord.package;
                        }
                        packageMetadata.modifiedValues.rootCategory = resourceRecord.rootCategory;
                        // handle supplements removal
                        if (!packageMetadata.supplements && resourceRecord.supplements) {
                            packageMetadata.modifiedValues.supplements = resourceRecord.supplements;
                            packageMetadata.rootCategory = packageMetadata.rootCategory || [
                                ..._.dropRight(resourceRecord.rootCategory),
                                packageMetadata.name || resourceRecord.name
                            ];
                            delete resourceRecord.supplements;
                        }
                        // update resourceRecord with packageMetadata values
                        resourceRecord.package = packageMetadata.name || resourceRecord.package;
                        resourceRecord.name = packageMetadata.name || resourceRecord.name;
                        resourceRecord.rootCategory =
                            packageMetadata.rootCategory || resourceRecord.rootCategory;
                        resourceRecord.hideByDefault =
                            packageMetadata.hideByDefault || resourceRecord.hideByDefault;
                        resourceRecord.packageIdAliases = _.isEmpty(packageMetadata.packageIdAliases)
                            ? resourceRecord.packageIdAliases
                            : packageMetadata.packageIdAliases;
                        resourceRecord.modifiedValues = packageMetadata.modifiedValues;
                    }
                    packageHeader = {
                        package: resourceRecord.package,
                        packageVersion: resourceRecord.version,
                        packageId: resourceRecord.id,
                        packageUId: utils.formUid(resourceRecord.id, resourceRecord.version),
                        root: resourceRecord.rootCategory,
                        packageLicense: resourceRecord.license,
                        hideNodeDirPanel: resourceRecord.hideNodeDirPanel,
                        devices: resourceRecord.devices,
                        devtools: resourceRecord.devtools,
                        devtools_category: resourceRecord.devtools_category,
                        tags: resourceRecord.tags,
                        coreDependencies: resourceRecord.coreDependencies,
                        allowPartialDownload: resourceRecord.allowPartialDownload,
                        deprecates: resourceRecord.deprecates,
                        restrictions: resourceRecord.restrictions,
                        name: resourceRecord.package,
                        rootCategory: resourceRecord.rootCategory,
                        subType: resourceRecord.subType,
                        featureType: resourceRecord.featureType,
                        ccsVersion: resourceRecord.ccsVersion,
                        ccsInstallLocation: resourceRecord.ccsInstallLocation
                    };
                    // convert the 'package' record to an 'packageOverview' record which
                    // additionally contains the same fields as regular 'overview' records
                    // to conform with regular overview records the last element of root
                    // categories is assumed to be the name and is dropped. If it's not
                    // equivalent to the name the overview will not be shown for the package
                    // which is intended
                    resourceRecord.name = resourceRecord.package;
                    const l = resourceRecord.rootCategory.length;
                    if (l > 0) {
                        resourceRecord.categories = [deepCopy(resourceRecord.rootCategory)];
                        resourceRecord.categories[0].splice(l - 1, 1);
                    }
                    else {
                        resourceRecord.categories = [[]];
                    }
                    resourceRecord.packagePath = packagePath;
                    resourceRecord.packageOrder = packageOrder;
                    resourceRecord.resourceType = 'packageOverview';
                    resourceRecord.customGlobalResourceUids = resourceRecord.customGlobalResourceUids
                        ? resourceRecord.customGlobalResourceUids.concat(packageHeader.packageId)
                        : [packageHeader.packageId];
                    if (installPath) {
                        resourceRecord.installPath = installPath;
                    }
                    if (installCommand) {
                        resourceRecord.installCommand = installCommand;
                    }
                    if (installSize) {
                        resourceRecord.installSize = installSize;
                    }
                    // bundle: add all resources in the package as the default
                    if (resourceRecord.includedResources == null) {
                        resourceRecord.includedResources = [];
                    }
                    resourceRecord.includedResources.push({
                        package: utils.formUid(resourceRecord.id, resourceRecord.version)
                    }); // a query
                    // bundle: add all files in the package as the default
                    if (resourceRecord.includedFiles == null) {
                        resourceRecord.includedFiles = [];
                    }
                    resourceRecord.includedFiles.push('.');
                }
                else {
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: 'First record must be a package header. Cannot proceed.'
                    });
                }
            }
            // discover inlined bundle definitions and create separate pure bundle records for
            // them TODO: some same processing here as for other resources; should collect all
            // inline bundles first and then run them through the regular processing in a 2nd
            // pass
            const depProps = [
                'dependencies',
                'coreDependencies'
            ];
            for (let dp = 0; dp < depProps.length; dp++) {
                const depArr = resourceRecord[depProps[dp]];
                if (depArr != null) {
                    for (let ds = 0; ds < depArr.length; ds++) {
                        const dep = depArr[ds];
                        if ('packageId' in dep) {
                            dep.refId = dep.packageId;
                            delete dep.packageId;
                        }
                        if (!('refId' in dep)) {
                            // no 'refId' property, i.e. this is a new bundle definition
                            // (packageId is an alias for refId for better usability)
                            const pureBundle = deepCopy(dep);
                            pureBundle._id = idHelperTirex3.createUuid(pureBundle, packageHeader).idVal;
                            // IMPORTANT: make sure the pureBundle is still unaltered, i.e. as
                            // specified by content provide in the metadata json
                            if (pureBundle.id == null) {
                                pureBundle.id = pureBundle._id;
                            }
                            // TODO get rid of semver field; only for b/w compatibility
                            if (pureBundle.version == null) {
                                pureBundle.version = 'UNVERSIONED';
                                pureBundle.semver = '0.0.0';
                            }
                            else {
                                pureBundle.semver =
                                    versioning.convertToSemver(pureBundle.version) || '0.0.0';
                            }
                            // remember in which package this bundle was defined
                            pureBundle.packageId = packageHeader.packageId;
                            pureBundle.packageVersion = packageHeader.packageVersion;
                            pureBundle.packageUId = packageHeader.packageUId;
                            pureBundle.packagePath = packagePath;
                            // handle backward compatibility:
                            if (pureBundle.resources != null) {
                                pureBundle.includedResources = pureBundle.resources;
                                delete pureBundle.resources;
                            }
                            if (pureBundle.files != null) {
                                pureBundle.includedFiles = pureBundle.files;
                                delete pureBundle.files;
                            }
                            if (pureBundle.urls != null) {
                                pureBundle.includedUrls = pureBundle.urls;
                                delete pureBundle.urls;
                            }
                            try {
                                // TODO do actual error checking so the ts cast is not necessary
                                pureBundle.includedFilesForDownload = _processIncludedFiles(pureBundle, packageHeader, contentBasePath, logger, makeLogMsg).forDownload;
                            }
                            catch (err) {
                                logger.error(makeLogMsg('Failed processing included files: ' + err.message));
                                worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                            }
                            pureBundle.resourceType = 'bundle';
                            depArr[ds] = {
                                refId: pureBundle.id,
                                version: pureBundle.version
                            };
                            // replace the dep with a reference to the bundle
                            pureBundles.push(pureBundle);
                        }
                    }
                }
            }
            // now put the package name, id, version and path in all resources (even in
            // packageOverview)
            resourceRecord.package = packageHeader.package;
            // TODO: once we switched fully to packageId no longer put package name in records
            resourceRecord.packageId = packageHeader.packageId;
            resourceRecord.packageVersion = packageHeader.packageVersion;
            resourceRecord.packageUId = packageHeader.packageUId;
            resourceRecord.packagePath = packagePath;
            resourceRecord.allowPartialDownload = packageHeader.allowPartialDownload;
            let supplementedOverviews;
            if (resourceRecord.resourceType !== 'packageOverview') {
                // don't do this for the package header
                // add package level core dependencies to each resource
                if (packageHeader.coreDependencies != null) {
                    resourceRecord.dependencies = resourceRecord.dependencies.concat(packageHeader.coreDependencies);
                }
                // prefix category paths with the package root
                if (packageHeader.root != null && resourceRecord.categories != null) {
                    for (let c = 0; c < resourceRecord.categories.length; c++) {
                        if (resourceRecord.categories[c] != null) {
                            Array.prototype.splice.apply(resourceRecord.categories[c], [0, 0].concat(packageHeader.root));
                        }
                    }
                }
                supplementedOverviews = null;
            }
            else if (resourceRecord.supplements) {
                resourceRecord.dependencies.push({
                    refId: resourceRecord.supplements.packageId,
                    versionRange: resourceRecord.supplements.versionRange,
                    require: 'optional',
                    // for b/w compatibility
                    semver: resourceRecord.supplements.semver
                });
                supplementedOverviews = await getSupplementedPackages(resourceRecord);
            }
            else {
                supplementedOverviews = null;
            }
            // Note we setup supplemental dependencies so the supplemented package only depends on the latest version which supplements it.
            // We don't keep track of which dependencies were injected via supplemental vs explicit so if someone specifies an explicit
            // dependency to a package which it is supplemented by only the latest version between the explicit dependency and the supplemental
            // will be selected (the expected behaviour is likely to get both latest supplemental + explicit dependency). We don't really care
            // since this isn't a real use case & we don't support this
            if (supplementedOverviews) {
                for (const supplementedOverview of supplementedOverviews) {
                    // check if there is a package dependency in the supplementedOverview to a newer version of resourceRecord.id
                    const newerVersionPresent = supplementedOverview.dependencies.find(dependency => {
                        return (resourceRecord.id === dependency.refId &&
                            versioning.ltr(resourceRecord.version, dependency.versionRange));
                    });
                    if (!newerVersionPresent) {
                        // remove any dependencies to older versions
                        supplementedOverview.dependencies = supplementedOverview.dependencies.filter(dependency => dependency.refId !== resourceRecord.id);
                        // add ourselves as a dependency
                        supplementedOverview.dependencies.push({
                            refId: resourceRecord.id,
                            versionRange: resourceRecord.version,
                            require: 'optional',
                            // for b/w compatibility
                            semver: resourceRecord.semver,
                            version: resourceRecord.version
                        });
                        // update the supplementedOverview
                        await dbOverviews.updateAsync({ _id: supplementedOverview._id }, supplementedOverview);
                    }
                }
            }
            if (resourceRecord.moduleOf) {
                // Inject ourselves as a module in the core package
                const corePackage = await getCorePackage(resourceRecord, 'moduleOf');
                // Remove older versions
                corePackage.modules = corePackage.modules.filter(item => item.refId !== resourceRecord.id);
                // Add ourselves as a module
                corePackage.modules.push({
                    refId: resourceRecord.id,
                    versionRange: resourceRecord.version,
                    require: 'optional'
                });
                // Update the corePackageOverview
                await dbOverviews.updateAsync({ _id: corePackage._id }, corePackage);
            }
            if (resourceRecord.moduleGroup && resourceRecord.moduleGroup.corePackage) {
                // Inject ourselves as a module in the core package
                const corePackage = await getCorePackage(resourceRecord, 'moduleGroup');
                corePackage.moduleGroups = (corePackage.moduleGroups || []).filter(item => item.refId !== resourceRecord.id);
                // Add ourselves as a module
                corePackage.moduleGroups.push({
                    refId: resourceRecord.id,
                    versionRange: resourceRecord.version,
                    require: 'optional'
                });
                // Update the corePackageOverview
                await dbOverviews.updateAsync({ _id: corePackage._id }, corePackage);
            }
            // keep track of original order of resources
            resourceRecord.order = z;
            // '/' not allowed in name
            if (resourceRecord.name != null) {
                resourceRecord.name = resourceRecord.name.replace('/', '_');
            }
            else {
                logger.error(makeLogMsg("Field 'name' does not exist or is empty: " + JSON.stringify(resourceRecord)));
                worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
            }
            // '/', '&' not allowed in categories
            if (resourceRecord.categories != null) {
                for (let cpath = 0; cpath < resourceRecord.categories.length; cpath++) {
                    if (resourceRecord.categories[cpath] != null) {
                        for (let element = 0; element < resourceRecord.categories[cpath].length; element++) {
                            resourceRecord.categories[cpath][element] = resourceRecord.categories[cpath][element].replace('/', '_');
                            resourceRecord.categories[cpath][element] = resourceRecord.categories[cpath][element].replace('&', 'and');
                        }
                    }
                }
            }
            // prefix any paths with the json dir path; if the path can't be found locally we
            // assume it's a external link and don't prefix it.
            for (const prop in resourceRecord) {
                if (prop === 'link' || prop === 'image' || prop === 'icon' || prop === 'license') {
                    // TODO: put this list in vars and share with download/makeoffline
                    const linkType = prefixAndSetLinkType(resourceRecord, 
                    // @ts-ignore - looks like some of the keys here don't exist in resourceRecord (or may not exist)
                    prop, resourceRecord[prop]);
                    if (prop === 'link') {
                        resourceRecord.linkType = linkType;
                    }
                }
                else if (prop === 'linkForDownload') {
                    let propLfd;
                    for (propLfd in resourceRecord.linkForDownload) {
                        if (resourceRecord.linkForDownload.hasOwnProperty(propLfd)) {
                            prefixAndSetLinkType(resourceRecord.linkForDownload, 
                            // @ts-ignore - looks like some of the keys here don't exist in resourceRecord.linkForDownload (or may not exist)
                            propLfd, resourceRecord.linkForDownload[propLfd]);
                        }
                    }
                }
            }
            // implied dependency files: check if there's an implied dependency file and add
            // its path to the record if a mapping file exists for this content file, any
            // co-located dep files shall be ignored
            if (resourceRecord.link != null) {
                if (!implictDepedenciesMapping) {
                    const depDir = path.join(contentBasePath, jsonDir, vars_1.Vars.DEPENDENCY_DIR);
                    const pkgSpecificDepMappingFilePath = path.join(depDir, `${packageHeader.packageId}-${vars_1.Vars.IMPLICIT_DEPENDENCY_MAPPING_FILENAME}`);
                    const generalDepMappingFilePath = path.join(depDir, vars_1.Vars.IMPLICIT_DEPENDENCY_MAPPING_FILENAME);
                    const depMappingFilePath = fs.existsSync(pkgSpecificDepMappingFilePath)
                        ? pkgSpecificDepMappingFilePath
                        : fs.existsSync(generalDepMappingFilePath)
                            ? generalDepMappingFilePath
                            : null;
                    if (!depMappingFilePath) {
                        logger.info(makeLogMsg(`Neither expected dependency mapping file exists: ${generalDepMappingFilePath}; or ${pkgSpecificDepMappingFilePath}`));
                        implictDepedenciesMapping = {};
                    }
                    else {
                        try {
                            implictDepedenciesMapping = fs.readJsonSync(depMappingFilePath);
                        }
                        catch (err) {
                            logger.info(makeLogMsg(`Error reading dependency mapping file ${depMappingFilePath}: ${err.message}`));
                            implictDepedenciesMapping = {};
                        }
                    }
                }
                if (implictDepedenciesMapping && !_.isEmpty(implictDepedenciesMapping)) {
                    // locate dep file through mapping file (case where all dep files are flat
                    // in the same dir)
                    const depDir = path.join(jsonDir, vars_1.Vars.DEPENDENCY_DIR);
                    const relLink = path.relative(depDir, resourceRecord.link).replace(/\\/g, '/');
                    const depFile = implictDepedenciesMapping[relLink];
                    if (depFile != null) {
                        resourceRecord.implictDependencyFile = path.join(depDir, depFile);
                    }
                    else {
                        // loggerResources.log('warning', 'Could not look up filename in
                        // dependency mapping file: ' + relLink);
                    }
                }
                else {
                    // locate dep file based on resource location (case where dep file is
                    // co-located with project/projectspec) could check if the link is a
                    // directory and avoid removing the extension in that scenario (i.e if we
                    // had a ccs.tirex folder)
                    const linkNoExt = path.join(path.dirname(resourceRecord.link), path.basename(resourceRecord.link).split('.')[0]);
                    const depFile = linkNoExt + '.dependency.tirex.json';
                    if (fs.existsSync(path.join(contentBasePath, depFile))) {
                        resourceRecord.implictDependencyFile = depFile;
                    }
                }
            }
            // folders: read folder contents from file system and create a record for each
            // file; convert original folder resource into overview
            if (resourceRecord.resourceType === 'folder') {
                try {
                    const result = fsutils.readDirRecursive(path.join(contentBasePath, resourceRecord.link));
                    for (let jj = 0; jj < result.length; jj++) {
                        const filePath = result[jj].split(path.sep);
                        const folderRecord = deepCopy(resourceRecord);
                        folderRecord.name = filePath[filePath.length - 1];
                        folderRecord.link = path.join(folderRecord.link, filePath.join(path.sep));
                        // Create uuid: make a hash by adding the includedFile's path the
                        // existing parent uuid to make sure the uuid is unique also make sure
                        // that the file path is relative to the package root dir so that tirex
                        // desktop and other server installation that may have a different
                        // package path always arrive at the same hash
                        folderRecord._id = idHelperTirex3.updateUuid(resourceHashObj, {
                            link: path.relative(packagePath, folderRecord.link)
                        }).idVal;
                        const fileDir = filePath.slice(0, filePath.length - 1);
                        for (let cc = 0; cc < folderRecord.categories.length; cc++) {
                            folderRecord.categories[cc] = folderRecord.categories[cc]
                                .concat([resourceRecord.name])
                                .concat(fileDir);
                        }
                        folderRecord.resourceType = 'file';
                        folderRecord.doNotCount = true;
                        delete folderRecord.description;
                        delete folderRecord.image;
                        delete folderRecord.linkForDownload;
                        folderResources.push(folderRecord);
                    }
                    // convert original folder resource into overview
                    resourceRecord.resourceType = 'overview';
                    // @ts-ignore allow delete on non-optional value for now
                    delete resourceRecord.link;
                    delete resourceRecord.linkForDownload;
                }
                catch (e) {
                    const errStr = 'Cannot read folder ' + resourceRecord.link;
                    logger.error(makeLogMsg(errStr));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
            }
            // versionRange = dep.semver or dep.version depending on what was specified in the metadata (exact match or range)
            // For b/w compatibility: convert dependency.version to dependency.semver if dependency.semver wasn't defined
            resourceRecord.dependencies.forEach(dep => {
                if (dep.semver) {
                    dep.versionRange = dep.semver;
                }
                else {
                    // TODO get rid of semver field; only for b/w compatibility (range check still valuable)
                    dep.semver = versioning.convertToSemver(dep.version) || '0.0.0';
                    dep.versionRange = dep.version;
                }
            });
            const invalidDependency = resourceRecord.dependencies.find(dep => !semver.validRange(dep.versionRange) && !versioning.valid(dep.versionRange));
            if (invalidDependency) {
                logger.error(makeLogMsg(`Invalid dependency version / semver ${JSON.stringify(invalidDependency)} for ${resourceRecord.id}`));
                worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                continue;
            }
            // determine includedFiles (from embedded array or a dependency file if one exists)
            let includedFilesForDisplay = [];
            let includedFilesForDownload = [];
            try {
                const results = _processIncludedFiles(resourceRecord, packageHeader, contentBasePath, logger, makeLogMsg);
                includedFilesForDisplay = results.forDisplay;
                // TODO do actual error checking so the ts cast is not necessary
                includedFilesForDownload = results.forDownload;
            }
            catch (err) {
                logger.error(makeLogMsg('Failed processing included files: ' + err.message));
                worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
            }
            // if the resource points to a project folder, add folder files to
            // includedFilesForDisplay
            if (['project.ccs', 'folder.importable', 'project.energia'].indexOf(resourceRecord.resourceType) !== -1) {
                try {
                    const folderFiles = fsutils.readDirRecursive(path.join(contentBasePath, resourceRecord.link));
                    for (let i1 = 0; i1 < folderFiles.length; i1++) {
                        if (/\.c$|\.cpp$|\.h$|\.asm$|\.cmd$|\.ino$|\.txt$/gi.test(folderFiles[i1])) {
                            includedFilesForDisplay.push({
                                file: path.join(resourceRecord.link, folderFiles[i1]),
                                mapTo: folderFiles[i1]
                            });
                        }
                    }
                }
                catch (err) {
                    logger.error(makeLogMsg(`Could not read dir content specified by 'link': ${err.message}`));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                }
            }
            function isErrorType(obj) {
                return 'error' in obj;
            }
            // for all resources except 'folder', create resource records for
            // includedFilesForDisplay
            // At this point, all 'folder' resourceType has been converted to 'overview'
            // TODO: can this be merged with 'folder' above?
            for (let j = 0; j < includedFilesForDisplay.length; j++) {
                const includedFileForDisplay = includedFilesForDisplay[j];
                if (includedFileForDisplay == null) {
                    continue;
                }
                if (isErrorType(includedFileForDisplay)) {
                    let messageLevel = 1 /* RefreshMessageLevel.WARNING */;
                    if (semver.gte(packageMetadata.metaDataVer, '4.0.0')) {
                        messageLevel = 2 /* RefreshMessageLevel.ERROR_CONTINUE */;
                    }
                    const errorMessage = JSON.stringify(includedFileForDisplay.error);
                    const count = getDuplicatedLogsCount(duplicateInvalidIncludedFilesLogs, errorMessage, messageLevel);
                    if (count === 1) {
                        logger[dbBuilder_1.refreshMessageLevel[messageLevel]](makeLogMsg('Could not create record for includedFile: ' + errorMessage));
                        worstMessageLevel = Math.max(worstMessageLevel, messageLevel);
                    }
                    continue;
                }
                const childRecord = deepCopy(resourceRecord);
                // Create uuid: make a hash by adding the included file's path to the existing
                // parent uuid to make sure the uuid is unique also; make sure that the file
                // path is relative to the package root dir so that tirex desktop and other
                // server installation that may have a different package path always arrive
                // at the same hash
                childRecord._id = idHelperTirex3.updateUuid(resourceHashObj, {
                    link: path.relative(packagePath, includedFileForDisplay.file)
                }).idVal;
                childRecord.name = path.basename(includedFileForDisplay.mapTo);
                childRecord.link = includedFileForDisplay.file;
                for (let ll = 0; ll < childRecord.categories.length; ll++) {
                    childRecord.categories[ll] = childRecord.categories[ll].concat([
                        resourceRecord.name
                    ]);
                    const dirname = path.dirname(includedFileForDisplay.mapTo);
                    if (dirname !== '.') {
                        childRecord.categories[ll] = childRecord.categories[ll].concat(dirname.split('/'));
                    }
                }
                childRecord.parentID = resourceRecord._id;
                childRecord.resourceType = 'file';
                childRecord.doNotCount = true;
                childRecord.isIncludedFile = true;
                delete childRecord.description;
                delete childRecord.image;
                delete childRecord.linkForDownload;
                includedFileResources.push(childRecord);
            }
            if (includedFilesForDisplay.length > 0) {
                resourceRecord.hasIncludes = true;
            }
            // CCS project create/import
            let absPath;
            let projectName;
            let sourceFiles;
            if (resourceRecord.resourceType === 'project.ccs' ||
                (resourceRecord.resourceType === 'projectSpec' &&
                    (!resourceRecord.advanced ||
                        !resourceRecord.advanced.overrideProjectSpecDeviceId))) {
                absPath = path.join(vars_1.Vars.CCS_CLOUD_IMPORT_PATH, resourceRecord.link);
                // to be called by the browser; redirects to login if needed, launches the
                // IDE and imports:
                resourceRecord._importProjectCCS =
                    vars_1.Vars.CCS_IMPORT_PROJECT_API + '?location=' + absPath;
                resourceRecord._originalJsonFile = path.join(jsonDir, jsonFile);
                // intended for dependency script
            }
            else if (resourceRecord.resourceType === 'projectSpec' &&
                resourceRecord.advanced &&
                resourceRecord.advanced.overrideProjectSpecDeviceId) {
                absPath = path.join(vars_1.Vars.CCS_CLOUD_IMPORT_PATH, resourceRecord.link);
                // to be called by the browser; redirects to login if needed, launches the
                // IDE and imports:
                resourceRecord._importProjectCCS =
                    vars_1.Vars.CCS_IMPORT_PROJECT_API +
                        '?location=' +
                        absPath +
                        '&deviceId=' +
                        vars_1.Vars.TARGET_ID_PLACEHOLDER;
                resourceRecord._originalJsonFile = path.join(jsonDir, jsonFile);
                // intended for dependency script
            }
            else if (resourceRecord.resourceType === 'project.energia') {
                absPath = path.join(vars_1.Vars.CCS_CLOUD_IMPORT_PATH, resourceRecord.link);
                // to be called by the browser; redirects to login if needed, launches the
                // IDE and imports:
                resourceRecord._importProjectCCS =
                    vars_1.Vars.CCS_IMPORT_SKETCH_API +
                        '?sketchFile=' +
                        absPath +
                        '&boardId=' +
                        vars_1.Vars.TARGET_ID_PLACEHOLDER;
                if (resourceRecord.devtools == null || resourceRecord.devtools.length === 0) {
                    const errStr = 'Energia sketches must be tagged with a devtool: ' +
                        JSON.stringify(resourceRecord);
                    logger.error(makeLogMsg(errStr));
                    worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    continue;
                }
            }
            else if (resourceRecord.resourceType === 'file.importable') {
                // .c files: also need to create project
                projectName = resourceRecord.name;
                sourceFiles = path.join(vars_1.Vars.CCS_CLOUD_IMPORT_PATH, resourceRecord.link);
                // to be called by browser
                resourceRecord._createProjectCCS =
                    vars_1.Vars.CCS_CREATE_PROJECT_API +
                        '?' +
                        'projectName=' +
                        projectName +
                        '&deviceId=' +
                        vars_1.Vars.TARGET_ID_PLACEHOLDER +
                        '&copyFiles=' +
                        sourceFiles;
            }
            else if (resourceRecord.resourceType === 'folder.importable') {
                // folder with source files: also need to create project
                projectName = resourceRecord.name;
                const files = fsutils.readDirRecursive(path.join(contentBasePath, resourceRecord.link));
                sourceFiles = '';
                for (let kk = 0; kk < files.length; kk++) {
                    sourceFiles += path.join(vars_1.Vars.CCS_CLOUD_IMPORT_PATH, resourceRecord.link, files[kk]);
                    if (kk < files.length - 1) {
                        sourceFiles += ';';
                    }
                }
                // to be called by browser
                resourceRecord._createProjectCCS =
                    vars_1.Vars.CCS_CREATE_PROJECT_API +
                        '?' +
                        'projectName=' +
                        projectName +
                        '&deviceId=' +
                        vars_1.Vars.TARGET_ID_PLACEHOLDER +
                        '&copyFiles=' +
                        sourceFiles;
            }
            // IAR projects
            if (resourceRecord.resourceType === 'project.iar') {
                resourceRecord._originalJsonFile = path.join(jsonDir, jsonFile);
                // intended for dependency script
            }
            // add the full, unrecursed list to the record (i.e. unfiltered, not recursed into
            // dirs and which is to be used for downloading) important: do this only after the
            // record was cloned for all children
            resourceRecord.includedFilesForDownload = includedFilesForDownload;
        }
        resourceList = resourceList.concat(includedFileResources).concat(folderResources);
        return { worstMessageLevel, resourceList };
    }
    // //////////////////////////////////////////////////////////////
    // / Sync processing functions
    // //////////////////////////////////////////////////////////////
    // James: lets split sync processing up into functions here
    /**
     * Initialize resource record properties
     *
     * @param {Object} resourceRecord
     * @returns {Error|null} result
     *
     */
    function initalizeResourceRecordProperties(resourceRecord, i) {
        if (i === 0 && jsonFile.endsWith(vars_1.Vars.PACKAGE_TIREX_JSON)) {
            resourceRecord.package = resourceRecord.name;
        }
        // semver here for b/w compatibility; check is important (even after we get rid of semver field)
        if (resourceRecord.version == null) {
            resourceRecord.version = 'UNVERSIONED';
            resourceRecord.semver = '0.0.0';
        }
        else {
            resourceRecord.semver = versioning.convertToSemver(resourceRecord.version) || '0.0.0';
            if (resourceRecord.semver === '0.0.0') {
                const msg = `Invalid version ${resourceRecord.version} - Skipping resource/bundle.`;
                logger.critical(makeLogMsg(msg));
                throw new rexError_1.RefreshError({
                    refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                    message: msg
                });
            }
        }
        if (resourceRecord.advanced && Object.keys(resourceRecord.advanced).length === 0) {
            // @ts-ignore allow delete on non-optional value for now
            delete resourceRecord.advanced;
        }
        if (resourceRecord.dependencies == null) {
            resourceRecord.dependencies = [];
        }
        if (resourceRecord.modules == null) {
            resourceRecord.modules = [];
        }
        if (resourceRecord.moduleGroups == null) {
            resourceRecord.moduleGroups = [];
        }
        // devtools is superset of devtools_category
        if (resourceRecord.devtools_category == null && resourceRecord.devtools != null) {
            resourceRecord.devtools_category = resourceRecord.devtools;
        }
        else if (resourceRecord.devtools_category != null && resourceRecord.devtools == null) {
            resourceRecord.devtools = resourceRecord.devtools_category;
        }
        else if (resourceRecord.devtools_category != null && resourceRecord.devtools != null) {
            resourceRecord.devtools = utils.mergeMissingArrayElements(resourceRecord.devtools, resourceRecord.devtools_category);
        }
        else if (resourceRecord.devtools_category == null && resourceRecord.devtools == null) {
            // leave both null
        }
        // the file type cannot be overriden for projects since they are 'special' files
        if (resourceRecord.fileType &&
            [
                'project.ccs',
                'projectSpec',
                'project.energia',
                'energiaSketch',
                'project.iar'
            ].includes(resourceRecord.resourceType)) {
            delete resourceRecord.fileType;
        }
        return null;
    }
    /**
     * Rename metadata properties (property names changed overtime)
     *
     * @param {Object} resourceRecord
     *
     */
    function renameResourceRecordProperties(resourceRecord) {
        if (resourceRecord.core != null) {
            resourceRecord.coreDependencies = resourceRecord.core;
            delete resourceRecord.core;
        }
        // 'core' renamed to 'packageCore'
        // If both 'core' and 'packageCore' exist, let packageCore override the 'core' handled above
        if (resourceRecord.packageCore != null) {
            resourceRecord.coreDependencies = resourceRecord.packageCore;
            delete resourceRecord.packageCore;
        }
        if (resourceRecord.resources != null) {
            resourceRecord.includedResources = resourceRecord.resources;
            delete resourceRecord.resources;
        }
        if (resourceRecord.files != null) {
            resourceRecord.includedFiles = resourceRecord.files;
            delete resourceRecord.files;
        }
        if (resourceRecord.urls != null) {
            resourceRecord.includedUrls = resourceRecord.urls;
            delete resourceRecord.urls;
        }
        // resourceType 'package' is deprecated in metadata
        if (resourceRecord.resourceType === 'package') {
            resourceRecord.package = resourceRecord.name;
            // @ts-ignore allow delete on non-optional value for now
            delete resourceRecord.name;
            // @ts-ignore allow delete on non-optional value for now
            delete resourceRecord.resourceType;
        }
        // link field is deprecated in metadata
        if (resourceRecord.location != null) {
            resourceRecord.link = resourceRecord.location;
            delete resourceRecord.location;
        }
        // linkForDownload field is deprecated in metadata
        if (resourceRecord.locationForDownload != null) {
            resourceRecord.linkForDownload = resourceRecord.locationForDownload;
            delete resourceRecord.locationForDownload;
        }
        // content field is deprecated in metadata
        if (resourceRecord.resourceType === 'categoryInfo' ||
            resourceRecord.resourceType === 'overview') {
            if ('content' in resourceRecord) {
                resourceRecord.description = resourceRecord.content;
                delete resourceRecord.content;
            }
        }
        // 'weblink' is deprecated in metadata
        if (resourceRecord.resourceType === 'weblink') {
            resourceRecord.resourceType = 'other';
        }
        // 'overview' is deprecated in metadata
        if (resourceRecord.resourceType === 'categoryInfo') {
            resourceRecord.resourceType = 'overview';
        }
        // 'project' is deprecated in metadata
        if (resourceRecord.resourceType === 'project') {
            resourceRecord.resourceType = 'project.ccs';
        }
        // 'projectSpec' is deprecated in metadata
        if (resourceRecord.resourceType === 'project.ccs' &&
            path.extname(resourceRecord.link) === '.projectspec') {
            resourceRecord.resourceType = 'projectSpec';
        }
        // 'energiaSketch' is deprecated in metadata
        if (resourceRecord.resourceType === 'energiaSketch') {
            resourceRecord.resourceType = 'project.energia';
        }
        // actions field is deprecated in metadata
        if (resourceRecord.actions != null) {
            if (resourceRecord.resourceType === 'folder' &&
                resourceRecord.actions.indexOf('import') !== -1) {
                resourceRecord.resourceType = 'folder.importable';
            }
            // actions field is deprecated in metadata
            if (resourceRecord.resourceType === 'file' &&
                resourceRecord.actions.indexOf('import') !== -1) {
                resourceRecord.resourceType = 'file.importable';
            }
            delete resourceRecord.actions;
        }
        // 'executable' is deprecated in metadata
        if (resourceRecord.resourceType === 'executable') {
            resourceRecord.resourceType = 'file.executable';
        }
        // 'app' is deprecated in metadata
        if (resourceRecord.resourceType === 'app') {
            resourceRecord.resourceType = 'web.app';
        }
        if (resourceRecord.supplements) {
            resourceRecord.supplements.versionRange = resourceRecord.supplements.semver;
            // for b/w compatibility
            resourceRecord.supplements.id = resourceRecord.supplements.packageId;
            resourceRecord.supplements.version = resourceRecord.supplements.semver;
        }
        if (resourceRecord.moduleOf) {
            resourceRecord.moduleOf.versionRange = resourceRecord.moduleOf.semver;
        }
        if (resourceRecord.moduleGroup && resourceRecord.moduleGroup.corePackage) {
            resourceRecord.moduleGroup.corePackage.versionRange =
                resourceRecord.moduleGroup.corePackage.semver;
        }
        // handle public id values, we have alternate names for BUs vs internal use
        // the goal is to make things clear for BUs, while keeping things more explicit in the code itself.
        if (resourceRecord.localId) {
            resourceRecord.customResourceUid = resourceRecord.localId;
            delete resourceRecord.localId;
        }
        if (resourceRecord.localAliases) {
            resourceRecord.customResourceAliasUids = resourceRecord.localAliases;
            delete resourceRecord.localAliases;
        }
        if (resourceRecord.globalAliases || resourceRecord.aliases) {
            resourceRecord.customGlobalResourceUids =
                resourceRecord.globalAliases || resourceRecord.aliases;
            delete resourceRecord.globalAliases;
            delete resourceRecord.aliases;
        }
    }
    /**
     * Process categories and transform main and sub categories into categories
     *
     * @param {Object} resourceRecord
     * @param {Object} packageMetadata
     */
    function processCategories(resourceRecord, packageMetadata) {
        if (resourceRecord.mainCategories != null) {
            // convert to array if necessary
            if (Array.isArray(resourceRecord.mainCategories[0]) === false) {
                resourceRecord.mainCategories = [
                    resourceRecord.mainCategories
                ];
            }
            // suppress all categories except "Devices" and "Development Tools" for handling later
            // (***) heer is just a temporary implementation for a specific hard coded case
            if (packageMetadata.type === vars_1.Vars.TOP_CATEGORY.devices.id ||
                packageMetadata.type === vars_1.Vars.TOP_CATEGORY.devtools.id) {
                const suppressedMainCategories = [];
                for (let i = 0; i < resourceRecord.mainCategories.length; i++) {
                    const cat = resourceRecord.mainCategories[i];
                    const newcat = [];
                    for (let j = 0; j < cat.length; j++) {
                        if (cat[j] !== 'Devices' && cat[j] !== 'Development Tools') {
                            continue;
                        }
                        newcat.push(cat[j]);
                    }
                    suppressedMainCategories.push(newcat);
                }
                resourceRecord.mainCategories = suppressedMainCategories;
            }
            // assign mainCategories to categories
            // (*) not a deep copy, change to categories also apply to mainCategories
            //     if maintaining the original mainCategories is needed then do deep copy
            resourceRecord.categories = resourceRecord.mainCategories;
            // append subCategories
            if (resourceRecord.subCategories != null) {
                if (Array.isArray(resourceRecord.subCategories[0]) === true) {
                    // not allow multiple, just pick the first one
                    resourceRecord.subCategories = resourceRecord.subCategories[0];
                }
                _.remove(resourceRecord.subCategories, item => item === 'Kits and Boards');
                for (let ic = 0; ic < resourceRecord.categories.length; ic++) {
                    resourceRecord.categories[ic].push(...resourceRecord.subCategories);
                }
            }
            delete resourceRecord.mainCategories;
            delete resourceRecord.subCategories;
        }
    }
    /**
     * Extract filter fields such as resource class, compiler, ide, kernel and language, that are
     * not defined in old metadata from the categories field.
     * This is a workaround for pre-4.0 metadata on a best effort basis since packakages did not
     * consistently specify these fields
     *
     * Since this could end up a very expensive operation, the extraction is kept very simple:
     * no regex, no partial string matches, only the first found match is used, and early exit of
     * iteration whenever a match was found
     *
     * @param {Object} resourceRecord
     * @param packageHeader
     */
    function extractFilterFieldsFromCategories(resourceRecord, packageHeader) {
        // determine resource class: example or not
        if (!resourceRecord.resourceClass) {
            if ([
                'projectSpec',
                'project.ccs',
                'project.energia',
                'project.iar',
                'file.importable',
                'folder.importable'
            ].includes(resourceRecord.resourceType)) {
                resourceRecord.resourceClass = ['example'];
            }
        }
        // determine ide for example (TODO for non-example resources)
        if (!resourceRecord.ide) {
            if ([
                'projectSpec',
                'project.ccs',
                'project.energia',
                'file.importable',
                'folder.importable'
            ].includes(resourceRecord.resourceType)) {
                resourceRecord.ide = ['ccs'];
            }
            else if (['project.iar'].includes(resourceRecord.resourceType)) {
                resourceRecord.ide = ['iar'];
            }
        }
        // infer as best as we can compiler, kernel and language from categories
        if (resourceRecord.categories) {
            for (const categoryPath of resourceRecord.categories) {
                for (const category of categoryPath) {
                    if (!resourceRecord.compiler) {
                        if (['CCS Compiler'].includes(category)) {
                            resourceRecord.compiler = ['ccs'];
                            continue;
                        }
                        if (['GCC Compiler'].includes(category)) {
                            resourceRecord.compiler = ['gcc'];
                            continue;
                        }
                        if (['IAR Compiler'].includes(category)) {
                            resourceRecord.compiler = ['iar'];
                            continue;
                        }
                        if (['TI Clang Compiler'].includes(category)) {
                            resourceRecord.compiler = ['ticlang'];
                            continue;
                        }
                    }
                    if (!resourceRecord.kernel) {
                        if (['TI-RTOS7'].includes(category)) {
                            resourceRecord.kernel = ['tirtos7'];
                        }
                        if (['TI-RTOS'].includes(category)) {
                            resourceRecord.kernel = ['tirtos'];
                            continue;
                        }
                        if (['FreeRTOS'].includes(category)) {
                            resourceRecord.kernel = ['freertos'];
                            continue;
                        }
                        if (['No RTOS'].includes(category)) {
                            resourceRecord.kernel = ['nortos'];
                            continue;
                        }
                    }
                    if (!resourceRecord.language) {
                        if (['English'].includes(category)) {
                            resourceRecord.language = ['english'];
                            continue;
                        }
                        if (['Chinese'].includes(category)) {
                            resourceRecord.language = ['chinese'];
                            continue;
                        }
                    }
                }
            }
        }
        // set defaults if still nothing set in case of examples
        if (resourceRecord.resourceClass && resourceRecord.resourceClass.includes('example')) {
            if (!resourceRecord.compiler) {
                resourceRecord.compiler = ['ccs'];
            }
            if (!resourceRecord.kernel) {
                if (packageHeader && packageHeader.packageId.startsWith('tirtos_')) {
                    resourceRecord.kernel = ['tirtos'];
                }
                else {
                    resourceRecord.kernel = ['nortos'];
                }
            }
            if (!resourceRecord.ide) {
                resourceRecord.ide = ['ccs'];
            }
        }
    }
    /**
     * Process and possibly update the records rootCategory
     *
     */
    async function processRootCategory(resourceRecord, packageMetadata) {
        if (!resourceRecord.rootCategory) {
            resourceRecord.rootCategory = [];
        }
        if (resourceRecord.supplements) {
            // suffix rootCategory with package name
            resourceRecord.rootCategory = resourceRecord.rootCategory.concat([
                resourceRecord.package
            ]);
            // prefix rootCategory with parent root category (requires parents to be processed first)
            const supplementedOverviews = await getSupplementedPackages(resourceRecord);
            const parentRoots = supplementedOverviews.map(overview => overview.modifiedValues && overview.modifiedValues.rootCategory
                ? overview.modifiedValues.rootCategory
                : overview.rootCategory);
            {
                // Ensure all parents have same root category
                let parentRootsEqual = true;
                for (let i = 1; i < parentRoots.length; i++) {
                    parentRootsEqual =
                        parentRootsEqual &&
                            parentRoots[i].map((piece, j) => piece === parentRoots[0][j]).reduce((item1, item2) => item1 && item2, true);
                    if (!parentRootsEqual) {
                        break;
                    }
                }
                if (!parentRootsEqual) {
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: `Supplemental package ${resourceRecord.id} has parents with different root categories`
                    });
                }
            }
            resourceRecord.rootCategory = parentRoots[0].concat(resourceRecord.rootCategory);
        }
        else if (resourceRecord.moduleOf) {
            // Set the root category the same as the core package (requires core package to be processed first)
            const corePackageOverview = await getCorePackage(resourceRecord, 'moduleOf');
            if (corePackageOverview.rootCategory) {
                resourceRecord.rootCategory = corePackageOverview.rootCategory;
            }
        }
        else {
            // Software and Software Tools Packages: use package name if no root category specified
            if (resourceRecord.rootCategory.length === 0 &&
                (!packageMetadata.type ||
                    packageMetadata.type === vars_1.Vars.TOP_CATEGORY.software.id ||
                    packageMetadata.type === vars_1.Vars.TOP_CATEGORY.softwareTools.id)) {
                resourceRecord.rootCategory = [resourceRecord.package];
            }
            // prefix root category with the package type ("Software", "Device Documentation", etc.)
            if (packageMetadata && packageMetadata.typeName) {
                resourceRecord.rootCategory = [packageMetadata.typeName].concat(resourceRecord.rootCategory);
            }
        }
    }
    /**
     * Get the set of packages that the package supplements.
     *
     * @param {Object} resourceRecord
     */
    async function getSupplementedPackages(resourceRecord) {
        if (resourceRecord.supplements == null) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: 'Must be called with a supplements member'
            });
        }
        const { packageId, versionRange } = resourceRecord.supplements;
        const packageOverviews = await dbOverviews.findAsync({
            resourceType: 'packageOverview',
            packageId
        });
        if (!packageOverviews || packageOverviews.length === 0) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: `Missing package to supplement ${packageId}`
            });
        }
        const supplementedOverviews = packageOverviews.filter(overview => versioning.satisfies(overview.version, versionRange));
        if (supplementedOverviews.length === 0) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: `Supplementary package ${resourceRecord.id} has no packages to supplement`
            });
        }
        const supplementalOverview = supplementedOverviews.find(overview => !!overview.supplements);
        if (supplementalOverview) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: `Supplemental chain detected ${resourceRecord.id},${resourceRecord.version} -> ${supplementalOverview.id}, ${supplementalOverview.version} -> ${supplementalOverview.supplements.packageId}, ${supplementalOverview.supplements.versionRange}`
            });
        }
        return supplementedOverviews;
    }
    async function getCorePackage(resourceRecord, lookupField) {
        const field = lookupField === 'moduleGroup'
            ? resourceRecord.moduleGroup && resourceRecord.moduleGroup.corePackage
            : resourceRecord[lookupField];
        if (field == null) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
                message: 'Must be called with a module or module group'
            });
        }
        const { packageId, versionRange } = field;
        const packageOverviews = await dbOverviews.findAsync({
            resourceType: 'packageOverview',
            packageId
        });
        if (!packageOverviews || packageOverviews.length === 0) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: `Missing core package for module / moduleGroup ${packageId}`
            });
        }
        const corePackageOverview = packageOverviews
            .sort((item1, item2) => {
            return versioning.rcompare(item1.version, item2.version);
        })
            .find(overview => versioning.satisfies(overview.version, versionRange));
        if (!corePackageOverview) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: `Module / Module group package ${resourceRecord.id} has no core package`
            });
        }
        if (corePackageOverview[lookupField]) {
            throw new rexError_1.RefreshError({
                refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                message: `Core package is a module / moduelGroup of its own module (this is a cycle) ${corePackageOverview.id}, ${corePackageOverview.version} -> ${resourceRecord.packageId}, ${resourceRecord.version}`
            });
        }
        return corePackageOverview;
    }
    /**
     * ASYNC PROCESSING STEP (device and devtool related)
     */
    async function asyncProcessing(resourceList, duplicateMissingCoreTypesLogs, duplicateOverviewsLogs, duplicateMissingDevicesLogs) {
        for (const resourceRecord of resourceList) {
            // logger.info(makeLogMsg('DEBUG: Processing ' + resourceRecord.name));
            resourceRecord.fullPaths = [];
            resourceRecord.fullPathsCoreTypeId = [];
            resourceRecord.fullPathsDevId = [];
            resourceRecord.fullPathsPublicIds = [];
            if (!packageHeader) {
                throw new rexError_1.RefreshError({
                    refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                    message: 'No Package Header, possible supplement package without dependent package (being refered to) submission'
                });
            }
            // if no devtools/devtools_category defined propagate from package header
            // (devtools being null implies devtools_category is null too)
            if (resourceRecord.devtools == null && packageHeader.devtools != null) {
                resourceRecord.devtools = packageHeader.devtools;
                resourceRecord.devtools_category = packageHeader.devtools_category;
            }
            // if no devices defined propagate from package header
            if (resourceRecord.devices == null &&
                resourceRecord.devtools == null &&
                packageHeader.devices != null) {
                resourceRecord.devices = packageHeader.devices;
            }
            // <<<<< look up device names based on IDs: .devices changes from id to name
            // here! >>>>>>>
            try {
                const deviceNames = await devices.getNames(dbDevices, resourceRecord.devices, packageMetadata.metaDataVer);
                if (deviceNames != null && deviceNames.length > 0) {
                    resourceRecord.devices = deviceNames;
                }
            }
            catch (err) {
                logger.error(makeLogMsg(`Required device record(s) cannot be found. Offending resource record name [${resourceRecord.name}]. ${err.message}`));
                worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
            }
            // <<<<< look up devtool names based on IDs: .devtools changes from id to name
            // here! >>>>>>
            try {
                let devtoolNames = await devtools.getNames(dbDevtools, resourceRecord.devtools, packageMetadata.metaDataVer);
                if (devtoolNames != null && devtoolNames.length > 0) {
                    resourceRecord.devtools = devtoolNames;
                }
                // <<<<< look up devtool names based on IDs: .devtools_category changes from id
                // to name here! >>>>>>
                devtoolNames = await devtools.getNames(dbDevtools, resourceRecord.devtools_category, packageMetadata.metaDataVer);
                if (devtoolNames != null && devtoolNames.length > 0) {
                    resourceRecord.devtools_category = devtoolNames;
                }
            }
            catch (err) {
                logger.error(makeLogMsg(`Required devtool record(s) cannot be found. Offending resource record name [${resourceRecord.name}]. ${err.message}`));
                worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
            }
            // expand core types specified as regex
            let coreTypesExpanded = null;
            if (resourceRecord.coreTypes) {
                for (const coreType of resourceRecord.coreTypes) {
                    coreTypesExpanded = [];
                    const regex = /^\/(.*?)\/$/; // check if coreType is specified as regex,
                    // e.g.: '/msp43?/'
                    if (!regex.test(coreType)) {
                        coreTypesExpanded.push(coreType);
                        continue;
                    }
                    const r = regex.exec(coreType);
                    const coreTypeRegex = new RegExp(r[1]);
                    const deviceRecords = await dbDevices.findAsync({
                        // packageUId: resourceRecord.packageUId,  // Metadata_2.1 : global H/W
                        // packages
                        coreTypes_id: coreTypeRegex
                    });
                    if (deviceRecords === null) {
                        let messageLevel = 1 /* RefreshMessageLevel.WARNING */;
                        if (semver.gte(packageMetadata.metaDataVer, '4.0.0')) {
                            messageLevel = 2 /* RefreshMessageLevel.ERROR_CONTINUE */;
                        }
                        const count = getDuplicatedLogsCount(duplicateMissingDevicesLogs, coreType, messageLevel);
                        if (count === 1) {
                            logger[dbBuilder_1.refreshMessageLevel[messageLevel]](makeLogMsg(`Device not found in the device db: ${coreType}. Skipping.`));
                            worstMessageLevel = Math.max(worstMessageLevel, messageLevel);
                        }
                        continue;
                    }
                    for (let i = 0; i < deviceRecords.length; i++) {
                        const deviceRecord = deviceRecords[i];
                        for (let j = 0; j < deviceRecord.coreTypes_id.length; j++) {
                            const coreTypeId = deviceRecord.coreTypes_id[j];
                            if (coreTypeRegex.test(coreTypeId)) {
                                coreTypesExpanded.push(coreTypeId);
                            }
                        }
                    }
                }
            }
            if (coreTypesExpanded != null) {
                resourceRecord.coreTypes = coreTypesExpanded;
            }
            // add any missing devices based on specified coreTypes
            if (resourceRecord.coreTypes != null) {
                const devices = await dbDevices.findAsync({
                    // packageUId: resourceRecord.packageUId,  // Metadata_2.1 : global H/W
                    // packages
                    coreTypes_id: { $in: resourceRecord.coreTypes }
                });
                if (devices != null && devices.length > 0) {
                    if (resourceRecord.devices == null) {
                        resourceRecord.devices = [];
                    }
                    for (let i = 0; i < devices.length; i++) {
                        if (resourceRecord.devices.indexOf(devices[i].name) === -1) {
                            resourceRecord.devices.push(devices[i].name);
                        }
                    }
                }
                else {
                    const count = getDuplicatedLogsCount(duplicateMissingCoreTypesLogs, JSON.stringify(resourceRecord.coreTypes), 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    if (count === 1) {
                        logger.error(makeLogMsg(`All or some core types not found in device DB: ${JSON.stringify(resourceRecord.coreTypes)}`));
                        worstMessageLevel = Math.max(worstMessageLevel, 2 /* RefreshMessageLevel.ERROR_CONTINUE */);
                    }
                }
            }
            // expand family/subfamily/etc in 'devices' into its variants (leafs) and
            // move family/subfamily/etc out into 'devicesAncestors'
            resourceRecord.devicesVariants = [];
            resourceRecord.devicesAncestors = []; // list of common ancestors of all variants
            if (resourceRecord.devices != null) {
                for (const deviceName of resourceRecord.devices) {
                    await utils.expandDevices(dbDevices, resourceRecord, deviceName, logger);
                }
            }
            // no devtools, but devices specified: populate with devtools that are
            // associated with the devices
            if (resourceRecord.devtools == null && resourceRecord.devices != null) {
                const result = await dbDevtools.findAsync({
                    devices: { $in: resourceRecord.devicesVariants }
                });
                if (result != null && result.length > 0) {
                    resourceRecord.devtools = [];
                    resourceRecord.devtools_category = [];
                    for (let i = 0; i < result.length; i++) {
                        const devtool = result[i];
                        resourceRecord.devtools.push(devtool.name);
                        resourceRecord.devtools_category.push(devtool.name);
                    }
                }
            }
            // no devices, but devtools specified: populate with devices that are
            // associated with the devtools
            if (resourceRecord.devices == null && resourceRecord.devtools != null) {
                const result = await dbDevtools.findAsync({
                    name: { $in: resourceRecord.devtools }
                });
                if (result != null && result.length > 0) {
                    for (let i = 0; i < result.length; i++) {
                        const devtool = result[i];
                        if (devtool.devices != null) {
                            resourceRecord.devicesVariants = resourceRecord.devicesVariants.concat(devtool.devices);
                        }
                    }
                }
            }
            // build each possible combination of device variant path and category
            // path for the resource item: the device hierarchy path will be
            // inserted after 'Devices' path element but only if the latter
            // exists;;; a core type will be appended if (a) the device has more
            // than one core type and (b) the core type is specified in the
            // coreTypes filed
            for (const deviceName of resourceRecord.devicesVariants) {
                const messageLevel = await insertFullPathAsync(packageMetadata, dbDevices, resourceRecord, 'Devices', null, deviceName, null, packageMetadata.type, logger, duplicateMissingDevicesLogs, makeLogMsg, getDuplicatedLogsCount);
                worstMessageLevel = Math.max(worstMessageLevel, messageLevel);
            }
            // merge ancestors into 'devices'
            resourceRecord.devices = resourceRecord.devicesAncestors.concat(resourceRecord.devicesVariants);
            // @ts-ignore allow delete on non-optional value for now
            delete resourceRecord.devicesAncestors;
            // logger.info(makeLogMsg('Processed ' + resourceRecord.name));
            // TODO: put a warning for the package header if no overall device defined
            // callback => {
            //     if (resourceRecord.devices != null && !resourceRecord.isIncludedFile) {
            //         loggerResources.log(
            //             'warning',
            //             "The following resource does not have any 'devices' specified and may " +
            //                 'get excluded from filter/search results: ' +
            //                 JSON.stringify(
            //                     resourceRecord,
            //                     (key, value) =>
            //                         key === 'name' ||
            //                         key === 'categories' ||
            //                         key === 'packagePath'
            //                             ? value
            //                             : undefined
            //                 )
            //         );
            //     }
            //     setImmediate(callback);
            // },
            // build each possible combination of devtool name and category path for
            // the resource item: the devtool name will be inserted after 'Development
            // Tools' path element but only if the latter exists; a core type will be
            // appended if (a) a device is specified in the mapping, (b) the device is
            // specified in the devices field, (c) the device has more than one core
            // type and (d) the core type is specified in the coreTypes field; note: the
            // device hierarchy will NOT be inserted to avoid too many category levels
            // assumption: devtool db is a flat list, i.e. no hierarchy like devices
            if (resourceRecord.devtools_category != null) {
                const result = await dbDevtools.findAsync({
                    // packageUId: resourceRecord.packageUId,  // Metadata_2.1 : global H/W
                    // packages
                    name: { $in: resourceRecord.devtools_category }
                });
                if (result != null && result.length > 0) {
                    for (const devtoolRecord of result) {
                        if (devtoolRecord.devices != null) {
                            for (const deviceName of devtoolRecord.devices) {
                                if (resourceRecord.devices.indexOf(deviceName) !== -1) {
                                    const messageLevel = await insertFullPathAsync(packageMetadata, dbDevices, resourceRecord, 'Development Tools', devtoolRecord.name, deviceName, devtoolRecord.type, packageMetadata.type, logger, duplicateMissingDevicesLogs, makeLogMsg, getDuplicatedLogsCount);
                                    worstMessageLevel = Math.max(worstMessageLevel, messageLevel);
                                }
                            }
                        }
                        else {
                            insertFullPathDevtools(resourceRecord, 'Development Tools', devtoolRecord.name, devtoolRecord.type, packageMetadata.type);
                        }
                    }
                }
            }
            // add in remaining category paths to full paths
            if (resourceRecord.categories) {
                for (let i = 0; i < resourceRecord.categories.length; i++) {
                    const categoryPath = resourceRecord.categories[i];
                    if (categoryPath.indexOf('Development Tools') === -1 &&
                        categoryPath.indexOf('Devices') === -1) {
                        pushFullPath(resourceRecord, deepCopy(categoryPath));
                    }
                }
                // full paths must always be set
                if (resourceRecord.fullPaths.length === 0) {
                    resourceRecord.fullPaths = deepCopy(resourceRecord.categories);
                }
            }
            // create a list of all fullPaths (i.e w/o resources) in the package: this
            // is then used to add overviews and public ids for every fullPath
            const isOverview = utils.isOverview(resourceRecord);
            const isResource = !isOverview;
            for (let fpIndex = 0; fpIndex < resourceRecord.fullPaths.length; fpIndex++) {
                const fullPath = resourceRecord.fullPaths[fpIndex];
                const fullPathPlusName = fullPath.concat(resourceRecord.name);
                let treeNodePath = fullPathPlusName[0];
                let treeParentNodePath = '';
                fullPathPlusName.forEach((fullPathPlusNameElement, index, fullPathPlusName) => {
                    const isNameElement = index === fullPathPlusName.length - 1;
                    if (index > 0) {
                        treeParentNodePath = treeNodePath;
                        treeNodePath += '/' + fullPathPlusNameElement;
                    }
                    const isResourceLeafElement = isNameElement && isResource;
                    const fullPathInfo = !isResourceLeafElement
                        ? fullPathsMapFolders[treeNodePath]
                        : undefined;
                    const hasOverview = isNameElement && isOverview;
                    const _idOverview = hasOverview ? resourceRecord._id : undefined;
                    let defaultPublicId = '';
                    if (!fullPathInfo || isResourceLeafElement) {
                        if (packageMetadata.rootCategory &&
                            index + 2 > packageMetadata.rootCategory.length) {
                            const localPath = treeNodePath.replace(packageMetadata.rootCategory.join('/') + '/', '');
                            defaultPublicId = utils.createPublicIdFromTreeNodePath(
                            // The package overview will have localPath = '/'
                            localPath || '/');
                        }
                        else {
                            // generate a default publicId based on the tree path if none was
                            // provided (e.g. "Device Documentation/IWR1XXX/IWR1443/Application notes")
                            // format in 128-bit base64: [type:8bits|id:120bits]
                            defaultPublicId = utils.createPublicIdFromTreeNodePath(treeNodePath);
                        }
                    }
                    if (!isResourceLeafElement) {
                        // all folders in the tree, i.e resource ancestor paths and overview ancestor
                        // paths including overview name element itself (i.e. only excluding resource
                        // name element aka resource leaf)
                        if (!fullPathInfo) {
                            // create new entry in map
                            fullPathsMapFolders[treeNodePath] = {
                                defaultPublicId,
                                fromResource: isResource,
                                hasOverview,
                                _idOverview: _idOverview ? [_idOverview] : undefined,
                                overviewRef: isOverview ? resourceRecord : null
                            };
                        }
                        else if (fullPathInfo) {
                            if (hasOverview && fullPathInfo.hasOverview) {
                                const count = getDuplicatedLogsCount(duplicateOverviewsLogs, treeNodePath, 1 /* RefreshMessageLevel.WARNING */);
                                if (count === 1) {
                                    logger.warning(makeLogMsg(`Ignoring duplicate overview for ${treeNodePath}`));
                                    worstMessageLevel = Math.max(worstMessageLevel, 1 /* RefreshMessageLevel.WARNING */);
                                }
                            }
                            // update entry in map
                            fullPathInfo.fromResource = fullPathInfo.fromResource || isResource;
                            fullPathInfo.hasOverview = fullPathInfo.hasOverview || hasOverview;
                            if (hasOverview) {
                                if (!fullPathInfo._idOverview) {
                                    fullPathInfo._idOverview = [];
                                }
                                fullPathInfo._idOverview.push(_idOverview);
                            }
                        }
                    }
                    else {
                        // add resource leafs to the fullPathInfo
                        const fullPathInfo = fullPathsMapFolders[treeParentNodePath];
                        const resourceLeafName = fullPathPlusNameElement;
                        if (!fullPathInfo.leafs) {
                            fullPathInfo.leafs = {};
                        }
                        fullPathInfo.leafs = {
                            ...fullPathInfo.leafs,
                            [resourceLeafName]: {
                                defaultPublicId,
                                resourceLink: resourceRecord.link
                            }
                        };
                    }
                    if (isNameElement) {
                        // resource or overview
                        resourceRecord.fullPathsPublicIds.push(defaultPublicId);
                        // if a custom resource id was provided in the metadata generate a
                        // public UID from it
                        if (resourceRecord.customResourceUid) {
                            const customPublicId = utils.createPublicIdFromCustomResourcePublicUid(resourceRecord.customResourceUid, resourceRecord, fpIndex);
                            if (!resourceRecord.fullPathsCustomPublicIds) {
                                resourceRecord.fullPathsCustomPublicIds = [];
                            }
                            resourceRecord.fullPathsCustomPublicIds.push(customPublicId);
                        }
                        // if additionally custom alias resource ids were provided in the metadata
                        // generate public UIDs from it
                        let customAliasPublicIds = [];
                        if (resourceRecord.customResourceAliasUids) {
                            customAliasPublicIds = resourceRecord.customResourceAliasUids.map(customResourceAliasUid => utils.createPublicIdFromCustomResourcePublicUid(customResourceAliasUid, resourceRecord, fpIndex));
                        }
                        if (!resourceRecord.fullPathsCustomAliasPublicIds) {
                            resourceRecord.fullPathsCustomAliasPublicIds = [];
                        }
                        // Add the original defaultPublicId to the set of aliases, only for package resources
                        if (packageMetadata.rootCategory &&
                            index + 2 > packageMetadata.rootCategory.length) {
                            let oldTreeNodePath = treeNodePath;
                            if (packageMetadata.modifiedValues &&
                                packageMetadata.modifiedValues.rootCategory) {
                                const originalRootCategory = [
                                    ...packageMetadata.modifiedValues.rootCategory,
                                    ...(resourceRecord.kitsAndBoards ? ['Kits and Boards'] : [])
                                ].join('/');
                                oldTreeNodePath = oldTreeNodePath.replace(packageMetadata.rootCategory.join('/') +
                                    (originalRootCategory ? '' : '/'), originalRootCategory);
                            }
                            const alias = utils.createPublicIdFromTreeNodePath(oldTreeNodePath);
                            customAliasPublicIds.push(alias);
                        }
                        resourceRecord.fullPathsCustomAliasPublicIds.push(customAliasPublicIds);
                    }
                });
            }
            determineResourceGroup(packageHeader ? packageHeader.package : '', resourceRecord);
            // split into resources and overviews (mainly for performance reasons since we
            // need to query overviews w/o device/devtool/search and there are relatively
            // few overview entries)
            if (utils.isOverview(resourceRecord)) {
                // [ Metadata_2.1 : Extract package type from metadata and put in the
                // package overview here
                if (resourceRecord.type == null &&
                    resourceRecord.resourceType === 'packageOverview') {
                    if (packageMetadata.type == null || packageMetadata.type === 'full') {
                        resourceRecord.type = vars_1.Vars.TOP_CATEGORY.software.id;
                    }
                    else {
                        resourceRecord.type = packageMetadata.type;
                    }
                }
                // ]
                overviews.push(resourceRecord);
            }
            else {
                resources.push(resourceRecord);
            }
        }
        return worstMessageLevel;
    }
}
exports._process = _process;
/**
 * Groups together importable resources that appear to be the same example but for different
 * compilers and kernels. E.g. in the Table View such a group would be shown as a single table
 * entry. Resource groups are only established within a package and as such the generated
 * resourceGroup id is unique within a package only.
 */
function determineResourceGroup(packageName, resourceRecord) {
    // TODO: should use the below compilers and kernels definition also for the
    // extractFilterFieldsFromCategories function
    const compilers = {
        iar: 'IAR Compiler',
        gcc: 'GCC Compiler',
        ccs: 'CCS Compiler',
        ticlang: 'TI Clang Compiler'
    };
    const kernels = {
        tirtos: 'TI-RTOS',
        freertos: 'FreeRTOS',
        nortos: 'No RTOS',
        tirtos7: 'TI-RTOS7'
    };
    const nonCategoryPathItems = [
        resourceRecord.name,
        packageName,
        'Software',
        'Energia',
        'Development Tools',
        'Devices',
        'Chinese',
        'English',
        'Examples',
        'Built-in Examples',
        'Examples from Libraries',
        'Libraries',
        'Example Projects'
    ];
    if (!resourceRecord.doNotCount && // excludes source files within projects
        resourceRecord.resourceClass &&
        resourceRecord.resourceClass.includes('example')) {
        const resourceGroups = resourceRecord.fullPaths.map(fullPath => {
            // determine resource group id by removing compiler and kernel names from the
            // fullpath
            const resourceGroupId = fullPath
                .filter(pathElement => !(Object.values(compilers).includes(pathElement) ||
                Object.values(kernels).includes(pathElement)))
                .concat([resourceRecord.name]) // TODO TV: remove dulpicate ids
                .join('/');
            // determine resource group category context: retain the minimum number of fullpath
            // elements to give users an idea what the context of the resource is since its
            // location in category tree is not shown in the table view
            const resourceGroupCategoryContext = fullPath
                .filter(pathElement => !(Object.values(compilers).includes(pathElement) ||
                Object.values(kernels).includes(pathElement) ||
                Object.values(nonCategoryPathItems).includes(pathElement) ||
                (resourceRecord.devices &&
                    resourceRecord.devices.includes(pathElement)) ||
                (resourceRecord.devtools &&
                    resourceRecord.devtools.includes(pathElement))))
                .map(pathElement => pathElement.replace('Examples', ''))
                .join(' / ');
            return {
                id: resourceGroupId,
                categoryContext: resourceGroupCategoryContext
            };
        });
        resourceRecord.resourceGroup = _.uniqWith(resourceGroups, _.isEqual);
    }
}
/**
 * check record for includedFiles info in this order:
 * 1) inlined array
 *      Paths of files to be included are relative to the package root (TODO: should be
 *      content.tirex.json file location, but could break package core)
 * 2) explicit dependency file: file path specified
 *      Paths of files to be included are relative to the dep file location
 * 3) implicit dependency file:
 *      - same filename as link with extension replaced with '.dependency',
 *      OR
 *      - filename is specified in the dependency mapping file (flat dep
 *        files in same folder) In both cases the paths of files to be included are relative to the
 *        resource link
 *
 * Simple format:  One file path per line, paths must be relative to location of the dep file (for
 * 1 and 2) or relative to the content file (for 3). The first char of each line should be +, -, or
 * space.
 *
 * +|-|<space>file_path [-> category_path]
 *
 * <space>: the file or dir is designated for downloading
 * -: applies to dirs only: only the immediate files in this dir are designated for downloading
 * +: the file or dir is designated for downloading and displaying
 *
 * Note: Instead of <space> the path string may be started at the first column, but then any
 * filenames starting with + or - would not be found
 *
 * Example:
 *  +../../../Profiles -> PROFILES
 *  +../../../common/cc26xx/board_lcd.c -> Application/board_lcd.c
 *
 * - using either '/' or '\' separators
 * - DOS and UNIX line endings are handled
 * - Paths on either side can be files or dirs
 * - category_path is optional
 *
 * JSON format: The file list can also be wrapped inside a json file generated based on the
 * configurations of a project In this case the JSON is an array of configurations with the file
 * list specified in the 'file' property
 *
 * @param record
 * @param packageHeader
 * @returns {forDisplay: for creating new resources to show in tree, fullUnrescursed: for download}
 *     all paths relative to CONTENT_BASE_PATH
 * @private
 */
function _processIncludedFiles(record, packageHeader, contentBasePath, logger, makeLogMsg) {
    let lines = null;
    let dirName = null;
    const result = { forDisplay: [], forDownload: [] };
    if (Array.isArray(record.includedFiles)) {
        // 1) - Inlined Array
        lines = record.includedFiles;
        dirName = record.packagePath;
        // TODO: should be jsonDir, but need to verify first package core doesn't break
    }
    else {
        // look for a dependency file (2 or 3)
        let depFilePath;
        let data;
        if (record.includedFiles != null) {
            // 2) - explicit dependency file path
            dirName = path.dirname(path.join(record.packagePath, record.includedFiles));
            try {
                depFilePath = path.join(contentBasePath, record.packagePath, record.includedFiles);
                // note: the includedFiles field is not automatically prefixed with package
                // path as other fields are
                data = fs.readFileSync(depFilePath, { encoding: 'utf8' });
            }
            catch (err) {
                return result;
            }
        }
        else if (record.implictDependencyFile != null) {
            // 3) - implied dependency file
            dirName = path.dirname(record.link);
            try {
                depFilePath = path.join(contentBasePath, record.implictDependencyFile);
                data = fs.readFileSync(depFilePath, { encoding: 'utf8' });
            }
            catch (err) {
                logger.warning(makeLogMsg(err));
                return result;
            }
        }
        if (data != null) {
            if (path.extname(depFilePath) === '.json') {
                try {
                    lines = JSON.parse(data)[0].files; // TODO: pick the first configuration for now
                }
                catch (err) {
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 2 /* RefreshMessageLevel.ERROR_CONTINUE */,
                        message: `Error parsing ${depFilePath}: ${err.message}`,
                        causeError: err
                    });
                }
            }
            else {
                lines = data.split('\n');
            }
        }
    }
    _process(lines, dirName, packageHeader, contentBasePath);
    return result;
    function _process(lines, dirName, packageHeader, contentBasePath) {
        if (lines == null) {
            return;
        }
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const makeVisible = line.charAt(0) === '+';
            let dirRecursionDepth;
            switch (line.charAt(0)) {
                case '+':
                    dirRecursionDepth = -1; // full depth
                    line = line.slice(1); // remove char 0
                    break;
                case '-':
                    dirRecursionDepth = 1;
                    line = line.slice(1); // remove char 0
                    break;
                case ' ':
                    dirRecursionDepth = 0;
                    line = line.slice(1); // remove char 0
                    break;
                default:
                    dirRecursionDepth = 0; // no special char, treat the same as ' ' (but if
                // filenames start with + or - they would not be found)
            }
            const tmp = line.split('->');
            let relPath = tmp[0];
            let mapTo = tmp[1] != null ? tmp[1] : ''; // need to handle missing '->' or missing
            // arg after '->'
            relPath = relPath
                .replace(/\\/g, '/')
                .replace(/\r/g, '')
                .trim();
            mapTo = mapTo
                .replace(/\\/g, '/')
                .replace(/\r/g, '')
                .trim();
            if (relPath !== '') {
                // var depPath = path.join(path.dirname(link), relPath);
                const depPath = path.join(dirName, relPath);
                const absPath = path.join(contentBasePath, depPath);
                let stat;
                try {
                    stat = fs.statSync(absPath);
                }
                catch (err) {
                    if (packageHeader && packageHeader.allowPartialDownload) {
                        result.forDownload.push({ error: err });
                    }
                    if (makeVisible) {
                        result.forDisplay.push({ error: err });
                    }
                    continue;
                }
                if (stat.isFile()) {
                    result.forDownload.push(depPath);
                    if (makeVisible) {
                        result.forDisplay.push({
                            file: depPath,
                            mapTo: mapTo === '' ? path.basename(depPath) : mapTo
                        });
                    }
                }
                else if (stat.isDirectory()) {
                    let dirFiles;
                    try {
                        dirFiles = fsutils.readDirRecursive(absPath, null, dirRecursionDepth);
                    }
                    catch (err) {
                        if (packageHeader && packageHeader.allowPartialDownload) {
                            result.forDownload.push({ error: err });
                        }
                        if (makeVisible) {
                            result.forDisplay.push({ error: err });
                        }
                        continue;
                    }
                    if (dirRecursionDepth === 0) {
                        result.forDownload.push(depPath); // if no recursion, just keep the dir path
                    }
                    else {
                        for (let k = 0; k < dirFiles.length; k++) {
                            result.forDownload.push(path.join(depPath, dirFiles[k]));
                        }
                    }
                    if (makeVisible === true) {
                        for (let j = 0; j < dirFiles.length; j++) {
                            // if no recursion, there are no files to make visible
                            result.forDisplay.push({
                                file: path.join(depPath, dirFiles[j]),
                                mapTo: path.join(mapTo, dirFiles[j])
                            });
                        }
                    }
                }
            }
        }
    }
}
exports._processIncludedFiles = _processIncludedFiles;
/**
 *
 */
async function insertFullPathAsync(packageMetaData, dbDevices, resourceRecord, keyCategory, devtoolName, deviceVariantName, devtoolType, packageType, logger, duplicateMissingDevicesLogs, makeLogMsg, getDuplicatedLogsCount) {
    // logger.info('DEBUG: ' + resourceRecord.name + 'Finding device record for ' + deviceVariantName);
    let deviceVariantRecord;
    let messageLevel;
    try {
        deviceVariantRecord = await dbDevices.findOneAsync({
            // packageUId: resourceRecord.packageUId, // Metadata_2.1 : global H/W packages
            name: deviceVariantName
        });
    }
    catch (err) {
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */,
            message: 'Query error: ' + err.message,
            causeError: err
        });
    }
    if (deviceVariantRecord === null) {
        if (semver.gte(packageMetaData.metaDataVer, '4.0.0')) {
            messageLevel = 2 /* RefreshMessageLevel.ERROR_CONTINUE */;
            const count = getDuplicatedLogsCount(duplicateMissingDevicesLogs, deviceVariantName, messageLevel);
            if (count === 1) {
                logger.error(makeLogMsg('Device not found in the device db: ' + deviceVariantName + '. Skipping.'));
            }
        }
        else {
            messageLevel = 1 /* RefreshMessageLevel.WARNING */;
            const count = getDuplicatedLogsCount(duplicateMissingDevicesLogs, deviceVariantName, messageLevel);
            if (count === 1) {
                logger.warning(makeLogMsg('Device not found in the device db: ' + deviceVariantName + '. Skipping.'));
            }
        }
        return messageLevel;
    }
    function hasDeviceAncestors(r) {
        return r.devicesAncestors != null;
    }
    // add any missing device ancestors - TODO: why is this needed?
    if (hasDeviceAncestors(resourceRecord)) {
        for (let k = 0; k < deviceVariantRecord.ancestors.length; k++) {
            const ancestor = deviceVariantRecord.ancestors[k];
            if (resourceRecord.devicesAncestors.indexOf(ancestor) === -1) {
                resourceRecord.devicesAncestors.push(ancestor);
            }
        }
    }
    // generate the full paths (only done for variants, i.e. tree leaves)
    // the full path is the category path with the device hierarchy inserted after the
    // 'Devices' category element if 'Devices' doesn't exist fullpaths remains empty and should
    // be set to categoryPaths elsewhere
    const categoryPaths = resourceRecord.categories;
    if (!categoryPaths) {
        const errStr = 'Missing category path. Possible a parent package has been omited due to errors';
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
            message: errStr
        });
    }
    for (let i = 0; i < categoryPaths.length; i++) {
        // [ Metadata_2.1 : The top category can be package type 'Development Tools"
        //   which collide with the reserved category name
        // var d = categoryPaths[i].indexOf(keyCategory);
        // if (d !== -1) {
        const d = categoryPaths[i].lastIndexOf(keyCategory);
        if (d > 0) {
            // ]
            let addedCoreType = false;
            // append any core types for this device only if they were specifically specified
            // in the metadata; if not only add device path
            if (resourceRecord.coreTypes != null && resourceRecord.coreTypes.length > 0) {
                if (deviceVariantRecord.coreTypes_id != null) {
                    // only add core type if there's more than one for this device
                    if (deviceVariantRecord.coreTypes_id.length > 1) {
                        for (let l = 0; l < deviceVariantRecord.coreTypes_id.length; l++) {
                            const coreTypeId = deviceVariantRecord.coreTypes_id[l];
                            const coreTypeName = deviceVariantRecord.coreTypes_name[l];
                            if (resourceRecord.coreTypes.indexOf(coreTypeId) !== -1) {
                                let coreTypePath;
                                if (devtoolName == null) {
                                    coreTypePath = deviceVariantRecord.ancestors
                                        .concat(deviceVariantName)
                                        .concat(coreTypeName);
                                }
                                else {
                                    coreTypePath = [devtoolName, coreTypeName];
                                }
                                add(coreTypePath, i, d);
                                addedCoreType = true;
                            }
                        }
                    }
                }
            }
            if (addedCoreType !== true) {
                let devPath = [];
                if (devtoolName == null) {
                    devPath = deviceVariantRecord.ancestors.concat(deviceVariantName);
                    add(devPath, i, d);
                }
                else {
                    // TODO: since insertFullPath in the case of 'Development Tools' is called
                    // for every mapped device, we end up with the same path inserted multiple
                    // times. To fix this properly the logic would need to be restructured...
                    // for now we check and prevent adding duplicate paths in add() below
                    devPath = [devtoolName];
                    add(devPath, i, d, true);
                }
            }
        }
    }
    function add(devPath, i, d, checkForDuplicates) {
        const fullPath = deepCopy(categoryPaths[i]);
        if (packageType === vars_1.Vars.TOP_CATEGORY.devices.id ||
            packageType === vars_1.Vars.TOP_CATEGORY.devtools.id) {
            if (keyCategory === 'Devices') {
                // remove "devices", append devPath
                fullPath.splice(d, 1, ...devPath);
            }
            else if (keyCategory === 'Development Tools') {
                const devtoolName = devtoolType != null && lookupDevtoolName(devtoolType);
                if (devtoolName && devtoolName !== 'Kits and Boards') {
                    // remove "devtools", add devtools.type, append devPath
                    fullPath.splice(d, 1, devtoolName, ...devPath);
                }
                else {
                    if (devtoolName === 'Kits and Boards') {
                        resourceRecord.kitsAndBoards = true;
                    }
                    // remove devtools, append devPath
                    fullPath.splice(d, 1, ...devPath);
                }
            }
        }
        else {
            // append devPath
            fullPath.splice(d + 1, 0, ...devPath);
        }
        if (checkForDuplicates) {
            const isFullPathAlreadyExists = resourceRecord.fullPaths.some(recordFullPath => recordFullPath.join() === fullPath.join());
            if (!isFullPathAlreadyExists) {
                pushFullPath(resourceRecord, fullPath, devPath.join()); // TODO REX-3078: pass in deviceId/devtoolId and coreTypeId instead
            }
        }
        else {
            pushFullPath(resourceRecord, fullPath, devPath.join()); // TODO REX-3078: pass in deviceId/devtoolId and coreTypeId instead
        }
    }
    // loggerResources.log('fine', 'Done building path with ' + deviceVariantName);
    messageLevel = 0 /* RefreshMessageLevel.NONE */;
    return messageLevel;
}
/**
 *
 * @param resourceRecord
 * @param keyCategory
 * @param devtoolType
 * @param packageType
 * @param devtoolName
 */
function insertFullPathDevtools(resourceRecord, keyCategory, devtoolName, devtoolType, packageType) {
    // the full path is the category path with the devtool name inserted after the 'Development
    // Tools' category element if 'Development Tools' doesn't exist fullpaths remains empty and
    // should be set to categoryPaths elsewhere
    const categoryPaths = resourceRecord.categories;
    for (let i = 0; i < categoryPaths.length; i++) {
        // [ Metadata_2.1 : hide the category "Development Tools" & "Devices" for H/W packages
        // var d = categoryPaths[i].indexOf(keyCategory);
        // if (d !== -1) {
        //     var fullPath = deepCopy(categoryPaths[i]);
        //     fullPath.splice(d + 1, 0, devtoolName);
        //     resourceRecord.fullPaths.push(fullPath);
        // }
        const d = categoryPaths[i].lastIndexOf(keyCategory);
        if (d > 0) {
            const fullPath = deepCopy(categoryPaths[i]);
            if ((packageType === vars_1.Vars.TOP_CATEGORY.devices.id ||
                packageType === vars_1.Vars.TOP_CATEGORY.devtools.id) &&
                keyCategory === 'Development Tools') {
                const devtoolName2 = devtoolType != null && lookupDevtoolName(devtoolType);
                if (devtoolName2 && devtoolName2 !== 'Kits and Boards') {
                    // remove devtools, add devtools.type
                    fullPath.splice(d, 1, devtoolName2, devtoolName);
                }
                else {
                    if (devtoolName2 === 'Kits and Boards') {
                        resourceRecord.kitsAndBoards = true;
                    }
                    // remove devtools
                    fullPath.splice(d, 1, devtoolName);
                }
            }
            else {
                fullPath.splice(d + 1, 0, devtoolName);
            }
            pushFullPath(resourceRecord, fullPath, devtoolName); // TODO REX-3078: use devtoolId instead
        }
        // ]
    }
}
function pushFullPath(resourceRecord, fullPath, devId, // device ot devtool id
coreTypeId) {
    resourceRecord.fullPaths.push(fullPath);
    // keep a record of this for making the custom public UID unique
    resourceRecord.fullPathsDevId.push(devId);
    resourceRecord.fullPathsCoreTypeId.push(coreTypeId);
}
/**
 * Based on
 * http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-an-object/5344074#5344074
 * Note: it doesn't copy functions, Date and Regex's
 * @param obj
 * @returns {*}
 */
function deepCopy(obj) {
    // TODO: move into a util class
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Temporary lookup table.
 *
 * @param type
 */
function lookupDevtoolName(type) {
    let result = type;
    if (type === 'board') {
        result = 'Kits and Boards';
    }
    else if (type === 'ide') {
        result = 'Integrated Development Environments';
    }
    else if (type === 'probe') {
        result = 'Debug Probes';
    }
    else if (type === 'programmer') {
        result = 'Production Programmers';
    }
    else if (type === 'utility') {
        result = 'Utilities';
    }
    else {
    }
    return result;
}
/**
 * Return the json files we need to processes, with
 * their paths relative to the package directory.
 *
 * @param {string} metadataDir - The metadata directory.
 * @param {string} contentBasePath - The contentBase directory.
 * @param {string} PackagePath - The package directory.
 *
 * @returns {Array.<string>} files - A list of files with their paths
 * relative to the package directory.
 */
async function getFiles(metadataDir, contentBasePath, packagePath, modulePrefix) {
    const filesWithOtherModuleContent = fsutils.readDirRecursive(path.join(contentBasePath, packagePath), 
    // '*.content.tirex.json' OR 'content.tirex.json'
    new RegExp(`(${modulePrefix || ''}.*\.content\.tirex\.json$)|(${modulePrefix ||
        ''}content\.tirex\.json$)`));
    const allModulePrefixes = await getAllModulePrefixes();
    // The initial search for *.content.tirex.json, when modulePrefix is null,
    // will return all content.tirex.json files. Filter out the module content.
    const files = modulePrefix
        ? filesWithOtherModuleContent
        : filesWithOtherModuleContent.filter(item => !allModulePrefixes.find(prefix => path.basename(item).startsWith(prefix)));
    // Note: we put package.tirex.json first so we can process it first
    const filesFinal = [
        path.join(metadataDir, `${modulePrefix || ''}${vars_1.Vars.PACKAGE_TIREX_JSON}`),
        ...files
    ].filter(item => {
        // Metadata_2.1 : skip '2.0_devices.content.tirex.json' & '2.0_devtools.content.tirex.json'
        return (item.indexOf('2.0_devices.content.tirex.json') === -1 &&
            item.indexOf('2.0_devtools.content.tirex.json') === -1);
    });
    return filesFinal;
    async function getAllModulePrefixes() {
        const allPackageTirexJsonFiles = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(path.join(contentBasePath, packagePath));
        return allPackageTirexJsonFiles
            .map(item => getModulePrefix(path.basename(item)))
            .filter((item) => !!item);
    }
    function getModulePrefix(fileName) {
        const endOfPrefix = Math.max(fileName.indexOf(vars_1.Vars.PACKAGE_TIREX_JSON), 0);
        const prefix = fileName.substring(0, endOfPrefix);
        return prefix || null;
    }
}
exports.getFiles = getFiles;
