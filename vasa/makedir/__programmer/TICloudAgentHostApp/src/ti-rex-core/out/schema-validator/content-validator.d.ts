import { Validator } from './base-validator';
import { ValidateResult } from './validate-result';
import { BaseLogger } from '../utils/logging';
import { IRecord, MetaFieldSchema } from './schema-types';
import { PackageData } from '../lib/dbBuilder/refresh';
/**
 * Validator class for '*.content.tirex.json'.
 */
export declare class ContentValidator extends Validator {
    constructor(logger: BaseLogger, isSummary: boolean, logLimit?: number);
    validateFile(filePath: string, skipContents?: boolean, pkgData?: PackageData): ValidateResult;
    validateRecords(records: IRecord[], pkgData?: PackageData): ValidateResult;
    validateRecord(record: IRecord, idx?: number, pkgData?: PackageData): ValidateResult;
    validateField(fieldName: string, record: IRecord, schema?: MetaFieldSchema, pkgData?: PackageData): ValidateResult;
}
