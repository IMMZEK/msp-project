/// <reference types="agent" />
import * as React from 'react';
import { ErrorContextValue } from './context';
import { AppProps } from './util';
import { PackageData } from '../apis/filter-types';
import { AgentMode } from '../../cloudagent/interface';
import { ProjectType } from '../../cloudagent/ccs-adapter';
import { AppPropsInitial } from './entry-point-helpers';
interface UseLocalApisBaseParams {
    appProps: AppProps;
    errorCallback: React.RefObject<ErrorContextValue | null>;
    allowNoAgent?: boolean;
}
type UseGetPackageInstallInfoParams = UseLocalApisBaseParams;
type UseGetInstalledPackagesParams = UseLocalApisBaseParams;
interface UseUpdateOfflineBoardsAndDevices extends Omit<UseLocalApisBaseParams, 'appProps'> {
    appPropsInitial: AppPropsInitial;
    trigger: boolean;
}
interface UseGetOfflineBoardsAndDevicesParams extends Omit<UseLocalApisBaseParams, 'appProps'> {
    appProps: AppPropsInitial;
    trigger: boolean;
}
interface UseGetDevicesParams extends Omit<UseLocalApisBaseParams, 'appProps'> {
    appProps: AppPropsInitial;
    targetFilter: string | null;
    trigger: boolean;
}
interface UseGetDeviceDetailParams extends Omit<UseLocalApisBaseParams, 'appProps'> {
    appProps: AppPropsInitial;
    deviceId: string | null;
    trigger: boolean;
}
interface UseGetAgentModeParams extends Omit<UseLocalApisBaseParams, 'appProps'> {
    appProps: AppProps | null;
}
type UseGetProgressParams = UseLocalApisBaseParams;
type UseGetVersionParams = UseLocalApisBaseParams;
interface UseClearTaskProgressParams extends UseLocalApisBaseParams {
    progressId: string;
    trigger: boolean;
}
interface UseImportProjectParams extends UseLocalApisBaseParams {
    resourceType: ProjectType | null;
    packageUid: string | null;
    location: string | null;
    trigger: boolean;
    targetId: string | null;
    projectName: string | null;
}
interface UseImportProjectTemplateParams extends UseLocalApisBaseParams {
    trigger: boolean;
    templateId: string | null;
    targetId: string | null;
    projectName: string | null;
    toolVersion: string | null;
    outputTypeId: string | null;
}
interface UseInstallPackageParams extends UseLocalApisBaseParams {
    pkg: PackageData | PackageData[] | null;
    installLocation: string | null;
    trigger: boolean;
}
interface UseUninstallPackageParams extends UseLocalApisBaseParams {
    pkg: PackageData;
    trigger: boolean;
}
interface UseOpenExternallyParams extends UseLocalApisBaseParams {
    link: string;
    trigger: boolean;
}
interface UseApiParams<T> extends Omit<UseLocalApisBaseParams, 'appProps'> {
    api: (agent: TICloudAgent.AgentModule) => Promise<T> | null;
    dependencies: React.DependencyList;
    placeholder: T;
}
interface UseApiWithEventParams<T> extends UseApiParams<T> {
    evtHandling: (onResultUpdated: (result: T) => void) => () => void;
}
export declare function useGetPackageInstallInfo(args: UseGetPackageInstallInfoParams): {
    result: string[];
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
} | {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: string[] | null;
    shouldDisplayInitialLoadingUI?: undefined;
    initalLoadingInProgress?: undefined;
};
export declare function useGetInstalledPackages(args: UseGetInstalledPackagesParams): {
    result: import("../../cloudagent/response-data").InstalledPackage[];
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
} | {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../cloudagent/response-data").InstalledPackage[] | null;
    shouldDisplayInitialLoadingUI?: undefined;
    initalLoadingInProgress?: undefined;
};
export declare function useUpdateOfflineBoardsAndDevices(args: UseUpdateOfflineBoardsAndDevices): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: void | null;
} | {
    result: void | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useGetOfflineBoardsAndDevices(args: UseGetOfflineBoardsAndDevicesParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../cloudagent/external-apis").BoardDeviceInfo | null;
} | {
    result: import("../../cloudagent/external-apis").BoardDeviceInfo | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useGetCcsDevices(args: UseGetDevicesParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../cloudagent/ccs-theia-request").CCSDevicesInfo | null;
} | {
    result: import("../../cloudagent/ccs-theia-request").CCSDevicesInfo | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useGetCcsDeviceDetail(args: UseGetDeviceDetailParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: import("../../cloudagent/ccs-theia-request").CCSDeviceDetail | null;
} | {
    result: import("../../cloudagent/ccs-theia-request").CCSDeviceDetail | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useGetAgentMode(args: UseGetAgentModeParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: AgentMode | null;
} | {
    result: AgentMode | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useGetProgress(args: UseGetProgressParams): {
    result: {
        [x: string]: import("../../cloudagent/progress-manager").Progress;
    };
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
} | {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: {
        [x: string]: import("../../cloudagent/progress-manager").Progress;
    } | null;
    shouldDisplayInitialLoadingUI?: undefined;
    initalLoadingInProgress?: undefined;
};
export declare function useGetVersion(args: UseGetVersionParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: string | null;
} | {
    result: string;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useClearTaskProgress(args: UseClearTaskProgressParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: boolean | null;
} | {
    result: boolean;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useImportProject(args: UseImportProjectParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: boolean | null;
} | {
    result: boolean;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useImportProjectTemplate(args: UseImportProjectTemplateParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: boolean | null;
} | {
    result: boolean | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useInstallPackage(args: UseInstallPackageParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: string[] | null;
} | {
    result: string[] | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useUninstallPackage(args: UseUninstallPackageParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: string | null;
} | {
    result: string | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
export declare function useOpenExternally(args: UseOpenExternallyParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: boolean | null;
} | {
    result: boolean | null;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
declare function useApi<T>(args: UseApiParams<T>): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: T | null;
} | {
    result: T;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
};
declare function useApiWithEvent<T>(args: UseApiWithEventParams<T>): {
    result: T;
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
} | {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: T | null;
    shouldDisplayInitialLoadingUI?: undefined;
    initalLoadingInProgress?: undefined;
};
export declare const _useApi: typeof useApi;
export declare const _useApiWithEvent: typeof useApiWithEvent;
export {};
