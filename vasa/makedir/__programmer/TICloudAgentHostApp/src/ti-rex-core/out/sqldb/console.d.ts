import { ConsoleVerbosity } from './manage';
export declare class ConsoleLogger {
    readonly consoleVerbosity: ConsoleVerbosity;
    constructor(consoleVerbosity: ConsoleVerbosity);
    log(message?: string, level?: ConsoleVerbosity, newline?: boolean): void;
    progress(message?: string, newline?: boolean): void;
    progressOnly(message?: string): void;
    fine(message?: string): void;
    finer(message?: string): void;
}
