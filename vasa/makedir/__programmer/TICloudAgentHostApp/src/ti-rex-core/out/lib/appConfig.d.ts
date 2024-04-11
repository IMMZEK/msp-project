import * as DinfraTypes from 'dinfra';
import { Vars } from './vars';
export type Mode = 'remoteserver' | 'localserver';
export type ValidationType = 'url' | 'schema' | 'refresh' | 'all';
export interface AppConfig {
    allowExit: boolean;
    preset: string;
    mode: Mode;
    validationType?: ValidationType;
    myHttpPort?: string;
    contentPath: string;
    dbPath: string;
    seoPath: string;
    dbTablePrefix: string;
    logsDir: string;
    contentPackagesConfig: string;
    packageAuxDataFile: string;
    remoteBundleZips: string;
    localBundleZips: string;
    sysconfigTestServerURL: string;
    myRole: string;
    refreshDB: 'true' | 'false';
    allowRefreshFromWeb: 'true' | 'false';
    mailingList: string;
    handoffServer: boolean;
    downloadServer: boolean;
    testingServer: boolean;
    useConsole: 'true' | 'false';
    webComponentsServer: string;
    ccsCloudUrl: string;
    seaportHostIP: string;
    seaportPort: string;
    dcontrol: {
        legacy: {
            seaport: {
                address: string;
                port: string;
            };
        };
    };
    serverMode: 'https' | 'http' | 'both';
    deleteContent?: boolean;
    deleteDb?: boolean;
    dbResourcePrefix: string;
    relocatePackages?: boolean;
    remoteserverHost?: string;
    ccs_port?: string;
    packageGroupsConfigFile?: string;
    serveContentFromFs?: boolean;
    enableMetricsMiddleware?: boolean;
    rex3Config?: string;
    http_proxy?: string;
    isTheia?: boolean;
    handoffChecklistsFolder: string;
    buHandoffTestingServer: boolean;
}
export declare const tirexDatabasesDefaults: DinfraTypes.DatabaseDefaults;
/**
 * Configure dinfra, vars, and global default logger named 'tirex'
 *
 * (using this function ensures only vars is used instead of config)
 * TODO: should eventually also be used in app.ts once it is refactored
 */
export declare function configureDinfraAndVars(dinfraPath: string, dconfigPath: string, configFile: string, configCmdlineOverrides?: Partial<AppConfig>): Promise<{
    dinfra: typeof DinfraTypes;
    vars: Vars;
    logger: DinfraTypes.Logger;
}>;
export declare function processConfig(configPassedIn: AppConfig, configCmdlineOverrides?: Partial<AppConfig>): AppConfig;
