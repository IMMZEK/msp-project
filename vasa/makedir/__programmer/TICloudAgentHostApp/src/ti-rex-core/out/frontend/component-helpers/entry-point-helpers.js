"use strict";
/**
 * For components which are entry points to a page.
 * They accept appProps with the data that can be optained without going to the server (i.e urlQuery)
 * and the id of the selected node in the url (if there is any)
 *
 * Handles retriving the remaining fields for appProps from the server.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAvailableOfflineBoardsAndDevices = exports.getAppState = exports.getAppProps = void 0;
// our modules
const component_helpers_1 = require("../component-helpers/component-helpers");
const filter_helpers_1 = require("../component-helpers/filter-helpers");
const public_id_helpers_1 = require("../component-helpers/public-id-helpers");
const util_1 = require("../component-helpers/util");
const errors_1 = require("../../shared/errors");
const use_local_apis_1 = require("./use-local-apis");
const lodash_1 = require("lodash");
const use_async_operation_1 = require("./use-async-operation");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Get the final appProps, using appPropsInitial and the derived state from appPropsInitial
 *
 */
function getAppProps(appProps, state) {
    const { autoDetect, apis, history, localApis, mountComponentTemporarily, nodesState, page, tourState, urlQuery, errorCallback } = appProps;
    const { filter, filterOptions, packages, packageGroups, selectedNode, selectedNodeExtended } = state;
    return {
        autoDetect,
        apis,
        filter,
        filterOptions,
        history,
        localApis,
        nodesState,
        mountComponentTemporarily,
        packages,
        packageGroups,
        page,
        selectedNode,
        selectedNodeExtended,
        tourState,
        urlQuery,
        errorCallback
    };
}
exports.getAppProps = getAppProps;
/**
 * Get all the derived state which is included in appProps, using appPropsInitial.
 *
 */
