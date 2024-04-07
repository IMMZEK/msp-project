"use strict";
/**
 * Fixed configuration variables - they don't change at run-time
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vars = void 0;
const os = require("os");
const path = require("path");
const util_1 = require("../scripts-lib/util");
const request_1 = require("../lib/request");
const fsutils_1 = require("../utils/fsutils");
const projectRoot = path.join(__dirname, '..', '..');
var Preset;
(function (Preset) {
    Preset.CONTENT_DEVELOPER = 'content-developer';
    Preset.CONTENT_DOWNLOADS = 'content-downloads';
})(Preset || (Preset = {}));
class Vars {
    static PROJECT_ROOT = projectRoot;
    static PORT;
    static RESOURCE_OT_FOUND_MSG = 'Resource not found. Click on the TI Resource Explorer Home Button to refresh all resources.';
    static BUNDLE_LIST_DELIMITER = '::';
    static SUPPORT_MULTIPLE_VERSIONS = true;
    static RELOCATE_PACKAGES;
    static MAILING_LIST;
    static ALLOW_REFRESH_FROM_WEB;
    static REFRESH_DB;
    static BU_HANDOFF_TESTING_SERVER;
    static VERSION_TIREX = require(path.join(projectRoot, 'package.json'))
        .version;
    static TIREX_MIME_TYPES = {
        'text/x-c': ['cmd', 'ino'],
        'application/javascript': ['syscfg'],
        'application/text': ['hex']
    };
    ///////////////////////////////////////////////////////////////////////////
    // Things that should be deprecated
    ///////////////////////////////////////////////////////////////////////////
    static projectRoot = projectRoot; // use PROJECT_ROOT
    static LOCALSERVER; // use this.mode
    static HOST = os.platform(); // call os.platform() directly
    static PACKAGE_LIST_DELIMITER = '::'; // use BUNDLE_LIST_DELIMITER
    static ROLE; // use this.role
    static MODE; // use this.mode
    ///////////////////////////////////////////////////////////////////////////
    // URLs
    ///////////////////////////////////////////////////////////////////////////
    static WEBCOMPONENTSSERVER_BASEURL;
    static REMOTE_BUNDLE_ZIPS;
    static LOCAL_BUNDLE_ZIPS;
    static REMOTESERVER_BASEURL;
    static SYSCONFIG_TEST_SERVER_URL;
    ///////////////////////////////////////////////////////////////////////////
    // For content / zips
    ///////////////////////////////////////////////////////////////////////////
    static CONTENT_BASE_PATH;
    static ZIPS_FOLDER;
    static PACKAGE_MANAGER_FILE;
    static PACKAGE_AUX_DATA_FILE;
    static FOUNDATION_TREE_FILE;
    static CONTENT_PACKAGES_CONFIG;
    static DB_PACKAGE_GROUP_CONFIG_FILE;
    static HANDOFF_CHECKLISTS_FOLDER;
    ///////////////////////////////////////////////////////////////////////////
    // Paths
    ///////////////////////////////////////////////////////////////////////////
    static DB_BASE_PATH;
    static SEO_PATH;
    static DB_PACKAGE_GROUPS_CONFIG_FILE;
    static DB_LOGS_BASE_PATH;
    static BIN_BASE_PATH;
    ///////////////////////////////////////////////////////////////////////////
    // CCS Related
    ///////////////////////////////////////////////////////////////////////////
    static CCS_CLOUD_URL;
    static CCS_LOCALPORT;
    // the path as it exists on the CCS Cloud proxy
    static CCS_CLOUD_IMPORT_PATH = '@ti-rex-content';
    static TARGET_ID_PLACEHOLDER = '_deviceplaceholder_';
    static CCS_CLOUD_API_BASE = '/ide/api/ccsserver/';
    static CCS_DESKTOP_API_BASE;
    static CCS_CREATE_PROJECT_API;
    static CCS_IMPORT_PROJECT_API;
    static CCS_IMPORT_SKETCH_API;
    ///////////////////////////////////////////////////////////////////////////
    // Package metadata related
    ///////////////////////////////////////////////////////////////////////////
    static METADATA_DIR = path.join('.metadata', '.tirex');
    static PACKAGE_TIREX_JSON = 'package.tirex.json';
    static DEPENDENCY_DIR = path.join('.dependencies'); // relative to the METADATA_DIR
    // relative to the DEPENDENCY_DIR
    static IMPLICIT_DEPENDENCY_MAPPING_FILENAME = 'dependency-mapping.json';
    static TOP_CATEGORY = {
        software: { id: 'software', text: 'Software' },
        softwareTools: { id: 'softwareTools', text: 'Software Tools' },
        devices: { id: 'devices', text: 'Device Documentation' },
        devtools: { id: 'devtools', text: 'Development Tools' },
        getByText: (text) => {
            if (text === Vars.TOP_CATEGORY.software.text) {
                return Vars.TOP_CATEGORY.software;
            }
            else if (text === Vars.TOP_CATEGORY.softwareTools.text) {
                return Vars.TOP_CATEGORY.softwareTools;
            }
            else if (text === Vars.TOP_CATEGORY.devices.text) {
                return Vars.TOP_CATEGORY.devices;
            }
            else if (text === Vars.TOP_CATEGORY.devtools.text) {
                return Vars.TOP_CATEGORY.devtools;
            }
            else {
                return null;
            }
        }
    };
    // project files to be excluded from processing while generating dependencies
    static EXCLUDED_PROJECT_FILE = 'SYSCONFIG_GENERATED_FILES.IPCF';
    // SEO
    static DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX = '__duplicateResourceLinks';
    // predefined fields in package.tirex.json
    static METADATA_PKG_DOWNLOAD_ONLY = 'desktopOnly';
    static METADATA_PKG_IMPORT_ONLY = 'desktopImportOnly';
    // dinfra database constants
    static DB_RESOURCE_PREFIX;
    static DB_TABLE_PREFIX;
    static DB_TABLE_PREFIX_AUTO = 'AUTO';
    static DB_TABLE_PREFIX_0 = 'tirex0';
    static DB_TABLE_PREFIX_1 = 'tirex1';
    static DB_META_KEY = 'tirex';
    ///////////////////////////////////////////////////////////////////////////
    // Stuff converted to non-static (to get rid of singleton approach)
    ///////////////////////////////////////////////////////////////////////////
    handoffServer;
    downloadServer;
    mode;
    role;
    testingServer;
    // Urls
    remoteserverUrl;
    remoteBundleZips;
    localBundleZips;
    // For content / zips
    contentBasePath;
    zipsFolder;
    handoffChecklistsFolder;
    packageManagerFile;
    packageAuxDataFile;
    foundationTreeFile;
    rex3Config;
    overridesDir;
    // For database
    dbBasePath;
    contentPackagesConfig;
    // Server config
    httpProxy;
    requestObj;
    serverMode;
    /**
     * Constructor
     *
     * init:
     * @property {String} contentPath
     * @property {String} ccsCloudUrl
     *
     * @constructor
     */
    constructor(config) {
        this.mode = config.mode;
        this.role = config.myRole;
        Vars.RELOCATE_PACKAGES = config.relocatePackages;
        Vars.MAILING_LIST = config.mailingList;
        Vars.BU_HANDOFF_TESTING_SERVER = config.buHandoffTestingServer;
        Vars.PORT = undefined; // set later with the server's actual port
        this.testingServer = config.testingServer;
        if (config.rex3Config) {
            this.rex3Config = (0, util_1.resolvePath)(config.rex3Config, { relative: projectRoot });
        }
        ///////////////////////////////////////////////////////////////////////////
        // projectRoot dependent config
        ///////////////////////////////////////////////////////////////////////////
        if (config.preset === Preset.CONTENT_DEVELOPER) {
            Vars.ALLOW_REFRESH_FROM_WEB = 'true';
            Vars.REFRESH_DB = 'false';
            this.handoffServer = true;
        }
        else if (config.preset === Preset.CONTENT_DOWNLOADS) {
            this.downloadServer = true;
        }
        else {
            Vars.ALLOW_REFRESH_FROM_WEB = config.allowRefreshFromWeb;
            Vars.REFRESH_DB = config.refreshDB;
            this.handoffServer = config.handoffServer;
            this.downloadServer = config.downloadServer;
        }
        ///////////////////////////////////////////////////////////////////////////
        // Database
        ///////////////////////////////////////////////////////////////////////////
        this.dbBasePath = path.normalize(config.dbPath);
        Vars.DB_BASE_PATH = this.dbBasePath;
        Vars.SEO_PATH = path.normalize(config.seoPath);
        if (config.packageGroupsConfigFile) {
            Vars.DB_PACKAGE_GROUPS_CONFIG_FILE = path.normalize(config.packageGroupsConfigFile);
        }
        Vars.DB_LOGS_BASE_PATH = path.join(Vars.DB_BASE_PATH, 'logs');
        Vars.DB_RESOURCE_PREFIX = config.dbResourcePrefix;
        Vars.DB_TABLE_PREFIX = config.dbTablePrefix;
        Vars.DB_PACKAGE_GROUP_CONFIG_FILE = config.packageGroupsConfigFile;
        ///////////////////////////////////////////////////////////////////////////
        // Things that should be deprecated
        ///////////////////////////////////////////////////////////////////////////
        Vars.LOCALSERVER = config.mode;
        Vars.MODE = this.mode;
        Vars.ROLE = this.role;
        ///////////////////////////////////////////////////////////////////////////
        // URLs
        ///////////////////////////////////////////////////////////////////////////
        Vars.WEBCOMPONENTSSERVER_BASEURL = config.webComponentsServer;
        this.remoteBundleZips = config.remoteBundleZips;
        Vars.REMOTE_BUNDLE_ZIPS = this.remoteBundleZips;
        this.localBundleZips = config.localBundleZips;
        Vars.LOCAL_BUNDLE_ZIPS = this.localBundleZips;
        Vars.SYSCONFIG_TEST_SERVER_URL = config.sysconfigTestServerURL;
        this.remoteserverUrl = config.remoteserverHost || '';
        if (this.remoteserverUrl && !this.remoteserverUrl.endsWith('/')) {
            this.remoteserverUrl += '/';
        }
        Vars.REMOTESERVER_BASEURL = this.remoteserverUrl;
        ///////////////////////////////////////////////////////////////////////////
        // For content / zips
        ///////////////////////////////////////////////////////////////////////////
        this.contentBasePath = path.normalize(config.contentPath);
        Vars.CONTENT_BASE_PATH = this.contentBasePath;
        // zipsFolder - remember the default value from config
        if (config.mode === 'remoteserver') {
            this.zipsFolder = config.localBundleZips || path.join(Vars.CONTENT_BASE_PATH, 'zips');
        }
        else {
            this.zipsFolder = config.localBundleZips || path.join(os.tmpdir(), 'tirex', 'zips');
        }
        Vars.ZIPS_FOLDER = this.zipsFolder;
        // handoffChecklistsFolder
        this.handoffChecklistsFolder = path.normalize(config.handoffChecklistsFolder);
        Vars.HANDOFF_CHECKLISTS_FOLDER = this.handoffChecklistsFolder;
        // contentPackagesConfig
        this.contentPackagesConfig = path.isAbsolute(config.contentPackagesConfig)
            ? config.contentPackagesConfig
            : path.join(projectRoot, config.contentPackagesConfig);
        Vars.CONTENT_PACKAGES_CONFIG = this.contentPackagesConfig;
        // packageManagerFile
        const contentConfigPath = path.dirname(config.contentPackagesConfig);
        this.packageManagerFile = path.join(contentConfigPath, 'package-manager.tirex.json');
        Vars.PACKAGE_MANAGER_FILE = this.packageManagerFile;
        // FUTURE: We should get rid of the existsSync calls below as they blocks the main thread;
        // see REX-3545 for details
        // Set packageAuxDataFile. Default to package-aux-data file in content config if available;
        // otherwise fall back to one in tirex core's config
        const packageAuxDataFilename = 'package-aux-data.tirex.json';
        const contentPackageAuxDataFile = path.join(contentConfigPath, packageAuxDataFilename);
        const coreConfigPath = path.join(projectRoot, 'config');
        const corePackageAuxDataFile = path.join(coreConfigPath, packageAuxDataFilename);
        const packageAuxDataFile = (0, fsutils_1.findFirstExistingFileSync)([
            contentPackageAuxDataFile,
            corePackageAuxDataFile
        ]);
        // Setting to default even if it doesn't exist; will be flagged later as error if file is
        // needed.
        //
        // TODO: Better to fail here, if file is actually expected to exist and needed (i.e. on
        // server, but not frontend). But if so, then it may be best to break there vars out into
        // true globals and grouping by backend/frontend those that are not. Either that, or it
        // would have to be changed to string|undefined for all.
        this.packageAuxDataFile = packageAuxDataFile || corePackageAuxDataFile;
        Vars.PACKAGE_AUX_DATA_FILE = this.packageAuxDataFile;
        // Set foundationTreeFile. Default to foundation-tree file in content config if available;
        // otherwise fall back to one in tirex core's config
        const foundationTreeFilename = 'foundation-tree.json';
        const contentFoundationTreeFilepath = path.join(contentConfigPath, foundationTreeFilename);
        const coreFoundationTreeFilepath = path.join(coreConfigPath, foundationTreeFilename);
        const foundationTreeFile = (0, fsutils_1.findFirstExistingFileSync)([
            contentFoundationTreeFilepath,
            coreFoundationTreeFilepath
        ]);
        // Setting to default even if it doesn't exist; will be flagged later as error if needed.
        // TODO: Better to fail here; see above todo above regarding packageAuxDataFile
        this.foundationTreeFile = foundationTreeFile || coreFoundationTreeFilepath;
        Vars.FOUNDATION_TREE_FILE = this.foundationTreeFile;
        // overridesDir
        this.overridesDir = path.join(config.contentPath, 'tirex-package-overrides');
        ///////////////////////////////////////////////////////////////////////////
        // Server config
        ///////////////////////////////////////////////////////////////////////////
        if (config.http_proxy) {
            this.httpProxy = config.http_proxy;
            this.requestObj = (0, request_1.getRequest)(this.httpProxy);
        }
        this.serverMode = config.serverMode;
        ///////////////////////////////////////////////////////////////////////////
        // Paths
        ///////////////////////////////////////////////////////////////////////////
        // ensure this is a fast/local drive for better performance
        Vars.BIN_BASE_PATH = path.join(projectRoot, 'bin');
        ///////////////////////////////////////////////////////////////////////////
        // CCS Related
        ///////////////////////////////////////////////////////////////////////////
        Vars.CCS_CLOUD_URL = config.ccsCloudUrl;
        Vars.CCS_LOCALPORT = config.ccs_port;
        Vars.CCS_DESKTOP_API_BASE = Vars.CCS_CLOUD_API_BASE + 'ide/';
        Vars.CCS_CREATE_PROJECT_API = Vars.CCS_CLOUD_API_BASE + 'createProject';
        Vars.CCS_IMPORT_PROJECT_API = Vars.CCS_CLOUD_API_BASE + 'importProject';
        Vars.CCS_IMPORT_SKETCH_API = Vars.CCS_CLOUD_API_BASE + 'importSketch';
    }
}
exports.Vars = Vars;
