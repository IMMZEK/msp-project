import { Validator } from './base-validator';
import { ValidateResult } from './validate-result';
import { BaseLogger } from '../utils/logging';
import { IRecord, MetaFieldSchema, MetaVer } from './schema-types';
/**
 * Validator class for 'package.tirex.json'.
 */
export declare class PackageValidator extends Validator {
    pkgHeaderRecord: IRecord;
    metaVer: MetaVer;
    skipped: boolean;
    settings: {
        ignoreFields: never[];
        ignorePackages: never[];
        logLimit: number;
        compatibleVersionOnly: boolean;
    };
    constructor(logger: BaseLogger, isSummary: boolean, logLimit?: number);
    validateFile(filePath: string, skipContents?: boolean): ValidateResult;
    validateRecords(records: IRecord[]): ValidateResult;
    validateRecord(record: IRecord, idx?: number): ValidateResult;
    validateField(fieldName: string, record: IRecord, schema?: MetaFieldSchema): ValidateResult;
    validateNumberOfHeaders(records: IRecord[]): boolean;
    validateVersionFormat(field: string, record: IRecord): boolean;
    validateMetaVer(field: string, record: IRecord): boolean;
    validateSupplements(field: string, record: IRecord): boolean;
    validateDependencies(field: string, record: IRecord): boolean;
}
