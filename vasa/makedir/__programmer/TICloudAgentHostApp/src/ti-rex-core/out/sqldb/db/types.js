"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalIdToString = exports.publicVIdToString = exports.stringToInternalId = exports.stringToVPublicId = exports.kernelToDb = exports.dbToKernel = exports.compilerToDb = exports.dbToCompiler = exports.rowToDevice = exports.rowToDevtool = exports.rowToFilterChunk = exports.rowToFilter = exports.projectRestrictionToDb = exports.dbToProjectRestriction = exports.resourceSortToDb = exports.dbToResourceSort = exports.rowToResource = exports.decomposeStringArray = exports.recomposeStringArray = exports.mysqlWordsToPublicId = exports.nodeRowToPublicId = exports.nodePublicIdToDbWords = exports.rowToNode = exports.rowToPackageDepend = exports.decomposePlatformAttribute = exports.recomposePlatformAttributeObject = exports.rowToPackage = exports.rowToFilterDevSet = exports.rowToPackageGroup = exports.rowToContentSource = void 0;
const dbTypes_1 = require("../../lib/dbBuilder/dbTypes");
const Long = require("long");
const _ = require("lodash");
const dbBuilderUtils_1 = require("../../lib/dbBuilder/dbBuilderUtils");
const rexError_1 = require("../../utils/rexError");
const util_1 = require("../../shared/util");
function rowToContentSource(row) {
    return {
        id: row.id,
        publicVId: publicVIdToString({
            publicId: row.public_id,
            version: row.version
        }),
        publicId: row.public_id,
        version: row.version,
        created: row.created,
        stateUpdated: row.state_updated,
        type: row.type,
        state: row.state,
        mainPackageId: row.main_package_id,
        filterDevSetId: row.devset_id,
        priority: row.priority,
        packagesToListVersionsFrom: recomposeStringArray(row.packages_to_list_versions_from, false)
    };
}
exports.rowToContentSource = rowToContentSource;
function rowToPackageGroup(row) {
    return {
        id: row.id,
        publicVId: publicVIdToString({
            publicId: row.public_id,
            version: row.version
        }),
        publicId: row.public_id,
        version: row.version,
        created: row.created,
        stateUpdated: row.state_updated,
        type: row.type,
        state: row.state,
        mainPackageId: row.main_package_id,
        filterDevSetId: row.devset_id,
        packagesToListVersionsFrom: recomposeStringArray(row.packages_to_list_versions_from, false)
    };
}
exports.rowToPackageGroup = rowToPackageGroup;
function rowToFilterDevSet(row) {
    return {
        id: row.id,
        publicVId: publicVIdToString({
            publicId: row.public_id,
            version: row.version
        }),
        publicId: row.public_id,
        version: row.version,
        created: row.created,
        stateUpdated: row.state_updated,
        type: row.type,
        state: row.state,
        priority: row.priority
    };
}
exports.rowToFilterDevSet = rowToFilterDevSet;
/* prettier-ignore */
function rowToPackage(row) {
    /* prettier-ignore */
    return {
        id: row.id,
        jsonId: row.json_id,
        publicId: row.public_id,
        version: row.version,
        uid: row.uid,
        installPath: recomposePlatformAttributeObject(row.install_path),
        installCommand: recomposePlatformAttributeObject(row.install_command),
        installSize: {
            // TODO! Upgrade Prettier so that we can use ??
            win: row.install_size_win == null ? undefined : row.install_size_win,
            linux: row.install_size_linux == null ? undefined : row.install_size_linux,
            macos: row.install_size_macos == null ? undefined : row.install_size_macos
        },
        type: row.type,
        subType: row.sub_type ? row.sub_type : null,
        featureType: row.feature_type ? row.feature_type : null,
        ccsVersion: row.ccs_version,
        ccsInstallLocation: row.ccs_install_loc,
        name: row.name,
        description: row.descr,
        path: row.path,
        image: row.image,
        order: row.ordinal,
        semver: row.semver,
        metadataVersion: row.metadata_version,
        restrictions: row.restrictions,
        license: row.license,
        hideNodeDirPanel: row.hide_node_dir_panel === 1,
        moduleOf: row.module_of_package_id || row.module_of_version_range
            ? {
                packageId: row.module_of_package_id,
                versionRange: row.module_of_version_range
            }
            : null,
        hideByDefault: row.hide_by_default === 1,
        moduleGroup: row.module_grp_core_pkg_pid || row.module_grp_core_pkg_vrange || row.module_grp_packages
            ? {
                corePackage: {
                    packageId: row.module_grp_core_pkg_pid,
                    versionRange: row.module_grp_core_pkg_vrange
                },
                packages: row?.module_grp_packages?.split(',') || [],
                defaultModuleGroup: row.default_module_group
            }
            : null,
        devices: row.devices && !_.isEmpty(row.devices) ? row.devices.split(',') : null,
        devtools: row.devtools && !_.isEmpty(row.devtools) ? row.devtools.split(',') : null
    };
}
exports.rowToPackage = rowToPackage;
/**
 * Recompose a string array stored in database to a PlatformAttribute or null
 * @param data - string from database to recompose as PlatformAttribute or null
 */
