import * as sinon from 'sinon';
import { ProgressManager } from './progress-manager';
import { CCSAdapter } from './ccs-adapter';
import { EntryModuleDesktop } from './entry-module-inner-desktop';
import { Metadata } from '../test/integration-tests/database-utils';
import { OfflineMetadataManager } from './offline-metadata-manager';
interface CreateProgressManagerParams {
    triggerEventSpy?: sinon.SinonSpy;
}
interface CreateCCSAdapterParams {
    metadata?: Metadata;
    onIDERequest?: (pathname: string, params: Record<string, string>) => any;
    triggerEventSpy?: sinon.SinonSpy;
}
interface GetModuleParams {
    metadata?: Metadata;
    triggerEventSpy?: sinon.SinonSpy;
}
export declare function calledWithExactlyDeep(spy: sinon.SinonSpy, args: any[]): void;
export declare function waitForCall(stub: sinon.SinonStub): Promise<unknown>;
export declare function waitForCallWithArgs(stub: sinon.SinonStub, matchingArg: any): Promise<unknown>;
export declare function createProgressManager({ triggerEventSpy }: CreateProgressManagerParams): Promise<ProgressManager>;
export declare function createCCSAdapter({ metadata, triggerEventSpy, onIDERequest }: CreateCCSAdapterParams): Promise<{
    ccsAdapter: CCSAdapter;
    progressManager: ProgressManager;
    offlineMetadataManager: OfflineMetadataManager;
    commonParams: import("./util").CommonParams;
}>;
/**
 * Get the tirex cloud agent module with the given metadata and an optional spy on events
 *
 */
export declare function getModule(args: GetModuleParams): Promise<EntryModuleDesktop>;
export {};
