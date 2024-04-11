"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqldbSessionFactory = void 0;
// tslint:disable:member-ordering
const sortStable = require("stable");
const HttpStatus = require("http-status-codes");
const versioning = require("./versioning");
const rexError_1 = require("../utils/rexError");
const dbUpdateInfo_1 = require("./dbImporter/dbUpdateInfo");
const rexdb_1 = require("../rexdb/lib/rexdb");
const logger_1 = require("../utils/logger");
// our modules
const vars_1 = require("./vars");
const dbBuilderUtils_1 = require("./dbBuilder/dbBuilderUtils");
const sqldb_1 = require("../sqldb/sqldb");
const logging_1 = require("../utils/logging");
const dbTypes = require("./dbBuilder/dbTypes");
const _ = require("lodash");
// the id part of the uid field in packagegroups.js that identifies device and devtool packages
// example:
// {
//     "uid": "devices__1.00.09.20",
//     "packages": [
//         "c2000ware_devices_package__1.00.01.00",
//         "cc13x0_devices__1.00.00.0002"
//      ]
//     ...
//  }
const DEVICE_PACKAGEGROUP_ID = 'devices';
const DEVTOOL_PACKAGEGROUP_ID = 'devtools';
/**
 * Immutable Sqldb session that caches certain DB data
 *
 * A new session needs to be created whenever the DB changes
 */
