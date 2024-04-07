import { BaseLogger } from '../utils/logging';
import { ValidateResult } from './validate-result';
import { IRecord, MetaFieldSchema, VSettings, RuleSummary, RuleEntity } from './schema-types';
import { PackageData } from '../lib/dbBuilder/refresh';
/**
 * Base class for validators.
 */
export declare class BaseValidator {
    readonly title: string;
    name: string;
    settings: VSettings;
    logger: BaseLogger;
    filePath?: string;
    packagePath?: string;
    currentSource?: string;
    currentSubSource?: string;
    currentRecNo?: number;
    startTime?: Date;
    endTime?: Date;
    processed: number;
    logCount: number;
    idxToLineMap?: number[][];
    isSummary: boolean;
    logSummary?: Map<string, RuleSummary>;
    result: ValidateResult;
    constructor(title: string, _name: string, logger: BaseLogger | null, isSummary: boolean, logLimit?: number);
    updateSettings(): void;
    updateLogLimits(): void;
    setLogLimit(priority: string, limit: number): void;
    resetLogCount(): void;
    setSettings(settings: any): void;
    setPackagePath(pkg: string): void;
    getIdxToLineMap(filePath: string): void;
    setCurrentSource(src: string | number | undefined): void;
    resetCurrentSource(): void;
    setCurrentSubSource(src: string): void;
    resetCurrentSubSource(): void;
    getLogger(): BaseLogger;
    log(rule: RuleEntity, _tags?: string[], ...args: string[]): void;
    printEachLog(rule: RuleEntity, msgOut: string, _tags?: string[], ...args: string[]): void;
    readJson(filePath: string): any;
    preValidate(): void;
    preValidateFile(_filePath: string): ValidateResult;
    preValidateRecord(): ValidateResult;
    postValidate(): void;
    isIgnore(field: string): boolean;
    isIgnorePackage(record: IRecord): boolean;
    incIgnoreCount(field: string): void;
    resetIgnoreCounts(): void;
    validateArray(field: string, record: IRecord): boolean;
    validate2DArray(field: string, record: IRecord): boolean;
    validateLocationPath(field: string, record: IRecord): boolean;
    validateString(field: string, record: IRecord, schema: MetaFieldSchema): boolean;
    validateFieldBasic(field: string, record: IRecord, schema: MetaFieldSchema): boolean;
    reportNotInSpec(fields: string[], specs?: string[]): void;
    ruleFieldRecommended(field: string, record: IRecord): boolean;
    ruleInSpec(record: IRecord, specs: string[]): boolean;
    ruleFieldDefined(field: string, record: IRecord): boolean;
    ruleFieldDefinedNot(field: string, record: IRecord): boolean;
    ruleFileExists(path: string, field?: string): boolean;
    ruleFileExistsNot(path: string): boolean;
    ruleNonEmptyContent(field: string, record: IRecord): boolean;
    ruleValidLocalPath(field: string, record: IRecord): boolean;
    ruleValidUrl(field: string, record: IRecord): boolean;
    ruleValidHtml(field: string, record: IRecord): boolean;
    ruleItemListed(field: string, record: IRecord, listed: string[], warning?: boolean): boolean;
    ruleOneOrMore(field: string, record: IRecord, otherFields: string[]): boolean;
    ruleEmptyOptional(field: string, record: IRecord, optional: boolean): boolean;
    ruleSemver(field: string, record: IRecord): boolean;
    hasSpecialChar(str: string, strict?: boolean): string | null;
    ruleNoSpecialChar(field: string, record: IRecord, strict: boolean): boolean;
    ruleValidCoreType(field: string, record: IRecord): boolean;
    ruleValidDevice(field: string, record: IRecord, mainCat?: string[]): boolean;
    ruleValidDevtools(field: string, record: IRecord, mainCat?: string[]): boolean;
    ruleOnlyOneElement(field: string, record: IRecord): boolean;
    ruleUniqueElements(field: string, record: IRecord, pkgData: PackageData): boolean;
    ruleSortValue(field: string, sort: string): boolean;
}
/**
 * Base class for schema validators.
 */
export declare abstract class Validator extends BaseValidator {
    abstract validateFile(filePath: string, skipContents: boolean, pkgData?: object): ValidateResult;
    abstract validateRecords(records: IRecord[]): ValidateResult;
    abstract validateRecord(record: IRecord, idx?: number): ValidateResult;
    abstract validateField(fieldName: string, record: IRecord, schema?: MetaFieldSchema): ValidateResult;
}
