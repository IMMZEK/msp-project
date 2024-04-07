import { Bundle, Overview, PureBundle, Resource } from './dbBuilder/dbTypes';
import { IRexDB } from '../rexdb/lib/irexdb';
/**
 * Find latest bundle/package within the given version range
 *
 * versionRange can be
 *  - a semver range or specific version: NOTE that all candidate bundle versions a force-converted
 *  to semver in this case
 *  - a 4-digit specific version
 */
export declare function findLatestBundle(id: string, versionRange: string, dbOverviews: IRexDB<Overview>, dbPureBundles?: IRexDB<PureBundle>, dbResources?: IRexDB<Resource>): Promise<Bundle | undefined>;
