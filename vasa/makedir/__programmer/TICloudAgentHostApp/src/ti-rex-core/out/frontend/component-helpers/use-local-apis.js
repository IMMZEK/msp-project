"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports._useApiWithEvent = exports._useApi = exports.useOpenExternally = exports.useUninstallPackage = exports.useInstallPackage = exports.useImportProjectTemplate = exports.useImportProject = exports.useClearTaskProgress = exports.useGetVersion = exports.useGetProgress = exports.useGetAgentMode = exports.useGetCcsDeviceDetail = exports.useGetCcsDevices = exports.useGetOfflineBoardsAndDevices = exports.useUpdateOfflineBoardsAndDevices = exports.useGetInstalledPackages = exports.useGetPackageInstallInfo = void 0;
// 3rd party
const React = require("react");
// our modules
const use_async_operation_1 = require("./use-async-operation");
const use_state_1 = require("./use-state");
const util_1 = require("./util");
const errors_1 = require("../../shared/errors");
const use_cloud_agent_1 = require("./use-cloud-agent");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function useGetPackageInstallInfo(args) {
    const { appProps } = args;
    return useApiWithEvent({
        ...args,
        api: (agent) => {
            return appProps.localApis.getPackageInstallInfo(agent);
        },
        dependencies: [],
        evtHandling: (onResultUpdated) => {
            // Listen for updates
            const listener = (installInfo) => {
                onResultUpdated(installInfo);
            };
            appProps.localApis.onInstallInfoUpdated(listener);
            return () => {
                appProps.localApis.removeListener("OnInstallInfoUpdated" /* ModuleEvents.ON_INSTALL_INFO_UPDATED */, listener);
            };
        },
        placeholder: []
    });
}
exports.useGetPackageInstallInfo = useGetPackageInstallInfo;
function useGetInstalledPackages(args) {
    const { appProps } = args;
    return useApiWithEvent({
        ...args,
        api: (agent) => appProps.localApis.getInstalledPackages(agent),
        dependencies: [],
        evtHandling: (onResultUpdated) => {
            // Listen for updates
            const listener = (installedPackages) => {
                onResultUpdated(installedPackages);
            };
            appProps.localApis.onInstalledPackagesUpdated(listener);
            return () => {
                appProps.localApis.removeListener("OnInstalledPackagesUpdated" /* ModuleEvents.ON_INSTALLED_PACKAGES_UPDATED */, listener);
            };
        },
        placeholder: []
    });
}
exports.useGetInstalledPackages = useGetInstalledPackages;
function useUpdateOfflineBoardsAndDevices(args) {
    const { appPropsInitial: appProps, trigger } = args;
    return useApi({
        ...args,
        allowNoAgent: true,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            if (appProps) {
                return appProps.localApis.updateOfflineBoardsAndDevices(agent);
            }
            else {
                return null;
            }
        },
        dependencies: [],
        placeholder: null
    });
}
exports.useUpdateOfflineBoardsAndDevices = useUpdateOfflineBoardsAndDevices;
function useGetOfflineBoardsAndDevices(args) {
    const { appProps, trigger } = args;
    return useApi({
        ...args,
        allowNoAgent: true,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            if (appProps) {
                return appProps.localApis.getOfflineBoardsAndDevices(agent);
            }
            else {
                return null;
            }
        },
        dependencies: [!!appProps],
        placeholder: {
            boards: [],
            devices: []
        }
    });
}
exports.useGetOfflineBoardsAndDevices = useGetOfflineBoardsAndDevices;
function useGetCcsDevices(args) {
    const { appProps, targetFilter, trigger } = args;
    return useApi({
        ...args,
        allowNoAgent: true,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            if (appProps) {
                return appProps.localApis.getCcsDevices(agent, targetFilter);
            }
            else {
                return null;
            }
        },
        dependencies: [!!appProps, targetFilter],
        placeholder: {
            devices: [],
            targetFilters: []
        }
    });
}
exports.useGetCcsDevices = useGetCcsDevices;
function useGetCcsDeviceDetail(args) {
    const { appProps, deviceId, trigger } = args;
    return useApi({
        ...args,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            else if (!deviceId) {
                throw new Error('Missing input param');
            }
            return appProps.localApis.getCcsDeviceDetail(agent, deviceId);
        },
        dependencies: [deviceId],
        placeholder: null
    });
}
exports.useGetCcsDeviceDetail = useGetCcsDeviceDetail;
function useGetAgentMode(args) {
    const { appProps } = args;
    return useApi({
        ...args,
        api: (agent) => {
            if (appProps) {
                return appProps.localApis.getAgentMode(agent);
            }
            else {
                return null;
            }
        },
        dependencies: [!!appProps],
        placeholder: (0, util_1.fallbackIsDesktop)() ? 'desktop' : 'cloud'
    });
}
exports.useGetAgentMode = useGetAgentMode;
function useGetProgress(args) {
    const { appProps } = args;
    return useApiWithEvent({
        ...args,
        api: (agent) => appProps.localApis.getProgress(agent),
        dependencies: [],
        evtHandling: (onResultUpdated) => {
            // Listen for updates
            const listener = (progress) => {
                onResultUpdated(progress);
            };
            appProps.localApis.onProgressUpdated(listener);
            return () => {
                appProps.localApis.removeListener("OnProgressUpdated" /* ModuleEvents.ON_PROGRESS_UPDATED */, listener);
            };
        },
        placeholder: {}
    });
}
exports.useGetProgress = useGetProgress;
function useGetVersion(args) {
    const { appProps } = args;
    return useApi({
        ...args,
        api: (agent) => appProps.localApis.getVersion(agent),
        dependencies: [],
        placeholder: ''
    });
}
exports.useGetVersion = useGetVersion;
function useClearTaskProgress(args) {
    const { appProps, progressId, trigger } = args;
    return useApi({
        ...args,
        allowNoAgent: false,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            return appProps.localApis.clearTaskProgress(agent, progressId).then(() => true);
        },
        dependencies: [progressId, trigger],
        placeholder: false
    });
}
exports.useClearTaskProgress = useClearTaskProgress;
function useImportProject(args) {
    const { appProps, resourceType, packageUid, location, trigger, targetId, projectName } = args;
    return useApi({
        ...args,
        allowNoAgent: false,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            else if (!resourceType || !packageUid || !location) {
                throw new Error('Missing input param');
            }
            return appProps.localApis
                .importProject(agent, resourceType, packageUid, location, targetId, projectName)
                .then(() => true);
        },
        dependencies: [packageUid, resourceType, location, trigger, targetId, projectName],
        placeholder: false
    });
}
exports.useImportProject = useImportProject;
function useImportProjectTemplate(args) {
    const { appProps, trigger, targetId, templateId, projectName, toolVersion, outputTypeId } = args;
    return useApi({
        ...args,
        allowNoAgent: false,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            else if (!targetId || !templateId || !projectName || !toolVersion || !outputTypeId) {
                throw new Error('Missing input param');
            }
            return appProps.localApis
                .importProjectTemplate(agent, templateId, targetId, projectName, toolVersion, outputTypeId)
                .then(() => true);
        },
        dependencies: [trigger, targetId, templateId, projectName, toolVersion, outputTypeId],
        placeholder: null
    });
}
exports.useImportProjectTemplate = useImportProjectTemplate;
function useInstallPackage(args) {
    const { appProps, pkg, installLocation, trigger } = args;
    let packages = null;
    if (pkg) {
        packages = Array.isArray(pkg) ? pkg : [pkg];
    }
    return useApi({
        ...args,
        allowNoAgent: false,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            else if (!packages || !installLocation) {
                throw new Error('Missing input param');
            }
            return Promise.all(packages.map((pkg) => appProps.localApis.installPackage(agent, pkg, installLocation)));
        },
        dependencies: [
            packages && packages.map((item) => item.packagePublicUid).join(','),
            installLocation,
            trigger
        ],
        placeholder: null
    });
}
exports.useInstallPackage = useInstallPackage;
function useUninstallPackage(args) {
    const { appProps, pkg, trigger } = args;
    return useApi({
        ...args,
        allowNoAgent: false,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            else if (!pkg) {
                throw new Error('Missing input param');
            }
            return appProps.localApis.uninstallPackage(agent, pkg);
        },
        dependencies: [pkg.packagePublicUid, trigger],
        placeholder: null
    });
}
exports.useUninstallPackage = useUninstallPackage;
function useOpenExternally(args) {
    const { appProps, link, trigger } = args;
    return useApi({
        ...args,
        allowNoAgent: false,
        api: (agent) => {
            if (!trigger) {
                return null;
            }
            else if (!link) {
                throw new Error('Missing input param');
            }
            return appProps.localApis.openExternally(agent, link);
        },
        dependencies: [link, trigger],
        placeholder: null
    });
}
exports.useOpenExternally = useOpenExternally;
// Helpers
function useApi(args) {
    const { errorCallback, allowNoAgent, api, dependencies, placeholder } = args;
    const agent = useAgentModule({ errorCallback });
    const result = (0, use_async_operation_1.useAsyncOperation)({
        operation: async () => {
            if (!agent || typeof agent === 'string') {
                return null;
            }
            return api(agent);
        },
        dependencies: [agent, ...dependencies],
        errorCallback
    });
    if (typeof agent === 'string') {
        if (!allowNoAgent) {
            throw new errors_1.CloudAgentError(agent);
        }
        return {
            result: placeholder,
            shouldDisplayLoadingUI: false,
            shouldDisplayInitialLoadingUI: false,
            initalLoadingInProgress: false
        };
    }
    return result;
}
function useApiWithEvent(args) {
    const { errorCallback, allowNoAgent, api, evtHandling, dependencies, placeholder } = args;
    const [getState, setState] = (0, use_state_1.useState)({ result: null });
    const agent = useAgentModule({ errorCallback });
    const { result: resultInitial, ...rest } = (0, use_async_operation_1.useAsyncOperation)({
        operation: async () => {
            if (!agent || typeof agent === 'string') {
                return null;
            }
            return api(agent);
        },
        dependencies: [agent, ...dependencies],
        errorCallback
    });
    React.useEffect(() => {
        if (!agent || typeof agent === 'string') {
            return;
        }
        return evtHandling((result) => setState({ result }));
    }, [agent]);
    React.useEffect(() => setState({ result: resultInitial }), [resultInitial]);
    const { result } = getState();
    if (typeof agent === 'string') {
        if (!allowNoAgent) {
            throw new errors_1.CloudAgentError(agent);
        }
        return {
            result: placeholder,
            shouldDisplayLoadingUI: false,
            shouldDisplayInitialLoadingUI: false,
            initalLoadingInProgress: false
        };
    }
    return { result, ...rest };
}
let logErrors = true;
function useAgentModule(args) {
    const { errorCallback } = args;
    const { result: agentState } = (0, use_cloud_agent_1.useCloudAgent)({
        dependencies: [],
        errorCallback
    });
    if (!agentState || !agentState.agent) {
        if (agentState &&
            !agentState.agent &&
            agentState.cloudAgentInitState !== "NotInitialized" /* CloudAgentInitState.NOT_INITIALIZED */) {
            if (agentState.cloudAgentInitErrors && logErrors) {
                logErrors = false; // avoid repeated logging
                agentState.cloudAgentInitErrors.map((err) => console.error(err));
            }
            return 'Could not get agent, make sure to check if the agent is installed before calling this component';
        }
        return null;
    }
    return agentState.agent;
}
// For test purposes only
exports._useApi = useApi;
exports._useApiWithEvent = useApiWithEvent;
