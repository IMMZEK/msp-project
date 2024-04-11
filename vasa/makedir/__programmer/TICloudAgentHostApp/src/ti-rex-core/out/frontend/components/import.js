"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
// 3rd party
const React = require("react");
const _ = require("lodash");
const QueryString = require("query-string");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
const material_ui_styles_imports_1 = require("../imports/material-ui-styles-imports");
const ti_icon_imports_1 = require("../imports/ti-icon-imports");
const routing_helpers_1 = require("../component-helpers/routing-helpers");
const use_state_1 = require("../component-helpers/use-state");
const use_local_apis_1 = require("../component-helpers/use-local-apis");
const util_1 = require("../component-helpers/util");
const use_is_package_installed_1 = require("../component-helpers/use-is-package-installed");
const use_apis_1 = require("../component-helpers/use-apis");
const mount_component_temporarily_1 = require("../component-helpers/mount-component-temporarily");
const server_interface_1 = require("../apis/server-interface");
const analytics_1 = require("../component-helpers/analytics");
// our components
const license_1 = require("./license");
const loading_1 = require("./loading");
const popup_disabled_1 = require("./popup-disabled");
const install_1 = require("./install");
const error_boundary_1 = require("./error-boundary");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
exports.Import = React.forwardRef((props, ref) => {
    // Hooks
    const { result: importInfoOffline, shouldDisplayLoadingUI: loading1 } = useGetOfflineImportInfo(props);
    const { result: importInfoOnline, shouldDisplayLoadingUI: loading2 } = (0, use_apis_1.useGetImportInfo)({
        apis: props.appProps.apis,
        id: props.node.nodeDbId,
        urlQuery: props.appProps.urlQuery,
        trigger: props.importType === "Online" /* ImportType.ONLINE */,
        errorCallback: props.appProps.errorCallback
    });
    const { result: agentMode, shouldDisplayLoadingUI: loading3 } = (0, use_local_apis_1.useGetAgentMode)({
        appProps: props.appProps,
        errorCallback: props.appProps.errorCallback,
        allowNoAgent: true
    });
    // Render
    const { appProps, node, projectName, onCloseFinal, onClose, onInstall, skipInstallingMessage, importType, ...rest } = props;
    let content;
    const isLoading = loading1 || loading2 || loading3;
    if (!importInfoOnline || !importInfoOffline || !agentMode || isLoading) {
        content = isLoading ? React.createElement(loading_1.Loading, null) : null;
    }
    else if (agentMode === 'cloud') {
        content = React.createElement(ImportCloud, { importInfo: importInfoOnline, ...props });
    }
    else if (agentMode === 'desktop') {
        content = (React.createElement(ImportDesktop, { importInfo: importInfoOnline, importInfoOffline: importInfoOffline, ...props }));
    }
    else {
        content = null;
    }
    return (React.createElement("div", { ...rest, ref: ref }, content));
});
const ImportCloud = React.forwardRef((props, ref) => {
    const { appProps, node, importInfo, onCloseFinal: onCloseFinalOuter = () => { }, onClose = () => { }, onInstall = () => { }, skipInstallingMessage = false, projectName: _projectName, ...rest } = props;
    const onCloseFinal = (importComplete) => {
        // ImportCloud does not make use of onClose, change this if it does
        onClose();
        onCloseFinalOuter(importComplete);
    };
    // State
    const [getState, setState] = (0, use_state_1.useState)({
        popupEnabled: true,
        licenseAgreed: false,
        selectedTargetId: null
    });
    // Hooks
    useHandleImportCloud({
        onPopupEnabledUpdate: (popupEnabled) => setState({ popupEnabled }),
        licenseAgreed: getState().licenseAgreed,
        popupEnabled: getState().popupEnabled,
        selectedTargetId: getState().selectedTargetId,
        ...props,
        onCloseFinal
    });
    React.useEffect(() => {
        // Reset the state when we get a new item to import
        setState({ popupEnabled: true, licenseAgreed: false, selectedTargetId: null });
    }, [node.nodeDbId]);
    // Events
    const onAgree = React.useCallback((0, util_1.evtHandler)(() => {
        setState({ licenseAgreed: true });
    }, appProps.errorCallback), []);
    const onSelectTarget = React.useCallback((0, util_1.evtHandler)((target) => {
        setState({ selectedTargetId: target });
    }, appProps.errorCallback), []);
    // Render
    const license = !(0, util_1.getServerConfig)().offline ? (0, util_1.getPackageLicense)(node, appProps) : [];
    const { popupEnabled } = getState();
    let content;
    if (!popupEnabled) {
        content = React.createElement(popup_disabled_1.PopupDisabled, { onClose: () => onCloseFinal(false) });
    }
    else if (license && !getState().licenseAgreed && !_.isEmpty(license)) {
        content = (React.createElement(license_1.License, { license: license, onAgree: onAgree, onDisagree: () => onCloseFinal(false) }));
    }
    else if (_.size(importInfo.targets) > 1) {
        content = (React.createElement(SelectTarget, { appProps: appProps, importInfo: importInfo, onCancel: () => onCloseFinal(false), onSelectTarget: onSelectTarget }));
    }
    else {
        content = null;
    }
    return (React.createElement("div", { ...rest, ref: ref }, content));
});
const useImportDesktopStyles = (0, material_ui_styles_imports_1.makeStyles)((theme) => {
    return {
        root: {},
        buttonText: {
            fontWeight: 400,
            color: 'inherit',
            textTransform: 'none'
        },
        iconWithText: {
            marginLeft: theme.spacing(1),
            verticalAlign: 'middle'
        }
    };
});
const ImportDesktop = React.forwardRef((props, ref) => {
    const { appProps, node, projectName, onCloseFinal: onCloseFinalOuter = () => { }, onClose: _onClose = () => { }, onInstall = () => { }, importInfo, classes: _classes, className, skipInstallingMessage = false, ...rest } = props;
    // State
    const [getState, setState] = (0, use_state_1.useState)({
        selectedTargetId: null,
        progressIds: null,
        hasImportConformation: false,
        onCloseCalled: false
    });
    // Events
    const onCloseFinal = (0, util_1.evtHandler)((importComplete) => {
        const { onCloseCalled } = getState();
        if (!onCloseCalled) {
            _onClose();
        }
        onCloseFinalOuter(importComplete);
    }, appProps.errorCallback);
    const onClose = (0, util_1.evtHandler)(() => {
        if (getState().onCloseCalled) {
            throw new Error('Calling onClose multiple times');
        }
        setState({ onCloseCalled: true });
        _onClose();
    }, appProps.errorCallback);
    // Hooks
    const { result: isPackageInstalledState, shouldDisplayLoadingUI: loading1 } = (0, use_is_package_installed_1.useIsPackageInstalled)({
        appProps,
        errorCallback: appProps.errorCallback,
        // If we can't find the uid, we report it as not installed, so this is valid
        packageUid: node.packagePublicUid || 'nonPackageNode'
    });
    const { shouldDisplayLoadingUI: loading2 } = useHandleImportDesktop({
        selectedTargetId: getState().selectedTargetId,
        isPackageInstalled: isPackageInstalledState,
        hasImportConformation: getState().hasImportConformation,
        ...props,
        onCloseFinal
    });
    React.useEffect(() => {
        // Reset the state when we get a new item to import
        setState({
            selectedTargetId: null,
            progressIds: null,
            hasImportConformation: false,
            onCloseCalled: false
        });
    }, [node.nodeDbId]);
    const classes = useImportDesktopStyles(props);
    // Events
    const onSelectTarget = React.useCallback((0, util_1.evtHandler)((target) => {
        setState({ selectedTargetId: target });
    }, appProps.errorCallback), []);
    // Render
    let content;
    if (loading1 || loading2) {
        content = (React.createElement(React.Fragment, null,
            React.createElement(material_ui_imports_1.DialogTitle, null, loading1 ? 'Checking if package is installed' : 'Importing'),
            React.createElement(material_ui_imports_1.DialogContent, null,
                React.createElement(material_ui_imports_1.LinearProgress, { variant: "indeterminate" }))));
    }
    else if (!(0, util_1.getServerConfig)().offline &&
        isPackageInstalledState === "NOT_INSTALLED" /* PackageInstalled.NOT_INSTALLED */) {
        const uid = node.packagePublicUid;
        if (!uid) {
            throw new Error(`No package uid for nodeDbId ${node.nodeDbId}`);
        }
        const installItems = (0, install_1.getInstallItemsFromRequestedItem)(uid, appProps.packages);
        content = (React.createElement(React.Fragment, null,
            React.createElement(material_ui_imports_1.DialogTitle, null, "Import Project"),
            React.createElement(material_ui_imports_1.DialogContent, null,
                React.createElement(material_ui_imports_1.DialogContentText, { id: util_1.TEST_ID.importInstallMissingDialog }, "The project you have selected is in the cloud. Before you import it, you must download and install the associated SDK. Would you like to install now?")),
            React.createElement(material_ui_imports_1.DialogActions, null,
                React.createElement(install_1.Install, { classes: { buttonText: classes.buttonText }, agentProps: { appProps }, appProps: appProps, installItems: installItems, skipInstallingMessage: skipInstallingMessage, onOpen: () => {
                        onClose();
                        setState({ hasImportConformation: true });
                    }, onClose: (progressIds, packageUids) => {
                        if (!progressIds || !packageUids) {
                            // Install did not complete
                            return onCloseFinal(false);
                        }
                        onInstall(progressIds);
                        // ConfirmImport will wait until install is done (on the waiting mount)
                        // Then it will display a dialog to import (on the display mount)
                        const mountComponentProps = {
                            appProps,
                            node,
                            onClose,
                            progressIds,
                            packageUids,
                            projectName,
                            importType: "Online" /* ImportType.ONLINE */
                        };
                        appProps.mountComponentTemporarily.mountComponentTemporarily((props) => (React.createElement(error_boundary_1.ErrorBoundary, null,
                            React.createElement(ConfirmImport, { ...props, onCloseFinal: onCloseFinal }))), mountComponentProps, mount_component_temporarily_1.MountPoint.WAITING_MOUNT);
                    }, mode: "button" }),
                React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.importInstallMissingCancelButton, className: classes.buttonText, onClick: () => onCloseFinal(false) }, "Cancel"))));
    }
    else if (_.size(importInfo.targets) > 1) {
        content = (React.createElement(SelectTarget, { appProps: appProps, importInfo: importInfo, onCancel: () => onCloseFinal(false), onSelectTarget: onSelectTarget }));
    }
    else {
        content = null;
    }
    return (React.createElement("div", { ...rest, ref: ref }, content));
});
const SelectTarget = (props) => {
    // State
    const [getState, setState] = (0, use_state_1.useState)({
        currentTargetId: null
    });
    // Hooks
    React.useEffect(() => {
        // Reset the state when we get a new item to import
        setState({ currentTargetId: null });
    }, [props.importInfo.location]);
    // Events
    const onChangeTarget = React.useCallback((0, util_1.evtHandler)((value) => {
        const option = props.importInfo.targets.find((item) => item === value) || null;
        setState({ currentTargetId: option });
    }, props.appProps.errorCallback), []);
    const onSelectTarget = React.useCallback((0, util_1.evtHandler)(() => {
        const target = getState().currentTargetId;
        if (!target) {
            return;
        }
        props.onSelectTarget(target);
    }, props.appProps.errorCallback), []);
    // Render
    const { importInfo, onCancel } = props;
    const { currentTargetId } = getState();
    return (React.createElement(React.Fragment, null,
        React.createElement(material_ui_imports_1.DialogTitle, null, "Please select a specific device for the project"),
        React.createElement(material_ui_imports_1.DialogContent, { id: util_1.TEST_ID.importSelectTargetDialog },
            React.createElement(material_ui_imports_1.RadioGroup, { onChange: (_evt, value) => onChangeTarget(value), value: currentTargetId || undefined }, importInfo.targets.map((targetId) => {
                return (React.createElement(material_ui_imports_1.FormControlLabel, { control: React.createElement(material_ui_imports_1.Radio, { id: util_1.TEST_ID.importSelectTargetRadio(targetId) }), label: targetId, value: targetId, key: targetId }));
            }))),
        React.createElement(material_ui_imports_1.DialogActions, null,
            React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.importSelectTargetApply, onClick: onSelectTarget }, "Select"),
            React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.importSelectTargetCancel, onClick: onCancel }, "Cancel"))));
};
const ConfirmImport = (props) => {
    // Hooks
    const { result: progress } = (0, use_local_apis_1.useGetProgress)({
        appProps: props.appProps,
        errorCallback: props.appProps.errorCallback,
        allowNoAgent: true
    });
    const { result: installedPackages } = (0, use_local_apis_1.useGetInstalledPackages)({
        appProps: props.appProps,
        errorCallback: props.appProps.errorCallback,
        allowNoAgent: true
    });
    React.useEffect(() => {
        if (getIsInstallDone()) {
            const error = getError();
            props.appProps.mountComponentTemporarily.mountDialogTemporarily((propsInner) => {
                // Hooks
                const classes = useImportDesktopStyles(propsInner);
                // Render
                return (React.createElement(React.Fragment, null,
                    React.createElement(material_ui_imports_1.DialogTitle, null, "Import"),
                    React.createElement(material_ui_imports_1.DialogContent, null,
                        React.createElement(material_ui_imports_1.DialogContentText, { id: util_1.TEST_ID.importConfirmImportDialog }, error
                            ? `There was an error installing, please resolve before attempting to import again - ${error}`
                            : `Package installation complete, would you like to proceed with importing ${propsInner.node.name}?`)),
                    React.createElement(material_ui_imports_1.DialogActions, null,
                        !error && (React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.importConfrimImportImportButton, className: classes.buttonText, onClick: (0, util_1.evtHandler)(() => {
                                // Close the surounding dialog
                                propsInner.onClose();
                                propsInner.appProps.mountComponentTemporarily.mountDialogTemporarily(exports.Import, props);
                            }, props.appProps.errorCallback) },
                            "Import",
                            React.createElement(ti_icon_imports_1.CCS, { className: classes.iconWithText }))),
                        React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.importConfirmImportCancelButton, className: classes.buttonText, onClick: () => {
                                // Close the surounding dialog
                                propsInner.onClose();
                                // Close the mount this component is attached to
                                if (props.onClose) {
                                    props.onClose();
                                }
                                // Finish - import canceled
                                if (props.onCloseFinal) {
                                    props.onCloseFinal(false);
                                }
                            } }, "Cancel"))));
            }, {
                ...props,
                onClose: () => { }
            });
        }
    }, [getIsInstallDone()]);
    // Render
    return React.createElement("div", null);
    // Helpers
    function getIsInstallDone() {
        const isProgressDone = !!progress &&
            props.progressIds.reduce((accum, item) => {
                return accum && !!progress[item] && progress[item].isComplete;
            }, true);
        const isPackagesInstalled = !!installedPackages &&
            props.packageUids.reduce((accum, packageUid) => {
                return (accum &&
                    !!installedPackages.find((item) => item.packagePublicUid === packageUid));
            }, true);
        return isProgressDone && isPackagesInstalled;
    }
    function getError() {
        if (!progress) {
            throw new Error('progress is null');
        }
        const errorId = props.progressIds.find((id) => {
            return !!progress[id] && !!progress[id].error;
        });
        return !!errorId && progress[errorId].error;
    }
};
function useHandleImportCloud({ appProps, node, projectName, onCloseFinal, importInfo, onPopupEnabledUpdate, licenseAgreed, popupEnabled, selectedTargetId }) {
    React.useEffect((0, util_1.evtHandler)(() => {
        const license = (0, util_1.getPackageLicense)(node, appProps);
        if (((_.size(importInfo.targets) > 1 && !selectedTargetId) ||
            (!licenseAgreed && _.size(license) > 0)) &&
            !(0, util_1.getServerConfig)().offline) {
            return;
        }
        const popupEnabledInner = importProjectCloud(importInfo.location, importInfo.projectType, _.size(importInfo.targets) !== 1 ? selectedTargetId : importInfo.targets[0], projectName);
        if (popupEnabledInner !== popupEnabled) {
            onPopupEnabledUpdate(popupEnabledInner);
        }
        if (popupEnabledInner) {
            recordImport({ appProps, node, agentMode: 'cloud' }).catch((err) => {
                console.error(err);
            });
            if (onCloseFinal) {
                onCloseFinal(true);
            }
        }
    }, appProps.errorCallback), [licenseAgreed, selectedTargetId, importInfo]);
}
function useHandleImportDesktop({ appProps, node, projectName, onCloseFinal, importInfo, importInfoOffline, selectedTargetId, isPackageInstalled, hasImportConformation }) {
    const targetId = _.size(importInfo.targets) === 1 ? importInfo.targets[0] : selectedTargetId;
    const targetIdOffline = _.size(importInfoOffline.targets) === 1 ? importInfoOffline.targets[0] : selectedTargetId;
    const trigger = (!hasImportConformation && _.size(importInfo.targets) < 2) || !!selectedTargetId;
    const isOffline = (0, util_1.getServerConfig)().offline;
    const importProjectResult = (0, use_local_apis_1.useImportProject)({
        appProps,
        errorCallback: appProps.errorCallback,
        resourceType: importInfo.projectType,
        packageUid: node.packagePublicUid,
        location: importInfo.location,
        trigger: trigger && isPackageInstalled === "INSTALLED" /* PackageInstalled.INSTALLED */ && !isOffline,
        targetId,
        projectName
    });
    const importProjectTemplateResult = (0, use_local_apis_1.useImportProjectTemplate)({
        appProps,
        errorCallback: appProps.errorCallback,
        trigger: trigger && isOffline,
        targetId: targetIdOffline,
        projectName,
        templateId: importInfoOffline.templateId,
        toolVersion: importInfoOffline.toolVersion,
        outputTypeId: importInfoOffline.outputTypeId
    });
    const finishedDesktopImport = isOffline
        ? importProjectTemplateResult.result
        : importProjectResult.result;
    React.useEffect(() => {
        if (finishedDesktopImport) {
            recordImport({ appProps, node, agentMode: 'desktop' }).catch((err) => {
                console.error(err);
            });
            if (onCloseFinal) {
                onCloseFinal(true);
            }
        }
    }, [finishedDesktopImport]);
    return isOffline ? importProjectTemplateResult : importProjectResult;
}
function importProjectCloud(location, projectType, targetId, projectName) {
    const prefix = (0, routing_helpers_1.getLinkPrefix)();
    const params = {
        location,
        projectType,
        targetId: targetId || undefined,
        projectName: projectName || undefined
    };
    const queryString = QueryString.stringify(params);
    const dst = `${prefix}/${"api/importProject" /* API.GET_IMPORT_PROJECT */}?${queryString}`;
    const popUpEnabled = window.open(dst, 'default/ide');
    return !!popUpEnabled;
}
async function recordImport({ appProps, node, agentMode }) {
    const nodeExtended = await appProps.apis.getExtendedNodes(node.nodeDbId);
    const pkg = appProps.packages.find((item) => item.packagePublicUid === node.packagePublicUid);
    await (0, analytics_1.handleNodeImport)({ pkg: pkg || null, node, nodeExtended, agentMode, appProps });
}
function useGetOfflineImportInfo(props) {
    const { compiler, deviceIds, templateId, outputTypeId } = props.importType === "Offline" /* ImportType.OFFLINE */
        ? props
        : { deviceIds: null, templateId: null, compiler: null, outputTypeId: null };
    const { result: ccsDeviceDetail, ...rest } = (0, use_local_apis_1.useGetCcsDeviceDetail)({
        appProps: props.appProps,
        deviceId: _.first(deviceIds) || null,
        trigger: props.importType === "Offline" /* ImportType.OFFLINE */,
        allowNoAgent: true,
        errorCallback: props.appProps.errorCallback
    });
    if (ccsDeviceDetail && deviceIds) {
        const importInfo = {
            targets: deviceIds,
            toolVersion: getToolVersion(ccsDeviceDetail),
            templateId,
            outputTypeId
        };
        return { result: importInfo, ...rest };
    }
    else {
        return { result: null, ...rest };
    }
    function getToolVersion(ccsDeviceDetail) {
        const matchingToolVersions = _.filter(ccsDeviceDetail.toolVersions, (toolVersion) => server_interface_1.toolchainToCompiler[(0, server_interface_1.toolVersionToToolchain)(toolVersion.value)] === compiler);
        if (_.isEmpty(matchingToolVersions)) {
            throw new Error('No matching compilers');
        }
        // TODO! For now just select the first toolchain when there are multiple matches -- need
        // to instead select the latest
        const toolVersion = matchingToolVersions[0].value;
        return toolVersion;
    }
}
