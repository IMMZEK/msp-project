import * as React from 'react';
import { AppProps, CommonProps, UseStylesClasses } from '../component-helpers/util';
import { PackageData } from '../apis/filter-types';
import { WithCloudAgentProps } from './with-cloud-agent';
import { InstallItem } from './confirm-install';
export interface InstallProps extends WithCloudAgentProps, CommonProps {
    appProps: AppProps;
    installItems: InstallItem[];
    onOpen: () => void;
    onClose: (progressIds: string[] | null, packageUids: string[] | null) => void;
    mode: 'button' | 'listItem';
    skipInstallingMessage?: boolean;
    modifyInstall?: boolean;
    classes?: UseStylesClasses<typeof useInstallStyles>;
}
declare const useInstallStyles: (props?: any) => import("@material-ui/styles").ClassNameMap<"root" | "button" | "buttonText" | "iconWithText">;
export declare const Install: (props: import("../../shared/generic-types").Omit<Pick<InstallProps, "key" | "id" | "mode" | "onClose" | "style" | "agent" | "appProps" | "className" | "classes" | "onOpen" | "isLoading" | "hasTooltip" | "installItems" | "skipInstallingMessage" | "modifyInstall"> & React.RefAttributes<any>, keyof WithCloudAgentProps> & {
    agentProps: import("./with-cloud-agent").CloudAgentOnlyProps;
}) => JSX.Element;
export declare function getInstallItemsFromRequestedItem(packagePublicUid: string, packages: PackageData[]): InstallItem[];
export {};