async function getAppState(appPropsInitial, 
// TODO! Don't love offlineDevices being here... maybe move into AppsPropsInitial?
offlineDevices) {
    const { apis, urlQuery } = appPropsInitial;
    if ((0, util_1.getServerConfig)().offline) {
        if (!offlineDevices) {
            return null;
        }
        apis.initOffline(appPropsInitial.localApis, offlineDevices);
    }
    return Promise.all([apis.getFilterOptions(), apis.getPackages(), apis.getPackageGroups()])
        .then(([filterOptions, packages, packageGroups]) => {
        const filter = (0, filter_helpers_1.getFilterFromBrowserUrlQuery)(urlQuery, packageGroups, filterOptions);
        return {
            filter,
            filterOptions,
            packages,
            packageGroups,
            selectedNode: null,
            selectedNodeExtended: null
        };
    })
        .then((state) => {
        const id = appPropsInitial.urlQuery.node || null;
        if (!id) {
            return { id: null, state };
        }
        else {
            return (0, public_id_helpers_1.getNodeDbIdFromPublicId)(id, state.packageGroups, appPropsInitial.urlQuery, appPropsInitial.apis).then((id) => ({
                id,
                state
            }), (err) => {
                const statusCode = err instanceof errors_1.NetworkError ? parseInt(err.statusCode) : null;
                if (statusCode === 404 || statusCode === 400) {
                    if (statusCode === 400) {
                        console.warn(`Got a 400 from the server with msg ${err.message}`);
                    }
                    return { id: null, state };
                }
                else {
                    throw err;
                }
            });
        }
    })
        .then(({ id, state }) => (0, component_helpers_1.getNodeData)(id, apis).then((nodeData) => ({ nodeData, state })))
        .then(({ state, nodeData }) => ({
        ...state,
        selectedNode: nodeData && nodeData.node,
        selectedNodeExtended: nodeData && nodeData.nodeExtended
    }));
}
exports.getAppState = getAppState;
// TODO? Move the following functions to another module?
function useAvailableOfflineBoardsAndDevices(args) {
    const { appPropsInitial, trigger, errorCallback } = args;
    // Get REX boards and devices from offlined devices/boards JSON
    const { result: rexBoardsAndDevices } = (0, use_local_apis_1.useGetOfflineBoardsAndDevices)({
        appProps: appPropsInitial,
        errorCallback,
        trigger
    });
    // Get Targetdb based devices from CCS server
    const { result: ccsDevicesInfo } = (0, use_local_apis_1.useGetCcsDevices)({
        appProps: appPropsInitial,
        targetFilter: null,
        errorCallback,
        trigger
    });
    // Get boards and devices available offline
    // TODO?: Change to sync op or switch to a non-react-effect based mechanism
    // Using useAsyncOperation() to call getAvailableOfflineBoardsAndDevices() even though it's
    // synchronous as a) getAvailableOfflineBoardsAndDevices() is (currently at least) a longer
    // operation; and b) for the dependency based caching
    return (0, use_async_operation_1.useAsyncOperation)({
        operation: async () => {
            if (!trigger) {
                return null;
            }
            if (rexBoardsAndDevices && ccsDevicesInfo) {
                await new Promise((r) => setTimeout(r));
                return getAvailableOfflineBoardsAndDevices(rexBoardsAndDevices, ccsDevicesInfo);
            }
            else {
                return null;
            }
        },
        dependencies: [!!appPropsInitial, !!rexBoardsAndDevices && !!ccsDevicesInfo],
        errorCallback,
        keepResultBetweenUpdates: true
    });
}
exports.useAvailableOfflineBoardsAndDevices = useAvailableOfflineBoardsAndDevices;
function getAvailableOfflineBoardsAndDevices(rexBoardsAndDevices, ccsDevicesInfo) {
    // TODO! Rewrite to focus primarily on REX devices and not CCS devices. Most of the code below
    // was written before REX device info was available. While the following works, it's still
    // somewhat a WIP and needs to be cleaned up and refactored.
    // TODO! Add device family support
    // TODO!! Improve performance
    let ccsDevices = ccsDevicesInfo && ccsDevicesInfo.devices;
    // TODO` Strictly speaking don't really need to filter these anymore. And check to ensure that
    // none of these may match top level REX device familes.
    // Omit generic devices
    ccsDevices = lodash_1.default.filter(ccsDevices, (d) => !d.filterKey || d.filterKey !== 'Generic Devices');
    // TODO` Turn back on later and test for duplicates; and also make sure any duplicates that could occur in
    // production are handled properly
    const duplicateCheck = false;
    // Detect duplicates in devices returned by CCS getDevices()
    if (duplicateCheck) {
        const duplicateDevicesOnId = lodash_1.default.chain(ccsDevices)
            .countBy((device) => device.id)
            .pickBy((count) => count > 1)
            .mapValues((count, deviceId) => ({
            count,
            devices: lodash_1.default.filter(ccsDevices, (ccsDevice) => ccsDevice.id === deviceId)
        }))
            .value();
        const duplicateDevicesOnName = lodash_1.default.chain(ccsDevices)
            .countBy((device) => device.name)
            .pickBy((count) => count > 1)
            .mapValues((count, deviceName) => ({
            count,
            devices: lodash_1.default.filter(ccsDevices, (ccsDevice) => ccsDevice.name === deviceName)
        }))
            .value();
        console.log('Duplicate devices returned by getDevices', {
            duplicateDevicesOnId,
            duplicateDevicesOnName
        });
    }
    const ccsDevicesWithDerivedRexInfo = lodash_1.default.map(ccsDevices, (ccsDevice) => {
        // TODO? Instead just split on '  ' and use a regex on [] for the core for simplicity?
        const found = ccsDevice.name.match(/^(?<deviceName>.+?)(  (\[(?<coreName>.+?)\]))?$/);
        const deviceName = (found && found.groups && found.groups.deviceName) || undefined;
        if (!deviceName) {
            throw new Error(`deviceName not found in: ${ccsDevice.name}`);
        }
        const coreName = (found && found.groups && found.groups.coreName) || undefined;
        // Use last segment of ccs device id (using '.' as delimiter) for public id
        const ccsDeviceIdExclCore = lodash_1.default.last(ccsDevice.id.split(/[\.]/));
        const uniqueCcsDeviceKey = `${ccsDeviceIdExclCore}__${deviceName}`;
        // Attempt to derive REX device ID from the CCS device name. Truncating at white
        // space since REX device ids don't have whitespace.
        const deviceIdParts = ccsDeviceIdExclCore.split(/[^a-zA-Z0-9]+/);
        const firstPart = lodash_1.default.first(deviceIdParts);
        if (!firstPart) {
            throw new Error('deviceIdParts expected');
        }
        let rexName;
        if (
        // TODO` Would be best to replace this with something a bit more generic
        (firstPart === 'EVM' ||
            firstPart === 'GPEVM' ||
            firstPart === 'ICE' ||
            firstPart === 'IDK' ||
            firstPart === 'SK') &&
            deviceIdParts.length > 1) {
            rexName = deviceIdParts[1];
        }
        else {
            rexName = firstPart;
        }
        const rexDevicePublicId = rexName.toUpperCase();
        return {
            uniqueCcsDeviceKey,
            rexDevicePublicId,
            rexName,
            // TODO` Update device var naming throughout to be consistent and clearer, with 'core'
            // or whatever added as needed
            ccsDeviceCore: {
                ...ccsDevice,
                coreName // undefined if just single core
            }
        };
    });
    const ccsDeviceWithDuplicateCores = [];
    const ccsDevicesById = lodash_1.default.mapValues(lodash_1.default.groupBy(ccsDevicesWithDerivedRexInfo, (device) => device.rexDevicePublicId), (devices0, deviceId) => {
        // TODO? Consider adding better duplicate resolution?
        if (!devices0 || lodash_1.default.isEmpty(devices0)) {
            throw new Error(`No devices for deviceId: ${deviceId}`);
        }
        const devicesByCcsDeviceKey = lodash_1.default.groupBy(devices0, (device) => device.uniqueCcsDeviceKey);
        const ccsDeviceKeys = lodash_1.default.keys(devicesByCcsDeviceKey);
        const ccsDeviceKey = ccsDeviceKeys.length === 1
            ? // Not a duplicate, just a single match
                ccsDeviceKeys[0]
            : // Duplicates -- picking device group that has smallest device key (as more likely the best match)
                lodash_1.default.minBy(ccsDeviceKeys);
        const devices = devicesByCcsDeviceKey[ccsDeviceKey];
        let ccsDeviceCores = lodash_1.default.map(devices, (d) => d.ccsDeviceCore);
        const coresByCoreName = lodash_1.default.groupBy(ccsDeviceCores, (core) => core.coreName);
        const duplicateCoresExist = lodash_1.default.some(coresByCoreName, (cores) => cores.length > 1);
        if (duplicateCoresExist) {
            // Save for duplicate reporting
            ccsDeviceWithDuplicateCores.push({ deviceId, devices });
            // Strip off duplicate cores
            ccsDeviceCores = lodash_1.default.map(coresByCoreName, (duplicateCores, _coreName) => {
                return lodash_1.default.first(duplicateCores);
            });
        }
        // Just picking the first device to extract non-core info from
        const device = lodash_1.default.first(devices);
        return {
            rexDevicePublicId: device.rexDevicePublicId,
            rexName: device.rexName,
            ccsDevices: ccsDeviceCores
        };
    });
    // Report devices with duplicate cores
    if (duplicateCheck) {
        console.log('Devices with duplicate cores', {
            ccsDeviceWithDuplicateCores
        });
    }
    // Map REX devices to CCS devices
    const rexAndCssDevices = lodash_1.default.map(rexBoardsAndDevices.devices, (rexDevice) => {
        // Perform full search for an exact match first
        let ccsDevice = lodash_1.default.find(ccsDevicesById, (_ccsDevice, ccsDeviceId) => rexDevice.publicId === ccsDeviceId);
        // Then search on ccs device name
        if (!ccsDevice) {
            // TODO` This isn't catching anything now, but should later (at least AM2634)
            ccsDevice = lodash_1.default.find(ccsDevicesById, (ccsDevice) => {
                const found = ccsDevice.ccsDevices[0].name.match(/^(?<deviceName>.+?)(  (\[(?<coreName>.+?)\]))?$/);
                const deviceName = (found && found.groups && found.groups.deviceName) || undefined;
                if (!deviceName) {
                    throw new Error(`deviceName not found in: ${ccsDevice.ccsDevices[0].name}`);
                }
                return rexDevice.publicId === deviceName;
            });
        }
        // Search again with 'TMS320' prefix stripped off CCS device id
        ccsDevice = lodash_1.default.find(ccsDevicesById, (_ccsDevice, ccsDeviceId) => rexDevice.publicId === ccsDeviceId.replace(/^TMS320/, ''));
        return { realRexDevice: rexDevice, ccsDevice: ccsDevice || null };
    });
    // Reporting of matches and non-matches
    // TODO` Turn back on later to identify remaining non-matches and try addressing with
    // improvements to REX->CCS matching rules
    const reportNonmatches = true;
    if (reportNonmatches) {
        const matchesAndNon = lodash_1.default.partition(rexAndCssDevices, (o) => !!o.ccsDevice);
        console.log('REX->CCS device matches and not-matches ', {
            rexAndCssDevices,
            matchesAndNon
        });
    }
    const availableDevices = lodash_1.default.chain(rexAndCssDevices)
        .filter((v) => !!v.ccsDevice && !!v.ccsDevice.ccsDevices)
        .map((v) => ({
        rexDevicePublicId: v.realRexDevice.publicId,
        rexName: v.realRexDevice.name,
        ccsDevices: v.ccsDevice.ccsDevices
    }))
        .keyBy((v) => v.rexDevicePublicId)
        .value();
    const availableBoards = lodash_1.default.chain(rexBoardsAndDevices.boards)
        .map((board) => ({
        ...board,
        // subset of the board's devices that are supported by CCS Project Create
        supportedDevices: lodash_1.default.filter(board.devices, (device) => !!availableDevices[device])
    }))
        // include only boards with at least one device support by CCS
        .filter((board) => !lodash_1.default.isEmpty(board.supportedDevices))
        .value();
    return {
        availableBoards,
        availableDevices
    };
}
