import * as util from './util';
import { Log } from '../utils/logging';
export declare function saveHandoffChecklists({ entry, stagedEntries, submissionId, log }: {
    entry: util.UploadedEntry;
    stagedEntries: util.PackageEntryStaged[];
    submissionId: string;
    log: Log;
}): Promise<void>;
export declare function validateHandoffChecklist(handoffChecklist: util.HandoffChecklist | undefined, log: Log): boolean;
