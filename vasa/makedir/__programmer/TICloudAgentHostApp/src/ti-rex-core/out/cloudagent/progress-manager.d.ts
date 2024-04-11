import { Logger } from '../utils/logging';
import { TriggerEvent } from './util';
import { PartialMember } from '../shared/generic-types';
export declare const enum ProgressType {
    INDEFINITE = "Indefinite",
    DEFINITE = "Definite"
}
interface BaseProgress {
    name: string;
    subActivity: string;
    isFirstUpdate: boolean;
    isComplete: boolean;
    error: string | null;
}
interface DefiniteProgress extends BaseProgress {
    percent: number;
    progressType: ProgressType.DEFINITE;
}
interface IndefiniteProgress extends BaseProgress {
    progressType: ProgressType.INDEFINITE;
}
export type Progress = DefiniteProgress | IndefiniteProgress;
interface BaseInputProgress {
    name: string;
    subActivity?: string;
}
interface DefiniteInputProgress extends BaseInputProgress {
    percent: number;
    progressType: ProgressType.DEFINITE;
}
interface IndefiniteInputProgress extends BaseInputProgress {
    progressType: ProgressType.INDEFINITE;
}
export type InputProgress = DefiniteInputProgress | IndefiniteInputProgress;
type InitialProgress = PartialMember<DefiniteInputProgress, 'name'> | PartialMember<IndefiniteInputProgress, 'name'>;
export declare class ProgressManager {
    private readonly triggerEvent;
    private readonly logger;
    private readonly tasks;
    private readonly progressIdCounter;
    private readonly promises;
    private closed;
    constructor(triggerEvent: TriggerEvent, logger: Logger);
    close(): void;
    getProgress(): {
        [x: string]: Progress;
    };
    clearTaskProgress(progressId: string): void;
    createProgressTask(initialProgress: InitialProgress, context: string, isUserTask?: boolean): {
        registerTask: (task: Promise<any>) => string;
        onProgressUpdate: (updatedProgress: InputProgress) => void;
    };
    waitForTasks(): Promise<void[]>;
}
export type ProgressParams = Omit<ReturnType<ProgressManager['createProgressTask']>, 'registerTask'>;
export {};
