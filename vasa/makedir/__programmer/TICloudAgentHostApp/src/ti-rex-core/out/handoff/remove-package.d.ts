import { Log, LoggerManager } from '../utils/logging';
import * as util from './util';
import { PackageManagerAdapter } from './package-manager-adapter';
import { PackageInfo } from './package-helpers';
import { Omit } from '../shared/generic-types';
import { Vars } from '../lib/vars';
interface RemovePackageParams {
    packageInfo: Omit<PackageInfo, 'type' | 'name'>;
    submissionId: string;
    email: string;
}
export declare class RemovePackage {
    private readonly packageManagerAdapter;
    private readonly refreshFn;
    private readonly loggerManager;
    private readonly defaultLog;
    private readonly vars;
    constructor(packageManagerAdapter: PackageManagerAdapter, refreshFn: util.ProcessFn, loggerManager: LoggerManager, defaultLog: Log, vars: Vars);
    removePackage(params: RemovePackageParams): Promise<void>;
    _postProcessingPlaceholderForTesting(): Promise<void>;
}
export {};
