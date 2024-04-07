import { Omit } from '../shared/generic-types';
import { ConsoleVerbosity } from './manage';
export interface Config {
    dinfraPath: string;
    tablePrefix: string;
    logConfigPath?: string;
    trace: boolean;
    consoleVerbosity?: ConsoleVerbosity;
}
type PickKeysByType<T, T2> = {
    [K in keyof T]-?: T[K] extends T2 ? K : never;
}[keyof T];
type BooleanKeys = PickKeysByType<Config, boolean>;
export type PartialConfig = Partial<Config> & Omit<Config, BooleanKeys>;
export {};