function recomposePlatformAttributeObject(data) {
    return data === null || data === '' ? null : JSON.parse(data);
}
exports.recomposePlatformAttributeObject = recomposePlatformAttributeObject;
/**
 * Decompose a PlatformAttribute for storage in database as a stringified object
 * @param attr - PlatformAttribute to store. Can be null
 */
function decomposePlatformAttribute(attr) {
    return attr ? JSON.stringify(attr) : null;
}
exports.decomposePlatformAttribute = decomposePlatformAttribute;
function rowToPackageDepend(row) {
    return {
        id: row.id,
        packageId: row.package_id,
        type: row.type,
        refId: row.ref_id,
        versionRange: row.version_range,
        require: row.required,
        message: row.message
    };
}
exports.rowToPackageDepend = rowToPackageDepend;
function rowToNode(row) {
    return {
        id: row.id,
        parentId: row.parent_id,
        publicId: nodeRowToPublicId(row),
        readmeNodePublicId: row.readme_public_id_w0 == null || row.readme_public_id_w1 == null
            ? null
            : mysqlWordsToPublicId(row.readme_public_id_w0, row.readme_public_id_w1),
        name: row.name,
        isFoundation: row.is_foundation === 1,
        isContentSubTreeHead: row.is_content_subtree_head === 1,
        contentSourceId: row.content_source_id,
        resourceId: row.resource_id,
        descendantCount: row.descendant_count,
        isLeaf: row.is_leaf === 1,
        parentSort: dbToResourceSort(row.parent_sort),
        implicitOrder: row.implicit_order,
        customOrder: row.custom_order,
        leafOrder: row.leaf_order,
        resourceType: row.resource_type,
        fileType: row.file_type,
        packageId: row.package_id,
        linkExt: row.link_ext,
        linkType: row.link_type ? (row.link_type === 'l' ? 'local' : 'external') : null,
        icon: row.icon,
        shortDescription: row.short_descr,
        viewLimitations: recomposeStringArray(row.view_limitations)
    };
}
exports.rowToNode = rowToNode;
/**
 * Convert public id from a 128 bit base64 string to two 64-bit words (big-endian) in decimal
 * string form. The numbers have to be represented as strings instead of numbers due to Javascript
 * only supporting 52 bit precision.
 *
 * If the public id is *not* a 128 bit base64 string then a best attempt is made to convert it,
 * with non-base64 characters ignored and each 64-bit word returned as '0' if no characters are
 * valid.
 *
 * @param publicId
 */
function nodePublicIdToDbWords(publicId) {
    const publicIdHex = (0, dbBuilderUtils_1.base64UrlSafeToHex)(publicId);
    const w0 = publicIdHex.slice(0, -16);
    const w1 = publicIdHex.slice(-16);
    return {
        publicIdWord0: Long.fromString(w0 === '' ? '0' : w0, true, 16).toString(),
        publicIdWord1: Long.fromString(w1 === '' ? '0' : w1, true, 16).toString()
    };
}
exports.nodePublicIdToDbWords = nodePublicIdToDbWords;
/**
 * Get the node's public id from its record, where it is stored as two 64 bit
 * words.
 *
 * Each word is represented using a number if <= 52 bits, and a string if > 52 bits.
 *
 * @param row node record containing the public id's words
 */
function nodeRowToPublicId(row) {
    return mysqlWordsToPublicId(row.public_id_w0, row.public_id_w1);
}
exports.nodeRowToPublicId = nodeRowToPublicId;
/**
 * Convert a public id from two 64 bit words (in mysql node form) to base 64.
 *
 * @param publicIdWord0  public id word #0
 * @param publicIdWord1  public id word #1
 *
 * Each public id word is represented using a number if <= 52 bits, and a string if > 52 bits.
 */
