/**
 * Remote server functions for Download
 *
 */
import { LinkForDownload } from './dbBuilder/dbTypes';
import { Platform } from '../shared/routes/response-data';
interface ClientInfo {
    OS: string;
    arch: string;
}
/**
 *
 * @param linkForDownload
 * @returns {*}
 */
export declare function resolveDownloadLinkForOS(linkForDownload: LinkForDownload, clientInfo: ClientInfo): string | undefined;
/**
 *
 * @param os
 * @returns 'linux','win' or 'macos'
 */
export declare function resolvePackageZipForOS(os: string): Platform;
export {};
