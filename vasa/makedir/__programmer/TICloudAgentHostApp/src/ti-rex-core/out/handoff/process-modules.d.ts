import { Log } from '../utils/logging';
import * as util from './util';
import { PackageManagerAdapter } from './package-manager-adapter';
export interface SubmittedItem {
    downloadFolder: string;
    extractFolder: string;
    packageFolders: string[];
    nonPackageFolders: string[];
    zips: string[];
    uploadedEntry: util.UploadedEntry;
    handoffChecklistValid: boolean | null;
}
export declare function processModules(submittedItems: SubmittedItem[], packageManagerAdapter: PackageManagerAdapter, contentFolder: string, zipsFolder: string, log: Log): Promise<SubmittedItem[]>;
