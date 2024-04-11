"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTheiaTheme = exports.getTheiaPort = exports.isTableViewMode = exports.humanFileSize = exports.setTiUserGeo = exports.setTestingHelpers = exports.resultsFound = exports.isNodeInFilter = exports.isCloudAgentInstalled = exports.isBrowserEnvironment = exports.getWizardPermanentFilters = exports.getTableItemVariantAsString = exports._clearTICloudAgentObject = exports.getTICloudAgentObject = exports.getPlatform = exports.getPackageLicense = exports.getServerConfig = exports.fallbackIsDesktop = exports.handleError = exports.evtHandlerAsync = exports.evtHandler = exports.doControledTask = exports.convertToCloudAgentError = exports.TEST_ID = exports.SEARCH_ENGINE_ID = exports.LOADING_DELAY_MS = exports.LATEST = exports.HIGHEST_SAFE_NUMBER = exports.GAPI_KEY = exports.FILTER_TITLE_MAP = exports.DEFAULT_PAGE_TITLE = exports.Page = void 0;
const ua_parser_js_1 = require("ua-parser-js");
const _ = require("lodash");
const ajax_1 = require("../apis/ajax");
const errors_1 = require("../../shared/errors");
const delay_1 = require("../../test/delay");
const download_1 = require("../../lib/download");
var page_1 = require("../../shared/routes/page");
Object.defineProperty(exports, "Page", { enumerable: true, get: function () { return page_1.Page; } });
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
exports.DEFAULT_PAGE_TITLE = 'TI Resource Explorer';
exports.FILTER_TITLE_MAP = {
    compilers: 'Compiler',
    devices: 'Device',
    devtools: 'Board',
    ides: 'IDE',
    kernels: 'Kernel',
    languages: 'Language',
    resourceClasses: 'Type',
    search: 'Search',
    addedPackageGroups: 'Added Package',
    removedPackageGroups: 'Removed Package',
    nodeType: 'Node Type'
};
// This is the google api key. Go to https://console.developers.google.com/apis then click credentials to get the API key
exports.GAPI_KEY = 'AIzaSyCF84mS_LOb9Xj58LA6jv4lOHj75ifI36k';
exports.HIGHEST_SAFE_NUMBER = 2147483647;
exports.LATEST = 'LATEST';
exports.LOADING_DELAY_MS = 300;
// This refers to the search engine that we will use the google api with. Go to cse.google.com to see your search engines
exports.SEARCH_ENGINE_ID = '009639744219465978673:d9p5mpo0vbe';
exports.TEST_ID = {
    // AutoDetect
    autoDetectButton: 'test-id-auto-detect-button',
    autoDetectDetectedMenu: 'test-id-auto-detect-detected-menu',
    autoDetectDetectedMenuItem: (id) => `test-id-auto-detect-detected-menu-item-${id}`,
    autoDetectDialogClose: 'test-id-auto-detect-dialog-close',
    autoDetectDialogContent: 'test-id-auto-detect-dialog-content',
    autoDetectDownloadProgressBar: 'test-id-auto-detect-download-progress-bar',
    // Breadcrumb
    breadcrumbHome: 'test-id-breadcrumb-home',
    breadcrumbNode: (dbId) => `test-id-breadcrumb-node-${dbId}`,
    // ChangeVersionDropdownElements
    changeVersionDropdownElementsMenuItem: (packageGroupUid, latest) => `test-id-change-version-dropdown-elements-menu-item-${packageGroupUid}` +
        (latest ? 'latest' : ''),
    changeVersionDropdownElementsMenuItemNoVersions: 'test-id-change-version-dropdown-elements-menu-item-no-versions',
    // Filter
    filterAllFiltersButton: 'test-id-filter-all-filters-button',
    filterBoardDeviceFilter: 'test-id-filter-board-device-filter',
    filterKeywordsFilter: 'test-id-filter-keywords-filter',
    filterRadioButton: (key, id) => `test-id-filter-radio-${key}-${id}`,
    // Iframe
    iframeElement: 'test-id-iframe-element',
    // Import
    importSelectTargetApply: 'test-id-import-select-target-apply',
    importSelectTargetCancel: 'test-id-import-select-target-cancel',
    importSelectTargetRadio: (targetId) => `test-id-import-select-target-radio-${targetId}`,
    importInstallMissingDialog: `test-id-import-install-missing-dialog`,
    importInstallMissingInstallButton: 'test-id-import-install-missing-install-button',
    importInstallMissingCancelButton: 'test-id-import-install-missing-cancel-button',
    importSelectTargetDialog: 'test-id-import-select-target-dialog',
    importConfirmImportDialog: `test-id-import-confirm-import-dialog`,
    importConfrimImportImportButton: 'test-id-import-confirm-import-import-button',
    importConfirmImportCancelButton: 'test-id-import-confirm-import-cancel-button',
    // Install - versionRange used for not found case, version otherwise
    installButton: 'test-id-install-button',
    installCancelButton: 'test-id-install-cancel-button',
    installConfirmationDialog: 'test-id-install-confirmation-dialog',
    installDescriptionText: (packageId, versionRange) => `test-id-install-description-text-${packageId}-${versionRange}`,
    installDialog: 'test-id-install-dialog',
    installLocationContextMenu: 'test-id-install-location-context-menu',
    installLocationContextMenuButton: 'test-id-install-location-context-menu-button',
    installLocationDropdownElementsMenuItem: (idx) => `test-id-install-location-dropdown-elements-menu-item-${idx}`,
    installLocationText: (packageId, versionRange) => `test-id-install-location-text-${packageId}-${versionRange}`,
    installModifyButton: 'test-id-install-modify-button',
    installSelectCheckbox: (packageId, versionRange) => `test-id-install-select-checkbox-${packageId}-${versionRange}`,
    installNextButton: 'test-id-install-next-button',
    // License
    licenseAcceptButton: 'test-id-license-accept-button',
    licenseDeclineButton: 'test-id-license-decline-button',
    licenseDialog: 'test-id-license-dialog',
    // Message
    messageText: 'test-id-message-text',
    // Navbar
    navbarDialog: 'test-id-navbar-dialog',
    navbarTitle: 'test-id-navbar-title',
    navbarMenu: 'test-id-navbar-menu',
    navbarMenuButton: 'test-id-navbar-menu-button',
    navbarMenuPackageManager: 'test-id-navbar-package-manager',
    navbarMenuLoadLastSession: 'test-id-navbar-load-last-session',
    navbarMenuAutoLoadLastSession: 'test-id-navbar-auto-load-last-session',
    navbarMenuTableView: 'test-id-navbar-table-view',
    // NodeContextMenu
    nodeContentMenuDialog: 'test-id-node-context-menu-dialog',
    nodeContextMenuDownloadVersion: 'test-id-node-context-menu-download-version',
    nodeContextMenuImport: 'test-id-node-context-menu-import',
    nodeContextMenuInstall: 'test-id-node-context-menu-install',
    nodeContextMenuInstallModify: 'test-id-node-context-menu-install-modify',
    nodeContextMenuUninstall: 'test-id-node-context-menu-uninstall',
    nodeContextMenuOpenInNewTab: 'test-id-node-context-menu-open-in-new-tab',
    nodeContextMenuManageVersions: 'test-id-node-context-menu-manage-versions',
    // NodePresentation
    nodePresentationContextMenu: 'test-id-node-presentation-context-menu',
    nodePresentationContextMenuButton: (nodeDbId) => `test-id-node-presentation-context-menu-button-${nodeDbId}`,
    // PackageContextMenu
    packageContextMenuAddVersion: 'test-id-package-context-menu-add-version',
    packageContextMenuChangeVersion: 'test-id-package-context-menu-change-version',
    packageContextMenuDownloadVersion: 'test-id-package-context-menu-download-version',
    packageContextMenuHideVersion: 'test-id-package-context-menu-hide-version',
    // PackageManager
    packageManagerActionsMenu: 'test-id-package-manager-actions-menu',
    packageManagerActionsMenuButton: (packageUid) => `test-id-package-manager-actions-menu-button-${packageUid}`,
    packageManagerApplyButton: 'test-id-package-manager-apply-button',
    packageManagerCancelButton: 'test-id-package-manager-cancel-button',
    packageManagerMoreInfoButton: (packageId) => `test-id-package-manager-more-info-button-${packageId}`,
    packageManagerPackageNameText: (packageUid) => `test-id-package-manager-name-text-${packageUid}`,
    packageManagerShowInTreeAllCheckbox: 'test-id-package-manager-show-in-tree-all-checkbox',
    packageManagerShowInTreeCheckbox: (packageUid, latest) => `test-id-package-manager-show-in-tree-checkbox-${packageUid}-${latest}`,
    packageManagerSummaryButton: 'test-id-package-manager-summary-button',
    packageManagerTable: 'test-id-package-manager-table',
    packageManagerVersionText: (packageUid) => `test-id-package-manager-version-text-${packageUid}`,
    // SelectTableItemVariant
    selectTableItemVariantDialog: 'test-id-select-table-item-variant-dialog',
    selectTableItemVariantOkButton: 'test-id-select-table-item-variant-ok-button',
    selectTableItemVariantCancelButton: 'test-id-select-table-item-variant-cancel-button',
    // SelectTableItemVariant - Compiler
    selectTableItemVariantCompilerContextMenu: 'test-id-select-table-item-variant-compiler-context-menu',
    selectTableItemVariantCompilerContextMenuButton: 'test-id-select-table-item-variant-compiler-context-menu-button',
    selectTableItemVariantCompilerDropdownElementsMenuItem: (idx) => `test-id-select-table-item-variant-compiler-dropdown-elements-menu-item-${idx}`,
    // SelectTableItemVariant - Kernel
    selectTableItemVariantKernelContextMenu: 'test-id-select-table-item-variant-kernel-context-menu',
    selectTableItemVariantKernelContextMenuButton: 'test-id-select-table-item-variant-kernel-context-menu-button',
    selectTableItemVariantKernelDropdownElementsMenuItem: (idx) => `test-id-select-table-item-variant-kernel-dropdown-elements-menu-item-${idx}`,
    // Suggestions
    suggestionsItem: (key) => `test-id-suggestions-item-${key}`,
    suggestionsList: 'test-id-suggestions-list',
    // TableView
    tableViewDisplay: 'test-id-table-view-display',
    tableViewMessage: 'test-id-table-view-message',
    // TableViewItem
    tableViewItemImport: (id) => `test-id-table-view-item-import-${id}`,
    tableViewItemNodeLink: (id) => `test-id-table-view-item-node-link-${id}`,
    tableViewItemReadme: (id) => `test-id-table-view-item-readme-${id}`,
    // TestLandingPage
    testLandingPageButton: 'test-id-test-landing-page-button',
    // Uninstall
    uninstallYesButton: 'test-id-uninstall-yes-button',
    uninstallNoButton: 'test-id-uninstall-no-button',
    // Wizard
    wizardNextButton: 'test-id-wizard-next-button'
};
function convertToCloudAgentError(err) {
    const cloudAgentError = new errors_1.CloudAgentError(typeof err === 'string' ? err : err.message);
    cloudAgentError.stack = typeof err === 'string' ? '' : err.stack;
    return cloudAgentError;
}
exports.convertToCloudAgentError = convertToCloudAgentError;
/**
 * Do a controlled task - this is a task which uses the APIControl task to perform synchronization.
 *
 * @param apiControl
 * @param masterName
 * @param task
 *
 */
