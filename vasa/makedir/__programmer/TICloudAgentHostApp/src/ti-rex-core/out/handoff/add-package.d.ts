/// <reference types="node" />
import * as fs from 'fs-extra';
import { Vars } from '../lib/vars';
import { Log, LoggerManager } from '../utils/logging';
import * as util from './util';
import { PackageManagerAdapter } from './package-manager-adapter';
import { OnSubmissionDone } from './handoff-logs';
import { SubmittedItem } from './process-modules';
interface PreAddPackageParams {
    entries: util.UploadedEntry[];
    submissionId: string;
    assetUploads: util.AssetUpload[];
    handoffQueued: () => boolean;
}
interface AddPackageParams {
    serverHost: string | null;
    submittedItems: SubmittedItem[];
    onSubmissionDone: OnSubmissionDone;
    refreshOut: fs.WriteStream;
    refreshLog: Log;
    installLogFiles: string[];
    email: string;
    log: Log;
    submissionId: string;
}
interface RollbackPackagesParams {
    entries: util.PackageEntry[];
    log: Log;
    processingCompletedWithoutFatalError: boolean;
}
export declare class AddPackage {
    private readonly packageManagerAdapter;
    private readonly refreshFn;
    private readonly loggerManager;
    private readonly defaultLog;
    private readonly vars;
    constructor(packageManagerAdapter: PackageManagerAdapter, refreshFn: util.ProcessFn, loggerManager: LoggerManager, defaultLog: Log, vars: Vars);
    preAddPackage(params: PreAddPackageParams): Promise<{
        submittedItems: SubmittedItem[];
        onSubmissionDone: OnSubmissionDone;
        refreshOut: fs.WriteStream;
        refreshLog: Log;
        installLogFiles: string[];
        email: string;
        log: Log;
    }>;
    addPackage(params: AddPackageParams): Promise<void>;
    _rollbackPackages(params: RollbackPackagesParams): Promise<void>;
    _postProcessingPlaceholderForTesting(): Promise<void>;
    private notifySubmissionCompletedForAdditonalTesting;
    private stagePackages;
    private refreshPackages;
    private savePackages;
    private getSubmission;
    private stagePackageInner;
    private sendProcessingStartedEmail;
}
export {};
