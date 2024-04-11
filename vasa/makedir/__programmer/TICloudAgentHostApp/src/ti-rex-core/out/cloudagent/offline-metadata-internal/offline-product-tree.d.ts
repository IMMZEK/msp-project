import { RexDB } from '../../rexdb/lib/rexdb';
import { Device, Devtool } from '../../lib/dbBuilder/dbTypes';
import { InputProgress } from '../progress-manager';
import { TempDirs } from '../util';
interface OfflineProductTreeParams {
    dbDevices: RexDB<Device>;
    dbDevtools: RexDB<Devtool>;
    rex3Server: string;
    tempDirs: TempDirs;
    installLocation: string;
    onProgressUpdate: (progress: InputProgress) => void;
}
/**
 *
 */
export declare function offlineProductTreeNoQ({ dbDevices, dbDevtools, rex3Server, tempDirs, installLocation, onProgressUpdate }: OfflineProductTreeParams): Promise<void>;
export {};