function doControledTask(apiControl, masterName, task) {
    if (apiControl.isCurrentMaster(masterName)) {
        return registerTask(apiControl, masterName, task).then(() => { });
    }
    return apiControl
        .acquireControl(masterName)
        .then(() => registerTask(apiControl, masterName, task))
        .then(() => apiControl.releaseControl(masterName));
}
exports.doControledTask = doControledTask;
function evtHandler(onEvt, errorCallback) {
    return (...args) => {
        try {
            onEvt.apply(null, args);
        }
        catch (e) {
            handleError(e, errorCallback);
        }
    };
}
exports.evtHandler = evtHandler;
function evtHandlerAsync(onEvt, errorCallback) {
    return (...args) => {
        try {
            onEvt.apply(null, args).catch((e) => handleError(e, errorCallback));
        }
        catch (e) {
            handleError(e, errorCallback);
        }
    };
}
exports.evtHandlerAsync = evtHandlerAsync;
function handleError(e, errorCallback) {
    if (!errorCallback.current) {
        return console.error(e);
    }
    errorCallback.current(e);
}
exports.handleError = handleError;
/**
 * If the cloud agent or the tirex module are not available use this fallback method to determine if we're in desktop / cloud.
 *
 */
function fallbackIsDesktop() {
    return navigator.userAgent.includes('CCStudio') || navigator.userAgent.includes('CodeComposerStudio');
}
exports.fallbackIsDesktop = fallbackIsDesktop;
function getServerConfig() {
    const configElement = document.getElementById('server-config');
    if (configElement) {
        let serverConfig = JSON.parse(configElement.innerHTML);
        if (serverConfig.offline) {
            serverConfig = {
                ...serverConfig,
                // TODO? Does it instead make sense for this to instead be /ccs-webview/tirex?
                role: 'tirex',
                rootNodeDbId: '1',
                // TODO? Maybe just go with root's softwareNodePublicId?
                softwareNodePublicId: ''
                // Currently hardcoded in theia-index-offline.html
                // TODO! Instead get from ccs/tirex/package.json (as server does but through ccs.file module)
                // version: '4.14.0'
            };
        }
        return serverConfig;
    }
    else {
        throw new Error('Missing server-config');
    }
}
exports.getServerConfig = getServerConfig;
function getPackageLicense(node, appProps) {
    if (!appProps.packages) {
        throw new Error('no appProps.packages');
    }
    else {
        const packageUid = node.packagePublicUid;
        if (!packageUid) {
            throw new Error(`No package for node ${node}`);
        }
        const pkgData = appProps.packages.find(pkg => pkg.packagePublicUid === packageUid);
        if (!pkgData) {
            throw new Error(`Cannot find package ${packageUid}`);
        }
        return pkgData.licenses;
    }
}
exports.getPackageLicense = getPackageLicense;
function getPlatform() {
    const parser = new ua_parser_js_1.UAParser();
    return (0, download_1.resolvePackageZipForOS)(parser.getOS().name || '');
}
exports.getPlatform = getPlatform;
let getTICloudAgentObjectPromise = null;
async function getTICloudAgentObject() {
    if (!getTICloudAgentObjectPromise) {
        getTICloudAgentObjectPromise = _getTICloudAgentObject();
    }
    return getTICloudAgentObjectPromise;
    async function _getTICloudAgentObject() {
        if (fallbackIsDesktop() && !getTheiaPort()) {
            // In CCS Eclipse the agentPort is injected into the window property by the IDE.
            // This allows agent.js to talk to the local cloud agent process in CCS.
            // There is a delay before this is set and it needs to be set every time the url updates.
            // We will wait until this is present or throw an error if it doesn't show up after some time.
            const isAgentPortReady = () => {
                const windowAsAny = window;
                return (windowAsAny &&
                    windowAsAny.ti &&
                    windowAsAny.ti.debug &&
                    windowAsAny.ti.debug.cloudagent &&
                    windowAsAny.ti.debug.cloudagent.agentPort);
            };
            for (const _i in _.range(150)) {
                if (isAgentPortReady()) {
                    break;
                }
                else {
                    await (0, delay_1.delay)(200);
                }
            }
            if (!isAgentPortReady()) {
                throw new Error('agentPort not ready for TICloudAgent');
            }
        }
        const tiCloudAgentObject = isBrowserEnvironment()
            ? window.TICloudAgent
            : global.TICloudAgent;
        return tiCloudAgentObject;
    }
}
exports.getTICloudAgentObject = getTICloudAgentObject;
// For test purposes only
function _clearTICloudAgentObject() {
    getTICloudAgentObjectPromise = null;
}
exports._clearTICloudAgentObject = _clearTICloudAgentObject;
/**
 * Get the tableItemVariant as a string (sorted). Useful for comparing.
 *
 */
