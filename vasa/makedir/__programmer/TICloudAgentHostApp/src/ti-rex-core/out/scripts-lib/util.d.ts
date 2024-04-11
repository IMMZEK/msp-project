export const remoteServerLog: string;
export const webdriverLog: string;
export const protractorLog: string;
export const browserConsoleLog: string;
export const mochaLog: string;
export const tscLog: string;
export const npmLog: string;
export const mochaServerPort: 4002;
export const seleniumServerPort: 4004;
export const remoteServerDebugPort: 6000;
export const mochaHtmlReport: string;
export const mochaJSONReport: string;
export const protractorHtmlReport: string;
export const protractorJSONReport: string;
export const loadTestSummaryHtmlReport: string;
export const generatedDataFolder: string;
export const dataFolder: string;
export const mochaServer: string;
export namespace TestConfig {
    let REMOTESERVER: string;
    let LOADREMOTESERVER: string;
    let SERVER_INDEPENDENT: string;
    let E2E: string;
}
export namespace TestMode {
    let LIGHT_WEIGHT: string;
    let HEAVY: string;
    let VERY_HEAVY: string;
}
export const siteStaticData: string;
export const webdriversPath: string;
export const defaultTestdataPath: string;
export const mochaServerDataFolder: string;
export function initMochaConfig(overriddenConfig: Object): void;
export function getMochaConfig(): {
    preset: string;
    mode: string;
    validationType: string;
    myHttpPort: string;
    contentPath: string;
    dbTablePrefix: string;
    dbPath: string;
    seoPath: string;
    logsDir: string;
    analyticsDir: string;
    contentPackagesConfig: string;
    remoteBundleZips: string;
    localBundleZips: string;
    myRole: string;
    no_proxy: string;
    refreshDB: string;
    allowRefreshFromWeb: string;
    mailingList: string;
    handoffServer: boolean;
    downloadServer: boolean;
    useConsole: string;
    dbResourcePrefix: string;
    serveContentFromFs: boolean;
    allowExit: boolean;
    testingServer: boolean;
    webComponentsServer: string;
    ccsCloudUrl: string;
    https_proxy: string;
    http_proxy: string;
    HTTP_PROXY: string;
    HTTPS_PROXY: string;
    NO_PROXY: string;
    seaportHostIP: string;
    seaportPort: string;
    dcontrol: null;
    serverMode: string;
};
export function initMochaDConfig(overriddenDconfig: any): void;
export function getMochaDconfig(): any;
export function setupLog(log: string, callback: any, { clear }?: Object): void;
export const processManager: ProcessManager;
export function resolvePath(p: string, { relative }?: {
    relative: string;
}): string;
export function setOptionDefault(option: any, optionList: any, value: any): any;
export const projectRoot: string;
export const logsDir: string;
declare const reportDir: string;
/**
 * Simplifies process management
 *
 */
export class ProcessManager {
    /**
     * Redirect the processes output to the write stream
     *
     * @param {Object} p - An object returned by a child_process function
     *  i.e require('child_processes').spawn(..)
     * @param {stream.Writeable} out - The stream to write the processes output to
     *
     */
    static redirectProcessOutput({ child, out, name, exitMessage }: Object): void;
    /**
     * Register process and redirect to out.
     *
     * @param {Object} args
     *  @param {Object} args.child - An object returned by a child_process function
     *   i.e require('child_processes').spawn(..)
     *  @param {stream.Writeable} args.out - The stream to write the
     *   processes output to.
     *  @param {String} name
     *  @param {Boolean} exitMessage - if false suppress the exit code message
     *  @param {Boolean} restart - if false don't kill child when receiving restart signal
     */
    addProcess({ child, out, name, exitMessage, restart }: {
        child: Object;
        out: stream.Writeable;
    }): void;
}
export { reportDir as loadTestHtmlReportDir };