function mysqlWordsToPublicId(publicIdWord0, publicIdWord1) {
    function mysql64bitWordToHexString(word) {
        return typeof word === 'number'
            ? word.toString(16)
            : Long.fromString(word, true).toString(16);
    }
    const w0AsHex0 = mysql64bitWordToHexString(publicIdWord0);
    const w1AsHex1 = mysql64bitWordToHexString(publicIdWord1);
    const hex = w0AsHex0.padStart(16, '0') + w1AsHex1.padStart(16, '0');
    return (0, dbBuilderUtils_1.hexToBase64UrlSafe)(hex);
}
exports.mysqlWordsToPublicId = mysqlWordsToPublicId;
/**
 * Recompose a string array stored in database as a comma-delimited list
 * @param data - string from database to recompose as array
 * @param nullDistinct - treat null/undefined and [] distinctly
 *
 * NOTE: By default, null/undefined and [] are treated distinctly and stored differently in the
 * database, with null/undefined stored as null and [] stored as an empty string. This is due to
 * undefined meaning "don't care" and [] meaning "none" in BU metadata. To override this behavior
 * and treat both as [] and store them both as null, set nullDistinct to false.
 */
function recomposeStringArray(data, nullDistinct = true) {
    if (nullDistinct) {
        if (data === null) {
            return null;
        }
        else {
            return data && !_.isEmpty(_.trim(data)) ? _.map(data.split(','), _.trim) : [];
        }
    }
    else {
        return data && !_.isEmpty(_.trim(data)) ? _.map(data.split(','), _.trim) : [];
    }
}
exports.recomposeStringArray = recomposeStringArray;
/**
 * Decompose a string array for storage in database as a comma-delimited list
 * @param array - array of strings to store
 * @param nullDistinct - treat null/undefined and [] distinctly
 *
 * NOTE: By default, null/undefined and [] are treated distinctly and stored differently in the
 * database, with null/undefined stored as null and [] stored as an empty string. This is due to
 * undefined meaning "don't care" and [] meaning "none" in BU metadata. To override this behavior
 * and treat both as [] and store them both as null, set nullDistinct to false.
 */