function getTableItemVariantAsString(variant) {
    return `${variant.compiler}-${variant.kernel}`;
}
exports.getTableItemVariantAsString = getTableItemVariantAsString;
function getWizardPermanentFilters(appProps) {
    return {
        resourceClasses: appProps.filterOptions.resourceClasses.filter(item => item.publicId === 'example')
    };
}
exports.getWizardPermanentFilters = getWizardPermanentFilters;
function isBrowserEnvironment() {
    const navigator = globalThis.navigator;
    return !!navigator && !navigator.userAgent.includes('node.js');
}
exports.isBrowserEnvironment = isBrowserEnvironment;
async function isCloudAgentInstalled() {
    const CloudAgent = await getTICloudAgentObject();
    if (typeof CloudAgent === 'undefined') {
        return false;
    }
    else {
        return CloudAgent.Init().then(() => true, () => false);
    }
}
exports.isCloudAgentInstalled = isCloudAgentInstalled;
function isNodeInFilter(nodeExtended, urlQuery, apis) {
    const nodeIdPath = nodeExtended.nodeDbIdPath;
    return apis
        .getFilteredChildrenNodes(nodeIdPath.length < 2
        ? [getServerConfig().rootNodeDbId]
        : [nodeIdPath[nodeIdPath.length - 2]], urlQuery)
        .then(([filteredSiblings]) => filteredSiblings.some(sibling => sibling.nodeDbId === nodeExtended.nodeDbId));
}
exports.isNodeInFilter = isNodeInFilter;
/**
 * Determine if there are any results for the given urlQuery
 *
 * @param urlQuery
 * @param apis
 *
 * @returns resultsFound
 */
