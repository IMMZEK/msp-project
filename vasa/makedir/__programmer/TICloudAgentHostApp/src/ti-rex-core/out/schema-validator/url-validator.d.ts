import { BaseLogger } from '../utils/logging';
import { BaseValidator } from './base-validator';
import { ValidateResult } from './validate-result';
import { Content, Devtools, PackageDefinition } from './schema-types';
import { RefreshOperation } from '../lib/dbBuilder/dbBuilder';
export declare class UrlValidator extends BaseValidator {
    validateCb: (arg1: string, callback: (err: any) => void) => void;
    result: ValidateResult;
    constructor(logger: BaseLogger, isSummary: boolean, logLimit?: number);
    validateURL(filePath: string): Promise<void>;
    checkRequest(link: string, fieldName: string): Promise<void>;
    fieldNamesToVerify(filePath: string): Content[] | Devtools[];
    validate(rootDir: string): Promise<void>;
    runFileValidation(rootDir: string, latestPkgMap: Map<string, {
        version: string;
        operation: RefreshOperation;
    }>, packageMetadataList: Map<string, PackageDefinition>): Promise<void>;
}
