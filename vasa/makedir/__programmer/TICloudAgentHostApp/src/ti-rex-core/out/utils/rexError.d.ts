import { RefreshMessageLevel } from '../lib/dbBuilder/dbBuilder';
/**
 * RexError
 *
 */
export declare class RexError extends Error {
    level?: string;
    causeError?: Error;
    httpCode?: number;
    constructor(arg: string | {
        name?: string;
        level?: string;
        message: string;
        causeError?: Error;
        httpCode?: number;
    });
}
export declare class RefreshError extends RexError {
    refreshMessageLevel: RefreshMessageLevel;
    message: string;
    causeError?: Error;
    constructor(arg: {
        refreshMessageLevel: RefreshMessageLevel;
        message: string;
        causeError?: Error;
    });
}
export declare function stringifyError(error: Error): string;
