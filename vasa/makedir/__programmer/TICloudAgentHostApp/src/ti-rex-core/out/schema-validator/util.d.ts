/// <reference types="node" />
import * as fs from 'fs-extra';
import { BaseLogger } from '../utils/logging';
import { MetadataSchema, MetaFieldSchema, IRecord, PackageDefinition, RuleEntity } from './schema-types';
import { Validator } from './base-validator';
import { PackageType } from '../lib/dbBuilder/dbTypes';
export declare class ConsoleLogger extends BaseLogger {
    logger: Console;
    output: fs.WriteStream;
    constructor(file?: string);
    recommended: (_message: string, _tags?: string[]) => void;
    gap: () => boolean | void;
    private _createLogFunction;
}
/**
 * Simple levenshtein implementation, from github: keesey/levenshtein.ts
 *
 * @param a String 1
 * @param b String 2
 * @return The distance between the 2 strings
 */
export declare function levenshtein(a: string, b: string): number;
/**
 * Extend the error message from JSON file parser with rough location in the JSON file.
 *
 * @param filePath Full path of the JSON file
 * @param err Input error message from JSON parser
 * @return Extended error message
 */
export declare function extendJsonErrorMsg(filePath: string, err: string): string;
/**
 * Find roughly the location of json object in the JSON file.
 *
 * @param filePath Full path of the JSON file
 * @return A map of object index to [startLineNo, startColumn, endLineNo, endColumn]
 */
export declare function jsonLineNum(filePath: string): number[][] | undefined;
export declare function isHTTP(str: string): boolean;
export declare function isInList(item: string, list: string[]): boolean;
export declare function isValidUrl(str: string): boolean;
export declare function isValidHtml(_str: string): boolean;
export declare function getSuggestion(word: string, dict?: string[]): string;
export declare function runValidateField(v: Validator, record: IRecord, metadataSchema: MetadataSchema): void;
export declare function getSchema(metadataSchema: MetadataSchema, fieldName: string): MetaFieldSchema;
export declare function findContentFiles(dir: string): string[];
export declare function findDeviceFiles(dir: string): string[];
export declare function findDevtoolFiles(dir: string): string[];
export declare function findMacrosFiles(dir: string): string[];
export declare function findFiles(dir: string, level: number, endsWith: string): string[];
export declare function setPackageMetadataList(packageMetadataList: Map<string, PackageDefinition>, packageFolder: string, id: string, version: string, type: PackageType): void;
export declare function insertBlankLine(logger: BaseLogger | ConsoleLogger): void;
export declare function updateRuleSetting(ruleEntity: RuleEntity, priority: string): void;
