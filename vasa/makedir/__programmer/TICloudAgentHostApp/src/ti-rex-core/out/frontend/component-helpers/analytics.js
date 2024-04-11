"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUrlChange = exports.handleNodeImport = exports.handlePackageInstall = exports.handleNodeDownload = exports.handlePackageDownload = void 0;
// 3rd party
const _ = require("lodash");
// our modules
const tealium_1 = require("./tealium");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
async function handlePackageDownload({ pkg, agentMode }) {
    await (0, tealium_1.sendTirexEventToTealium)({
        event_name: "tirex package download" /* TirexEventType.PACKAGE_DOWNLOAD */,
        ...getSbeData(),
        ...getPackageData(pkg),
        ...getCommonData(agentMode)
    });
}
exports.handlePackageDownload = handlePackageDownload;
async function handleNodeDownload({ pkg, node, nodeExtended, appProps, agentMode }) {
    const resourceData = await getResourceData(node, nodeExtended, appProps);
    await (0, tealium_1.sendTirexEventToTealium)({
        event_name: "tirex file download" /* TirexEventType.FILE_DONWLOAD */,
        ...getSbeData(),
        ...(pkg ? getPackageData(pkg) : getEmptyPackageData()),
        ...resourceData,
        ...getCommonData(agentMode)
    });
}
exports.handleNodeDownload = handleNodeDownload;
async function handlePackageInstall({ pkg, agentMode }) {
    await (0, tealium_1.sendTirexEventToTealium)({
        event_name: "tirex package install" /* TirexEventType.PACKAGE_INSTALL */,
        ...getSbeData(),
        ...getPackageData(pkg),
        ...getCommonData(agentMode)
    });
}
exports.handlePackageInstall = handlePackageInstall;
async function handleNodeImport({ pkg, node, nodeExtended, appProps, agentMode }) {
    const resourceData = await getResourceData(node, nodeExtended, appProps);
    await (0, tealium_1.sendTirexEventToTealium)({
        event_name: "tirex project import" /* TirexEventType.PROJECT_IMPORT */,
        ...getSbeData(),
        ...(pkg ? getPackageData(pkg) : getEmptyPackageData()),
        ...resourceData,
        ...getCommonData(agentMode)
    });
}
exports.handleNodeImport = handleNodeImport;
async function handleUrlChange({ appProps, nextAppProps, agentMode }) {
    await Promise.all([handlePageView(), handleFilterChange(), handleSearchChange()]);
    async function handlePageView() {
        if (nextAppProps.selectedNodeExtended && nextAppProps.selectedNode) {
            if (!appProps ||
                !appProps.selectedNodeExtended ||
                (appProps.selectedNodeExtended &&
                    appProps.selectedNodeExtended.nodeDbId !==
                        nextAppProps.selectedNodeExtended.nodeDbId)) {
                const { selectedNode: node, selectedNodeExtended: nodeExtended } = nextAppProps;
                const pkgUid = node && node.packagePublicUid;
                const pkg = nextAppProps.packages.find(item => item.packagePublicUid === pkgUid);
                const resourceData = await getResourceData(node, nodeExtended, nextAppProps);
                const evt = {
                    event_name: "tirex page view" /* TirexEventType.PAGE_VIEW */,
                    ...getSbeData(),
                    ...(pkg ? getPackageData(pkg) : getEmptyPackageData()),
                    ...resourceData,
                    ...getCommonData(agentMode)
                };
                await (0, tealium_1.sendTirexEventToTealium)(evt);
            }
        }
    }
    async function handleFilterChange() {
        const urlQueryWithChanges = {};
        const urlQueryKeys = [
            'devices',
            'devtools',
            'kernels',
            'compilers',
            'search'
        ];
        urlQueryKeys.map(key => {
            setValueUsingFn(urlQueryWithChanges, key, getQueryKeyChange);
            if (!urlQueryWithChanges[key]) {
                // avoid having keys with undefined set explicitly due to the above
                delete urlQueryWithChanges[key];
            }
        });
        if (Object.keys(urlQueryWithChanges).length > 0) {
            const evt = {
                event_name: "tirex filter" /* TirexEventType.FILTER */,
                ...getFilterData(urlQueryWithChanges),
                ...getCommonData(agentMode)
            };
            await (0, tealium_1.sendTirexEventToTealium)(evt);
        }
    }
    async function handleSearchChange() {
        const urlQueryWithChanges = {};
        setValueUsingFn(urlQueryWithChanges, 'fullTextSearch', getQueryKeyChange);
        if (urlQueryWithChanges.fullTextSearch) {
            const evt = {
                event_name: "tirex search" /* TirexEventType.SEARCH */,
                search_key: urlQueryWithChanges.fullTextSearch,
                ...getCommonData(agentMode)
            };
            await (0, tealium_1.sendTirexEventToTealium)(evt);
        }
    }
    function getQueryKeyChange(key) {
        let changes;
        if ((!appProps || !_.isEqual(appProps.urlQuery[key], nextAppProps.urlQuery[key])) &&
            nextAppProps.urlQuery[key]) {
            const allCurrentItems = (appProps && appProps.urlQuery[key]) || null;
            const allNextItems = nextAppProps.urlQuery[key] || null;
            if (Array.isArray(allNextItems)) {
                const newNextItems = _.differenceWith(allNextItems, allCurrentItems || [], _.isEqual);
                changes = newNextItems;
            }
            else if (allNextItems && allNextItems !== allCurrentItems) {
                changes = allNextItems;
            }
        }
        return changes;
    }
}
exports.handleUrlChange = handleUrlChange;
// Helpers
/**
 * See "setValueForPair", this is a variant of it for this use case
 *
 */
function setValueUsingFn(o1, key, fn) {
    o1[key] = fn(key);
}
function getSbeData() {
    return {
        sbe_0: 'placeholder sbe_0',
        sbe_1: 'placeholder sbe_1',
        sbe_2: 'placeholder sbe_2'
    };
}
function getPackageData(pkg) {
    return {
        product_category: 'placeholder product_category',
        package_opn: 'placeholder package_opn',
        package_name: pkg.name,
        package_version: pkg.packageVersion,
        package_type: 'placeholder package_type',
        device_gpn: 'placeholder device_gpn',
        devtools_gpn: 'placeholder devtools_gpn'
    };
}
function getEmptyPackageData() {
    return {
        product_category: null,
        package_opn: null,
        package_name: null,
        package_version: null,
        package_type: null,
        device_gpn: null,
        devtools_gpn: null
    };
}
async function getResourceData(node, nodeExtended, appProps) {
    const nodePath = await appProps.apis.getNodes(nodeExtended.nodeDbIdPath);
    return {
        resource_id: node.nodePublicId,
        resource_name: node.name,
        resource_path: nodePath.map(item => item.name).join('/'),
        resource_type: 'placeholder resource_type'
    };
}
function getCommonData(agentMode) {
    return {
        tool: 'tirex',
        environment: agentMode,
        ccs_version: agentMode === 'desktop' ? 'placeholder ccs_version' : null // TODO get from agent or other means
    };
}
function getFilterData(urlQuery) {
    return {
        device_gpn: urlQuery.devices ? 'placeholder device_gpn' : null,
        devtools_gpn: urlQuery.devtools ? 'placeholder devtools_gpn' : null,
        kernel: _.first(urlQuery.kernels) || null,
        compiler: _.first(urlQuery.compilers) || null,
        search_key: urlQuery.search || null
    };
}
