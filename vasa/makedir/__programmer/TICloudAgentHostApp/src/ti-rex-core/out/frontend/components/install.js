"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstallItemsFromRequestedItem = exports.Install = void 0;
// 3rd party
const _ = require("lodash");
const classnames_1 = require("classnames");
const React = require("react");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
const mdi_material_ui_imports_1 = require("../imports/mdi-material-ui-imports");
const material_ui_styles_imports_1 = require("../imports/material-ui-styles-imports");
// our modules
const util_1 = require("../component-helpers/util");
const use_state_1 = require("../component-helpers/use-state");
const use_local_apis_1 = require("../component-helpers/use-local-apis");
const analytics_1 = require("../component-helpers/analytics");
const Versioning = require("../../lib/versioning");
const util_2 = require("../../shared/util");
// our components
const license_1 = require("./license");
const styles_1 = require("../component-helpers/styles");
const with_cloud_agent_1 = require("./with-cloud-agent");
const loading_1 = require("./loading");
const confirm_install_1 = require("./confirm-install");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const TITLE_MAP = {
    [0 /* InstallStep.CONFIRM_INSTALL */]: (pkg) => `Installing ${pkg}`,
    [1 /* InstallStep.LICENSE */]: () => 'Licenses',
    [2 /* InstallStep.INSTALL_PACKAGE */]: () => 'Installing Packages'
};
const NUM_STEPS = Object.keys(TITLE_MAP).length;
const useInstallStyles = (0, material_ui_styles_imports_1.makeStyles)((theme) => {
    const {} = (0, styles_1.stylesCommon)(theme);
    return {
        root: {},
        button: {
            fontWeight: 400,
            textTransform: 'none'
        },
        buttonText: {
            color: theme.palette.text.primary
        },
        iconWithText: {
            marginLeft: theme.spacing(1),
            verticalAlign: 'middle'
        }
    };
});
const _Install = (props, ref) => {
    // Hooks
    const classes = useInstallStyles(props);
    // Events
    const onClick = (0, util_1.evtHandler)((evt) => {
        evt.preventDefault();
        onOpen();
        appProps.mountComponentTemporarily.mountDialogTemporarily(InstallInner, props, {
            dialogProps: {
                id: util_1.TEST_ID.installDialog
            }
        });
    }, props.appProps.errorCallback);
    const onClickDoNothing = (0, util_1.evtHandler)(() => {
        // Event should be handled by withCloudAgent.
        // Currently withCloudAgent does not capture clicks until it knows if cloud agent has an issue.
        // So if we click before that info is loaded nothing will respond to the click.
        console.log('Recieved an install request but doing nothing...');
    }, props.appProps.errorCallback);
    // Render
    const { appProps, installItems, mode, hasTooltip, onOpen, onClose: _onClose, classes: _classes, skipInstallingMessage, modifyInstall, className, ...rest } = props;
    const actionText = modifyInstall ? 'Modify Install' : 'Download and Install';
    const button = (onClick) => (React.createElement(material_ui_imports_1.Button, { id: modifyInstall ? util_1.TEST_ID.installModifyButton : util_1.TEST_ID.installButton, onClick: onClick, className: classes.button, classes: {
            label: classes.buttonText
        } },
        actionText,
        React.createElement(mdi_material_ui_imports_1.DownloadIcon, { className: classes.iconWithText })));
    let content = null;
    const onClickFinal = props.hasTooltip ? onClickDoNothing : onClick;
    content =
        props.mode === 'button' ? (button(onClickFinal)) : (React.createElement(material_ui_imports_1.ListItem, { id: modifyInstall
                ? util_1.TEST_ID.nodeContextMenuInstallModify
                : util_1.TEST_ID.nodeContextMenuInstall, onClick: onClickFinal },
            React.createElement(material_ui_imports_1.ListItemText, { primary: actionText, primaryTypographyProps: { noWrap: true } }, actionText)));
    return (React.createElement("div", { className: (0, classnames_1.default)(classes.root, className), ...rest, ref: ref }, content));
};
exports.Install = (0, with_cloud_agent_1.withCloudAgent)({})(React.forwardRef(_Install));
const InstallInner = (props) => {
    // State
    const [getState, setState] = (0, use_state_1.useState)({
        activeStep: 0,
        selectedPackages: null,
        installLocation: null,
        install: null,
        closeWithProgressIds: false
    });
    const { activeStep } = getState();
    const isLastStep = activeStep === NUM_STEPS - 1;
    // Hooks
    React.useEffect(() => {
        setState({
            activeStep: 0,
            selectedPackages: null,
            installLocation: null,
            install: null,
            closeWithProgressIds: false
        });
    }, [
        props.installItems.map((item) => `${item.packagePublicId}__${item.versionRange}`).join(',')
    ]);
    const { result: installedPackages, shouldDisplayLoadingUI: showLoading1 } = (0, use_local_apis_1.useGetInstalledPackages)({
        appProps: props.appProps,
        errorCallback: props.appProps.errorCallback
    });
    const { result: installLocations, shouldDisplayLoadingUI: showLoading2 } = useGetInstallLocations({
        appProps: props.appProps
    });
    const { result: desktopVersion, shouldDisplayLoadingUI: showLoading3 } = (0, use_local_apis_1.useGetVersion)({
        appProps: props.appProps,
        errorCallback: props.appProps.errorCallback
    });
    const { result: agentMode } = (0, use_local_apis_1.useGetAgentMode)({
        appProps: props.appProps,
        errorCallback: props.appProps.errorCallback
    });
    React.useEffect(() => {
        if (!installedPackages) {
            return;
        }
        const { selectedPackages, installLocation, activeStep } = getState();
        if (selectedPackages && installLocation && activeStep === 2 /* InstallStep.INSTALL_PACKAGE */) {
            // Fetch the package data for the selectedPackages, then setState to kick off the install
            const packages = _.uniqBy(_.flatten(selectedPackages.map((packageUid) => {
                const pkg = props.appProps.packages.find((item) => item.packagePublicUid === packageUid);
                if (!pkg) {
                    throw new Error(`Package ${packageUid} does not exist on remoteserver`);
                }
                if (pkg.moduleGroup) {
                    const modules = (0, confirm_install_1.getModulesFromModuleGroup)(pkg.moduleGroup, props.appProps.packages, installedPackages);
                    return modules
                        .filter((item) => item.origin === "Remote" /* PackageOrigin.REMOTE */)
                        .map((item) => item.data);
                }
                else {
                    return [pkg];
                }
            })), (item) => item.packagePublicUid);
            if (_.isEmpty(packages)) {
                throw new Error('No packages selected for install');
            }
            setState({ install: packages });
            // Remember last install location
            localStorage.setItem("LastInstallLocation" /* LocalStorageKey.LAST_INSTALL_LOCATION */, installLocation);
        }
    }, [getState().activeStep === 2 /* InstallStep.INSTALL_PACKAGE */, !!installedPackages]);
    React.useEffect(() => {
        // Record the install
        if (!agentMode) {
            return;
        }
        const { selectedPackages, activeStep } = getState();
        if (selectedPackages && activeStep === 2 /* InstallStep.INSTALL_PACKAGE */) {
            const packages = selectedPackages.map((packageUid) => {
                const pkg = props.appProps.packages.find((item) => item.packagePublicUid === packageUid);
                if (!pkg) {
                    throw new Error(`Package ${packageUid} does not exist on remoteserver`);
                }
                return pkg;
            });
            if (_.isEmpty(packages)) {
                throw new Error('No packages selected for install');
            }
            packages.map((pkg) => {
                (0, analytics_1.handlePackageInstall)({ pkg, agentMode }).catch((err) => {
                    console.error(err);
                });
            });
        }
    }, [getState().activeStep === 2 /* InstallStep.INSTALL_PACKAGE */, agentMode]);
    const { result: progressIds
    // TODO - consider adding a linear progress at top while install ongoing
    // shouldDisplayLoadingUI: showLoading3
     } = (0, use_local_apis_1.useInstallPackage)({
        appProps: props.appProps,
        pkg: getState().install,
        installLocation: getState().installLocation,
        trigger: !_.isEmpty(getState().install),
        errorCallback: props.appProps.errorCallback
    });
    React.useEffect(() => {
        const { install } = getState();
        if (isLastStep &&
            progressIds &&
            (getState().closeWithProgressIds || props.skipInstallingMessage)) {
            props.onClose(progressIds, install && install.map((item) => item.packagePublicUid));
        }
    }, [isLastStep, progressIds && progressIds.join(','), getState().closeWithProgressIds]);
    // Render
    const isLoading = !installedPackages || !installLocations || !desktopVersion;
    let contentInner = React.createElement("div", null);
    if (showLoading1 || showLoading2 || showLoading3) {
        contentInner = loadingContent();
    }
    else if (isLoading) {
        contentInner = React.createElement("div", null);
    }
    else if (shouldRequireUpdate()) {
        contentInner = requireUpdateToInstall();
    }
    else if (activeStep === 0 /* InstallStep.CONFIRM_INSTALL */) {
        contentInner = confirmInstallContent();
    }
    else if (activeStep === 1 /* InstallStep.LICENSE */) {
        contentInner = licenseContent();
    }
    else {
        contentInner = installPackageContent();
    }
    const shouldBlockNext = blockNext();
    const showNext = (!isLoading && activeStep === 0 /* InstallStep.CONFIRM_INSTALL */) || isLastStep;
    const mainInstallItem = props.installItems.find((item) => item.installItemType === "main" /* InstallItemType.MAIN */);
    const mainInstallItemData = mainInstallItem &&
        props.appProps.packages.find((pkg) => pkg.packagePublicId === mainInstallItem.packagePublicId &&
            Versioning.satisfies(pkg.packageVersion, mainInstallItem.versionRange));
    let nextStep = 'Next';
    if (isLastStep) {
        nextStep = 'Ok';
    }
    else if (activeStep === 0 /* InstallStep.CONFIRM_INSTALL */) {
        nextStep = 'Install';
    }
    return (React.createElement(React.Fragment, null,
        React.createElement(material_ui_imports_1.DialogTitle, null,
            React.createElement(React.Fragment, null,
                isLoading
                    ? 'Loading'
                    : TITLE_MAP[activeStep](mainInstallItemData
                        ? `${mainInstallItemData.name} ${mainInstallItemData.packageVersion}`
                        : ''),
                activeStep === 0 /* InstallStep.CONFIRM_INSTALL */ ? (React.createElement(material_ui_imports_1.Typography, { variant: "subtitle2", component: "div" }, "Powered by SDK Composer")) : null)),
        React.createElement(material_ui_imports_1.DialogContent, null, contentInner),
        React.createElement(material_ui_imports_1.DialogActions, null,
            showNext && !shouldBlockNext && (React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.installNextButton, onClick: () => {
                    if (!shouldBlockNext && !isLastStep) {
                        setState({ activeStep: activeStep + 1 });
                    }
                    else if (!shouldBlockNext) {
                        setState({ closeWithProgressIds: true });
                    }
                } }, nextStep)),
            !isLastStep && (React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.installCancelButton, onClick: () => {
                    props.onClose(null, null);
                } }, "Cancel")))));
    // Steps
    function loadingContent() {
        return React.createElement(loading_1.Loading, null);
    }
    function requireUpdateToInstall() {
        return (React.createElement(material_ui_imports_1.DialogContentText, null,
            "Installing this package requires a newer version of Resource Explorer. Please update to CCS 12.2 or later. Alternatively if you are using CCS 11.0 or later, follow the instructions",
            ' ',
            React.createElement("a", { href: "http://software-dl.ti.com/ccs/esd/documents/update_to_tirex_v4_11_0.html" }, "here"),
            "."));
    }
    function confirmInstallContent() {
        if (!installedPackages) {
            throw new Error('installedPackages null');
        }
        else if (!installLocations) {
            throw new Error('installInfo null');
        }
        return (React.createElement(confirm_install_1.ConfirmInstall, { appProps: props.appProps, installedPackages: installedPackages, installLocations: installLocations, onSelectionUpdate: (uids, installLocation) => {
                setState({ selectedPackages: uids, installLocation });
            }, installItems: props.installItems }));
    }
    function licenseContent() {
        const { selectedPackages } = getState();
        if (!selectedPackages) {
            throw new Error('No selected packages');
        }
        const license = _.chain(props.appProps.packages)
            .filter((pkg) => _.includes(selectedPackages, pkg.packagePublicUid))
            .map((pkg) => pkg.licenses || [])
            .flatten()
            .value();
        if (_.isEmpty(license)) {
            // use setImmediate so that we don't call the setState directly in the render cycle
            setImmediate(() => {
                setState({ activeStep: activeStep + 1 });
            });
            return React.createElement("div", null);
        }
        return (React.createElement(license_1.License, { onAgree: () => {
                setState({ activeStep: activeStep + 1 });
            }, onDisagree: () => {
                props.onClose(null, null);
            }, license: license }));
    }
    function installPackageContent() {
        return (React.createElement(material_ui_imports_1.DialogContentText, { id: util_1.TEST_ID.installConfirmationDialog }, props.skipInstallingMessage && activeStep === 2 /* InstallStep.INSTALL_PACKAGE */
            ? ''
            : 'Your package(s) will be installed in the background. Progress can be viewed using the task view, accessible from the toolbar.'));
    }
    // Helpers
    function blockNext() {
        if (activeStep === 0 /* InstallStep.CONFIRM_INSTALL */) {
            const { selectedPackages } = getState();
            return _.isEmpty(selectedPackages);
        }
        else {
            return false;
        }
    }
    function shouldRequireUpdate() {
        if (!desktopVersion) {
            throw new Error('desktopVersion null');
        }
        if (Versioning.satisfies(desktopVersion, '^4.11.0')) {
            return false;
        }
        const componentItem = props.installItems.find((item) => {
            const { packagePublicId, versionRange } = item;
            const remotePackage = props.appProps.packages.find((pkg) => pkg.packagePublicId === packagePublicId &&
                Versioning.satisfies(pkg.packageVersion, versionRange));
            return (remotePackage &&
                (!_.isEmpty(remotePackage.moduleOf) || !_.isEmpty(remotePackage.modules)));
        });
        return !!componentItem;
    }
};
function getInstallItemsFromRequestedItem(packagePublicUid, packages) {
    const pkgInput = packages.find((item) => item.packagePublicUid === packagePublicUid);
    if (!pkgInput) {
        throw new Error(`Cannot find packageUid ${packagePublicUid}`);
    }
    // Resolve modules
    let pkg;
    const moduleOf = pkgInput.moduleOf;
    if (moduleOf) {
        pkg =
            packages.find((item) => item.packagePublicId === moduleOf.packageId &&
                Versioning.satisfies(item.packageVersion, moduleOf.versionRange)) || null;
        if (!pkg) {
            throw new Error(`Cannot find ${JSON.stringify(moduleOf)} for ${packagePublicUid}`);
        }
    }
    else {
        pkg = pkgInput;
    }
    const { moduleGroups, dependencies } = pkg;
    const installItems = [
        {
            packagePublicId: pkg.packagePublicId,
            versionRange: pkg.packageVersion,
            installItemType: "main" /* InstallItemType.MAIN */
        },
        ...moduleGroups.map((item) => {
            const moduleGroupPkg = packages.find((pkg) => pkg.packagePublicId === item.packagePublicId &&
                Versioning.satisfies(pkg.packageVersion, item.versionRange));
            return {
                packagePublicId: item.packagePublicId,
                versionRange: item.versionRange,
                installItemType: moduleGroupPkg &&
                    moduleGroupPkg.moduleGroup &&
                    moduleGroupPkg.moduleGroup.defaultModuleGroup
                    ? "selectedModuleGroup" /* InstallItemType.SELECTED_MODULE_GROUP */
                    : "moduleGroup" /* InstallItemType.MODULE_GROUP */
            };
        }),
        ...dependencies.map((item) => {
            let installItemType = "na" /* InstallItemType.NA */;
            switch (item.dependencyType) {
                case "mandatory" /* PackageDependencyType.MANDATORY */:
                    installItemType = "mandatory" /* InstallItemType.MANDATORY */;
                    break;
                case "optional" /* PackageDependencyType.OPTIONAL */:
                    installItemType = "optional" /* InstallItemType.OPTIONAL */;
                    break;
                default:
                    (0, util_2.assertNever)(item.dependencyType);
                    if ((0, util_1.isBrowserEnvironment)()) {
                        console.warn(`Unknown query item ${item.dependencyType} skipping...`);
                    }
            }
            return {
                packagePublicId: item.packagePublicId,
                versionRange: item.versionRange,
                installItemType
            };
        })
    ];
    return installItems;
}
exports.getInstallItemsFromRequestedItem = getInstallItemsFromRequestedItem;
function useGetInstallLocations({ appProps }) {
    const { result: installLocations, ...rest } = (0, use_local_apis_1.useGetPackageInstallInfo)({
        appProps,
        errorCallback: appProps.errorCallback
    });
    const defaultLocation = localStorage.getItem("LastInstallLocation" /* LocalStorageKey.LAST_INSTALL_LOCATION */) || '';
    if (!installLocations) {
        return { result: installLocations, ...rest };
    }
    // Put the default at the top of installLocations, if it existed in installLocations
    const sortedLocations = [defaultLocation, ..._.without(installLocations, defaultLocation)];
    return {
        result: sortedLocations.length === installLocations.length ? sortedLocations : installLocations,
        ...rest
    };
}
