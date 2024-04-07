import * as Sqldb from '../lib/dbSession';
import { Platform } from '../shared/routes/response-data';
import { Vars } from '../lib/vars';
import { Logger } from '../utils/logging';
export declare class CustomDownloadManager {
    private readonly vars;
    private readonly logger;
    private readonly outputCombindationZips;
    private readonly extractedContentFolder;
    private readonly tempDir;
    private pendingCustomDownloads;
    private pendingCustomDownloadStatus;
    constructor(vars: Vars, logger: Logger);
    getCustomDownload(zipFilePrefix: string, packages: Sqldb.PackageRecord[], platform: Platform, urlPrefix: string): Promise<{
        requestToken: string;
        downloadUrl: string;
    } | {
        requestToken: string;
        downloadUrl: null;
    }>;
    getCustomDownloadStatus(requestToken: string): {
        downloadUrl: string | null;
    } | null;
    private createZip;
}
