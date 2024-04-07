import { AppProps } from './util';
interface UrlOptions {
    chapter?: string;
}
interface FilterOptions {
    device?: string;
    devtool?: string;
}
export interface LiveActionOptions {
    throwError?: boolean;
}
export type NodeJumpOptions = LiveActionOptions & UrlOptions;
export type BuIdJumpOptions = LiveActionOptions & UrlOptions & FilterOptions;
export declare function jumpToNode(appProps: AppProps, publicId: string, options?: NodeJumpOptions): void;
export declare function jumpToNodeInCurrentPackage(appProps: AppProps, nodePublicId: string, options?: NodeJumpOptions): void;
export declare function jumpToNodeOnGlobalId(appProps: AppProps, globalId: string, options?: BuIdJumpOptions): Promise<void>;
export declare function jumpToNodeOnLocalId(appProps: AppProps, localId: string, packageId?: string, packageVersion?: string, options?: BuIdJumpOptions): Promise<void>;
export declare function importProject(appProps: AppProps, publicId: string): Promise<void>;
export declare function importProjectInCurrentPackage(appProps: AppProps, nodePublicId: string): Promise<void>;
export {};