function resultsFound(urlQuery, apis) {
    return apis
        .getFilteredChildrenNodes([getServerConfig().rootNodeDbId], urlQuery)
        .then(([filteredSiblings]) => !_.isEmpty(filteredSiblings));
}
exports.resultsFound = resultsFound;
function setTestingHelpers() {
    return Promise.resolve().then(() => require(/* webpackChunkName: "testing-helpers-bundle" */ '../testing-helpers/testing-helpers')).then(({ TestingHelpers }) => {
        window.testingHelpers = TestingHelpers;
    });
}
exports.setTestingHelpers = setTestingHelpers;
/**
 * Script for Geo location
 *
 * @returns {Promise}
 */
function setTiUserGeo() {
    return ajax_1.ajax
        .get('https://www.ti.com/general/docs/readAkamaiHeaders0.tsp')
        .then(responseJson => {
        window.tiUserGeo = responseJson;
    });
}
exports.setTiUserGeo = setTiUserGeo;
function humanFileSize(size) {
    const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    const value = Number((size / Math.pow(1024, i)).toFixed(2)) * 1;
    const unit = ['B', 'kB', 'MB', 'GB', 'TB'][i];
    return `${value} ${unit}`;
}
exports.humanFileSize = humanFileSize;
/**
 * Register a task to be processed. If another master has control your
 * request will only be processed once it is finished.
 *
 * @param apiControl
 * @param masterName
 * @param task
 *
 * @returns taskResult
 */
function registerTask(apiControl, masterName, task) {
    if (masterName && apiControl.isCurrentMaster(masterName)) {
        return task();
    }
    else if (masterName && !apiControl.isCurrentMaster(masterName)) {
        return Promise.reject(new Error(`Not current master ${masterName}`));
    }
    else {
        return apiControl.onIdle().then(() => task());
    }
}
/**
 *  Modes
 */
function isTableViewMode(appProps) {
    return appProps.urlQuery.modeTableView === 'true';
}
exports.isTableViewMode = isTableViewMode;
function getTheiaPort() {
    const theiaPort = Object.fromEntries(new URLSearchParams(location.search)).theiaPort;
    // NOTE: Radix 10 is passed in in spite of it being the default due to some browsers (at least
    // in the past) treating numbers with a leading '0' as octal
    return parseInt(theiaPort, 10) || 0;
}
exports.getTheiaPort = getTheiaPort;
function getTheiaTheme() {
    return Object.fromEntries(new URLSearchParams(location.search)).theiaTheme;
}
exports.getTheiaTheme = getTheiaTheme;