class SqldbSession {
    sqldb;
    rootId;
    devicePackageGroup;
    devtoolPackageGroup;
    softwarePackageGroups;
    packageRecords;
    dbDevices;
    dbDevtools;
    deviceVariantsSorted;
    devtoolBoardsSorted;
    extraBoardAndDeviceData;
    sessionId;
    constructor(sqldb, 
    // package groups
    rootId, devicePackageGroup, devtoolPackageGroup, softwarePackageGroups, // no supplemental packages
    // packages
    packageRecords, 
    // dev tree
    dbDevices, dbDevtools, deviceVariantsSorted, devtoolBoardsSorted, extraBoardAndDeviceData, 
    // Other
    sessionId) {
        this.sqldb = sqldb;
        this.rootId = rootId;
        this.devicePackageGroup = devicePackageGroup;
        this.devtoolPackageGroup = devtoolPackageGroup;
        this.softwarePackageGroups = softwarePackageGroups;
        this.packageRecords = packageRecords;
        this.dbDevices = dbDevices;
        this.dbDevtools = dbDevtools;
        this.deviceVariantsSorted = deviceVariantsSorted;
        this.devtoolBoardsSorted = devtoolBoardsSorted;
        this.extraBoardAndDeviceData = extraBoardAndDeviceData;
        this.sessionId = sessionId;
    }
    /**
     * Public static function to create a new instance.
     * @param sqldb
     * @param sessionId
     * @returns SqldbSession instance, or undefined if DB is empty
     * @throws RexError if error creating an instance
     */
    static async create(sqldb, sessionId) {
        try {
            if (await sqldb.tree.isEmpty()) {
                logger_1.logger.warning('sqldb is empty');
                return undefined;
            }
            const { devicePackageGroup, devtoolPackageGroup, softwarePackageGroups: allSoftwarePackageGroups } = await SqldbSession.cachePackageGroupInfo(sqldb);
            const allPackageRecords = await SqldbSession.cachePackageRecordInfo(sqldb, allSoftwarePackageGroups);
            // sort packages and groups - for the benefit of the client only
            SqldbSession.sortPackagesByNameAndVersion(allPackageRecords);
            SqldbSession.sortGroupsByMainPackageOrder(allSoftwarePackageGroups, allPackageRecords);
            SqldbSession.sortGroupsPackagesListByPackageOrder(allSoftwarePackageGroups, allPackageRecords);
            // Remove any restricted packages - we don't want those available
            const { softwarePackageGroups, packageRecords } = SqldbSession.removeRestrictedPackages(allSoftwarePackageGroups, allPackageRecords);
            const { dbDevices, dbDevtools, deviceVariantsSorted, devtoolBoardsSorted, boardAndDeviceData } = await SqldbSession.cacheDevicesAndDevtoolsInfo(sqldb, allPackageRecords, devicePackageGroup, devtoolPackageGroup);
            return new SqldbSession(sqldb, (await sqldb.tree.getTreeRootId()), devicePackageGroup, devtoolPackageGroup, softwarePackageGroups, packageRecords, dbDevices, dbDevtools, deviceVariantsSorted, devtoolBoardsSorted, boardAndDeviceData, sessionId.toString());
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: 'Error creating an SqldbSession',
                causeError: err
            });
        }
    }
    /**
     * Cache package group info from the DB. Must only be called once at create time.
     */
    static async cachePackageGroupInfo(sqldb) {
        const allPackageGroupsDB = await sqldb.packages.getPackageGroups({});
        const packageRecordsDB = await sqldb.packages.getOverviews();
        let devicePackageGroup = null;
        let devtoolPackageGroup = null;
        const softwarePackageGroups = [];
        for (const packageGroupDB of allPackageGroupsDB) {
            const packagesPublicUids = packageGroupDB.packageIds.map((packageId) => {
                const packageRecord = packageRecordsDB.find((record) => record.id === packageId);
                if (!packageRecord) {
                    throw new rexError_1.RexError({
                        message: 'no package record for package id' + packageId,
                        httpCode: 500
                    });
                }
                return packageRecord.uid;
            });
            const packageGroup = {
                packageGroupDbId: packageGroupDB.id,
                packageGroupPublicId: packageGroupDB.publicId,
                packageGroupVersion: packageGroupDB.version,
                packageGroupPublicUid: packageGroupDB.publicVId,
                packagesPublicUids,
                packageGroupPublicIdEncoded: (0, dbBuilderUtils_1.encodePackageGroupPublicId)(packageGroupDB.publicId),
                packagesToListVersionsFrom: packageGroupDB.packagesToListVersionsFrom
            };
            if (packageGroupDB.publicId === DEVICE_PACKAGEGROUP_ID) {
                // device package group - no main package
                devicePackageGroup = packageGroup;
            }
            else if (packageGroupDB.publicId === DEVTOOL_PACKAGEGROUP_ID) {
                // devtool package group - no main package
                devtoolPackageGroup = packageGroup;
            }
            else {
                // software package group - has a main package
                const mainPackageRecord = packageRecordsDB.find((record) => record.id === packageGroupDB.mainPackageId);
                if (!mainPackageRecord) {
                    throw new rexError_1.RexError({
                        message: 'no package record for main package id' + packageGroupDB.mainPackageId,
                        httpCode: 500
                    });
                }
                const softwarePackageGroup = {
                    ...packageGroup,
                    mainPackagePublicUid: mainPackageRecord.uid,
                    mainPackageName: mainPackageRecord.name,
                    mainPackageHideByDefault: mainPackageRecord.hideByDefault
                };
                softwarePackageGroups.push(softwarePackageGroup);
            }
        }
        return {
            devicePackageGroup,
            devtoolPackageGroup,
            softwarePackageGroups
        };
    }
    /**
     * Cache package info from the DB. Must only be called once at create time.
     *
     * Note: the same supplemental package may occur multiple times since it could be associated
     * with multiple main packages
     */
    static async cachePackageRecordInfo(sqldb, softwarePackageGroups) {
        const packageRecordsDB = await sqldb.packages.getOverviews();
        const packageRecords = [];
        for (const packageRecordDB of packageRecordsDB) {
            const packageRecordBase = {
                packageDbId: packageRecordDB.id,
                packagePublicId: packageRecordDB.publicId,
                packageVersion: packageRecordDB.version,
                packagePublicUid: packageRecordDB.uid,
                packagePath: packageRecordDB.path,
                name: packageRecordDB.name,
                license: packageRecordDB.license,
                hideNodeDirPanel: packageRecordDB.hideNodeDirPanel,
                hideByDefault: packageRecordDB.hideByDefault,
                dependencies: packageRecordDB.dependencies,
                modules: packageRecordDB.modules,
                moduleOf: packageRecordDB.moduleOf || undefined,
                installPath: packageRecordDB.installPath || undefined,
                installCommand: packageRecordDB.installCommand || undefined,
                installSize: packageRecordDB.installSize || undefined,
                restrictions: packageRecordDB.restrictions ? [packageRecordDB.restrictions] : [],
                aliases: packageRecordDB.aliases,
                moduleGroups: packageRecordDB.moduleGroups,
                moduleGroup: packageRecordDB.moduleGroup || undefined,
                subType: packageRecordDB.subType,
                featureType: packageRecordDB.featureType,
                ccsInstallLocation: packageRecordDB.ccsInstallLocation,
                ccsVersion: packageRecordDB.ccsVersion,
                devices: packageRecordDB.devices || undefined,
                devtools: packageRecordDB.devtools || undefined
            };
            // determine packageGroupDbId and packageType
            // check if package is the main package of the group
            const softwarePackageGroup = softwarePackageGroups.find((pkgGroup) => pkgGroup.mainPackagePublicUid === packageRecordBase.packagePublicUid);
            const isMainPackage = !!softwarePackageGroup;
            if (isMainPackage && softwarePackageGroup) {
                const packageRecord = {
                    ...packageRecordBase,
                    packageGroupDbId: softwarePackageGroup.packageGroupDbId,
                    packageType: "softwareMain" /* PackageRecordType.SOFTWARE_MAIN */
                };
                packageRecords.push(packageRecord);
            }
            else if (packageRecordDB.type === 'devices') {
                const packageRecord = {
                    ...packageRecordBase,
                    packageType: "device" /* PackageRecordType.DEVICE */
                };
                packageRecords.push(packageRecord);
            }
            else if (packageRecordDB.type === 'devtools') {
                const packageRecord = {
                    ...packageRecordBase,
                    packageType: "devtool" /* PackageRecordType.DEVTOOL */
                };
                packageRecords.push(packageRecord);
            }
            else {
                // TODO: this should be based on the 'supplements' field but is currently not available from the DB - make the assumption for now that if it's nothing else it's a supplemental package
                const packageRecord = {
                    ...packageRecordBase,
                    packageType: "softwareSupplemental" /* PackageRecordType.SOFTWARE_SUPPLEMENTAL */
                };
                packageRecords.push(packageRecord);
            }
        }
        return packageRecords;
    }
    /**
     * Cache device and devtool info from the DB. Only called once at create time.
     */
    static async cacheDevicesAndDevtoolsInfo(sqldb, allPackageRecords, devicePackageGroup, devtoolPackageGroup) {
        // create dbDevices and dbDevtools
        const log = new logging_1.LoggerManager(logger_1.logger).createLogger('sqlDbSession');
        const dbDevices = new rexdb_1.RexDB(log);
        const dbDevtools = new rexdb_1.RexDB(log);
        let deviceVariantsSorted;
        let devtoolBoardsSorted;
        const deviceRecords = await sqldb.devices.getAll();
        const devtoolRecords = await sqldb.devtools.getAll();
        // rexdb needs built-in _id: set it to internal DB id
        [deviceRecords, devtoolRecords].forEach((recordsArr) => {
            recordsArr.forEach((record) => {
                record._id = record.id.toString();
            });
        });
        // << WORKAROUND - TODO: remove once overviewNodeId lookup moved to DB import (REX-259)
        await Promise.all(deviceRecords.map(async (record) => {
            if (record.overviewPublicId && devicePackageGroup) {
                record.overviewNodeId = await sqldb.tree.lookupNodeOnPublicId(record.overviewPublicId, {
                    publicId: devicePackageGroup.packageGroupPublicId,
                    version: devicePackageGroup.packageGroupVersion
                });
                if (!record.overviewNodeId) {
                    // ignore this for now
                }
            }
        }));
        await Promise.all(devtoolRecords.map(async (record) => {
            if (record.overviewPublicId && devtoolPackageGroup) {
                record.overviewNodeId = await sqldb.tree.lookupNodeOnPublicId(record.overviewPublicId, {
                    publicId: devtoolPackageGroup.packageGroupPublicId,
                    version: devtoolPackageGroup.packageGroupVersion
                });
                if (!record.overviewNodeId) {
                    // ignore this for now
                }
            }
        }));
        // >>
        await dbDevices.insertAsync(deviceRecords);
        await dbDevtools.insertAsync(devtoolRecords);
        // prepare sorted device variant and board lists
        const deviceVariants = await dbDevices.findAsync({ children: null });
        const devtoolBoards = await dbDevtools.findAsync({ type: 'board' });
        [deviceVariants, devtoolBoards].forEach((devArray) => {
            sortStable.inplace(devArray, (a, b) => {
                return String(a.name).localeCompare(b.name);
            });
            // remove duplicates from (sorted) variants and devtools
            for (let i = 1; i < devArray.length; i++) {
                if (devArray[i - 1].name === devArray[i].name) {
                    devArray.splice(i, 1);
                    i--;
                }
            }
        });
        deviceVariantsSorted = deviceVariants ? deviceVariants : [];
        devtoolBoardsSorted = devtoolBoards ? devtoolBoards : [];
        // Get device support packages
        const deviceSupportPackages = _.filter(allPackageRecords, (pkg) => pkg.packageType === 'softwareMain' && pkg.featureType === 'deviceSupport');
        const deviceSupportByDevice = _(deviceRecords)
            .map((device) => {
            const deviceAndItsAncestors = [device.publicId, ...(device.ancestors || [])];
            return {
                publicId: device.publicId,
                deviceSupportPackages: _(deviceSupportPackages)
                    // a supporting package must have support for the device or one of its
                    // ancestors
                    .filter((pkg) => _(deviceAndItsAncestors).some((devicePublicId) => _(pkg.devices).includes(devicePublicId)))
                    // we're only interested in their public ids (and not versions)
                    .map((pkg) => pkg.packagePublicId)
                    .uniq()
                    .value()
            };
        })
            .keyBy((o) => o.publicId)
            .mapValues((o) => o.deviceSupportPackages)
            .value();
        const deviceSupportByDevtool = _(devtoolRecords)
            .map((devtool) => ({
            publicId: devtool.publicId,
            deviceSupportPackages: _(deviceSupportPackages)
                // a supporting package must have support for the devtool
                .filter((pkg) => _(pkg.devtools).includes(devtool.publicId))
                // we're only interested in their public ids (and not versions)
                .map((pkg) => pkg.packagePublicId)
                .uniq()
                .value()
        }))
            .keyBy((o) => o.publicId)
            .mapValues((o) => o.deviceSupportPackages)
            .value();
        // Get device and board data incl. their device support packages
        const boardAndDeviceData = {
            devices: deviceVariantsSorted.map((device) => {
                const publicId = device.publicId;
                const deviceSupport = deviceSupportByDevice[publicId];
                return {
                    publicId,
                    name: device.name,
                    type: device.type,
                    featureSupport: deviceSupport || []
                };
            }),
            boards: devtoolBoardsSorted.map((board) => {
                const publicId = board.publicId;
                const deviceSupport = deviceSupportByDevtool[publicId];
                return {
                    publicId,
                    name: board.name,
                    devices: board.devices,
                    featureSupport: deviceSupport || []
                };
            })
        };
        // Delete device and devtool props from packages as they're only meant to be exposed through
        // devices and devtools (which we've now built), and to save space.
        for (const pkg of allPackageRecords) {
            delete pkg.devices;
            delete pkg.devtools;
        }
        return {
            dbDevices,
            dbDevtools,
            deviceVariantsSorted,
            devtoolBoardsSorted,
            boardAndDeviceData
        };
    }
    getRootId() {
        return this.rootId;
    }
    getSessionId() {
        return this.sessionId;
    }
    getDevicePackageGroup() {
        return this.devicePackageGroup;
    }
    getDevtoolPackageGroup() {
        return this.devtoolPackageGroup;
    }
    getDeviceVariantsSorted() {
        return this.deviceVariantsSorted;
    }
    getBoardAndDeviceData() {
        return this.extraBoardAndDeviceData;
    }
    getDevtoolBoardsSorted() {
        return this.devtoolBoardsSorted;
    }
    getSoftwarePackageGroups() {
        return this.softwarePackageGroups;
    }
    getAllPackageGroups() {
        return [
            this.getDevicePackageGroup(),
            this.getDevtoolPackageGroup(),
            ...this.getSoftwarePackageGroups()
        ].filter((group) => group != null);
    }
    getPackageRecords() {
        return this.packageRecords;
    }
    // TODO: needs to be provided by the DB (REX-2148)
    getResourceClasses() {
        const exampleId = 'example';
        const resourceClasses = [
            {
                publicId: exampleId,
                name: dbTypes.resourceClasses[exampleId]
            }
        ];
        return resourceClasses;
    }
    // TODO: needs to be provided by the DB (REX-2148)
    getCompilers() {
        const ccsId = 'ccs';
        const gccId = 'gcc';
        const iarId = 'iar';
        const ticlangId = 'ticlang';
        const compilers = [
            {
                publicId: ccsId,
                name: dbTypes.compilers[ccsId]
            },
            {
                publicId: ticlangId,
                name: dbTypes.compilers[ticlangId]
            },
            {
                publicId: gccId,
                name: dbTypes.compilers[gccId]
            },
            {
                publicId: iarId,
                name: dbTypes.compilers[iarId]
            }
        ];
        return compilers;
    }
    // TODO: needs to be provided by the DB (REX-2148)
    getKernels() {
        const tirtosId = 'tirtos';
        const tirtos7Id = 'tirtos7';
        const freertosId = 'freertos';
        const nortosId = 'nortos';
        const kernels = [
            {
                publicId: tirtos7Id,
                name: dbTypes.kernels[tirtos7Id]
            },
            {
                publicId: tirtosId,
                name: dbTypes.kernels[tirtosId]
            },
            {
                publicId: freertosId,
                name: dbTypes.kernels[freertosId]
            },
            {
                publicId: nortosId,
                name: dbTypes.kernels[nortosId]
            }
        ];
        return kernels;
    }
    // TODO: needs to be provided by the DB (REX-2148)
    getIdes() {
        const ides = [
            {
                publicId: 'ccs',
                name: 'CCS'
            },
            {
                publicId: 'iar',
                name: 'IAR'
            }
        ];
        return ides;
    }
    // TODO: needs to be provided by the DB (REX-2148)
    getLanguages() {
        const languages = [
            {
                publicId: 'english',
                name: 'English'
            },
            {
                publicId: 'chinese',
                name: 'Chinese'
            }
        ];
        return languages;
    }
    async lookupNodeDbIdOnPublicId(nodePublicId, packageGroup, packagePublicId) {
        return this.sqldb.tree.lookupNodeOnPublicId(nodePublicId, packageGroup || undefined, packagePublicId || undefined);
    }
    async lookupNodesOnCustomResourceId(customResourceId, packageGroup, filter, maxNodes) {
        return this.sqldb.tree.lookupNodesOnCustomResourceId(customResourceId, packageGroup, filter, maxNodes);
    }
    async lookupNodesOnGlobalId(globalId, filter, maxNodes) {
        return this.sqldb.tree.lookupNodesOnGlobalId(globalId, filter, maxNodes);
    }
    async getPackageOverviews(criteria) {
        return this.sqldb.packages.getOverviews(criteria);
    }
    async getNodePackageTree() {
        return this.sqldb.tree.getNodePackageTree();
    }
    /**
     *
     * @param {number[]} parentNodeIds
     * @param {number[]} packageGroupIds
     * @param {FilterProps} filter
     * @returns {Promise<ParentToChildrenIdMap>} parent -> children
     */
    async getNodeChildrenBulk(parentNodeIds, packageGroupIds, filter) {
        const result = new Map();
        let parentNodeId = -1;
        try {
            for (parentNodeId of parentNodeIds) {
                const childrenNodeIds = await this.sqldb.tree.getNodeChildren(parentNodeId, packageGroupIds, 
                // database-middleware types mismatch
                // @ts-ignore
                filter);
                result.set(parentNodeId, childrenNodeIds);
            }
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getNodeChildrenBulk: parent node id: ${parentNodeId}`,
                causeError: err
            });
        }
        return result;
    }
    /**
     *
     */
    async getTableViewItems(parentNodeId, packageGroupIds, filter) {
        try {
            return new Map([
                [
                    parentNodeId,
                    await this.sqldb.tableViews.getTableView(parentNodeId, packageGroupIds, filter)
                ]
            ]);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getTableViewItems: parent node id: ${parentNodeId}`,
                causeError: err
            });
        }
    }
    /**
     *
     */
    async getAvailableTableViewFilters(nodeId, packageGroupIds, filter) {
        try {
            return new Map([
                [
                    nodeId,
                    await this.sqldb.tableViews.getAvailableTableViewFilters(nodeId, packageGroupIds, filter)
                ]
            ]);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getAvailableTableViewFilters: node id: ${nodeId}`,
                causeError: err
            });
        }
    }
    /**
     *
     */
    async getNodePresentationForTableViewItemVariant(tableViewItemId, filter, variant) {
        let result;
        try {
            result = await this.sqldb.tableViews.getNode(tableViewItemId, filter, variant);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getNodePresentationForTableViewItem: tableViewItemId: ${tableViewItemId}`,
                causeError: err
            });
        }
        if (!result) {
            throw new rexError_1.RexError({
                message: `Node for table view item variant not found: tableViewItemId: ${tableViewItemId.toString()}, compiler: ${variant.compiler}, kernel: ${variant.kernel}`,
                httpCode: HttpStatus.NOT_FOUND
            });
        }
        return result;
    }
    /**
     *
     * @param {number[]} nodeIds
     * @returns {Promise<IdToPresentationDataMap>}
     */
    async getNodePresentation(nodeId) {
        let result;
        try {
            const arr = await this.sqldb.tree.getNodePresentation([nodeId]);
            result = arr[0];
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getNodePresentation: node id: ${nodeId}`,
                causeError: err
            });
        }
        if (!result) {
            throw new rexError_1.RexError({
                message: `Unknown node id: ${nodeId.toString()}`,
                httpCode: HttpStatus.NOT_FOUND
            });
        }
        return result;
    }
    /**
     *
     * @param {number[]} nodeIds
     * @returns {Promise<IdToPresentationDataMap>}
     */
    async getNodePresentationBulk(nodeIds) {
        const result = new Map();
        let nodeId;
        try {
            for (nodeId of nodeIds) {
                const presentationData = await this.sqldb.tree.getNodePresentation([nodeId]);
                // TODO: API is already bulk but not right result format
                result.set(nodeId, presentationData[0]);
            }
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getNodePresentationBulk: node id: ${nodeId}`,
                causeError: err
            });
        }
        for (const [nodeId, presentationData] of result.entries()) {
            if (!presentationData) {
                throw new rexError_1.RexError({
                    message: `Unknown node id: ${nodeId.toString()}`,
                    httpCode: HttpStatus.NOT_FOUND
                });
            }
        }
        return result;
    }
    /**
     *
     * @param {number[]} nodeIds
     * @returns {Promise<IdToResourceRecordMap>}
     */
    async getResourceOnNodeBulk(nodeIds) {
        const result = new Map();
        let nodeId;
        try {
            for (nodeId of nodeIds) {
                const resourceData = await this.sqldb.resources.getOnNode(nodeId);
                result.set(nodeId, resourceData);
            }
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getResourceOnNodeBulk: node id: ${nodeId}`,
                causeError: err
            });
        }
        return result;
    }
    /**
     *
     * @param {number} nodeId
     * @returns {Promise<ResourceRecord>}
     */
    async getResourceOnNode(nodeId) {
        try {
            return this.sqldb.resources.getOnNode(nodeId);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getResourceOnNode: node id: ${nodeId}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<number[]>}
     */
    async getDevicesOnResource(resourceId) {
        try {
            return this.sqldb.devices.getIdsOnResource(resourceId);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getDevicesOnResource: node id: ${resourceId}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<number[]>}
     */
    async getDevtoolsOnResource(resourceId) {
        try {
            return this.sqldb.devtools.getIdsOnResource(resourceId);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getDevtoolsOnResource: node id: ${resourceId}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<string[]>}
     */
    async getDeviceNamesOnResource(resourceId) {
        try {
            return this.sqldb.devices.getNamesOnResource(resourceId);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getDeviceNamesOnResource: resource id: ${resourceId}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @param {number} resourceId
     * @returns {Promise<string[]>}
     */
    async getDevtoolNamesOnResource(resourceId) {
        try {
            return this.sqldb.devtools.getNamesOnResource(resourceId);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getDevtoolNamesOnResource: resource id: ${resourceId}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @param {number} nodeId
     * @returns {Promise<number[]>}
     */
    async getNodeAncestors(nodeId) {
        try {
            return this.sqldb.tree.getNodeAncestors(nodeId);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getNodeAncestors: node id: ${nodeId}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @param {string} substring
     * @param packageGroupDbIds
     * @returns {Promise<string[]>}
     */
    async getSearchSuggestions(substring, packageGroupDbIds) {
        try {
            return this.sqldb.tree.getSearchSuggestions(substring, packageGroupDbIds);
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getSearchTokens: ${err.message}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @returns {Promise<DeviceRecord[]>}
     */
    async getAllDevices() {
        try {
            return this.sqldb.devices.getAll();
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getAllDevices: ${err.message}`,
                causeError: err
            });
        }
    }
    /**
     *
     * @returns {Promise<DevtoolRecord[]>}
     */
    async getAllDevtools() {
        try {
            return this.sqldb.devtools.getAll();
        }
        catch (err) {
            throw new rexError_1.RexError({
                message: `getAllDevtools: node id: ${err.message}`,
                causeError: err
            });
        }
    }
    /**
     * This sorting is for the benefit of the client:
     *   in package picker show order of packages alphabetically by name with decreasing version
     *
     * @param packages
     */
    static sortPackagesByNameAndVersion(packages) {
        // sort by id first
        packages.sort((p1, p2) => {
            if (p1.packagePublicId > p2.packagePublicId) {
                return 1;
            }
            else if (p1.packagePublicId < p2.packagePublicId) {
                return -1;
            }
            else {
                return 0;
            }
        });
        // sort versions of package by decreasing semver
        // use stable sort so that a 0 comparison result (i.e. equality) doesn't cause re-order
        // among different packageGroups
        sortStable.inplace(packages, (p1, p2) => {
            if (p1.packagePublicId === p2.packagePublicId) {
                return versioning.rcompare(p1.packageVersion, p2.packageVersion);
            }
            else {
                return 0;
            }
        });
        const latestPackageNames = packages.reduce((acc, curr, index, array) => {
            if (index === 0 || curr.packagePublicId !== array[index - 1].packagePublicId) {
                acc[curr.packagePublicId] = curr.name;
            }
            return acc;
        }, {});
        // finally sort the packages by the latest package name
        sortStable.inplace(packages, (p1, p2) => {
            const p1Name = latestPackageNames[p1.packagePublicId];
            const p2Name = latestPackageNames[p2.packagePublicId];
            if (p1Name > p2Name) {
                return 1;
            }
            else if (p1Name < p2Name) {
                return -1;
            }
            else {
                return 0;
            }
        });
    }
    /**
     * Sort software package groups in the same order as their main packages
     *
     * @param softwareGroups: i.e. every group must have a main package
     * @param packages: used as the reference for ordering
     */
    static sortGroupsByMainPackageOrder(softwareGroups, packages) {
        softwareGroups.sort((groupA, groupB) => {
            return (SqldbSession.findIndexOfPackage(groupA.mainPackagePublicUid, packages) -
                SqldbSession.findIndexOfPackage(groupB.mainPackagePublicUid, packages));
        });
    }
    /**
     * Entries of the packageGroup.packagesPublicUids field are sorted in the same order as the
     * packages array
     *
     * @param groups
     * @param packages: used as the reference for ordering
     */
    static sortGroupsPackagesListByPackageOrder(groups, packages) {
        groups.forEach((group) => {
            group.packagesPublicUids.sort((uidA, uidB) => {
                return (SqldbSession.findIndexOfPackage(uidA, packages) -
                    SqldbSession.findIndexOfPackage(uidB, packages));
            });
        });
    }
    static findIndexOfPackage(packagePublicUid, packages) {
        if (!packagePublicUid) {
            throw new rexError_1.RexError({
                message: 'cannot sort: packagePublicUid is undefined',
                httpCode: HttpStatus.INTERNAL_SERVER_ERROR
            });
        }
        return packages.findIndex((packageRecord) => packageRecord.packagePublicUid === packagePublicUid);
    }
    static removeRestrictedPackages(softwarePackageGroups, packageRecords) {
        softwarePackageGroups = softwarePackageGroups.filter((thePackage) => !hasRestictedPackage(thePackage));
        packageRecords = packageRecords.filter((packageRecord) => !isRestictedPackage(packageRecord));
        return { softwarePackageGroups, packageRecords };
        function isRestictedPackage(packageRecord) {
            return (packageRecord.restrictions &&
                packageRecord.restrictions.indexOf(vars_1.Vars.METADATA_PKG_IMPORT_ONLY) !== -1);
        }
        function hasRestictedPackage(thePackageGroup) {
            return thePackageGroup.packagesPublicUids.some((uid) => {
                const thePackage = packageRecords.find((pkg) => pkg.packagePublicUid === uid);
                if (!thePackage) {
                    throw new rexError_1.RexError({
                        message: `No package record found for : ${uid}`,
                        httpCode: HttpStatus.INTERNAL_SERVER_ERROR
                    });
                }
                return isRestictedPackage(thePackage);
            });
        }
    }
}
/**
 * Class to create SqldbSession's.  It caches and saves a valid instance of that class that can be
 * reused until the next database update.
 */
