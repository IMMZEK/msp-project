/// <reference types="node" />
/// <reference types="node" />
import * as fs from 'fs-extra';
import { Log } from '../utils/logging';
import { Omit } from '../shared/generic-types';
import { InputProgress } from '../cloudagent/progress-manager';
import { RefreshRequestEntry } from '../lib/dbBuilder/dbBuilder';
import { PlatformAttribute } from '../lib/dbBuilder/dbTypes';
export declare enum Platform {
    WINDOWS = "win",
    LINUX = "linux",
    OSX = "macos",
    ALL = "all",
    MODULE_GROUP = "moduleGroup"
}
export interface AssetUpload {
    path: string;
    originalname: string;
}
export type RefreshRequest = 'add' | 'remove' | 'nothing';
export declare const enum SubmissionType {
    ZIP = "zip",
    INSTALLER = "installer"
}
interface UploadedBaseEntry {
    email: string;
    localAssets?: {
        [platform: string]: string;
    };
    assets?: {
        [platfrom: string]: string;
    };
    handoffChecklist?: HandoffChecklistType;
}
export interface InstallCommand {
    [platform: string]: string;
}
export interface UploadedInstallerEntry extends UploadedBaseEntry {
    submissionType: SubmissionType.INSTALLER;
    installCommand: InstallCommand;
    submittedPackage: {
        id: string;
        version: string;
    };
}
export interface UploadedZipEntry extends UploadedBaseEntry {
    submissionType: SubmissionType.ZIP;
}
export type UploadedEntry = UploadedInstallerEntry | UploadedZipEntry;
export type ProcessFn = (refreshInput: RefreshRequestEntry[], refreshLog: Log) => Promise<boolean>;
export interface HandoffChecklist {
}
export type HandoffChecklistType = HandoffChecklist;
export declare const enum PackageEntryState {
    STAGED = "staged",
    VALID = "valid"
}
export interface PackageEntryBase {
    id: string;
    version: string;
    content: string[];
    zips: string[];
    submissionId: string;
    email: string;
    showEntry: boolean;
}
export interface PackageEntryStaged extends PackageEntryBase {
    state: PackageEntryState.STAGED;
    backupContent: string[];
    backupZips: string[];
    backupFolder: string;
    backupEntry: Omit<PackageEntryBase, 'id' | 'version' | 'content' | 'zips'>;
}
export interface PackageEntryValid extends PackageEntryBase {
    state: PackageEntryState.VALID;
}
export type PackageEntry = PackageEntryStaged | PackageEntryValid;
/**
 * Gets the file from the provided url.
 *
 * @param url - The url to download the zip from.
 * @param dst - the destination folder.
 * @param onProgressUpdate
 *
 * @returns {Promise} fileName
 */
export declare function downloadFile(url: string, dst: string, onProgressUpdate: (progress: InputProgress) => void): Promise<string>;
/**
 * Extract the zip at the given location.
 *
 * @param zip - The file name of the zip to extract.
 * @param dst - the destination folder.
 * @param onProgressUpdate
 *
 *  @returns {Promise} topLevelItems - where topLevelItems is the
 *  files / folders located at the root of the zip.
 */
export declare function extract(zip: string, dst: string, onProgressUpdate: (progress: InputProgress) => void): Promise<string[]>;
export declare function install(installCommand: string, workingDirectory: string, installDir: string, onProgressUpdate: (progress: InputProgress) => void, out?: fs.WriteStream): Promise<string[]>;
/**
 * Prepare the message for the email.
 *
 * @param message - A log message.
 *
 * @returns formatedMessage - The formatted result.
 *
 */
export declare function transformLogMessage(message: Buffer): string;
/**
 * Ignore any errors caused by calling the promise.
 *
 * @param promiseFn
 *
 * @returns {Promise} result - or null if there was an error
 */
export declare function ignoreError<T>(promiseFn: () => Promise<T>): Promise<T | null>;
/**
 * Take err1 and err2 and return the one with the higher precedence.
 * Non graceful errors get highest precedence, err1 takes higher precedence than err2.
 *
 * @param err1
 * @param err2
 *
 * @returns combinedError
 */
export declare function getCombinedError(err1: Error | null, err2: Error | null): Error | null;
export declare function sendEmail(email: string, subjectPostfix: string, message: string, log: Log | null, action: 'add' | 'remove', attachments?: object[]): Promise<void>;
export declare function logMessage(logMethod: (message: string, tags: string[]) => void, message: string): void;
export declare function getRefreshParams(items: {
    entry: PackageEntry;
    request: RefreshRequest;
}[], allEntires: PackageEntry[], contentFolder: string, zipsFolder: string): Promise<RefreshRequestEntry[]>;
export declare function getInstallCommand(entry: PackageEntry, contentFolder: string): Promise<PlatformAttribute | null>;
export declare function getEntryWithModules(entry: PackageEntry, contentFolder: string): Promise<(PackageEntry & {
    modulePrefix: string | null;
})[]>;
export declare function getAssetsPath(entry: PackageEntry): PlatformAttribute;
export declare function prepareLogFile(parentFolder: string, fileName: string): Promise<{
    logOut: fs.WriteStream;
    logFile: string;
}>;
export {};
