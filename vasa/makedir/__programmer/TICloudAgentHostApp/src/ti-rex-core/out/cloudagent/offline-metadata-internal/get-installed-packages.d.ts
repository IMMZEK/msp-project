import { RexDB } from '../../rexdb/lib/rexdb';
import { DesktopOverview } from '../offline-metadata-manager';
import { PackageDependency } from '../../shared/routes/response-data';
/**
 * Get package info of installed packages sorted by version
 *
 */
export declare function getInstalledPackagesNoQ(dbOverviews: RexDB<DesktopOverview>): Promise<{
    name: string;
    packageVersion: string;
    packagePublicId: string;
    packagePublicUid: string;
    licenses: string[] | undefined;
    dependencies: PackageDependency[];
    localPackagePath: string;
    isInstallable: boolean;
    subType: import("../../lib/dbBuilder/dbTypes").PackageSubType | null;
    featureType: import("../../lib/dbBuilder/dbTypes").FeatureType | null;
    ccsVersion: string | null;
}[]>;
