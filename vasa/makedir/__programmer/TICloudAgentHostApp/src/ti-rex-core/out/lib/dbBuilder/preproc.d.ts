/**
 * Created by osohm on 28/05/15.
 */
import { BaseLogger } from '../../utils/logging';
interface TextMacro {
    value: string;
}
interface SetMacro {
    fieldIndices: {
        [key: string]: number;
    };
    values: string[];
}
interface MacroTable {
    [key: string]: TextMacro;
}
export interface Macros {
    text: MacroTable;
    set: {
        [key: string]: SetMacro;
    };
}
/**
 * Helper for preprocessing *.tirex.json files
 */
export declare function processFile<T extends object>(jsonFile: string, existingMacros: Macros | null, logger: BaseLogger): Promise<{
    records: T[];
    unresolvedMacros: string[];
    macros: Macros;
} | undefined>;
/**
 *
 * - array macros are converted to text macros
 *    + cannot use '.' in the name (reserved for setmacro references)
 * - text macros are replaced in the json text
 *    + cannot use '.' in the name (reserved for setmacro references)
 * - set macros are expanded in the objectified json
 *    + fields can only contain the reference to the macro, nothing else (unlike text macros)
 */
export declare function process<T extends object>(jsonText: string, existingMacros: Macros | null, logger: BaseLogger, keepMacroRecords?: boolean): {
    records: T[];
    unresolvedMacros: string[];
    macros: Macros;
};
export {};