function decomposeStringArray(array, nullDistinct = true) {
    if (nullDistinct) {
        return array ? array.join() : null;
    }
    else {
        return array && !_.isEmpty(array) ? array.join() : null;
    }
}
exports.decomposeStringArray = decomposeStringArray;
function rowToResource(row) {
    if (!(0, dbTypes_1.isResourceType)(row.type)) {
        throw new rexError_1.RexError(`Invalid record type: ${row.type}`);
    }
    else {
        const json = row.json ? JSON.parse(row.json) : null;
        return {
            id: row.id,
            parentId: row.parent_id,
            packageId: row.package_id,
            jsonId: row.json_id,
            type: row.type,
            name: row.name,
            implicitOrder: row.implicit_order,
            customOrder: row.custom_order,
            sort: dbToResourceSort(row.sort),
            description: row.descr,
            shortDescription: row.short_descr,
            // TODO: Eliminate these casts
            viewLimitations: recomposeStringArray(row.view_limitations),
            projectRestriction: dbToProjectRestriction(row.proj_restriction),
            kernels: (recomposeStringArray(row.kernel) || []),
            compilers: (recomposeStringArray(row.compiler) || []),
            overrideProjectSpecDeviceId: row.override_projspec_device,
            link: row.link,
            linkType: row.link_type ? (row.link_type === 'local' ? 'local' : 'external') : null,
            icon: row.icon,
            fileType: row.file_type,
            hasIncludes: row.has_includes === null ? null : row.has_includes === 1,
            isIncludedFile: row.is_included_file === null ? null : row.is_included_file === 1,
            image: row.image,
            root0: row.root0,
            isCounted: row.is_counted === 1,
            importProjectCCS: json.importProjectCCS == null ? null : json.importProjectCCS,
            createProjectCCS: json.createProjectCCS == null ? null : json.createProjectCCS,
            linkForDownload: json.linkForDownload == null ? null : json.linkForDownload
        };
    }
}
exports.rowToResource = rowToResource;
function dbToResourceSort(s) {
    switch (s) {
        case 'a':
            return 'filesAndFoldersAlphabetical';
        case 'm':
            return 'manual';
        default:
            return 'default';
    }
}
exports.dbToResourceSort = dbToResourceSort;
function resourceSortToDb(s) {
    switch (s) {
        case 'filesAndFoldersAlphabetical':
            return 'a';
        case 'manual':
            return 'm';
        default:
            return 'd';
    }
}
exports.resourceSortToDb = resourceSortToDb;
function dbToProjectRestriction(s) {
    switch (s) {
        case null:
            return null;
        case 'c':
            return 'cloudOnly';
        case 'd':
            return 'desktopOnly';
        default:
            throw new Error(`Invalid resource.proj_restriction: ${s}`);
    }
}
exports.dbToProjectRestriction = dbToProjectRestriction;
function projectRestrictionToDb(restriction) {
    switch (restriction) {
        case null:
            return null;
        case 'cloudOnly':
            return 'c';
        case 'desktopOnly':
            return 'd';
        default:
            (0, util_1.assertNever)(restriction);
            throw new Error(`Unknown project restriction: ${restriction}`);
    }
}
exports.projectRestrictionToDb = projectRestrictionToDb;
function rowToFilter(row) {
    return {
        id: row.id,
        packageGroupId: row.package_group_id,
        type: row.type,
        name: row.name,
        nameSearch: row.name_search,
        deviceId: row.device_id,
        devtoolId: row.devtool_id
    };
}
exports.rowToFilter = rowToFilter;
function rowToFilterChunk(row) {
    return {
        id: row.id,
        packageGroupId: row.package_group_id,
        chunk: row.chunk
    };
}
exports.rowToFilterChunk = rowToFilterChunk;
function rowToDevtool(row) {
    const json = row.json ? JSON.parse(row.json) : null;
    return {
        id: row.id,
        devSetId: row.devset_id,
        publicId: row.public_id,
        jsonId: row.json_id,
        type: row.type,
        overviewPublicId: row.overview_public_id,
        name: row.name,
        packageUid: row.package_uid,
        description: row.descr,
        buyLink: row.buy_link,
        image: row.image,
        toolsPage: row.tools_page,
        connections: json != null ? json.connections : null,
        energiaBoards: json != null ? json.energiaBoards : null
    };
}
exports.rowToDevtool = rowToDevtool;
function rowToDevice(row) {
    const json = row.json ? JSON.parse(row.json) : null;
    return {
        id: row.id,
        parentId: row.parent_id,
        devSetId: row.devset_id,
        publicId: row.public_id,
        jsonId: row.json_id,
        type: row.type,
        overviewPublicId: row.overview_public_id,
        name: row.name,
        packageUid: row.package_uid,
        description: row.descr,
        image: row.image,
        coreTypes: json != null ? json.coreTypes : null
    };
}
exports.rowToDevice = rowToDevice;
function invert(o) {
    return _.invert(o);
}
// Compiler db mappings
const dbToCompilerMapping = { 1: 'ccs', 2: 'gcc', 3: 'iar', 4: 'ticlang' };
const compilerToDbMapping = invert(dbToCompilerMapping);
function dbToCompiler(s) {
    const compiler = dbToCompilerMapping[_.parseInt(s)];
    if (!compiler) {
        throw new rexError_1.RexError(`Invalid compiler: ${s}`);
    }
    else {
        return compiler;
    }
}
exports.dbToCompiler = dbToCompiler;
function compilerToDb(compiler) {
    return compiler ? compilerToDbMapping[compiler] || null : null;
}
exports.compilerToDb = compilerToDb;
// Kernel db mappings
const dbToKernelMapping = { 1: 'tirtos', 2: 'freertos', 3: 'nortos', 4: 'tirtos7' };
const kernelToDbMapping = invert(dbToKernelMapping);
function dbToKernel(s) {
    const kernel = dbToKernelMapping[_.parseInt(s)];
    if (!kernel) {
        throw new rexError_1.RexError(`Invalid kernel: ${s}`);
    }
    else {
        return kernel;
    }
}
exports.dbToKernel = dbToKernel;
function kernelToDb(kernel) {
    return kernel ? kernelToDbMapping[kernel] || null : null;
}
exports.kernelToDb = kernelToDb;
function stringToVPublicId(versionedPublicId) {
    const part = versionedPublicId.split('__');
    if (part.length !== 2) {
        throw new rexError_1.RexError(`Versioned Public ID must have exactly 2 segments: ${versionedPublicId}`);
    }
    else {
        return {
            publicId: part[0],
            version: part[1]
        };
    }
}
exports.stringToVPublicId = stringToVPublicId;
function stringToInternalId(internalId) {
    const part = internalId.split('__');
    if (part.length !== 3) {
        throw new rexError_1.RexError(`Internal ID must have exactly 3 segments: ${internalId}`);
    }
    else if (!_.isInteger(part[2])) {
        throw new rexError_1.RexError(`Third segment of Internal ID must be a timestamp: ${internalId}`);
    }
    else {
        return {
            publicId: part[0],
            version: part[1],
            created: parseInt(part[2])
        };
    }
}
exports.stringToInternalId = stringToInternalId;
function publicVIdToString(publicVId) {
    return publicVId.publicId + '__' + publicVId.version;
}
exports.publicVIdToString = publicVIdToString;
function internalIdToString(internalId) {
    return internalId.publicId + '__' + internalId.version;
}
exports.internalIdToString = internalIdToString;
