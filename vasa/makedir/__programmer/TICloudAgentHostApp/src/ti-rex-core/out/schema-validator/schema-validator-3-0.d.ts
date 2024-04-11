import * as preproc from '../lib/dbBuilder/preproc';
import { BaseLogger } from '../utils/logging';
import { PackageValidator } from './package-validator';
import { MacrosValidator } from './macros-validator';
import { DevicesValidator } from './devices-validator';
import { DevtoolsValidator } from './devtools-validator';
import { ContentValidator } from './content-validator';
import { ValidateResult } from './validate-result';
import { PackageData } from '../lib/dbBuilder/refresh';
interface Config {
    contentPath: string;
    cfg: string;
    full?: boolean;
}
export declare class SchemaValidator {
    validateCb: (callback: (err: any) => void) => void;
    rootDir: string;
    pkgDirs: string[];
    contentFiles: string[][];
    deviceFiles: string[][];
    devtoolFiles: string[][];
    macrosFiles: string[][];
    logger: BaseLogger;
    settings: {
        rootFolders: string;
    };
    isSummary: boolean;
    macros: preproc.Macros;
    vPkg: PackageValidator;
    vMacro: MacrosValidator;
    vDev: DevicesValidator;
    vTool: DevtoolsValidator;
    vRes: ContentValidator;
    startTime: Date;
    endTime: Date;
    constructor();
    config(logger: BaseLogger, config: Config): Promise<void>;
    validate(): Promise<void>;
    logIntro(title: string): void;
    logEnding(title: string): void;
    validatePackage(pkgDir: string, pkgData: PackageData, modulePrefix: string | null): Promise<void>;
    validatePackageJson(filePath: string): ValidateResult | null;
    validateMacrosJson(filePath: string): ValidateResult | null;
    validateDeviceJson(filePath: string): ValidateResult | null;
    validateDevtoolJson(filePath: string): ValidateResult | null;
    validateContentJson(filePath: string, pkgData: PackageData): ValidateResult | null;
    private runFileValidation;
}
export {};
