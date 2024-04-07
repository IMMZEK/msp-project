export function testProjects({ tirexUrl, ccsUrl, logFile, reportFile, exclude, backupLocation, packages, device, devtool }: {
    tirexUrl: any;
    ccsUrl: any;
    logFile: any;
    reportFile: any;
    exclude?: any[] | undefined;
    backupLocation?: null | undefined;
    packages?: null | undefined;
    device?: null | undefined;
    devtool?: null | undefined;
}, callback: any): void;
export type getImportablesCallback = (error: Error, : Array.module) => any;
/**
 * BuildType
 */
export type BuildType = string;
export namespace BuildType {
    let FULL: string;
    let INCREMENTAL: string;
    let CLEAN: string;
}
export function testProject({ importable: { location, coreTypes }, ccsUrl, exclude, logStream, reportStream, backupLocation }: {
    importable: {
        location: any;
        coreTypes: any;
    };
    ccsUrl: any;
    exclude?: any[] | undefined;
    logStream: any;
    reportStream: any;
    backupLocation: any;
}): Promise<{
    total: any;
    failed: any;
    error: number;
    skipped: number;
}>;
