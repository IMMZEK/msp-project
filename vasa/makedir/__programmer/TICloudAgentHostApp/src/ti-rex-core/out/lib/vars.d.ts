/**
 * Fixed configuration variables - they don't change at run-time
 */
/// <reference types="node" />
import * as request from 'request';
import { AppConfig, Mode } from './appConfig';
import { PackageType } from './dbBuilder/dbTypes';
export type MANAGED_DB_TABLE_PREFIX = 'tirex0' | 'tirex1';
export declare class Vars {
    static readonly PROJECT_ROOT: string;
    static PORT?: number;
    static readonly RESOURCE_OT_FOUND_MSG = "Resource not found. Click on the TI Resource Explorer Home Button to refresh all resources.";
    static readonly BUNDLE_LIST_DELIMITER = "::";
    static readonly SUPPORT_MULTIPLE_VERSIONS = true;
    static RELOCATE_PACKAGES?: boolean;
    static MAILING_LIST: string;
    static ALLOW_REFRESH_FROM_WEB: string;
    static REFRESH_DB: string;
    static BU_HANDOFF_TESTING_SERVER: boolean;
    static readonly VERSION_TIREX: string;
    static readonly TIREX_MIME_TYPES: {
        'text/x-c': string[];
        'application/javascript': string[];
        'application/text': string[];
    };
    static readonly projectRoot: string;
    static LOCALSERVER: string;
    static readonly HOST: NodeJS.Platform;
    static readonly PACKAGE_LIST_DELIMITER = "::";
    static ROLE: string;
    static MODE: Mode;
    static WEBCOMPONENTSSERVER_BASEURL: string;
    static REMOTE_BUNDLE_ZIPS: string;
    static LOCAL_BUNDLE_ZIPS: string;
    static REMOTESERVER_BASEURL?: string;
    static SYSCONFIG_TEST_SERVER_URL: string;
    static CONTENT_BASE_PATH: string;
    static ZIPS_FOLDER: string;
    static PACKAGE_MANAGER_FILE: string;
    static PACKAGE_AUX_DATA_FILE: string;
    static FOUNDATION_TREE_FILE: string;
    static CONTENT_PACKAGES_CONFIG: string;
    static DB_PACKAGE_GROUP_CONFIG_FILE?: string;
    static HANDOFF_CHECKLISTS_FOLDER: string;
    static DB_BASE_PATH: string;
    static SEO_PATH: string;
    static DB_PACKAGE_GROUPS_CONFIG_FILE?: string;
    static DB_LOGS_BASE_PATH: string;
    static BIN_BASE_PATH: string;
    static CCS_CLOUD_URL: string;
    static CCS_LOCALPORT?: string;
    static readonly CCS_CLOUD_IMPORT_PATH = "@ti-rex-content";
    static readonly TARGET_ID_PLACEHOLDER = "_deviceplaceholder_";
    static readonly CCS_CLOUD_API_BASE = "/ide/api/ccsserver/";
    static CCS_DESKTOP_API_BASE: string;
    static CCS_CREATE_PROJECT_API: string;
    static CCS_IMPORT_PROJECT_API: string;
    static CCS_IMPORT_SKETCH_API: string;
    static readonly METADATA_DIR: string;
    static readonly PACKAGE_TIREX_JSON = "package.tirex.json";
    static readonly DEPENDENCY_DIR: string;
    static readonly IMPLICIT_DEPENDENCY_MAPPING_FILENAME = "dependency-mapping.json";
    static readonly TOP_CATEGORY: {
        software: {
            id: PackageType;
            text: string;
        };
        softwareTools: {
            id: PackageType;
            text: string;
        };
        devices: {
            id: PackageType;
            text: string;
        };
        devtools: {
            id: PackageType;
            text: string;
        };
        getByText: (text: string) => {
            id: PackageType;
            text: string;
        } | null;
    };
    static readonly EXCLUDED_PROJECT_FILE = "SYSCONFIG_GENERATED_FILES.IPCF";
    static readonly DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX = "__duplicateResourceLinks";
    static readonly METADATA_PKG_DOWNLOAD_ONLY = "desktopOnly";
    static readonly METADATA_PKG_IMPORT_ONLY = "desktopImportOnly";
    static DB_RESOURCE_PREFIX: string;
    static DB_TABLE_PREFIX: string;
    static readonly DB_TABLE_PREFIX_AUTO = "AUTO";
    static readonly DB_TABLE_PREFIX_0 = "tirex0";
    static readonly DB_TABLE_PREFIX_1 = "tirex1";
    static readonly DB_META_KEY = "tirex";
    handoffServer: boolean;
    downloadServer: boolean;
    mode: Mode;
    role: string;
    testingServer: boolean;
    remoteserverUrl: string;
    remoteBundleZips: string;
    localBundleZips: string;
    contentBasePath: string;
    zipsFolder: string;
    handoffChecklistsFolder: string;
    packageManagerFile: string;
    packageAuxDataFile: string;
    foundationTreeFile: string;
    rex3Config: string;
    overridesDir: string;
    dbBasePath: string;
    contentPackagesConfig: string;
    httpProxy: string;
    requestObj: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
    serverMode: 'https' | 'http' | 'both';
    /**
     * Constructor
     *
     * init:
     * @property {String} contentPath
     * @property {String} ccsCloudUrl
     *
     * @constructor
     */
    constructor(config: AppConfig);
}
