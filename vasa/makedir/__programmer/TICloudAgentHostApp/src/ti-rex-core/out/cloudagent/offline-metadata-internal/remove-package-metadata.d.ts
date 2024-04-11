import { RexDBSplit } from '../../rexdb/lib/rexdb-split';
import { PureBundle, Resource } from '../../lib/dbBuilder/dbTypes';
import { RexDB } from '../../rexdb/lib/rexdb';
import { DesktopOverview } from '../offline-metadata-manager';
import { InputProgress } from '../progress-manager';
/**
 *
 * @param packageUid
 * @param logger
 * @param onProgressUpdate
 */
export declare function removePackageMetadataNoQ(packagePublicUid: string, dbResources: RexDBSplit<Resource>, dbOverviews: RexDB<DesktopOverview>, dbPureBundles: RexDB<PureBundle>, onProgressUpdate: (progress: InputProgress) => void): Promise<[unknown, unknown, unknown]>;
