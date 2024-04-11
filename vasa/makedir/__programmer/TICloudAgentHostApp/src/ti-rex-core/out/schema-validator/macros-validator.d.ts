import { Validator } from './base-validator';
import { ValidateResult } from './validate-result';
import { BaseLogger } from '../utils/logging';
import { IRecord, MetaFieldSchema, MetadataSchema } from './schema-types';
/**
 * Validator class for 'macros.tirex.json'.
 */
export declare class MacrosValidator extends Validator {
    static Text: string;
    static Array: string;
    static Set: string;
    textMacros: Map<string, number>;
    arrayMacros: Map<string, number>;
    setMacros: Map<string, number>;
    MACROS_METADATA_SCHEMA: MetadataSchema;
    constructor(logger: BaseLogger, isSummary: boolean, logLimit?: number);
    getMacroValue(key: string): number | undefined;
    getMacroType(record: IRecord): string | null;
    clearMacros(): void;
    checkAlreadyDefined(key: string): boolean;
    validateFile(filePath: string, skipContents?: boolean): ValidateResult;
    validateRecords(records: IRecord[]): ValidateResult;
    validateRecord(record: IRecord, idx?: number): ValidateResult;
    validateField(fieldName: string, record: IRecord, schema?: MetaFieldSchema): ValidateResult;
}
