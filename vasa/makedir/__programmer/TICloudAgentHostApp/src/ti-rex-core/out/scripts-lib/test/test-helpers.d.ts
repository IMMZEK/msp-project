import * as scriptsUtil from '../../scripts-lib/util';
export declare function getUniqueFileName(): string;
/**
 * Get a unique folder name (at least for the current execution)
 *
 * @returns folder - an absolute path
 */
export declare function getUniqueFolderName(prefix?: string): string;
interface TestingGlobals {
    dinfraPath: string;
    remoteserverUrl: string;
    testConfig: scriptsUtil.TestConfig;
    reqLimit: number;
    testMode: scriptsUtil.TestMode;
    customTest: string;
    testdataPath: string;
}
export declare let testingGlobals: TestingGlobals;
export declare function setTestingGlobals(args: any): void;
export {};
