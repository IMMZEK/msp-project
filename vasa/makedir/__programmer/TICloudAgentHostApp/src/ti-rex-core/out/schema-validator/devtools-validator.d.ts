import { Validator } from './base-validator';
import { ValidateResult } from './validate-result';
import { BaseLogger } from '../utils/logging';
import { IRecord, MetaFieldSchema } from './schema-types';
/**
 * Validator class for 'devtools.tirex.json'.
 */
export declare class DevtoolsValidator extends Validator {
    constructor(logger: BaseLogger, isSummary: boolean, logLimit?: number);
    validateFile(filePath: string, skipContents?: boolean): ValidateResult;
    validateRecords(records: IRecord[]): ValidateResult;
    validateRecord(record: IRecord, idx?: number): ValidateResult;
    validateField(fieldName: string, record: IRecord, schema?: MetaFieldSchema): ValidateResult;
}
