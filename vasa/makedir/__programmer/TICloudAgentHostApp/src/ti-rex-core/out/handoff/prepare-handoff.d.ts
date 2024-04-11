/// <reference types="node" />
import * as fs from 'fs-extra';
import { Log } from '../utils/logging';
import * as util from './util';
import { PackageManagerAdapter } from './package-manager-adapter';
interface PrepareHandoffParamsBase {
    uploadedEntry: util.UploadedEntry;
    contentFolder: string;
    assetUploads: util.AssetUpload[];
    log: Log;
}
interface PrepareHandoffParamsInstaller extends PrepareHandoffParamsBase {
    installOut: fs.WriteStream | null;
    packageManagerAdapter: PackageManagerAdapter;
    submissionType: util.SubmissionType.INSTALLER;
    skipVerifyInstallerInSync?: boolean;
}
interface PrepareHandoffParamsZip extends PrepareHandoffParamsBase {
    submissionType: util.SubmissionType.ZIP;
}
type PrepareHandoffParams = PrepareHandoffParamsInstaller | PrepareHandoffParamsZip;
/**
 * Retrieve the submission and do any fs operations to prepare its data.
 */
export declare function prepareHandoff(args: PrepareHandoffParams): Promise<{
    zips: string[];
    packageFolders: string[];
    nonPackageFolders: string[];
    downloadFolder: string;
    extractFolder: string;
    handoffChecklistValid: boolean;
}>;
export declare function getExtractedItems(topLevelItems: string[], extractFolder: string): Promise<{
    packageFolders: string[];
    nonPackageFolders: string[];
}>;
export {};