class SqldbSessionFactory {
    dinfraPath;
    tablePrefix;
    currentSessionPromise;
    sqldb;
    /**
     * Constructor
     *
     * @param dinfraPath
     * @param tablePrefix
     */
    constructor(dinfraPath, tablePrefix) {
        this.dinfraPath = dinfraPath;
        this.tablePrefix = tablePrefix;
    }
    /**
     * Asynchronous function to fetch a valid SqldbSession interface.  First creates the Sqldb
     * instance and updates the database schema if not yet performed, and then asynchronously
     * creates a new SqldbSession instance.
     *
     * @returns Promise<SqldbSession | undefined>: Promise<undefined> if the DB is empty
     */
    async getCurrentSessionPromise() {
        if (!this.sqldb) {
            const sqldb = await sqldb_1.SqlDb.instance({
                dinfraPath: this.dinfraPath,
                tablePrefix: this.tablePrefix
            });
            await sqldb.manage.updateSchema();
            this.sqldb = sqldb; // don't assign sqldb instance until schema update completes
        }
        if (!this.currentSessionPromise) {
            const dbUpdateInfo = await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(require(this.dinfraPath));
            this.currentSessionPromise = SqldbSession.create(this.sqldb, dbUpdateInfo.timestamp);
        }
        return this.currentSessionPromise;
    }
    /**
     * Invalidates the current session.  Any copies of the current session will continue to work
     * with the old cached state, but any new requests will end up fetching a brand new session
     */
    invalidate() {
        if (this.sqldb) {
            this.sqldb.reset();
        }
        this.currentSessionPromise = undefined;
    }
}
exports.SqldbSessionFactory = SqldbSessionFactory;
