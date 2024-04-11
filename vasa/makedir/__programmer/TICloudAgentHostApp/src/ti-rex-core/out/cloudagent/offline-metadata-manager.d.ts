import { Overview as CloudOverview } from '../lib/dbBuilder/dbTypes';
import { InputProgress } from './progress-manager';
import { CommonParams } from './util';
import { InstalledPackage } from './response-data';
export interface DesktopOverviewItems {
    localPackagePath: string;
}
export type DesktopOverview = CloudOverview & DesktopOverviewItems;
/**
 * This class is responsible for managing the rex3 local database content
 *  - querying for what packages are local
 *  - detecting and removing database entries for removed packages
 *  - downloading new database content and updating the existing .db files when requested
 */
export declare class OfflineMetadataManager {
    private readonly commonParams;
    private readonly databaseQueue;
    private readonly dbDevices;
    private readonly dbDevtools;
    private readonly dbResources;
    private readonly dbOverviews;
    private readonly dbPureBundles;
    constructor(commonParams: CommonParams);
    /**
     *  Return package infos for all installed (offlined) packages based on dbOverviews
     */
    getInstalledPackages(): Promise<InstalledPackage[]>;
    /**
     * Queue up fetching the metadata of a software package and insertiing it into the offline DB.
     * Update the offline product tree (devices and devtools DB) if needed.
     * Send event that packages were updated.
     */
    offlinePackageMetadata(packagePublicUid: string, installPackageFolder: string, onProgressUpdate: (progress: InputProgress) => void, ignorePackageNotOnServer?: boolean): Promise<void>;
    /**
     *  Queue up removing the offline metadata of a software package.
     *  Send event that packages were updated.
     */
    removePackageMetadata(packagePublicUid: string, onProgressUpdate: (progress: InputProgress) => void): Promise<void>;
}
