import DinfraTypes = require('dinfra');
export interface Options {
    appendOnly?: boolean;
    strictValidation?: boolean;
    verboseLogging?: boolean;
    quiet?: boolean;
    configFile?: string;
    dryRun?: boolean;
}
export declare function contentImport(dinfra: typeof DinfraTypes, contentPath: string | undefined, resourcePrefix: string, options: Options): Promise<void>;
