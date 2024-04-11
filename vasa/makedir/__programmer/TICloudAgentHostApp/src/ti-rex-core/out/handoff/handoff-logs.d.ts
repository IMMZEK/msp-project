/// <reference types="node" />
import * as fs from 'fs-extra';
import { Log, LoggerManager } from '../utils/logging';
interface OnSubmissionDoneParams {
    err: Error | null;
    refreshSuccess: boolean;
    stageDone: boolean;
    emailTag: string;
    additonalAttachments?: string[];
    handoffChecklistValid: boolean;
}
export type OnSubmissionDone = (params: OnSubmissionDoneParams) => Promise<void>;
interface ManageLogsParams {
    loggerManager: LoggerManager;
    email: string;
    submissionId: string;
}
/**
 * Manage the logs for the submission.
 *  Create the submission logs.
 *  Email the logs when submission is done.
 *  Close the loggers once we are complete.
 *
 */
export declare function manageLogsSubmission(args: ManageLogsParams): Promise<{
    onSubmissionDone: OnSubmissionDone;
    log: Log;
    refreshLog: Log;
    refreshOut: fs.WriteStream;
}>;
/**
 * Manage the logs for the deletion.
 *  Create the submission logs.
 *  Email the logs when submission is done.
 *  Close the loggers once we are complete.
 *
 */
export declare function manageLogsDeletion(args: ManageLogsParams): Promise<{
    onSubmissionDone: OnSubmissionDone;
    log: Log;
    refreshLog: Log;
    refreshOut: fs.WriteStream;
}>;
export {};
