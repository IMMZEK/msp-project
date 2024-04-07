"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModulesFromModuleGroup = exports.ConfirmInstall = void 0;
// 3rd party
const _ = require("lodash");
const classnames_1 = require("classnames");
const React = require("react");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
const material_ui_styles_imports_1 = require("../imports/material-ui-styles-imports");
const util_1 = require("../component-helpers/util");
const Versioning = require("../../lib/versioning");
const response_data_1 = require("../../shared/routes/response-data");
const use_state_1 = require("../component-helpers/use-state");
// our components
const index_1 = require("./drop-down-list/index");
const styles_1 = require("../component-helpers/styles");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const INSTALL_ITEM_TEXT = {
    ["mandatory" /* InstallItemType.MANDATORY */]: 'yes',
    ["main" /* InstallItemType.MAIN */]: 'requested package',
    ["optional" /* InstallItemType.OPTIONAL */]: 'optional',
    ["module" /* InstallItemType.MODULE */]: 'optional',
    ["moduleGroup" /* InstallItemType.MODULE_GROUP */]: 'optional',
    ["selectedModuleGroup" /* InstallItemType.SELECTED_MODULE_GROUP */]: 'yes',
    ["na" /* InstallItemType.NA */]: ''
};
const useConfirmInstallStyles = (0, material_ui_styles_imports_1.makeStyles)((theme) => {
    const { noFlex, horizontalFlexContainer } = (0, styles_1.stylesCommon)(theme);
    return {
        root: {},
        downloadSizeContainer: { marginLeft: theme.spacing(2) },
        footerContainer: { ...horizontalFlexContainer, margin: theme.spacing(1) },
        footerItem: { ...noFlex },
        messageContainer: { margin: theme.spacing(1) },
        modulesContainer: { marginBottom: theme.spacing(2), marginLeft: theme.spacing(2) },
        tableCellPackageName: {
            width: '400px'
        }
    };
});
exports.ConfirmInstall = React.forwardRef((props, ref) => {
    const { appProps, installedPackages, installLocations, installItems, onSelectionUpdate, classes: _classes, className, ...rest } = props;
    if (_.isEmpty(installLocations)) {
        throw new Error('No install locations');
    }
    // State
    const [getState, setState] = (0, use_state_1.useState)({
        selection: getInitialSelection(),
        installLocation: installLocations[0]
    });
    // Hooks
    const classes = useConfirmInstallStyles(props);
    React.useEffect(() => {
        onSelectionUpdate(getSelectedUids(), getState().installLocation);
    }, [...getSelectedUids(true), getState().installLocation]);
    // Render
    const moduleDependenciesNoSelected = getState()
        .selection.filter((item) => item.installPackageData.installItemType === "moduleGroup" /* InstallItemType.MODULE_GROUP */)
        .sort(sortByPackageName);
    const moduleDependenciesSelected = getState()
        .selection.filter((item) => item.installPackageData.installItemType ===
        "selectedModuleGroup" /* InstallItemType.SELECTED_MODULE_GROUP */)
        .sort(sortByPackageName);
    const packageDependencies = getState()
        .selection.filter((item) => item.installPackageData.installItemType !== "moduleGroup" /* InstallItemType.MODULE_GROUP */ &&
        item.installPackageData.installItemType !==
            "selectedModuleGroup" /* InstallItemType.SELECTED_MODULE_GROUP */ &&
        item.installPackageData.installItemType !== "main" /* InstallItemType.MAIN */)
        .sort(sortByPackageName);
    const renderInstallRow = (selectionData, type) => {
        const installData = selectionData.installPackageData;
        const { nameOrId, version } = getInstallDataPresentationInfo(installData);
        return type === 'dependency' ? (React.createElement(ConfirmInstallRow, { appProps: appProps, installedPackages: props.installedPackages, selectionData: selectionData, onChange: (installData, value) => {
                setState({
                    selection: getUpdatedSelection(installData, value)
                });
            }, apis: appProps.apis, key: `${nameOrId}__${version}` })) : (React.createElement(ConfirmInstallRowModuleGroup, { appProps: appProps, installedPackages: props.installedPackages, selectionData: selectionData, onChange: (installData, value) => {
                const selectedModuleGroup = _.first(moduleDependenciesSelected);
                if (installData.installItemType === "moduleGroup" /* InstallItemType.MODULE_GROUP */ &&
                    value &&
                    selectedModuleGroup &&
                    selectedModuleGroup.selected) {
                    const selectedModuleGroup = _.first(moduleDependenciesSelected);
                    const selection = getUpdatedSelection(installData, value);
                    const selectionNoSelectedModuleGroup = selection.filter((item) => item.installPackageData.installItemType !==
                        "selectedModuleGroup" /* InstallItemType.SELECTED_MODULE_GROUP */);
                    setState({
                        selection: selectedModuleGroup
                            ? [
                                ...selectionNoSelectedModuleGroup,
                                { ...selectedModuleGroup, selected: false }
                            ]
                            : selectionNoSelectedModuleGroup
                    });
                }
                else {
                    setState({
                        selection: getUpdatedSelection(installData, value)
                    });
                }
            }, apis: appProps.apis, key: `${nameOrId}__${version}` }));
    };
    const uniqInstallItems = _.uniqBy(_.flatten(getState()
        .selection.filter((item) => item.selected)
        .map((item) => {
        if (item.installPackageData.installItemType ===
            "moduleGroup" /* InstallItemType.MODULE_GROUP */ &&
            item.installPackageData.origin === "Remote" /* PackageOrigin.REMOTE */) {
            const pkgData = item.installPackageData.data;
            const moduleGroup = pkgData.moduleGroup;
            if (!moduleGroup) {
                throw new Error(`${pkgData.packagePublicId} ${pkgData.packageVersion} not a module group`);
            }
            const modules = getModulesFromModuleGroup(moduleGroup, appProps.packages, props.installedPackages);
            return modules;
        }
        else {
            return [item.installPackageData];
        }
    })), (item) => `${item.data.packagePublicId}__${item.origin !== "NotFound" /* PackageOrigin.NOT_FOUND */
        ? item.data.packageVersion
        : item.data.versionRange}`);
    const installSize = _.sum(uniqInstallItems.map((item) => {
        return item.origin === "Remote" /* PackageOrigin.REMOTE */
            ? (item.data.installSize && item.data.installSize[(0, util_1.getPlatform)()]) || 0
            : 0;
    }));
    return (React.createElement("div", { className: (0, classnames_1.default)(classes.root, className), ...rest, ref: ref },
        [...moduleDependenciesSelected, ...moduleDependenciesNoSelected].length > 0 && (React.createElement(React.Fragment, null,
            React.createElement(material_ui_imports_1.Typography, { variant: "h6", component: "div" }, "Select Installation Options"))),
        moduleDependenciesSelected.length > 0 && (React.createElement("div", { className: classes.modulesContainer },
            React.createElement(material_ui_imports_1.Typography, { variant: "subtitle1", component: "div" }, "full install"),
            React.createElement(material_ui_imports_1.Table, null,
                React.createElement(material_ui_imports_1.TableBody, null, moduleDependenciesSelected.map((selectionData) => {
                    return renderInstallRow(selectionData, 'moduleGroup');
                }))))),
        moduleDependenciesNoSelected.length > 0 && (React.createElement("div", { className: classes.modulesContainer },
            React.createElement(material_ui_imports_1.Typography, { variant: "subtitle1", component: "div" },
                moduleDependenciesSelected.length > 0 ? 'or' : '',
                " custom install"),
            React.createElement(material_ui_imports_1.Table, null,
                React.createElement(material_ui_imports_1.TableBody, null, moduleDependenciesNoSelected.map((selectionData) => {
                    return renderInstallRow(selectionData, 'moduleGroup');
                }))))),
        packageDependencies.length > 0 && (React.createElement(React.Fragment, null,
            React.createElement(material_ui_imports_1.Typography, { variant: "h6", component: "div" }, "Select Dependencies"),
            React.createElement(material_ui_imports_1.Table, null,
                React.createElement(material_ui_imports_1.TableBody, null, packageDependencies.map((selectionData) => {
                    return renderInstallRow(selectionData, 'dependency');
                }))))),
        React.createElement("div", { className: classes.footerContainer },
            React.createElement(index_1.DropDownList, { className: classes.footerItem, name: "Install Location", items: installLocations.map((location, idx) => {
                    return {
                        label: location,
                        id: idx.toString(),
                        elementType: "NonNested" /* DropDownType.NON_NESTED */,
                        onClick: () => {
                            setState({ installLocation: location });
                        },
                        listItemProps: {
                            id: util_1.TEST_ID.installLocationDropdownElementsMenuItem(idx.toString())
                        }
                    };
                }), headerButtonProps: { id: util_1.TEST_ID.installLocationContextMenuButton } }),
            React.createElement(material_ui_imports_1.Typography, { className: classes.footerItem }, getState().installLocation),
            React.createElement(material_ui_imports_1.Typography, { className: (0, classnames_1.default)(classes.footerItem, classes.downloadSizeContainer), variant: "subtitle2" },
                "Total download size ",
                (0, util_1.humanFileSize)(installSize))),
        getFooterText()));
    function getInitialSelection() {
        const fullSelection = props.installItems.map((item) => {
            const { packagePublicId, versionRange, installItemType } = item;
            // Assume installed packages is version sorted
            const localPkg = props.installedPackages.find((installedPkg) => installedPkg.packagePublicId === packagePublicId &&
                Versioning.satisfies(installedPkg.packageVersion, versionRange));
            if (localPkg) {
                const result = {
                    origin: "Local" /* PackageOrigin.LOCAL */,
                    data: localPkg,
                    installItemType
                };
                return { result, support: "unknown" /* PlatformSupport.UNKNOWN */ };
            }
            // Assume packages is version sorted
            const remotePackage = props.appProps.packages.find((pkg) => pkg.packagePublicId === packagePublicId &&
                Versioning.satisfies(pkg.packageVersion, versionRange));
            if (remotePackage) {
                const result = {
                    origin: "Remote" /* PackageOrigin.REMOTE */,
                    data: remotePackage,
                    installItemType
                };
                return {
                    result,
                    support: remotePackage.downloadUrl[(0, util_1.getPlatform)()]
                        ? "supported" /* PlatformSupport.SUPPORTED */
                        : "notSupported" /* PlatformSupport.NOT_SUPPORTED */
                };
            }
            // Nothing satisfies the dependency
            const result = {
                origin: "NotFound" /* PackageOrigin.NOT_FOUND */,
                data: item,
                installItemType
            };
            return { result, support: "unknown" /* PlatformSupport.UNKNOWN */ };
        });
        return fullSelection.map((item) => ({
            installPackageData: item.result,
            selected: item.support !== "notSupported" /* PlatformSupport.NOT_SUPPORTED */ &&
                item.result.installItemType !== "moduleGroup" /* InstallItemType.MODULE_GROUP */,
            support: item.support
        }));
    }
    /**
     * Get the updated value of getState().selection after changeing the selected value of installPackageDataOuter to value
     *
     */
    function getUpdatedSelection(installPackageDataOuter, value) {
        return getState().selection.map(({ installPackageData, selected, ...rest }) => {
            if (installPackageData.origin === "NotFound" /* PackageOrigin.NOT_FOUND */) {
                return installPackageDataOuter.origin === "NotFound" /* PackageOrigin.NOT_FOUND */ &&
                    installPackageData.data.packagePublicId ===
                        installPackageDataOuter.data.packagePublicId &&
                    installPackageData.data.versionRange ===
                        installPackageDataOuter.data.versionRange
                    ? {
                        ...rest,
                        installPackageData,
                        selected: value
                    }
                    : {
                        ...rest,
                        installPackageData,
                        selected
                    };
            }
            else {
                return installPackageDataOuter.origin !== "NotFound" /* PackageOrigin.NOT_FOUND */ &&
                    installPackageData.data.packagePublicUid ===
                        installPackageDataOuter.data.packagePublicUid
                    ? {
                        ...rest,
                        installPackageData,
                        selected: value
                    }
                    : {
                        ...rest,
                        installPackageData,
                        selected
                    };
            }
        });
    }
    function getSelectedUids(keepPlaceholders = false) {
        const uids = getState().selection.map((item) => {
            if (!item.selected || item.installPackageData.origin !== "Remote" /* PackageOrigin.REMOTE */) {
                return '';
            }
            return item.installPackageData.data.packagePublicUid;
        });
        return keepPlaceholders ? uids : uids.filter((item) => !!item);
    }
    function getFooterText() {
        const uids = getSelectedUids();
        if (_.isEmpty(uids)) {
            return (React.createElement("div", null,
                React.createElement(material_ui_imports_1.Typography, { color: "error", className: classes.messageContainer }, "You must select at least one package to install")));
        }
        else {
            const message = (0, util_1.getPlatform)() === response_data_1.Platform.MACOS
                ? 'Additonal install locations can be specified in CCStudio (Code Composer Studio -> Preferences -> Code Composer Studio -> Products)'
                : 'Additonal install locations can be specified in CCStudio (Window -> Preferences -> Code Composer Studio -> Products)';
            return (React.createElement("div", null,
                React.createElement(material_ui_imports_1.Typography, { className: classes.messageContainer }, message)));
        }
    }
});
function ConfirmInstallRow(props) {
    const { selectionData, onChange, apis, className, classes: _classes, ...rest } = props;
    const support = selectionData.support;
    const { description } = getRowDescription(selectionData);
    // Hooks
    const classes = useConfirmInstallStyles(props);
    // Render
    const installData = selectionData.installPackageData;
    const { nameOrId, version } = getInstallDataPresentationInfo(installData);
    const isDisabled = installData.origin !== "Remote" /* PackageOrigin.REMOTE */ || support === "notSupported" /* PlatformSupport.NOT_SUPPORTED */;
    const installSize = installData.origin === "Remote" /* PackageOrigin.REMOTE */ &&
        installData.data.installSize &&
        installData.data.installSize[(0, util_1.getPlatform)()];
    return (React.createElement(material_ui_imports_1.TableRow, { className: (0, classnames_1.default)(classes.root, className), ...rest },
        React.createElement(material_ui_imports_1.TableCell, { padding: "checkbox" },
            React.createElement(material_ui_imports_1.Checkbox, { checked: isDisabled
                    ? installData.origin === "Local" /* PackageOrigin.LOCAL */
                    : selectionData.selected, inputProps: {
                    id: util_1.TEST_ID.installSelectCheckbox(installData.data.packagePublicId, version)
                }, onChange: (_evt, value) => {
                    onChange(installData, value);
                }, ...(isDisabled ? { disabled: true } : {}) })),
        React.createElement(material_ui_imports_1.TableCell, { className: classes.tableCellPackageName }, nameOrId),
        React.createElement(material_ui_imports_1.TableCell, null, version),
        React.createElement(material_ui_imports_1.TableCell, null, installSize ? (0, util_1.humanFileSize)(installSize) : ''),
        React.createElement(material_ui_imports_1.TableCell, { id: util_1.TEST_ID.installDescriptionText(installData.data.packagePublicId, version) }, description)));
}
function ConfirmInstallRowModuleGroup(props) {
    const { selectionData: selectionDataInitial, onChange, apis, classes: _classes, className, ...rest } = props;
    const { isDisabled, installSize, installData, isInstalled } = getModuleGroupInfo(selectionDataInitial);
    const selectionData = { ...selectionDataInitial, installPackageData: installData };
    if (isDisabled && !isInstalled) {
        selectionData.support = "notSupported" /* PlatformSupport.NOT_SUPPORTED */;
    }
    else if (isDisabled) {
        selectionData.support = "unknown" /* PlatformSupport.UNKNOWN */;
    }
    else {
        selectionData.support = "supported" /* PlatformSupport.SUPPORTED */;
    }
    const { description, extraInfo: descriptionExtraInfo } = getRowDescription(selectionData);
    // Hooks
    const classes = useConfirmInstallStyles(props);
    // Render
    const { nameOrId, version } = getInstallDataPresentationInfo(installData);
    return (React.createElement(material_ui_imports_1.TableRow, { className: (0, classnames_1.default)(classes.root, className), ...rest },
        React.createElement(material_ui_imports_1.TableCell, { padding: "checkbox" },
            React.createElement(material_ui_imports_1.Checkbox, { checked: isDisabled ? isInstalled : selectionData.selected, inputProps: {
                    id: util_1.TEST_ID.installSelectCheckbox(installData.data.packagePublicId, version)
                }, onChange: (_evt, value) => {
                    onChange(installData, value);
                }, ...(isDisabled ? { disabled: true } : {}) })),
        React.createElement(material_ui_imports_1.TableCell, { className: classes.tableCellPackageName }, nameOrId),
        React.createElement(material_ui_imports_1.TableCell, null, installSize ? (0, util_1.humanFileSize)(installSize) : ''),
        React.createElement(material_ui_imports_1.TableCell, { id: util_1.TEST_ID.installDescriptionText(installData.data.packagePublicId, version) }, descriptionExtraInfo && description)));
    function getModuleGroupInfo(selectionData) {
        const installData = selectionData.installPackageData;
        if (installData.origin !== "Remote" /* PackageOrigin.REMOTE */) {
            const { isDisabled, installSize } = getInfoFromInstallData(installData);
            return {
                isDisabled,
                installSize,
                installData,
                isInstalled: installData.origin === "Local" /* PackageOrigin.LOCAL */
            };
        }
        else {
            const pkgData = installData.data;
            const moduleGroup = pkgData.moduleGroup;
            if (!moduleGroup) {
                throw new Error(`${pkgData.packagePublicId} ${pkgData.packageVersion} not a module group`);
            }
            const modules = getModulesFromModuleGroup(moduleGroup, props.appProps.packages, props.installedPackages);
            const modulesInfo = modules.map((installData) => {
                const { isDisabled, installSize } = getInfoFromInstallData(installData);
                return {
                    isDisabled,
                    installSize,
                    installData,
                    isInstalled: installData.origin === "Local" /* PackageOrigin.LOCAL */
                };
            });
            const accum = {
                isDisabled: true,
                installSize: 0,
                installData,
                isInstalled: true
            };
            const moduleGroupInfo = modulesInfo.reduce((accum, moduleInfo) => {
                return {
                    isDisabled: accum.isDisabled && moduleInfo.isDisabled,
                    installSize: (accum.installSize || 0) +
                        (moduleInfo.isInstalled ? 0 : moduleInfo.installSize || 0),
                    installData: accum.installData,
                    isInstalled: accum.isInstalled && moduleInfo.isInstalled
                };
            }, accum);
            return moduleGroupInfo;
        }
    }
    function getInfoFromInstallData(installData) {
        const isDisabled = installData.origin !== "Remote" /* PackageOrigin.REMOTE */ ||
            !installData.data.downloadUrl[(0, util_1.getPlatform)()];
        const installSize = installData.origin === "Remote" /* PackageOrigin.REMOTE */ &&
            installData.data.installSize &&
            installData.data.installSize[(0, util_1.getPlatform)()];
        return { isDisabled, installSize };
    }
}
function getRowDescription(selectionData) {
    let description = INSTALL_ITEM_TEXT[selectionData.installPackageData.installItemType];
    let extraInfo = false;
    if (selectionData.installPackageData.origin === "NotFound" /* PackageOrigin.NOT_FOUND */) {
        description = (description ? `${description}` : '') + ' (error: package unavailable)';
        extraInfo = true;
    }
    else if (selectionData.installPackageData.origin === "Local" /* PackageOrigin.LOCAL */) {
        description =
            (description ? `${description}` : '') +
                ` (package already installed at ${selectionData.installPackageData.data.localPackagePath})`;
        extraInfo = true;
    }
    else if (selectionData.support === "notSupported" /* PlatformSupport.NOT_SUPPORTED */) {
        description =
            (description ? `${description}` : '') + ' (package not supported on current platform)';
        extraInfo = true;
    }
    return { description: _.capitalize(description), extraInfo };
}
function sortByPackageName(item1, item2) {
    const { nameOrId: name1 } = getInstallDataPresentationInfo(item1.installPackageData);
    const { nameOrId: name2 } = getInstallDataPresentationInfo(item2.installPackageData);
    if (name1 < name2) {
        return -1;
    }
    else if (name1 > name2) {
        return 1;
    }
    else {
        return 0;
    }
}
function getInstallDataPresentationInfo(installData) {
    const nameOrId = installData.origin === "NotFound" /* PackageOrigin.NOT_FOUND */
        ? installData.data.packagePublicId
        : installData.data.name;
    const version = installData.origin === "NotFound" /* PackageOrigin.NOT_FOUND */
        ? installData.data.versionRange
        : installData.data.packageVersion;
    return { nameOrId, version };
}
function getModulesFromModuleGroup(moduleGroup, allPackages, installedPackages) {
    const corePackage = allPackages.find((item) => item.packagePublicId === moduleGroup.corePackage.packageId &&
        Versioning.satisfies(item.packageVersion, moduleGroup.corePackage.versionRange));
    if (!corePackage) {
        throw new Error(`Missing corePackage ${moduleGroup.corePackage.packageId} ${moduleGroup.corePackage.versionRange}`);
    }
    const modules = corePackage.modules;
    return moduleGroup.packages
        .map((item) => {
        const moduleInfo = [
            {
                packagePublicId: corePackage.packagePublicId,
                versionRange: corePackage.packageVersion
            },
            ...modules
        ].find((moduleItem) => moduleItem.packagePublicId === item);
        if (!moduleInfo) {
            throw new Error(`Module not found ${item} in corePackage ${corePackage.packagePublicId} ${corePackage.packageVersion}`);
        }
        return moduleInfo;
    })
        .map((moduleInfo) => {
        // Check if local
        const localPkg = installedPackages.find((installedPkg) => installedPkg.packagePublicId === moduleInfo.packagePublicId &&
            Versioning.satisfies(installedPkg.packageVersion, moduleInfo.versionRange));
        if (localPkg) {
            const result = {
                origin: "Local" /* PackageOrigin.LOCAL */,
                data: localPkg,
                installItemType: "module" /* InstallItemType.MODULE */
            };
            return result;
        }
        // Check if remote
        const remotePackage = allPackages.find((pkg) => pkg.packagePublicId === moduleInfo.packagePublicId &&
            Versioning.satisfies(pkg.packageVersion, moduleInfo.versionRange));
        if (!remotePackage) {
            throw new Error(`Cannot find module ${moduleInfo.packagePublicId} ${moduleInfo.versionRange} in corePackage ${corePackage.packagePublicId} ${corePackage.packageVersion}`);
        }
        const result = {
            origin: "Remote" /* PackageOrigin.REMOTE */,
            data: remotePackage,
            installItemType: "module" /* InstallItemType.MODULE */
        };
        return result;
    });
}
exports.getModulesFromModuleGroup = getModulesFromModuleGroup;
