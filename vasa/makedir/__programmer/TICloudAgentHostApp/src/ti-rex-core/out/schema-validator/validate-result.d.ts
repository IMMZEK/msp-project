import { RefreshMessageLevel } from '../lib/dbBuilder/dbBuilder';
/**
 * Class of validation result.
 */
export declare class ValidateResult {
    counts: {
        [key: string]: number;
    };
    logLimits: {
        [key: string]: number;
    };
    constructor();
    resetCounts(): void;
    copy(other: ValidateResult): void;
    clone(): ValidateResult;
    add(other: ValidateResult): void;
    delta(other: ValidateResult): ValidateResult;
    isPassed(): boolean;
    hasEmergency(): boolean;
    hasAlert(): boolean;
    hasCritical(): boolean;
    hasError(): boolean;
    hasWarning(): boolean;
    hasRecommended(): boolean;
    getHighestErrorLevel(): RefreshMessageLevel;
}
