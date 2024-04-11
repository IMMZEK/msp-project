"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomDownloadManager = void 0;
// 3rd party
const path = require("path");
const fs = require("fs-extra");
const XXH = require("xxhashjs");
const path_helpers_1 = require("../shared/path-helpers");
const src_1 = require("../3rd_party/merge-dirs/src");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class CustomDownloadManager {
    vars;
    logger;
    outputCombindationZips;
    extractedContentFolder;
    tempDir;
    pendingCustomDownloads = {};
    pendingCustomDownloadStatus = {};
    constructor(vars, logger) {
        this.vars = vars;
        this.logger = logger;
        this.outputCombindationZips = `${this.vars.zipsFolder}/dynamic-zips/`;
        this.extractedContentFolder = `${this.vars.contentBasePath}/extracted-content/`;
        this.tempDir = `${this.vars.contentBasePath}/temp-folder`;
    }
    async getCustomDownload(zipFilePrefix, packages, platform, urlPrefix) {
        // Get the output zip name
        const packageCombinationHash = XXH.h64(0);
        packages.map((pkg) => {
            packageCombinationHash.update(pkg.packagePublicUid);
        });
        const packageCombinationHashString = packageCombinationHash.digest().toString(16);
        const outputZip = path.join(this.outputCombindationZips, `${zipFilePrefix}__${packageCombinationHashString}__${platform}.zip`);
        // Check if we have the output zip, return if we do
        const downloadUrl = `${urlPrefix}/${path_helpers_1.PathHelpers.getRelativePath(outputZip, this.vars.zipsFolder)}`;
        const pending = this.pendingCustomDownloads[packageCombinationHashString];
        if (await fs.pathExists(outputZip)) {
            return {
                requestToken: '',
                downloadUrl
            };
        }
        else if (pending) {
            return { requestToken: packageCombinationHashString, downloadUrl: null };
        }
        else {
            this.pendingCustomDownloadStatus[packageCombinationHashString] = { downloadUrl: null };
            this.pendingCustomDownloads[packageCombinationHashString] = this.createZip(packages, platform, outputZip)
                .catch((err) => {
                // TODO update progress
                this.logger.error(typeof err === 'string' ? err : err.message);
            })
                .then(() => {
                this.pendingCustomDownloadStatus[packageCombinationHashString] = {
                    downloadUrl
                };
                return downloadUrl;
            });
            return {
                requestToken: packageCombinationHashString,
                downloadUrl: null
            };
        }
    }
    getCustomDownloadStatus(requestToken) {
        return this.pendingCustomDownloadStatus[requestToken];
    }
    async createZip(packages, platform, outputZip) {
        const mergeDir = path.join(this.tempDir, 'combined-content', path.parse(outputZip).name);
        if (!(await fs.pathExists(mergeDir))) {
            const contentToMerge = await Promise.all(packages.map(async (pkg) => {
                const extractedContent = path.join(this.extractedContentFolder, pkg.packagePublicUid, platform);
                const extractedContentAll = path.join(this.extractedContentFolder, pkg.packagePublicUid, 'all');
                if (!(await fs.pathExists(extractedContent)) &&
                    !(await fs.pathExists(extractedContentAll))) {
                    throw new Error(`package does not have content for platform ${platform}`);
                }
                return (await fs.pathExists(extractedContent))
                    ? extractedContent
                    : extractedContentAll;
            }));
            // TODO go back to cp if not performing well
            for (const item of contentToMerge) {
                await (0, src_1.mergeDirs)(item, mergeDir, src_1.conflictResolvers.overwrite, false);
            }
        }
        //
        // Create zip
        //
        await execFile('/usr/bin/time', [
            '/usr/bin/7z',
            'a',
            '-tzip',
            '-bd',
            '-mx=1',
            outputZip,
            `${mergeDir}/*`,
            // Redirecting to null and using shell due to 7z not having quiet mode
            '>/dev/null'
        ], { shell: true });
    }
}
exports.CustomDownloadManager = CustomDownloadManager;
async function execFile(file, args, options) {
    const util = require('util');
    const execFile = util.promisify(require('child_process').execFile);
    const execFilePromise = execFile(file, args, options);
    const child = execFilePromise.child;
    child.stdout.on('data', (data) => {
        console.log('stdout: ' + data);
    });
    child.stderr.on('data', (data) => {
        console.log('stderr: ' + data);
    });
    child.on('close', (code) => {
        console.log('closing code: ' + code);
    });
    await execFilePromise;
}
