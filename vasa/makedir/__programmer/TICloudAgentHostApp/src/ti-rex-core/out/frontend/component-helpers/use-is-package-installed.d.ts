import * as React from 'react';
import { ErrorContextValue } from './context';
import { AppProps } from './util';
interface UseIsPackageInstalledParams {
    appProps: AppProps;
    errorCallback: React.RefObject<ErrorContextValue | null>;
    packageUid: string;
    allowNoAgent?: boolean;
}
export declare const enum PackageInstalled {
    NOT_INSTALLED = "NOT_INSTALLED",
    INSTALLED = "INSTALLED"
}
export declare function useIsPackageInstalled(args: UseIsPackageInstalledParams): {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
    result: null;
} | {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    shouldDisplayInitialLoadingUI?: undefined;
    initalLoadingInProgress?: undefined;
    result: null;
} | {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitialLoadingUI: boolean;
    initalLoadingInProgress: boolean;
    result: PackageInstalled;
} | {
    shouldDisplayLoadingUI: boolean;
    shouldDisplayInitalLoadingUI: boolean;
    initalLoadInProgress: boolean;
    shouldDisplayInitialLoadingUI?: undefined;
    initalLoadingInProgress?: undefined;
    result: PackageInstalled;
};
export {};
