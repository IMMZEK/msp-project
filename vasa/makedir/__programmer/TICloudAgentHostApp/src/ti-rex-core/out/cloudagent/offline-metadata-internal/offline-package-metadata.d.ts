import { PureBundle, Resource } from '../../lib/dbBuilder/dbTypes';
import { InputProgress } from '../progress-manager';
import { RexDBSplit } from '../../rexdb/lib/rexdb-split';
import { RexDB } from '../../rexdb/lib/rexdb';
import { TempDirs } from '../util';
import { DesktopOverview } from '../offline-metadata-manager';
interface OfflinePackageMetadataParams {
    packagePublicUid: string;
    dbResources: RexDBSplit<Resource>;
    dbOverviews: RexDB<DesktopOverview>;
    dbPureBundles: RexDB<PureBundle>;
    installPackageFolder: string;
    onProgressUpdate: (progress: InputProgress) => void;
    rex3Server: string;
    dstPath: string;
}
/**
 * Add package metadata to offline DB
 *
 */
export declare function offlinePackageMetadataNoQ(args: OfflinePackageMetadataParams): Promise<void>;
export declare function downloadAndExtractPackageMetadata(packagePublicUid: string, { downloadDir, extractDir }: TempDirs, onProgressUpdate: (progress: InputProgress) => void, rex3Server: string): Promise<string>;
export {};
