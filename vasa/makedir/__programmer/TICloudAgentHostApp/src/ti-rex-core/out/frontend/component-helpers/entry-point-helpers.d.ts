/**
 * For components which are entry points to a page.
 * They accept appProps with the data that can be optained without going to the server (i.e urlQuery)
 * and the id of the selected node in the url (if there is any)
 *
 * Handles retriving the remaining fields for appProps from the server.
 */
/// <reference types="react" />
import { Filter, FilterData, PackageData, PackageGroupData } from '../apis/filter-types';
import { Nodes } from '../../shared/routes/response-data';
import { AppProps } from '../component-helpers/util';
import { Omit } from '../../shared/generic-types';
import _ from 'lodash';
import { ErrorContextValue } from './context';
interface AppPropsDerivedState {
    filter: Filter;
    filterOptions: FilterData.Options;
    packages: PackageData[];
    packageGroups: PackageGroupData[];
    selectedNode: Nodes.Node | null;
    selectedNodeExtended: Nodes.NodeExtended | null;
}
export type AppPropsInitial = Omit<AppProps, 'filter' | 'filterOptions' | 'packages' | 'packageGroups' | 'selectedNode' | 'selectedNodeExtended'>;
export interface OfflineDevice {
    rexDevicePublicId: string;
    rexName: string;
    ccsDevices: {
        id: string;
        name: string;
        filterKey?: string;
        coreName: string | undefined;
    }[];
}
export interface OfflineBoard {
    supportedDevices: string[];
    name: string;
    devices: string[];
    publicId: string;
}
export interface OfflineBoardsAndDevices {
    availableBoards: OfflineBoard[];
    availableDevices: {
        [publicId: string]: OfflineDevice;
    };
}
interface CcsDeviceCore {
    coreName: string | undefined;
    id: string;
    name: string;
    filterKey?: string | undefined;
}
/**
 * Get the final appProps, using appPropsInitial and the derived state from appPropsInitial
 *
 */
export declare function getAppProps(appProps: AppPropsInitial, state: AppPropsDerivedState): AppProps;
/**
 * Get all the derived state which is included in appProps, using appPropsInitial.
 *
 */
export declare function getAppState(appPropsInitial: AppPropsInitial, offlineDevices: OfflineBoardsAndDevices | null): Promise<AppPropsDerivedState | null>;
export declare function useAvailableOfflineBoardsAndDevices(args: {
    appPropsInitial: AppPropsInitial;
    trigger: boolean;
    errorCallback: React.RefObject<ErrorContextValue | null>;
}): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    result: {
        availableBoards: {
            supportedDevices: string[];
            publicId: string;
            name: string;
            devices: string[];
            featureSupport: string[];
        }[];
        availableDevices: _.Dictionary<{
            rexDevicePublicId: string;
            rexName: string;
            ccsDevices: CcsDeviceCore[];
        }>;
    } | null;
};
export {};
