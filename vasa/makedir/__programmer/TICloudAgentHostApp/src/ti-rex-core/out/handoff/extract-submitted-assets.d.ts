/// <reference types="node" />
import * as fs from 'fs-extra';
import { Log } from '../utils/logging';
import * as util from './util';
/**
 * Process the submission items. This includes extracting, verification, downloading,
 * and moving items into the download / extract folders
 */
export declare function extractSubmittedAssets(assetUploads: util.AssetUpload[], uploadedEntry: util.UploadedEntry, downloadFolder: string, extractFolder: string, installOut: fs.WriteStream | null, log: Log): Promise<{
    allAssets: {
        asset: string;
        platform: string;
    }[];
    topLevelItems: string[];
}>;
