"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manage = exports.ConsoleVerbosity = void 0;
const callbacks_1 = require("../utils/callbacks");
const types_js_1 = require("./db/types.js");
const session_js_1 = require("./db/session.js");
const util_1 = require("./util");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const util_2 = require("../shared/util");
const dbTypes = require("../lib/dbBuilder/dbTypes.js");
const fs = require("fs-extra");
const util = require("util");
const path = require("path");
const StreamArray = require("stream-json/streamers/StreamArray");
const url = require("url");
const _ = require("lodash");
const vars_1 = require("../lib/vars");
// Flags, most of which are temporary
// TODO: Move any that are permanent into options
const PRUNE_TREE = false;
const REPORT_MEM_USAGE = false;
const CREATE_HEAPDUMP_SNAPSHOTS = false;
const PERFORM_GC = false;
// Temporarily disabling population of tables used solely for calculating descendant counts as
// the feature isn't currently used by UI -- and will likely take another approach anyway due to
// the table's large size (24G as of 1/23/2019).
const POPULATE_DESCENDANT_COUNT_TABLES = false;
const READ_CHAR = '.';
const TREE_CHAR = '-';
const WRITE_CHAR = '+';
// TODO: Move filter chunking regex into json
// Keyword filter chunking rules used to chunk strings containing multiple keywords that aren't
// separated by a non-alphabetic character or case (camel or all caps).
// E.g. 'tirtos' => ['ti', 'rtos], 'uartdemo' => ['uart', 'demo']
//
// The current rules were determined by searching the latest package groups (as of Jan-2019) in the
// database for chunks that needed to be broken down further to satisfy search keywords from the
// top 150 REX v3 searches (from 2018-02-01 to 2019-01-31).  The following sql query was used to
// against each individual search keyword:
//     select f.name, f.type, group_concat(distinct x.filter_segment)
//     from tirexfilters f
//     left join tirexfilters_x_chunks x on x.filter_id = f.id
//     where
//   	 f.package_group_id in (@PACKAGE_GROUP_ID_LIST)
//    	 and f.name rlike '([a-z]@KEYWORD)|(@KEYWORD[a-z])'
//    	 and f.type <> 'freq-chunk'
//     group by 1, 2;
const FILTER_CHUNKING_REGEX = new RegExp('(' +
    [
        /(?:keyboard|board|(?<!scale)dma|rtos|bus|blinky?|link|hz|launch(pad)|interrupts?)/,
        /(?:projects?|ccs|master|slave|single|multi(ple)?|uart|boost(er|xl)|spi|timers?)/,
        /(?:(?<!bro)adc|pwm|flash|gpio|sensor|control(ler)?|simple|nvs|echo|buttons?|mqtt)/,
        /(?:sleep|power|fatsd|temperature|config|usb|aes|driver|serial|fft|bios|queue)/,
        /(?:(?<=outof)box|out(?=ofbox)|i2c|apps|stack|sample|snmp|(?<=[kx])led|lib(?!(ra)))/
    ]
        .map((regex) => regex.source)
        .join('|') +
    ')');
// TODO: Move excluded keywords into json, or/and find a package to do most of this
// Keywords to exclude from node name based filters (based on analysis of keywords in metadata)
const NODE_NAME_KEYWORDS_TO_EXCLUDE = new Set([
    'an',
    'and',
    'are',
    'as',
    'at',
    'by',
    'for',
    'from',
    'has',
    'have',
    'he',
    'her',
    'hers',
    'him',
    'his',
    'if',
    'in',
    'into',
    'is',
    'it',
    'its',
    'may',
    'me',
    'my',
    'of',
    'on',
    'or',
    'our',
    'she',
    'so',
    'than',
    'that',
    'the',
    'their',
    'then',
    'these',
    'them',
    'they',
    'this',
    'those',
    'through',
    'to',
    'us',
    'was',
    'we',
    'use',
    'will',
    'with',
    'within',
    'without',
    'you',
    'your',
    'yours'
]);
// Keywords to exclude from resource description based filters (based on analysis of keywords in
// metadata)
// This is a superset of the node name keyword exclusion set. It exists because the importance and
// quality of keywords in node names is higher than that in descriptions. E.g. Keyword 'about' is
// here but not in the name exclusion set because it appears in node "Everything You Need to Know
// About TI FRAM-Based MSP430 Devices", where it has more importance than that typically seen in
// descriptions; and it could be used even more prominently, such as "About Product X".
const DESCR_KEYWORDS_TO_EXCLUDE = new Set([
    ...NODE_NAME_KEYWORDS_TO_EXCLUDE,
    'about',
    'above',
    'achieve',
    'across',
    'additional',
    'additionally',
    'after',
    'allow',
    'allows',
    'along',
    'against',
    'all',
    'alongside',
    'also',
    'am',
    'another',
    'any',
    'appropriate',
    'based',
    'be',
    'because',
    'become',
    'begin',
    'being',
    'below',
    'best',
    'between',
    'both',
    'but',
    'can',
    'certain',
    'commonly',
    'compared',
    'completely',
    'considerably',
    'considered',
    'containing',
    'contains',
    'demonstrates',
    'do',
    'documented',
    'dramatically',
    'each',
    'ended',
    'enough',
    'entering',
    'etc',
    'every',
    'first',
    'fully',
    'getting',
    'go',
    'greatly',
    'highly',
    'how',
    'includes',
    'including',
    'intensive',
    'less',
    'like',
    'many',
    'means',
    'might',
    'mine',
    'minimizes',
    'more',
    'most',
    'need',
    'new',
    'no',
    'not',
    'offers',
    'ok',
    'only',
    'others',
    'over',
    'perform',
    'powerful',
    'practical',
    'prior',
    'progressing',
    'provide',
    'provided',
    'provides',
    'quickly',
    'recommend',
    'related',
    'relates',
    'relies',
    'resemble',
    'robust',
    'same',
    'several',
    'seamlessly',
    'showing',
    'shows',
    'simple',
    'some',
    'specific',
    'start',
    'started',
    'starting',
    'supports',
    'taking',
    'toward',
    'towards',
    'typically',
    'underlying',
    'understand',
    'unfamiliar',
    'used',
    'uses',
    'using',
    'various',
    'very',
    'want',
    'what',
    'when',
    'where',
    'which',
    'while',
    'widely',
    'written',
    'yes'
]);
// Regex for identifying chinese characters.
// Source: http://flyingsky.github.io/2018/01/26/javascript-detect-chinese-japanese
// TODO!: Replace with 3rd party module?
const CHINESE_REGEX = /[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u3300-\u33ff]|[\ufe30-\ufe4f]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]/u;
const loggerService = 'rexdb';
var ConsoleVerbosity;
(function (ConsoleVerbosity) {
    ConsoleVerbosity[ConsoleVerbosity["Quiet"] = 0] = "Quiet";
    ConsoleVerbosity[ConsoleVerbosity["ProgressOnly"] = 1] = "ProgressOnly";
    ConsoleVerbosity[ConsoleVerbosity["Normal"] = 2] = "Normal";
    ConsoleVerbosity[ConsoleVerbosity["Verbose"] = 3] = "Verbose";
    ConsoleVerbosity[ConsoleVerbosity["VeryVerbose"] = 4] = "VeryVerbose";
})(ConsoleVerbosity || (exports.ConsoleVerbosity = ConsoleVerbosity = {}));
const importOptionsDefaults = {
    skipExistingPackages: true,
    writeToDb: true
};
const defaultContentSourceDeleteOptions = {
    types: ['pkggrp', 'devset'],
    states: ['incomplete', 'imported', 'unpublished'],
    age: 7 * 24 * 3600 // 1 week
};
const profilingNodeFilters = false;
class Manage {
    db;
    logger;
    console;
    config;
    packages;
    dinfra;
    // TODO: Take another look at tracing, don't particularly love this.
    // TODO: Tracing needs to be more comprehensive, particularly on the SQL side
    TRACE0;
    TRACE;
    dbSession;
    treeRoot;
    filterCache;
    filterDevSetCache;
    freqChunkFiltersByStdFilters;
    constructor(db, logger, console, config, dinfraLibPath, packages) {
        this.db = db;
        this.logger = logger;
        this.console = console;
        this.config = config;
        this.packages = packages;
        this.dinfra = require(config.dinfraPath);
        const denum = require(dinfraLibPath + '/denum');
        this.TRACE0 = denum.configureTrace(this.TRACE, 'x:', config.trace);
        this.TRACE = (...args) => {
            (0, util_1.safeTrace)(this.TRACE0, ...args);
        };
        this.dinfra = require(config.dinfraPath);
        this.reset();
        this.dbSession = new session_js_1.DbSession(this.logger, config);
    }
    reset() {
        this.treeRoot = null;
        this.filterCache = new Map();
        this.filterDevSetCache = new Map();
    }
    /**
     * Create new database, clearing database if it already exists.
     */
    async createDb() {
        // TODO: Either remove db wipe, or enable on when in production and then
        // only when explicitly enabled by option
        this.reset();
        await this.dbSession.openConnection(true);
        try {
            this.console.progress('Creating REX database ');
            // TODO: Once dinfra upgrade issues have been fixed (e.g. "unknown type smallint"):
            // First truncate all rex tables and perform schema upgrade. If that fails, then
            // proceed with current approach of table drop and db create. Will also need to
            // deal with dinfra schema upgrade version detection which is problematic; maybe be
            // best to continue just forcing schema upgrade regardless of schema version.
            // Get the names of all tables currently in db with table prefix
            const tableNames = _.uniq([
                ..._.map(await this.dbSession.getConnection().query('get-rex-tables', 'select table_name from information_schema.tables ' +
                    'where table_schema = "ticloudtools" ' +
                    'and table_name like ? ' +
                    // '%tirex%' check guards against accidental table deletion, just in
                    // case the table prefix falls in any non-rex table names
                    'and table_name like "%tirex%"', [this.config.tablePrefix + '%']), (r) => r.table_name),
                // need to include tables defined in schema to ensure that they're dropped if the
                // table prefix doesn't include 'tirex' (see above sql query)
                ..._.values(this.db.tables)
            ]);
            // Drop all rex tables
            await this.dbSession
                .getConnection()
                .query('drop-tables', 'drop table if exists ' + tableNames.join());
            // Delete rex's dinfra_schema row to skip version check and force upgrade
            await this.dbSession
                .getConnection()
                .query('delete-rex-schema-version', 'delete ignore from dinfra_schema where prefix = ?', [this.config.tablePrefix]);
            // Create db tables (schema is created not upgraded since all tables were dropped)
            await this.updateSchema();
            // Create foundation tree
            await this.importFoundationTree();
            this.console.progressOnly(' (done)\n');
        }
        finally {
            await this.dbSession.closeConnection();
        }
    }
    async updateSchema() {
        // TODO: Verify that dinfra has been configured
        // TODO: Add an enable-schema-upgrade argument; or alternatively move into another function
        // TODO: If schema upgrade is made optional, then add check to see if it's necessary
        const upgrade = await this.dinfra.openSchemaUpgrade(loggerService, '' // no prefix
        );
        try {
            await upgrade.upgrade(this.config.tablePrefix, require('../../config/sqldb/rexdb-schema.json'));
        }
        catch (e) {
            try {
                await upgrade.close();
            }
            catch (e) {
                // ignore exceptions on close
            }
            throw e.length === 1 ? e[0] : e;
        }
        await upgrade.close();
    }
    /**
     * Create and persist the top-level REX Foundation Tree
     */
    async importFoundationTree() {
        const foundationTreeDefinitionFile = vars_1.Vars.FOUNDATION_TREE_FILE;
        this.console.log('Importing Foundation Tree from: ' + foundationTreeDefinitionFile);
        let rootNode = null;
        await this.dbSession.openConnection(true);
        try {
            // Query for root node, to verify that it doesn't yet exist
            const rows = await this.dbSession
                .getConnection()
                .query('manage-get-root', `select * from ${this.db.tables.nodes} where parent_id is null`);
            if (!_.isEmpty(rows)) {
                throw new Error('Root node already exists in database');
            }
            // Import the Foundation Tree from its definition starting at root
            rootNode = {
                ...createNode('ROOT'),
                isFoundation: true,
                isContentSubTreeHead: false,
                publicId: (0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)('ROOT')
            };
            const foundationTreeDefinition = await fs.readJson(foundationTreeDefinitionFile);
            this.addChildrenToFoundationTree(rootNode, foundationTreeDefinition.root.children);
            // And save it to db
            await this.writeFoundationTreeToDb(rootNode);
        }
        finally {
            await this.dbSession.closeConnection();
        }
        this.treeRoot = rootNode;
    }
    /**
     * Import a new Package Group.
     *
     * @param {Object} packageGroupJsons - the Package Group definitions
     * @param {string} dir - where packages are located
     * @param {string} filterDevSetId - Device/devtool Set id (defaults to current default if null)
     * @param {Object} options
     *
     * Fails if a Package Group with the same Public ID has already been imported.
     */
    async importPackageGroups(dir, packageGroupJsons, filterDevSetId, options = {}) {
        options = this.getOptions(options);
        let packageGroupsInDb;
        // Get package groups in db
        if (options.skipExistingPackages) {
            packageGroupsInDb = await this.packages.getPackageGroups({
                states: ['imported', 'published', 'unpublished']
            });
        }
        // Create list of package groups to import, with groups already in
        // db removed from given list if options.skipExistingPackages
        let packageGroupsToImport = [];
        if (_.isEmpty(packageGroupsInDb)) {
            packageGroupsToImport = packageGroupJsons;
        }
        else {
            const groupUidsToSkip = [];
            for (const packageGroupJson of packageGroupJsons) {
                const packageGroup = packageGroupFromJson(packageGroupJson);
                if (packageGroupsInDb.find((packageGroupInDb) => packageGroup.publicVId === packageGroupInDb.publicVId)) {
                    groupUidsToSkip.push(packageGroup.publicVId);
                }
                else {
                    packageGroupsToImport.push(packageGroupJson);
                }
            }
            if (!_.isEmpty(groupUidsToSkip)) {
                this.console.log("Skipping import of the following Package Groups as they're already in " +
                    'database:');
                this.console.log('  ' + groupUidsToSkip.join('\n  '));
            }
        }
        // Import package groups
        const packageGroupInternalIds = [];
        const modulePackageGroups = [];
        for (const packageGroup of packageGroupsToImport) {
            const packageGroupInfo = await this.importPackageGroup(packageGroup, dir, filterDevSetId, options);
            packageGroupInternalIds.push(packageGroupInfo.internalId);
            if (packageGroupInfo.moduleGroup) {
                modulePackageGroups.push(packageGroupInfo);
            }
        }
        // Verify that exactly one and only one module group is the default within each set of module groups that share
        // the same core
        const moduleGroupSetsWithoutExactlyOneDefault = _.chain(modulePackageGroups)
            // group module groups by their core packages
            .groupBy((pg) => (0, dbBuilderUtils_1.formUid)(pg.moduleGroup.corePackage.packageId, pg.moduleGroup.corePackage.versionRange))
            // filter out module groups that don't have prop defaultModuleGroup
            .mapValues((groupValues) => _.filter(groupValues, (pg) => !!(pg.moduleGroup && pg.moduleGroup.defaultModuleGroup)))
            // filter out module group sets that have exactly one defaultModuleGroup
            .pickBy((v) => v.length !== 1)
            .value();
        if (!_.isEmpty(moduleGroupSetsWithoutExactlyOneDefault)) {
            const errors = _.map(moduleGroupSetsWithoutExactlyOneDefault, (groups, id) => `${id}: ` +
                (groups.length
                    ? 'Multiple defaults specified: ' +
                        _.map(groups, (pg) => (0, dbBuilderUtils_1.formUid)(pg.internalId.publicId, pg.internalId.version)).join(', ')
                    : 'No default specified')).join('; ');
            throw new Error(`Exactly one module group must be specified as the default: ${errors}`);
        }
        return packageGroupInternalIds;
    }
    /**
     * Re-import a Package Group.
     *
     * @param {Object} packageGroups - the Package Groups
     * @param {string} dir - where packages are located
     * @param {string} filterDevSetId - Device/devtool Set id (defaults to current default if null)
     *
     * Fails if a Package Group with the same Public ID hasn't already been imported.
     */
    reimportPackageGroups(_dir, _packageGroups, _filterDevSetId) {
        // TODO?: Can already re-import using existing API without further changes.
        // However may implement this in the future for convenience.
    }
    /**
     * Publish a Package Group. If another earlier Package Group exists with the
     * same vpublic id, unpublish it. If multiple Package Group exist with the
     * same vpublic id, publish the latest.
     *
     * @param {string} packageGroupVPublicId - package group's versioned public id
     */
    async publishPackageGroup(publicVId) {
        await this.publishContentSource('pkggrp', publicVId);
    }
    /**
     * Publish a FilterDevSet. If another earlier FilterDevSet exists with the same vpublic
     * id, unpublish it. If multiple FilterDevSets exist with the same vpublic id,
     * publish the latest.
     *
     * @param {string} filterDevSetVPublicId - FilterDevSet's versioned public id
     */
    async publishFilterDevSet(publicVId) {
        await this.publishContentSource('devset', publicVId);
    }
    /**
     * Unpublish a Package Group.
     *
     * @param {string} packageGroupVPublicId - package group's versioned public id
     */
    async unpublishPackageGroup(publicVId) {
        await this.unpublishContentSource('pkggrp', publicVId);
    }
    /**
     * Unpublish a FilterDevSet.
     *
     * @param {string} filterDevSetVPublicId - FilterDevSet's versioned public id
     */
    async unpublishFilterDevSet(publicVId) {
        await this.unpublishContentSource('devset', publicVId);
    }
    /**
     * Import a Device/Devtool Set.
     *
     * @param {string} dir - where devices and devtool DB JSON files are located
     * @param {string} filterDevSetId - the new set's Public ID
     * @param {string} devicesFilename - defaults to devices.db if null
     * @param {string} devtoolsFilename - defaults to devtools.db if null
     *
     * Fails if a device/devtool set already exists with the same public id.
     */
    async importFilterDevSet(dir, filterDevSetPubId, devicesFilename = 'devices.db', devtoolsFilename = 'devtools.db') {
        this.console.progress(`Importing devset ${filterDevSetPubId} `);
        const start = process.hrtime();
        const filterDevSet = this.createFilterDevSet(filterDevSetPubId);
        filterDevSet.state = 'incomplete';
        filterDevSet.stateUpdated = filterDevSet.created = Math.floor(Date.now() / 1000);
        const publicVId = (0, types_js_1.stringToVPublicId)(filterDevSetPubId);
        filterDevSet.publicId = publicVId.publicId;
        filterDevSet.version = publicVId.version;
        if (filterDevSet.publicId !== 'devset') {
            throw new Error("FilterDevSet Public ID's first segment must be 'devset'");
        }
        const devices = filterDevSet.devices;
        const devtools = filterDevSet.devtools;
        const outstandingDevices = {};
        await this.dbSession.openConnection(true);
        try {
            // Import devices
            await this.parseDeviceFile(path.join(dir, devicesFilename), outstandingDevices, devices);
            // Import devtools
            await this.parseDevtoolFile(path.join(dir, devtoolsFilename), devices, devtools);
            // Save FilterDevSet to db
            this.console.log('Writing DevSet ' + filterDevSet.publicVId + ' to database');
            await this.writeFilterDevSet(filterDevSet);
            // Hook up devices to their DevSet via device.devSetId
            for (const device of Object.values(devices)) {
                device.devSetId = filterDevSet.id;
            }
            // Save devices to db
            this.logger.info('Writing devices to database');
            // Save devices in batches, starting with those without parents, then their children,
            // and so on.
            let unwrittenDevices = Object.values(devices);
            let devicesToWriteNext;
            do {
                // Write both unwritten devices without parents and unwritten devices with
                // parents that have already been persisted (since we need the parent's id)
                [devicesToWriteNext, unwrittenDevices] = _.partition(unwrittenDevices, (device) => !device.id && (!device.parent || device.parent.id));
                await this.writeDevicesToDb(devicesToWriteNext);
            } while (!_.isEmpty(unwrittenDevices));
            // Save DevTools, its filters, and associations to db
            // Write devtools to database
            this.logger.info('Writing devtools to database');
            // Gather up for insertion into DB all unsaved devices without
            // parents or with parents that have already been saved.
            const devtoolsToWrite = [];
            Object.keys(devtools).forEach((key) => {
                const devtool = devtools[key];
                devtool.devSetId = filterDevSet.id;
                devtoolsToWrite.push(devtool);
            });
            if (!_.isEmpty(devtoolsToWrite)) {
                // Write devtools
                await this.writeDevToolsToDb(devtoolsToWrite);
                // Write devtool filters, one per devtool
                await this.writeDevtoolHasDevicesToDb(devtoolsToWrite);
            }
            // Change FilterDevSet's state to imported
            await this.updateContentSourceState(filterDevSet, 'imported');
        }
        finally {
            await this.dbSession.closeConnection();
        }
        const time = (0, util_1.hrtimeToSec)(process.hrtime(start));
        this.console.log('DevSet imported');
        this.console.progressOnly(' (done)');
        this.console.progressOnly(` (${time.toFixed(2)}s)\n`);
    }
    /**
     * Legacy Import - import all of the given package groups in the given directory
     * matching the given filters.
     */
    async import(dir, _filters, packageGroups, options) {
        const filterDevSetId = 'devset__1.0.0.0';
        options = this.getOptions(options);
        // Load default dev set, filters and foundation tree, if not already loaded
        await this.dbSession.openConnection(true);
        try {
            // Get default FilterDevSet; tries to load from db if not in cache
            const filterDevSet0 = await this.getFilterDevSet(filterDevSetId);
            if (filterDevSet0 == null) {
                // FilterDevSet not in cache or db. So import into db.
                await this.importFilterDevSet(dir, filterDevSetId);
            }
            await this.publishFilterDevSet(filterDevSetId);
            // NOTE: 2nd open necessary (for now) due to inner close
            await this.dbSession.openConnection(true);
            // Load foundation tree (if not yet loaded)
            if (this.treeRoot == null) {
                await this.loadFoundationTree();
            }
            const internalIds = await this.importPackageGroups(dir, packageGroups, filterDevSetId, options);
            // Publish package groups
            for (const internalId of internalIds) {
                await this.publishPackageGroup((0, types_js_1.publicVIdToString)(internalId));
            }
            this.console.log('Import complete');
        }
        finally {
            await this.dbSession.closeConnection();
        }
    }
    /**
     * Delete from the database Content Sources matching the given criteria.
     *
     * All rows belonging to the Content Source are deleted, except for its row in table
     * content_sources which is marked 'deleted'.
     *
     * Deletions are performed in batches and not transactionally for performance.
     *
     * Default options were chosen for cloud maintenance operations, due to the high potential
     * impact of an erroneous option while deleting from the cloud.
     *
     * @param options - Criteria by which content sources are selected for deletion. See
     *   {@link defaultContentSourceDeleteOptions} for defaults.
     */
    async deleteContentSource(options = {}) {
        // Get full options
        const { types, states, age } = {
            ...defaultContentSourceDeleteOptions,
            ...options
        };
        // Find matching content sources to delete, oldest first.
        const youngestStateChange = Date.now() - age * 1000;
        // Also delete any content sources that are partially deleted (due to possible
        // interruption or some other issue).
        const statesToDelete = [...states, 'deleting'];
        const contentSources = (await this.db.simpleQuery('get-content-sources-to-delete', `select s.* ` +
            `from ${this.db.tables.contentSources} s ` +
            `where s.type in ( ? ) ` +
            `  and s.state in ( ? ) ` +
            `  and s.state_updated < ? ` +
            `order by s.state_updated`, [types, statesToDelete, youngestStateChange] // oldest first,
        )).map((row) => (0, types_js_1.rowToContentSource)(row));
        this.logger.info(`Deleting the ${contentSources.length} content sources with type in ${types}, ` +
            `state in ${statesToDelete}, with state change on or before ${youngestStateChange}`);
        // Delete one Content Source at a time.
        for (const contentSource of contentSources) {
            // Set state to 'deleting' first so that it'll be deleted later if something goes
            // wrong part of the way through.
            await this.updateContentSourceState(contentSource, 'deleting');
            let deletedRows = 0;
            if (contentSource.type === 'devset') {
                // Delete all of the devset's rows with the exception of content_sources.
                // let start = process.hrtime();
                deletedRows += (await this.db.manipulate('delete-devset-devtools', `delete from dt, x ` +
                    `using ${this.db.tables.devtools} dt ` +
                    `  left join ${this.db.tables.devtoolDevices} x on x.devtool_id = dt.id ` +
                    `where dt.devset_id = ?`, [contentSource.id])).affectedRows;
                // TODO! Add back once console verbosity hooked in
                // this.console.progress(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
                // Delete devset's device rows
                // start = process.hrtime();
                deletedRows += (await this.db.manipulate('delete-devset-devices', `delete from ${this.db.tables.devices} dv where dv.devset_id = ?`, [contentSource.id])).affectedRows;
                // TODO! Add back once console verbosity hooked in
                // this.console.progress(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
            }
            else if (contentSource.type === 'pkggrp') {
                // Delete all of the package group's rows with the exception of content_sources.
                // Delete the package group's chunk table rows, and the rows of tables that
                // reference them with an indexed column.
                // let start = process.hrtime();
                deletedRows += await this.deletePackageGroupChildRows(contentSource.id, 'chunk', `select min(c.id) minId, max(c.id) maxId ` +
                    `from ${this.db.tables.chunks} c ` +
                    `where c.package_group_id = ? `, `delete from c, xfc, tsc ` +
                    `using ${this.db.tables.chunks} c ` +
                    `  left join ${this.db.tables.filtersXChunks} xfc ` +
                    `    on xfc.chunk_id = c.id ` +
                    `  left join ${this.db.tables.trailingSubChunks} tsc ` +
                    `    on tsc.chunk_id = c.id ` +
                    `where c.package_group_id = ? ` +
                    `  and c.id between ? and ?`, 100);
                // TODO! Add back once console verbosity hooked in
                // this.console.progress(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
                // Delete the package group's filter table rows, and the rows of tables that
                // reference them with an indexed column.
                // start = process.hrtime();
                deletedRows += await this.deletePackageGroupChildRows(contentSource.id, 'filter', `select min(f.id) minId, max(f.id) maxId ` +
                    `from ${this.db.tables.filters} f ` +
                    `where f.package_group_id = ? `, `delete from f, xfn, xfnc ` +
                    `using ${this.db.tables.filters} f ` +
                    `  left join ${this.db.tables.filterAffectsNode} xfn ` +
                    `    on xfn.filter_id = f.id ` +
                    `  left join ${this.db.tables.filterAffectsNodeCDesc} xfnc ` +
                    `    on xfnc.filter_id = f.id ` +
                    `where f.package_group_id = ? ` +
                    `  and f.id between ? and ?`, 10);
                // TODO! Add back once console verbosity hooked in
                // this.console.progress(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
                // Delete the package group's node table rows, and the rows of tables that
                // reference them with an indexed column.
                // start = process.hrtime();
                deletedRows += await this.deletePackageGroupChildRows(contentSource.id, 'node', `select min(n.id) minId, max(n.id) maxId ` +
                    `from ${this.db.tables.nodes} n ` +
                    `where n.content_source_id = ? `, `delete from n, xa, xr, xia ` +
                    `using ${this.db.tables.nodes} n ` +
                    `  left join ${this.db.tables.nodeAncestors} xa ` +
                    `    on xa.node_id = n.id ` +
                    `  left join ${this.db.tables.nodeDevResourceGroups} xr ` +
                    `    on xr.node_id = n.id ` +
                    `  left join ${this.db.tables.nodePublicIds} xia ` +
                    `    on xia.node_id = n.id ` +
                    `where n.content_source_id = ? ` +
                    `  and n.id between ? and ?`, 100);
                // TODO! Add back once console verbosity hooked in
                // this.console.progress(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
                // Delete the package group's resource table rows, and the rows of tables that
                // reference them with an indexed column.
                // start = process.hrtime();
                deletedRows += await this.deletePackageGroupChildRows(contentSource.id, 'resource', `select min(r.id) minId, max(r.id) maxId ` +
                    `from ${this.db.tables.resources} r ` +
                    `where r.package_id in ( ` +
                    `  select xsp.package_id ` +
                    `  from ${this.db.tables.contentSourcePackages} xsp ` +
                    `  where xsp.content_source_id = ? ` +
                    `) `, `delete from r, xsp, xrdv, xrdt, xrf ` +
                    `using ${this.db.tables.resources} r ` +
                    `  join ${this.db.tables.contentSourcePackages} xsp ` +
                    `    on xsp.package_id = r.package_id ` +
                    `  left join ${this.db.tables.resourceDevices} xrdv ` +
                    `    on xrdv.resource_id = r.id ` +
                    `  left join ${this.db.tables.resourceDevtools} xrdt ` +
                    `    on xrdt.resource_id = r.id ` +
                    `  left join ${this.db.tables.resourceFilters} xrf ` +
                    `    on xrf.resource_id = r.id ` +
                    `where xsp.content_source_id = ? ` +
                    `  and r.id between ? and ?`, 1000);
                // TODO! Add back once console verbosity hooked in
                // this.console.progress(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
                // Delete rows from the package-group-package associative table, and related
                // package, package-alias, resource-group, and resource-group-node rows.
                // start = process.hrtime();
                deletedRows += (await this.db.manipulate('delete-pkggrp-packages', `delete from xsp, p, pa, pd, rg, rgn ` +
                    `using ${this.db.tables.contentSourcePackages} xsp ` +
                    `  left join ${this.db.tables.packages} p on p.id = xsp.package_id ` +
                    `  left join ${this.db.tables.packageAliases} pa on pa.package_id = p.id ` +
                    `  left join ${this.db.tables.packageDepends} pd on pd.package_id = p.id ` +
                    `  left join ${this.db.tables.resourceGroups} rg on rg.package_id = p.id ` +
                    `  left join ${this.db.tables.resourceGroupNodes} rgn ` +
                    `    on rgn.resource_group_id = rg.id ` +
                    `where xsp.content_source_id = ? `, [contentSource.id])).affectedRows;
                // TODO! Add back once console verbosity hooked in
                // this.console.progress(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
                // Delete rows from the node custom resource id table.
                // start = process.hrtime();
                deletedRows += (await this.db.manipulate('delete-node-custom-res-ids', `delete from ${this.db.tables.nodeCustomResourceIds} ` +
                    `  where package_group_id = ?`, [contentSource.id])).affectedRows;
                // console.log(`Delete time: ${hrtimeToSec(process.hrtime(start))}s`);
                // Clear the main_package_id column in content_sources since the package it
                // referenced has been deleted.
                await this.db.manipulate('clear-main-package-id', `update ${this.db.tables.contentSources} cs ` +
                    `set cs.main_package_id = null ` +
                    `where cs.id = ? `, [contentSource.id]);
            }
            else {
                (0, util_2.assertNever)(contentSource.type);
                throw new Error('Invalid content source type: ' + contentSource.type);
            }
            this.logger.finer(`deleted content source ... ${contentSource.type} ... ` +
                `${deletedRows} rows deleted`);
            // Set state to 'deleted'
            await this.updateContentSourceState(contentSource, 'deleted');
        }
    }
    /**
     * Check the database's referential integrity by ensuring all rows referenced by foreign keys
     * exist.
     *
     * @returns Array of foreign keys with broken references. Empty if none found.
     */
    async checkDatabaseReferentialIntegrity() {
        // TODO: Consider moving foreignKeys into a separate .ts that's associated with the REX
        // schema json. Or maybe merge it and the schema json into a new .ts and derive the schema
        // json from that for dinfra?
        const foreignKeys = {
            nodeCustomResourceIds: [
                {
                    column: 'package_group_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'node_id',
                    referencedTable: 'nodes'
                }
            ],
            chunks: [
                {
                    column: 'package_group_id',
                    referencedTable: 'contentSources'
                }
            ],
            contentSources: [
                {
                    column: 'main_package_id',
                    referencedTable: 'packages'
                },
                {
                    column: 'devset_id',
                    referencedTable: 'contentSources'
                }
            ],
            contentSourcePackages: [
                {
                    column: 'content_source_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'package_id',
                    referencedTable: 'packages'
                }
            ],
            devices: [
                {
                    column: 'devset_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'parent_id',
                    referencedTable: 'devices'
                }
            ],
            devtools: [
                {
                    column: 'devset_id',
                    referencedTable: 'contentSources'
                }
            ],
            devtoolDevices: [
                {
                    column: 'devtool_id',
                    referencedTable: 'devtools'
                },
                {
                    column: 'device_id',
                    referencedTable: 'devices'
                }
            ],
            filters: [
                {
                    column: 'package_group_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'devtool_id',
                    referencedTable: 'devtools'
                },
                {
                    column: 'device_id',
                    referencedTable: 'devices'
                }
            ],
            filtersXChunks: [
                {
                    column: 'filter_id',
                    referencedTable: 'filters'
                },
                {
                    column: 'chunk_id',
                    referencedTable: 'chunks'
                }
            ],
            filterAffectsNode: [
                {
                    column: 'source_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'filter_id',
                    referencedTable: 'filters'
                },
                {
                    column: 'node_id',
                    referencedTable: 'nodes'
                }
            ],
            filterAffectsNodeCDesc: [
                {
                    column: 'source_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'filter_id',
                    referencedTable: 'filters'
                },
                {
                    column: 'node_id',
                    referencedTable: 'nodes'
                },
                {
                    column: 'ancestor_node_id',
                    referencedTable: 'nodes'
                }
            ],
            nodes: [
                {
                    column: 'parent_id',
                    referencedTable: 'nodes'
                },
                {
                    column: 'content_source_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'resource_id',
                    referencedTable: 'resources'
                },
                {
                    column: 'package_id',
                    referencedTable: 'packages'
                }
            ],
            nodeAncestors: [
                {
                    column: 'node_id',
                    referencedTable: 'nodes'
                },
                {
                    column: 'ancestor_node_id',
                    referencedTable: 'nodes'
                }
            ],
            nodeDevResourceGroups: [
                {
                    column: 'node_id',
                    referencedTable: 'nodes'
                },
                {
                    column: 'resource_group_id',
                    referencedTable: 'resources'
                }
            ],
            nodePublicIds: [
                {
                    column: 'node_id',
                    referencedTable: 'nodes'
                }
            ],
            deviceAliases: [
                {
                    column: 'devset_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'device_id',
                    referencedTable: 'devices'
                }
            ],
            devtoolAliases: [
                {
                    column: 'devset_id',
                    referencedTable: 'contentSources'
                },
                {
                    column: 'devtool_id',
                    referencedTable: 'devtools'
                }
            ],
            packageAliases: [
                {
                    column: 'package_id',
                    referencedTable: 'packages'
                }
            ],
            resourceFilters: [
                {
                    column: 'filter_id',
                    referencedTable: 'filters'
                },
                {
                    column: 'resource_id',
                    referencedTable: 'resources'
                }
            ],
            packages: [],
            packageDepends: [
                {
                    column: 'package_id',
                    referencedTable: 'packages'
                }
            ],
            resources: [
                {
                    column: 'parent_id',
                    referencedTable: 'resources'
                },
                {
                    column: 'package_id',
                    referencedTable: 'packages'
                }
            ],
            resourceDevices: [
                {
                    column: 'resource_id',
                    referencedTable: 'resources'
                },
                {
                    column: 'device_id',
                    referencedTable: 'devices'
                }
            ],
            resourceDevtools: [
                {
                    column: 'resource_id',
                    referencedTable: 'resources'
                },
                {
                    column: 'devtool_id',
                    referencedTable: 'devtools'
                }
            ],
            trailingSubChunks: [
                {
                    column: 'chunk_id',
                    referencedTable: 'chunks'
                }
            ],
            resourceGroups: [],
            resourceGroupNodes: [
            // TODO!
            //     {
            //         column: 'resource_group_id',
            //         referencedTable: 'resourceGroups'
            //     },
            //     {
            //         column: 'resource_id',
            //         referencedTable: 'resources'
            //     }
            // TODO: This will need special handling as dev_id is a polymorphic association
            // {
            //     column: 'dev_id',
            //     referencedTable: 'devices'
            // },
            // {
            //     column: 'dev_id',
            //     referencedTable: 'devtools'
            // }
            ]
        };
        // Iterate over flattened array of individual foreign keys and check referential integrity
        // on each
        const brokenForeignKeys = [];
        for (const { table, column, referencedTable } of _.flatMap(foreignKeys, (tableFks, table) => _.map(tableFks, ({ column, referencedTable }) => {
            return { table, column, referencedTable };
        }))) {
            if ((await this.db.simpleQuery(`check-ref-integrity-on-${table}.${column}`, `select exists( ` +
                `  select 1 ` +
                `  from ${this.db.tables[table]} c ` +
                `    left join ${this.db.tables[referencedTable]} p ` +
                `      on p.id = c.${column} ` +
                `  where c.${column} is not null and p.id is null ` +
                `  limit 1 ` +
                `) found`))[0].found) {
                brokenForeignKeys.push({ table, column });
            }
        }
        return brokenForeignKeys;
    }
    /**
     * Delete rows from tables belonging to the given package group, in batches, using the given
     * SQL statements to determine the batch id range and perform deletions.
     *
     * Primarily targets the rows of a table belonging to the package group, and optionally rows of
     * other secondary tables that efficiently reference the first table (i.e. with an indexed
     * column).
     *
     * @param packageGroupId - The id of the package group.
     * @param tableGroupName - Short name for the table grouping, used in logging.
     * @param idRangeQuery - SQL query statement used to get the minimum and maximum ids of primary
     *      table rows belonging to the given package group. Query must have a single '?' parameter
     *      for the package group id.
     * @param deleteStatement - SQL delete statement used to delete rows in batches from the
     *      primary table and optionally others as well. Must have 3 '?' parameters: package group
     *      id, primary table batch start id, primary table batch end id
     * @param batchSize - The delete batch size, with batches being of the primary table. Deletions
     *      can be much greater due to associated table deletions.
     * @returns deletedRows - The total number of deleted rows from all tables.
     */
    async deletePackageGroupChildRows(packageGroupId, tableGroupName, idRangeQuery, deleteStatement, batchSize) {
        const { minId, maxId } = (await this.db.simpleQuery(`get-pkggrp-${tableGroupName}-delete-range`, idRangeQuery, [packageGroupId]))[0];
        let deletedRows = 0;
        if (minId && maxId) {
            for (let id = minId; id <= maxId; id += batchSize) {
                deletedRows += (await this.db.manipulate(`delete-pkggrp-${tableGroupName}-batched`, deleteStatement, [packageGroupId, id, Math.min(id + batchSize - 1, maxId)])).affectedRows;
            }
        }
        return deletedRows;
    }
    /**
     * Publish a Content Source. If another earlier published content source
     * exists with the same vpublic id, unpublish it. If multiple content
     * sources exist with the same vpublic id, publish the latest.
     *
     * @param {string} publicVId - Package Group's versioned public id
     */
    async publishContentSource(type, publicVId) {
        // TODO: Refactor type specific code out of here
        // TODO: All queries should be executed within the same transaction
        const typeName = type === 'pkggrp' ? 'Package Group' : 'FilterDevSet';
        const contentSources = await this.getContentSources(type, {
            publicVId,
            states: ['imported', 'published', 'unpublished'],
            latest: true
        });
        if (_.isEmpty(contentSources)) {
            throw new Error(`${typeName} not found: vpublic-id: ${publicVId}`);
        }
        else if (contentSources.length > 1) {
            throw new Error(`internal error: multiple latest ${typeName}s found: vpublid-id: ${publicVId}`);
        }
        const contentSource = contentSources[0];
        if (contentSource.state === 'published') {
            throw new Error(`${typeName} already published: vpublic-id: ${publicVId}`);
        }
        // TODO!: Add additional check for Dev Sets: should not be able to
        // unpublish FilterDevSets that are dependencies of published Package Groups.
        // Same goes for unpublish in unpublishContentSource().
        // Implement by instead first querying for the db ids and internal ids of
        // content sources that need to be unpublished, as well as any published
        // package group dependencies. If any dependencies are found, fail with
        // info on the published package groups.
        // Change state of any other (earlier) published content sources with
        // same vpublic id to 'unpublished'
        const update1Result = await this.db.manipulate('content-source-imported', `update ${this.db.tables.contentSources} cs1 ` +
            `join ${this.db.tables.contentSources} cs2 ` +
            `  on cs2.public_id = cs1.public_id ` +
            `    and cs2.version = cs1.version ` +
            `    and cs2.type = cs1.type ` +
            `set ` +
            `  cs1.state = 'unpublished', ` +
            `  cs1.state_updated = ? ` +
            `where ` +
            `  cs1.state = 'published' ` +
            `  and cs1.id <> ? ` +
            `  and cs2.id = ? `, [Math.floor(Date.now() / 1000), contentSource.id, contentSource.id]);
        if (update1Result.changedRows) {
            this.console.log('Existing ' + typeName + ' with same id ' + publicVId + ' was unpublished');
        }
        // Change state of content source to 'published'
        await this.updateContentSourceState(contentSource, 'published');
        this.console.log('Published ' + typeName + ' with id ' + publicVId);
    }
    /**
     * Unpublish a Content Source.
     *
     * @param {string} publicVId - Package Group's versioned public id
     */
    async unpublishContentSource(type, publicVId) {
        // TODO: All queries should be executed within the same transaction
        // TODO: Prevent devsets from being unpublished if there are published package groups that
        // are dependent on them
        const typeName = type === 'pkggrp' ? 'Package Group' : 'FilterDevSet';
        const contentSources = await this.getContentSources(type, {
            publicVId,
            states: ['published'],
            latest: true
        });
        if (_.isEmpty(contentSources)) {
            throw new Error(`${typeName} not found: vpublic-id: ${publicVId}`);
        }
        else if (contentSources.length > 1) {
            throw new Error(`internal error: multiple latest ${typeName}s found: vpublid-id: ${publicVId}`);
        }
        const contentSource = contentSources[0];
        // Change state of content source to unpublished
        await this.updateContentSourceState(contentSource, 'unpublished');
        this.console.log('Unpublished ' + typeName + ' with id ' + publicVId);
    }
    /* Get Content Sources
        criteria : {
            publicVId - content source versioned public id
            states - states to filter on; defaults to 'published'
            latest - latest package group per versioned public id; otherwise all
        }
    */
    async getContentSources(type, criteria) {
        const latestOnly = !criteria || criteria.latest === undefined ? true : criteria.latest;
        let sql = `select s.* from ${this.db.tables.contentSources} s where s.type = ? `;
        const params = [type];
        if (criteria && !_.isEmpty(criteria.publicVId)) {
            const { publicId, version } = (0, types_js_1.stringToVPublicId)(criteria.publicVId);
            sql += 'and s.public_id = ? and s.version = ? ';
            params.push(publicId, version);
        }
        let states;
        if (!criteria || _.isEmpty(criteria.states)) {
            states = ['published'];
        }
        else {
            states = criteria.states;
        }
        sql += 'and s.state in ( ? ) ';
        params.push(states);
        sql += 'order by public_id, version, created desc';
        const contentSources = (await this.db.simpleQuery('get-content-sources', sql, params)).map((row) => (0, types_js_1.rowToContentSource)(row));
        if (latestOnly) {
            // Remove all content sources with the same versioned public id
            // except for the latest
            // TODO: Optimize by moving into queries
            // This is dependent on the query result set being ordered on
            // public_id, version, and created, in that order, with
            // created in descending order.
            const latestContentSources = [];
            let currentContentSource;
            for (const contentSource of contentSources) {
                if (currentContentSource === undefined ||
                    currentContentSource.publicId !== contentSource.publicId ||
                    currentContentSource.version !== contentSource.version) {
                    // First or new versioned public id
                    latestContentSources.push(contentSource);
                    currentContentSource = contentSource;
                }
            }
            return latestContentSources;
        }
        else {
            // Otherwise return all of the content sources
            return contentSources;
        }
    }
    /*
     * Return complete import options, with defaults used where missing
     * @param options
     */
    getOptions(options) {
        return {
            ...importOptionsDefaults,
            ...options
        };
    }
    displayNodeChildren(node, level) {
        if (!level) {
            level = 0;
        }
        if (node.children != null) {
            for (const child of node.children) {
                this.TRACE('  '.repeat(level) + '/' + child.name);
                this.displayNodeChildren(child, level + 1);
            }
        }
        if (node.contentHeadChildren) {
            node.contentHeadChildren.forEach((child) => {
                this.TRACE('  '.repeat(level) +
                    '/' +
                    child.name +
                    ' (pkg ' +
                    child.packageGroup.publicVId +
                    '; ' +
                    child.descendantCount +
                    ' desc)');
            });
        }
    }
    async writeDevicesToDb(devices) {
        if (_.isEmpty(devices)) {
            return;
        }
        // Write devices to db
        await this.dbSession.getConnection().writeDbObjsToDb('write-devices', devices, this.db.tables.devices, [
            'devset_id',
            'package_uid',
            'parent_id',
            'json_id',
            'public_id',
            'name',
            'descr',
            'image',
            'type',
            'overview_public_id',
            'json'
        ], (device) => {
            const json = {
                coreTypes: device.coreTypes
            };
            return [
                device.devSetId,
                device.packageUid,
                device.parent != null ? device.parent.id : null,
                device.jsonId,
                device.publicId,
                device.name,
                device.description,
                device.image,
                device.type,
                device.overviewPublicId,
                JSON.stringify(json)
            ];
        }, { ignoreDuplicates: true, ignoreWarnings: true });
        // Write the devices' aliases to db
        await this.dbSession
            .getConnection()
            .writeObjsToDb('write-device-aliases', devices, this.db.tables.deviceAliases, ['devset_id', 'alias', 'public_id', 'device_id'], (device) => _.map(device.aliases, (alias) => [
            device.devSetId,
            alias,
            device.publicId,
            device.id
        ]), { ignoreDuplicates: true, ignoreWarnings: true });
        this.console.progress(WRITE_CHAR);
    }
    async writeDevToolsToDb(devtools) {
        // Write the devtools to db
        await this.dbSession.getConnection().writeDbObjsToDb('write-devtools', devtools, this.db.tables.devtools, [
            'devset_id',
            'package_uid',
            'json_id',
            'public_id',
            'name',
            'buy_link',
            'descr',
            'image',
            'tools_page',
            'type',
            'overview_public_id',
            'json'
        ], (devtool) => {
            const json = {
                connections: devtool.connections,
                energiaBoards: devtool.energiaBoards
            };
            return [
                devtool.devSetId,
                devtool.packageUid,
                devtool.jsonId,
                devtool.publicId,
                devtool.name,
                devtool.buyLink,
                devtool.description,
                devtool.image,
                devtool.toolsPage,
                devtool.type,
                devtool.overviewPublicId,
                JSON.stringify(json)
            ];
        }, { ignoreDuplicates: true, ignoreWarnings: true });
        // Write the devtools' aliases to db
        await this.dbSession
            .getConnection()
            .writeObjsToDb('write-devtool-aliases', devtools, this.db.tables.devtoolAliases, ['devset_id', 'alias', 'public_id', 'devtool_id'], (devtool) => _.map(devtool.aliases, (alias) => [
            devtool.devSetId,
            alias,
            devtool.publicId,
            devtool.id
        ]), { ignoreDuplicates: true, ignoreWarnings: true });
        this.console.progress(WRITE_CHAR);
    }
    async writeDevtoolHasDevicesToDb(devtoolsToWrite) {
        await this.dbSession.getConnection().writeObjsToDb('write-devtool-x-devices', devtoolsToWrite, this.db.tables.devtoolDevices, ['devtool_id', 'device_id'], (devtool) => {
            const rows = [];
            if (devtool.devices != null) {
                for (const device of devtool.devices) {
                    rows.push([devtool.id, device.id]);
                }
            }
            return rows;
        }, { ignoreDuplicates: true, ignoreWarnings: true });
        this.console.progress(WRITE_CHAR);
    }
    async importPackageGroup(packageGroupDef, dir, devGroupPubId, options = {}) {
        const packages = new Map();
        let filterDevSet;
        const packageGroup = packageGroupFromJson(packageGroupDef);
        packageGroup.state = 'incomplete';
        packageGroup.stateUpdated = packageGroup.created = Math.floor(Date.now() / 1000);
        // TODO: Verify that files exist.
        const resourcesDbDir = path.join(dir, 'resources_full.db');
        const overviewsSplitDbDir = path.join(dir, 'overviews_split.db');
        const useSplitOverviews = fs.existsSync(overviewsSplitDbDir);
        packageGroup.packageUids.forEach((packageUid) => {
            packageGroup.packageFiles.push(path.join(resourcesDbDir, packageUid));
            if (useSplitOverviews) {
                packageGroup.packageFiles.push(path.join(overviewsSplitDbDir, packageUid));
            }
        });
        if (!useSplitOverviews) {
            packageGroup.packageFiles.push(path.join(dir, 'overviews.db'));
        }
        const groupImportStart = process.hrtime();
        let groupDbWriteStart = null;
        this.console.progress(`Importing package group ${packageGroup.publicVId} `);
        this.console.log(); // to print newline if logging at higher verbosity than Progress
        this.console.fine('  packages:');
        this.console.fine('    ' + packageGroup.packageUids.join('\n    '));
        this.console.fine('  files:');
        this.console.fine('    ' + packageGroup.packageFiles.join('\n    '));
        this.console.fine('  against DevSet: ' + devGroupPubId);
        this.reportMemUsage();
        if (!PRUNE_TREE) {
            await this.preloadCaches(dir, devGroupPubId);
        }
        await this.dbSession.openConnection(true);
        try {
            const filterDevSet0 = await this.getFilterDevSet(devGroupPubId);
            if (!filterDevSet0) {
                throw new Error('FilterDevSet not found: ' + devGroupPubId);
            }
            filterDevSet = filterDevSet0;
            await this.buildPackageGroupTree(packageGroup, packages, packageGroup.packageFiles, filterDevSet);
            this.mergePackageGroupTree(packageGroup);
            // Create content node name filters
            this.console.fine('Creating node filters');
            // Iterate over the content subtrees and create node-name filters for their nodes.
            packageGroup.contentHeadNodes.forEach((contentHeadNode) => {
                this.createNodeNameFilters(contentHeadNode);
            });
            this.console.progress(TREE_CHAR);
            // Add descendant counts to nodes
            this.console.fine('Calculating node descendant counts');
            // Iterate over the content subtrees, and calculate and set
            // each subtree nodes' descendant count.
            packageGroup.contentHeadNodes.forEach((contentHeadNode) => {
                setDescendantCounts(contentHeadNode);
            });
            this.console.progress(TREE_CHAR);
            function setDescendantCounts(contentNode) {
                // Calculate and set the descendant count of the given
                // content node and its descendants.
                contentNode.descendantCount = 0;
                if (contentNode.children != null) {
                    for (const child of contentNode.children) {
                        if (child.resource && child.resource.isCounted) {
                            contentNode.descendantCount++;
                        }
                        setDescendantCounts(child);
                        if (child.descendantCount != null) {
                            contentNode.descendantCount += child.descendantCount;
                        }
                    }
                }
            }
            // TODO: Send to logger or/and include in verbose console output
            if (this.TRACE0) {
                this.TRACE0('Foundation tree and head nodes:');
                this.displayNodeChildren(this.treeRoot, 1);
            }
            const parseTime = (0, util_1.hrtimeToSec)(process.hrtime(groupImportStart));
            groupDbWriteStart = process.hrtime();
            if (options.writeToDb) {
                const packageList = Array.from(packages.values());
                // Write Package Overviews to db
                await this.writePackageOverviewsToDb(packageList);
                // Write Package Group to db
                if (packageGroup.mainPackageUid) {
                    packageGroup.mainPackage = packageList.find((pkg) => pkg.uid === packageGroup.mainPackageUid);
                    if (packageGroup.mainPackage) {
                        const packageAuxData = require(vars_1.Vars.PACKAGE_AUX_DATA_FILE);
                        packageGroup.packagesToListVersionsFrom =
                            packageAuxData[packageGroup.mainPackage.publicId]
                                ?.listVersionsFromPackage ?? [];
                    }
                }
                else {
                    packageGroup.packagesToListVersionsFrom = [];
                }
                await this.writePackageGroupToDb(packageGroup, filterDevSet);
                // Write the Package Group's packages to db
                await this.writePackageGroupPackagesToDb(packageGroup, packages);
                // Write package aliases to db
                await this.writePackageAliasesToDb(packageList);
                // Write generic, device, and devtool filters to db
                await this.flushFiltersToDb(packageGroup);
                // Write content trees and their associations to db, per package group and head node
                this.logger.info('Writing content subtrees belonging to package group: ' + packageGroup.publicVId);
                for (const contentHeadNode of packageGroup.contentHeadNodes) {
                    await this.writeContentTreeToDb(contentHeadNode, packages);
                }
                // Write table view resource and resource group data to db
                await this.writeResourceGroupsToDb(packageGroup.resourceGroups);
                this.console.log(`Database write time: ${(0, util_1.hrtimeToSec)(process.hrtime(groupDbWriteStart))}s`);
            }
            const dbWriteTime = (0, util_1.hrtimeToSec)(process.hrtime(groupDbWriteStart));
            this.console.progressOnly(' (done)');
            this.console.progressOnly(` (read/convert ${parseTime.toFixed(2)}s, write ${dbWriteTime.toFixed(2)}s)\n`);
            this.console.fine('Import cleanup');
            if (PRUNE_TREE) {
                // Prune added Package Group
                this.pruneFoundationTree(this.treeRoot);
            }
            else {
                // Otherwise reset everything
                this.treeRoot = null;
                this.filterCache = new Map();
                this.filterDevSetCache = new Map();
            }
            // Change Package Group's state to imported
            await this.updateContentSourceState(packageGroup, 'imported');
            this.console.log('Package Group ' + packageGroup.publicVId + ' import done');
            const creationInfo = {
                internalId: {
                    publicId: packageGroup.publicId,
                    version: packageGroup.version,
                    created: packageGroup.created
                },
                moduleGroup: (packageGroup.mainPackage && packageGroup.mainPackage.moduleGroup) || undefined
            };
            return creationInfo;
        }
        finally {
            await this.dbSession.closeConnection();
        }
    }
    assignDevsToNodes(resources) {
        // Assign a subset of each given resource's devices and devtools to its nodes.
        //
        // Devices and devtools are assigned differently for Tree Filtering and Table View
        // Filtering due to different requirements for each.  The key difference between them
        // being that each of a resource's devices and devtools must be assigned to one and only
        // one of a resource's nodes for Table View Filtering, whereas for Tree Filtering a
        // resource's devices and devtools can be assigned to one or more of a resource's nodes.
        // The reason for this difference is that within the Table View, multiple resource nodes
        // will appear as duplicates since it displays resource groups (not nodes), while within
        // the Tree this is not a problem.
        //
        // Devices and devtools are assigned to nodes based on their names appearing in the node's
        // paths. If a device or devtool doesn't appear in a node's path, then it is arbitrarily
        // assigned to one if for Table View filtering, and to all if Tree filtering.
        let i = 0;
        for (const resource of resources.values()) {
            // Tree Filtering: Assign a subset of the resource's devices and devtools to its nodes
            // for Tree Filtering.
            for (const device of _.values(resource.devices)) {
                const matchingNodes = findNodesWithDev(resource.nodes, device);
                const nodesToAssign = _.isEmpty(matchingNodes)
                    ? // No matches found, so assign the device to all of the nodes' tree-devices.
                        // Better to show all of the nodes in the tree when the device is selected
                        // than to arbitrarily pick one (since that pick could in fact the worse, and
                        // there's nothing inherently wrong with showing multiple in this case).
                        resource.nodes
                    : matchingNodes;
                for (const node of nodesToAssign) {
                    if (!node.treeDevices) {
                        node.treeDevices = [];
                    }
                    node.treeDevices.push(device);
                }
            }
            for (const devtool of _.values(resource.devtools)) {
                // TODO!: This is virtually identical to that above for devices, merge
                const matchingNodes = findNodesWithDev(resource.nodes, devtool);
                const nodesToAssign = _.isEmpty(matchingNodes) ? resource.nodes : matchingNodes;
                for (const node of nodesToAssign) {
                    if (!node.treeDevtools) {
                        node.treeDevtools = [];
                    }
                    node.treeDevtools.push(devtool);
                }
            }
            // Table View Filtering: Assign a subset of the resource's devices, device ancestors,
            // and devtools to its nodes for Table View Filtering.  Each device and devtool is
            // assigned to just a single node to prevent duplicates within the Table View in the
            // UI.
            if (!resource.isDuplicate) {
                // Skipped if resource is a duplicate, as its nodes are processed with the
                // non-duplicate resource's nodes
                // TODO: Try to first assign devices/devtools to those nodes belonging to the
                // device/devtool's resource before moving on to other resource's nodes
                // Get the set of devices and device ancestors belonging to the resource
                let devices = [];
                const allResourceDevices = _.concat(_.values(resource.devices), _.flatten(_.map(resource.duplicates, (dup) => _.values(dup.devices))));
                for (const device of _.values(allResourceDevices)) {
                    // Add device
                    devices.push(device);
                    // Add device's ancestors
                    let ancestor = device.parent; // TODO! eliminate device casts
                    while (ancestor) {
                        devices.push(ancestor);
                        ancestor = ancestor.parent;
                    }
                }
                // Eliminate duplicate devices, necessary as device variants may share ancestors
                // and duplicate resources may share devices
                devices = _.uniqWith(devices, (o1, o2) => o1.publicId === o2.publicId);
                // Assign the devices and devtools to not just the resource's nodes, but also the
                // nodes of its duplicates
                const unmatchedNodes = _.concat(resource.nodes, _.flatten(_.map(resource.duplicates, (dup) => dup.nodes)));
                const matchedNodes = [];
                for (const device of devices) {
                    let nodeToAssign = findFirstNodeWithDev(unmatchedNodes, device);
                    if (nodeToAssign) {
                        // Move node from unmatched nodes to matched nodes
                        unmatchedNodes.splice(unmatchedNodes.indexOf(nodeToAssign), 1);
                        matchedNodes.push(nodeToAssign);
                    }
                    else {
                        // Now search already matched nodes
                        nodeToAssign = findFirstNodeWithDev(matchedNodes, device);
                        if (!nodeToAssign) {
                            // Assign to arbitrary node, but don't move to matched nodes.
                            nodeToAssign = resource.nodes[0];
                        }
                    }
                    // TODO!!: This shouldn't be necessary, is just a temp workaround
                    if (!nodeToAssign) {
                        continue;
                    }
                    if (!nodeToAssign.tvDevices) {
                        nodeToAssign.tvDevices = [];
                    }
                    nodeToAssign.tvDevices.push(device);
                }
                const allResourceDevtools = _.uniqWith(_.concat(_.values(resource.devtools), _.flatten(_.map(resource.duplicates, (dup) => _.values(dup.devtools)))), (o1, o2) => o1.publicId === o2.publicId);
                for (const devtool of _.values(allResourceDevtools)) {
                    // TODO!: Very similar to that above for devices, merge
                    let nodeToAssign = findFirstNodeWithDev(unmatchedNodes, devtool);
                    if (nodeToAssign) {
                        // Move node from unmatched nodes to matched nodes
                        unmatchedNodes.splice(unmatchedNodes.indexOf(nodeToAssign), 1);
                        matchedNodes.push(nodeToAssign);
                    }
                    else {
                        // Now search already matched nodes
                        nodeToAssign = findFirstNodeWithDev(matchedNodes, devtool);
                        if (!nodeToAssign) {
                            // Assign to arbitrary node, but don't move to matched nodes.
                            nodeToAssign = resource.nodes[0];
                        }
                    }
                    // TODO!!: This shouldn't be necessary, is just a temp workaround
                    if (!nodeToAssign) {
                        continue;
                    }
                    if (!nodeToAssign.tvDevtools) {
                        nodeToAssign.tvDevtools = [];
                    }
                    nodeToAssign.tvDevtools.push(devtool);
                }
            }
            // Delete resource.duplicates to save memory as it's no longer needed
            delete resource.duplicates;
            if (i++ % 100 === 0) {
                this.console.progress(TREE_CHAR);
            }
        }
        function findNodesWithDev(nodes, dev, firstOnly = false) {
            const matches = [];
            for (const node of nodes) {
                let nodeOnPath = node;
                while (nodeOnPath && !nodeOnPath.isContentSubTreeHead) {
                    if (_.lowerCase(dev.name) === _.lowerCase(nodeOnPath.name) ||
                        _.lowerCase(dev.publicId) === _.lowerCase(nodeOnPath.name)) {
                        matches.push(node);
                        if (firstOnly) {
                            return matches;
                        }
                        else {
                            break;
                        }
                    }
                    nodeOnPath = nodeOnPath.parent;
                }
            }
            return matches;
        }
        function findFirstNodeWithDev(nodes, dev) {
            const matches = findNodesWithDev(nodes, dev, true);
            if (_.isEmpty(matches)) {
                return undefined;
            }
            else {
                return matches[0];
            }
        }
    }
    async updateContentSourceState(contentSource, newState) {
        const result = await this.db.manipulate('set-content-source-state', `update ${this.db.tables.contentSources} cs ` +
            `set ` +
            `  cs.state = ?, ` +
            `  cs.state_updated = ? ` +
            `where cs.id = ? `, [newState, Math.floor(Date.now() / 1000), contentSource.id]);
        if (!result.changedRows) {
            throw new Error(`Content source ${contentSource.publicVId} state update to ${newState} failed`);
        }
    }
    /**
     * Prune Foudation Tree, removing non-foundation nodes.
     *
     * @param node the node to prune from non-foundation nodes from
     */
    pruneFoundationTree(node) {
        const foundationChildren = [];
        for (const child of node.children) {
            if (child.isFoundation) {
                foundationChildren.push(child);
                this.pruneFoundationTree(child);
            }
            else {
                child.parent = null;
            }
        }
        node.children = foundationChildren;
    }
    async writePackageOverviewsToDb(packages) {
        this.console.fine('Writing to database');
        await this.dbSession
            .getConnection()
            .writeDbObjsToDb('write-package-overviews', packages, this.db.tables.packages, [
            'json_id',
            'public_id',
            'version',
            'uid',
            'install_path',
            'install_command',
            'install_size_win',
            'install_size_linux',
            'install_size_macos',
            'path',
            'name',
            'descr',
            'type',
            'sub_type',
            'feature_type',
            'ccs_version',
            'ccs_install_loc',
            'image',
            'ordinal',
            'metadata_version',
            'restrictions',
            'semver',
            'license',
            'hide_node_dir_panel',
            'module_of_package_id',
            'module_of_version_range',
            'hide_by_default',
            'module_grp_core_pkg_pid',
            'module_grp_core_pkg_vrange',
            'module_grp_packages',
            'default_module_group',
            'devices',
            'devtools'
        ], (pkg) => [
            pkg.jsonId,
            pkg.publicId,
            pkg.version,
            pkg.uid,
            (0, types_js_1.decomposePlatformAttribute)(pkg.installPath),
            (0, types_js_1.decomposePlatformAttribute)(pkg.installCommand),
            pkg.installSize?.win ?? null,
            pkg.installSize?.linux ?? null,
            pkg.installSize?.macos ?? null,
            pkg.path,
            pkg.name,
            pkg.description,
            pkg.type,
            pkg.subType ?? null,
            pkg.featureType ?? null,
            pkg.ccsVersion ?? null,
            pkg.ccsInstallLocation ?? null,
            pkg.image,
            pkg.order,
            pkg.metadataVersion,
            pkg.restrictions,
            pkg.semver,
            pkg.license,
            pkg.hideNodeDirPanel,
            pkg.moduleOf && pkg.moduleOf.packageId,
            pkg.moduleOf && pkg.moduleOf.versionRange,
            pkg.hideByDefault,
            pkg?.moduleGroup?.corePackage?.packageId,
            pkg?.moduleGroup?.corePackage?.versionRange,
            pkg?.moduleGroup?.packages?.join() ?? null,
            pkg?.moduleGroup?.defaultModuleGroup,
            pkg.devices && !_.isEmpty(pkg.devices) ? pkg.devices.join() : null,
            pkg.devtools && !_.isEmpty(pkg.devtools) ? pkg.devtools.join() : null
        ], { ignoreDuplicates: true, ignoreWarnings: true });
        // Next, write package dependencies to package_depends table
        await this.dbSession
            .getConnection()
            .writeObjsToDb('write-package-dependencies', packages, this.db.tables.packageDepends, ['package_id', 'type', 'ref_id', 'version_range', 'required', 'message'], (pkg) => {
            const rows = [];
            // Transform package dependencies into db-writable rows
            for (const dependency of pkg.packageDependencies || []) {
                rows.push([
                    pkg.id,
                    dependency.type,
                    dependency.refId,
                    dependency.versionRange,
                    dependency.require,
                    dependency.message
                ]);
            }
            return rows;
        });
        this.console.progress(WRITE_CHAR);
    }
    async writePackageAliasesToDb(packages) {
        await this.dbSession
            .getConnection()
            .writeObjsToDb('write-package-aliases', packages, this.db.tables.packageAliases, ['alias', 'package_id'], (pkg) => {
            return _.isEmpty(pkg.aliases)
                ? []
                : _.map(pkg.aliases, (alias) => [alias, pkg.id]);
        });
    }
    async writeFoundationTreeToDb(rootNode) {
        this.console.log('Writing foundation tree to database');
        // TODO: May be able to merge this with other code that writes nodes.
        this.logger.info('Writing foundation nodes to database');
        // Write foundation nodes to db in a batched breadth-first traveral,
        // starting at the root node. This approach is taken because of
        // node db records' contain references to their parent ids,
        // which are not available until written.
        await processTree(rootNode, 1000, // batch size selected to balance memory use, speed, and transaction size
        (level) => {
            this.logger.fine('Writing foundation tree, level ' + level);
        }, async (nodes, batchNo) => {
            // Write node batch and their ancestors to database.
            this.logger.fine('Writing foundation tree, batch ' + batchNo);
            this.console.progress(WRITE_CHAR);
            // Filter out all nodes except foundation nodes. Needed as subtree head nodes can
            // also be included in the foundation ndoe definition, but only foundation nodes are
            // part of the actual foundation tree
            const foundationNodes = nodes.filter((node) => node.isFoundation);
            await this.writeNodesAndAncestorsToDb(foundationNodes);
        });
        this.console.log('\n');
    }
    async writePackageGroupToDb(packageGroup, filterDevSet) {
        this.logger.info('Writing package group to database');
        // Write package group to DB
        await this.dbSession
            .getConnection()
            .writeDbObjsToDb('write-package-group', [packageGroup], this.db.tables.contentSources, [
            'public_id',
            'version',
            'created',
            'state_updated',
            'type',
            'state',
            'main_package_id',
            'devset_id',
            'packages_to_list_versions_from'
        ], (packageGroup) => [
            packageGroup.publicId,
            packageGroup.version,
            packageGroup.created,
            packageGroup.stateUpdated,
            packageGroup.type,
            packageGroup.state,
            packageGroup.mainPackage != null ? packageGroup.mainPackage.id : null,
            filterDevSet.id,
            (0, types_js_1.decomposeStringArray)(packageGroup.packagesToListVersionsFrom, false)
        ], { ignoreDuplicates: true, ignoreWarnings: true });
        this.console.progress(WRITE_CHAR);
    }
    async writePackageGroupPackagesToDb(packageGroup, packages) {
        // Insert package groups X packages into DB.
        this.logger.debug('Writing package groups X packages to database');
        await this.dbSession.getConnection().writeObjsToDb('write-package-group-x-packages', packageGroup.packageUids, this.db.tables.contentSourcePackages, ['content_source_id', 'package_id'], (packageUid) => {
            const pkg = packages.get(packageUid);
            if (pkg == null) {
                throw new Error("Package '" + packageUid + "' not found, likely 'missing from overviews.db'");
            }
            return [[packageGroup.id, pkg.id]];
        }, { ignoreDuplicates: true, ignoreWarnings: true });
        this.console.progress(WRITE_CHAR);
    }
    /**
     * Merge Package Group's subtrees into the Foundation Tree
     *
     * @param packageGroup
     */
    mergePackageGroupTree(packageGroup) {
        // First convert nodes' childrenByName map into children array
        flattenChildMap(packageGroup.treeRoot);
        // Merge the Package Group tree into the Foundation tree. The
        // Package Group tree is broken into discrete subtrees, with
        // each subtree hanging off a Foundation tree node.
        //
        // Additionally, the root of each such subtree is added to the
        // Package Group's content subtree head node list.
        this.console.fine('Merging subtrees');
        mergeNodeChildren(this.treeRoot, packageGroup.treeRoot, 0);
        return;
        function flattenChildMap(node) {
            node.children = [];
            for (const [, child] of node.childrenByName) {
                node.children.push(child);
                flattenChildMap(child);
            }
            delete node.childrenByName;
        }
        // Merge the children of packageGroupNode into node toNode
        function mergeNodeChildren(toNode, packageGroupNode, level) {
            level++;
            for (const child of packageGroupNode.children) {
                // Find the child of toNode to merge into
                const toChild = toNode.children.find((toChild) => toChild.name === child.name);
                if (!toChild) {
                    // A matching child node doesn't exist in the foundation tree to merge into.
                    // Which means that the child isn't a foundation node, but that its parent must
                    // be (as we only recurse into foundation nodes). So move this node to the
                    // foundation tree as the head of a new content subtree, hanging off the
                    // foundation tree.
                    if (!toNode.isFoundation) {
                        throw new Error('Unexpected: Parent node is non-foundation: ' + nodePathToString(toNode));
                    }
                    mergeNodeAsContentSubTreeHead();
                }
                else if (toChild.isFoundation) {
                    // This node already exists as a foundation node in the foundation tree. So
                    // don't do anything with it and move on to the node's children (if it has any)
                    if (!_.isEmpty(child.children)) {
                        mergeNodeChildren(toChild, child, level);
                    }
                }
                else if (toChild.isContentSubTreeHead) {
                    // The package group subtree head is pre-defined in our foundation tree, so we
                    // need to use whatever attributes are defined there and apply them to this node
                    // when hooking it up
                    //
                    // Note: The only attribute that is currently defined in this way is public-id,
                    // and then only if it isn't already defined by the resource (introduced to
                    // address REX-3485)
                    if (toChild.id) {
                        throw new Error('Content subtree head node already written, so seems that we have a duplicate package head node:' +
                            nodePathToString(toChild));
                    }
                    if (toChild.children.length) {
                        throw new Error('Unexpected: Content subtree head node already has children:' +
                            nodePathToString(toChild));
                    }
                    if (!toChild.publicId) {
                        throw new Error('Node public id expected on globally defined package subtree nodes:' +
                            nodePathToString(toNode));
                    }
                    if (!toNode.isFoundation) {
                        throw new Error('Parent node must foundation: ' + nodePathToString(toNode));
                    }
                    mergeNodeAsContentSubTreeHead();
                    // If the child's publicId isn't already defined (the case only for
                    // resource-less nodes), then set it to the public id from its match in the
                    // global tree
                    if (!child.publicId) {
                        child.publicId = toChild.publicId;
                    }
                }
                else {
                    throw new Error('Unexpected: Foundation tree node is neither a foundation or content head node: ' +
                        nodePathToString(toChild));
                }
                function mergeNodeAsContentSubTreeHead() {
                    if (!toNode.contentHeadChildren) {
                        toNode.contentHeadChildren = [];
                    }
                    toNode.contentHeadChildren.push(child);
                    child.parent = toNode;
                    // Add to package group
                    child.isContentSubTreeHead = true;
                    packageGroup.contentHeadNodes.push(child);
                }
            }
        }
    }
    async writeContentTreeToDb(contentHeadNode, packages) {
        // Write content sub-tree to database
        const packageGroup = contentHeadNode.packageGroup;
        this.console.fine('Writing content subtree to db');
        this.logger.info('Writing content subtree: ' + nodePathToString(contentHeadNode));
        // Write subtree nodes nodes, their resource, and associations to db in
        // a batched breadth-first traveral, starting at the content node's
        // head.
        const resourcesWithParent = [];
        const resourcesWithUnwrittenParent = [];
        const resourcesHookedUpToDuplParentInDiffPackage = [];
        const resourcesHookedUpToDuplParentInSamePackage = [];
        const packageAuxData = require(vars_1.Vars.PACKAGE_AUX_DATA_FILE);
        let i = 0;
        await processTree(contentHeadNode, 100, // batch size selected to balance memory use, speed, and transaction size
        (level) => {
            this.logger.fine('Writing package group subtree, level ' + level);
        }, async (nodes, batchNo) => {
            // Write the batch of nodes and their associations to database
            this.logger.fine('Writing package group subtree, batch ' + batchNo);
            // Create list of associated resources to write to db
            let resourcesToWrite = [];
            for (const node of nodes) {
                if (node.resource != null && node.resource.id == null) {
                    resourcesToWrite.push(node.resource);
                    if (node.resource.parent) {
                        resourcesWithParent.push(node.resource);
                        if (!node.resource.parent.id) {
                            if (node.resource.parent.duplicateOf?.id) {
                                // Resource hooked up to a duplicate of its parent resource
                                if (node.resource.parent.packageUid ===
                                    node.resource.parent.duplicateOf.packageUid) {
                                    // And that duplicate resource is from the same package
                                    // (shouldn't happen)
                                    resourcesHookedUpToDuplParentInSamePackage.push(node.resource);
                                }
                                else {
                                    // And that duplicate resource is from a different package
                                    // (expected when an earlier imported peer package
                                    // duplicates resources from this package)
                                    resourcesHookedUpToDuplParentInDiffPackage.push(node.resource);
                                }
                            }
                            else {
                                // Resource's parent resource (whether actual or duplicate)
                                // was never written
                                resourcesWithUnwrittenParent.push(node.resource);
                            }
                        }
                    }
                }
                // Generate public ids for this resource-less folder node.
                // We generate two public ids: one as an alias based on the full path
                // except with the original root category, for backward compatibility
                // since that is what's been used in the past; as well as another as the
                // primary that's based on the node's local path within its package
                // Build node's full path and get its nearest resource (above or below)
                const pathSegments = [];
                let pathNode = node;
                let resource;
                while (pathNode && pathNode.name !== 'ROOT') {
                    if (!pathNode.name) {
                        throw new Error('node name is null');
                    }
                    pathSegments.unshift(pathNode.name);
                    if (!resource && pathNode.resource) {
                        resource = pathNode.resource;
                    }
                    pathNode = pathNode.parent;
                }
                if (!resource) {
                    // Search descendants for a resource
                    resource = getResourcefromDescendants(node);
                    function getResourcefromDescendants(node) {
                        for (const child of node.children) {
                            if (child.resource) {
                                return child.resource;
                            }
                            else {
                                const resource = getResourcefromDescendants(child);
                                if (resource) {
                                    return resource;
                                }
                            }
                        }
                        return undefined;
                    }
                }
                const nodeFullPath = pathSegments.join('/');
                if (!resource) {
                    throw new Error(`Unable to find a resource for node '${nodeFullPath}' of ` +
                        `package group '${packageGroup?.publicVId}'`);
                }
                else if (!resource.packageUid) {
                    throw new Error(`Missing packageUid in resource: ${JSON.stringify(resource)}`);
                }
                const pkg = packages.get(resource.packageUid);
                if (!pkg) {
                    throw new Error(`Package not found: ${resource.packageUid}`);
                }
                else if (!pkg.rootCategory) {
                    throw new Error(`Missing rootCategory in package: ${JSON.stringify(pkg)}`);
                }
                // Get the package's _current_ root category
                const pkgRootCategory = pkg.rootCategory.join('/');
                // Get package's _original_ root category from packages-aux json
                const packageCatMapping = packageAuxData[pkg.publicId];
                const originalRootCategory = packageCatMapping?.originalRootCategory;
                const newRootCategory = packageCatMapping?.rootCategory?.join('/');
                // Create primary public id, if it doesn't already exist in the jsondb (as is
                // currently the case only for resource-less folder nodes).
                // TODO!! Consider creating all primary public ids here, and removing
                // altogether from jsondb refresh
                if (!node.publicId) {
                    // Create local path based public id
                    let localNodePath = nodeFullPath.replace(pkgRootCategory, '');
                    // We don't allow leading slash (consistency needed for compatibility)
                    if (localNodePath.charAt(0) === '/') {
                        localNodePath = localNodePath.substring(1);
                    }
                    node.publicId = (0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)(localNodePath || '/');
                }
                // Create original (pre-tree-restructuring) fullpath-based public id alias
                // Adjust original fullpath to use the original root category path
                let oldTreeFullNodePath = originalRootCategory && newRootCategory
                    ? nodeFullPath.replace(newRootCategory, originalRootCategory)
                    : nodeFullPath;
                // Adjust the original fullpath to use the actual package name instead of the
                // 'name' override in package-aux json if used
                if (packageCatMapping?.name) {
                    const lastOriginalRootCategory = _.last(pkg.originalRootCategory);
                    if (lastOriginalRootCategory) {
                        oldTreeFullNodePath = oldTreeFullNodePath.replace(packageCatMapping.name, lastOriginalRootCategory);
                    }
                }
                node.aliasPublicIds = [(0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)(oldTreeFullNodePath)];
                // TODO!: Need some way of identifying completely new packages introduced
                // after tree restructuring (i.e. new _packages_, not new _versions_ of
                // existing packages), as they won't need fullpath-based aliases. Maybe by
                // adding an entry in packages-aux for all pre-restructuring packages, plus
                // possibly some boolean indicating that it's post-restructuring?
            }
            resourcesToWrite = _.uniq(resourcesToWrite);
            // Write nodes and their associations to database.
            // Write resources to db
            await this.writeResourcesToDb(resourcesToWrite, packages);
            // Write resources' devices to db
            await this.writeResourceDevicesToDb(resourcesToWrite);
            // Write resources' devtools to db
            await this.writeResourceDevtoolsToDb(resourcesToWrite);
            // Write nodes and their ancestors to db
            await this.writeNodesAndAncestorsToDb(nodes);
            // Write node public id aliases to db
            await this.writeAliasNodePublicIdsToDb(nodes);
            // Write bu public ids -> nodes to db
            await this.writeNodeCustomResourceIds(resourcesToWrite, packageGroup);
            // Determine node/filters associations for later persistence to database
            await this.prepareNodeFilters(nodes, contentHeadNode);
            if (i++ % 25 === 0) {
                this.console.progress(WRITE_CHAR);
            }
        });
        this.console.log('\n');
        // Report or fail on problems detected hooking up resource children with their parents
        if (!_.isEmpty(resourcesWithUnwrittenParent)) {
            throw new Error(`Some resources were not hooked up to their parent resource: ` +
                `${resourcesWithUnwrittenParent.length} ` +
                `(out of ${resourcesWithParent.length} resources with parents)`);
        }
        else if (!_.isEmpty(resourcesHookedUpToDuplParentInSamePackage)) {
            throw new Error(`Resources were hooked up to duplicate parent resources found in the same package: ` +
                `${resourcesHookedUpToDuplParentInSamePackage} ` +
                `(out of ${resourcesWithParent.length} resources with parents)`);
        }
        else if (!_.isEmpty(resourcesHookedUpToDuplParentInDiffPackage)) {
            this.logger.warning(`WARNING: Resources were hooked up to duplicate parent resources from peer packages: ` +
                `${resourcesHookedUpToDuplParentInDiffPackage.length} ` +
                `(out of ${resourcesWithParent.length} resources with parents)`);
        }
        // Make another pass through the content subtree to save packages and filters affecting
        // its nodes
        this.logger.debug('Writing packages and filters affecting nodes to database');
        // Iterate through one level of the subtree at a time, in a breadth-first traveral
        // starting at the content head node.
        i = 0;
        await processTree(contentHeadNode, 100, // batch size selected to balance memory use, speed, and transaction size
        (level) => {
            const msg = 'Writing package group filters+, tree level ' + level;
            if (profilingNodeFilters) {
                this.logger.fine('\n\n' + msg);
            }
            else {
                this.logger.fine(msg);
            }
        }, async (nodes, batchNo) => {
            // Perform batch database insert of filter associations.
            this.logger.fine('Writing package group filters+, batch ' + batchNo);
            const dataToWriteMain = [];
            const dataToWriteDescendants = [];
            const dataToWriteResources = {};
            for (const node of nodes) {
                // Merge the node's direct, child and ancestor filters into one set, with
                // the node-filter relationship retained. In cases where a filter exists in
                // multiple sets (e.g. a filter that was assigned directly to a node as well
                // as to a node's ancestor), the direct relationship takes precedence,
                // followed by child and finally ancestor.
                let NodeFilterRelationship;
                (function (NodeFilterRelationship) {
                    NodeFilterRelationship[NodeFilterRelationship["Direct"] = 0] = "Direct";
                    NodeFilterRelationship[NodeFilterRelationship["Descendant"] = 1] = "Descendant";
                    NodeFilterRelationship[NodeFilterRelationship["Ancestor"] = 2] = "Ancestor";
                })(NodeFilterRelationship || (NodeFilterRelationship = {}));
                const allFilters = {};
                const filtersAndRelationships = [
                    // purposely ordered so that later higher priority relationships will
                    // overwrite earlier lower priority relationships
                    [node.ancestorNodeNameFilters, NodeFilterRelationship.Ancestor],
                    [node.descendantNodeFilters, NodeFilterRelationship.Descendant],
                    [node.filters, NodeFilterRelationship.Direct]
                ];
                for (const [filters, relationship] of filtersAndRelationships) {
                    if (filters) {
                        filters.forEach((id) => {
                            allFilters[id] = {
                                id,
                                relationship
                            };
                        });
                    }
                }
                // Delete node's filter sets to save space, no longer needed
                if (node.ancestorNodeNameFilters) {
                    delete node.ancestorNodeNameFilters;
                }
                if (node.descendantNodeFilters) {
                    delete node.descendantNodeFilters;
                }
                if (node.filters) {
                    delete node.filters;
                }
                // Create filter-affects-node associations
                for (const filterInfo of Object.values(allFilters)) {
                    const relationship = filterInfo.relationship === NodeFilterRelationship.Direct
                        ? 'd'
                        : filterInfo.relationship === NodeFilterRelationship.Ancestor
                            ? 'a'
                            : 'c';
                    dataToWriteMain.push([
                        packageGroup.id,
                        filterInfo.id,
                        node.id,
                        node.resource && node.resource.isCounted != null
                            ? node.resource.isCounted
                            : false,
                        relationship
                    ]);
                }
                // Create node->ancestor association entries, but only if node is countable
                if (POPULATE_DESCENDANT_COUNT_TABLES) {
                    let isNodeCounted = false;
                    if (node.resource && node.resource.isCounted != null) {
                        isNodeCounted = node.resource.isCounted;
                    }
                    if (isNodeCounted && !_.isEmpty(allFilters)) {
                        // Iterate over node's ancestors.
                        let ancestor = node.parent;
                        while (ancestor) {
                            // Iterate over node's package IDs.
                            // Iterate over filter IDs
                            for (const filterInfo of Object.values(allFilters)) {
                                // Create record entry
                                dataToWriteDescendants.push([
                                    packageGroup.id,
                                    ancestor.id,
                                    node.id,
                                    filterInfo.id
                                ]);
                            }
                            ancestor = ancestor.parent;
                        }
                    }
                }
                // Create resource/filter associations (for table-view)
                if (node.resource &&
                    node.resource.isCounted // only countable resources in table-view
                ) {
                    // Add resource-filter records for all filters that affect the node
                    for (const filterInfo of Object.values(allFilters)) {
                        // Add record entry (may overwrite earlier identical entry)
                        const value = [filterInfo.id, node.resource.id];
                        dataToWriteResources[value.toString()] = value;
                    }
                }
            }
            // Write to DB
            // Write package-node-filter associations to db
            await this.writePackageNodeFiltersToDb(dataToWriteMain);
            // Write package-node-ancestor-filter associations to db
            await this.writePackageNodeAncestorFiltersToDb(dataToWriteDescendants);
            // Write package-node-resource-filter associations to db
            await this.dbSession
                .getConnection()
                .writeRowsToDb('write-package-x-node-x-resource-filters', _.values(dataToWriteResources), this.db.tables.resourceFilters, ['filter_id', 'resource_id'], { ignoreDuplicates: true, ignoreWarnings: true });
            if (i++ % 25 === 0) {
                this.console.progress(WRITE_CHAR);
            }
        });
        this.console.log('\n');
    }
    async writeResourcesToDb(resources, packages) {
        // There may be no resources to write, if the current group of nodes don't have any
        // resources or if all of their resources have already been written.
        if (_.isEmpty(resources)) {
            return;
        }
        // Write resources to db
        await this.dbSession.getConnection().writeDbObjsToDb('write-resources', resources, this.db.tables.resources, [
            'package_id',
            'parent_id',
            'json_id',
            'type',
            'name',
            'descr',
            'short_descr',
            'view_limitations',
            'proj_restriction',
            'kernel',
            'compiler',
            'override_projspec_device',
            'link',
            'link_type',
            'icon',
            'implicit_order',
            'custom_order',
            'sort',
            'root0',
            'file_type',
            'has_includes',
            'is_included_file',
            'image',
            'is_counted',
            'json'
        ], (resource) => {
            if (resource.packageUid != null) {
                const pkg = packages.get(resource.packageUid);
                if (pkg != null) {
                    resource.packageId = pkg.id;
                }
            }
            const json = {
                importProjectCCS: resource.importProjectCCS == null ? null : resource.importProjectCCS,
                createProjectCCS: resource.createProjectCCS == null ? null : resource.createProjectCCS,
                linkForDownload: resource.linkForDownload == null ? null : resource.linkForDownload
            };
            return [
                resource.packageId,
                resource.parent != null && resource.parent.id != null
                    ? resource.parent.id
                    : null,
                resource.jsonId || null,
                resource.type || null,
                resource.name || null,
                resource.description || null,
                resource.shortDescription || null,
                (0, types_js_1.decomposeStringArray)(resource.viewLimitations),
                (0, types_js_1.projectRestrictionToDb)(resource.projectRestriction || null),
                (0, types_js_1.decomposeStringArray)(resource.kernels),
                (0, types_js_1.decomposeStringArray)(resource.compilers),
                resource.overrideProjectSpecDeviceId != null
                    ? resource.overrideProjectSpecDeviceId
                    : null,
                resource.link || null,
                resource.linkType || null,
                resource.icon || null,
                resource.implicitOrder || null,
                resource.customOrder || null,
                (0, types_js_1.resourceSortToDb)(resource.sort),
                resource.root0 || null,
                resource.fileType || null,
                resource.hasIncludes != null ? resource.hasIncludes : null,
                resource.isIncludedFile != null ? resource.isIncludedFile : null,
                resource.image || null,
                resource.isCounted,
                JSON.stringify(json)
            ];
        }, { ignoreDuplicates: true, ignoreWarnings: true });
    }
    async writeAliasNodePublicIdsToDb(nodes) {
        await this.dbSession.getConnection().writeObjsToDb('write-aliasid-x-primaryid', nodes, this.db.tables.nodePublicIds, ['public_id_w0', 'public_id_w1', 'node_id', 'alias'], (node) => {
            // Add the node's public id aliases, both as 128 bit ints
            const rows = _.map(node.aliasPublicIds, (aliasPublicId) => {
                const { publicIdWord0, publicIdWord1 } = (0, types_js_1.nodePublicIdToDbWords)(aliasPublicId);
                return [publicIdWord0, publicIdWord1, node.id, true];
            });
            // Add the node's original generated public id as an alias if it's been since
            // superseded by a custom id
            if (node.origGeneratedPublicId) {
                const { publicIdWord0, publicIdWord1 } = (0, types_js_1.nodePublicIdToDbWords)(node.origGeneratedPublicId);
                rows.push([publicIdWord0, publicIdWord1, node.id, true]);
            }
            // Add the node's primary public id
            const { publicIdWord0, publicIdWord1 } = (0, types_js_1.nodePublicIdToDbWords)(node.publicId);
            rows.push([publicIdWord0, publicIdWord1, node.id, false]);
            return rows;
        }, 
        // TP Maybe optimize this out?
        { ignoreDuplicates: true, ignoreWarnings: true });
    }
    async writeNodeCustomResourceIds(resources, packageGroup) {
        const packageGroupId = packageGroup.id;
        await this.dbSession.getConnection().writeObjsToDb('write-node-custom-res-ids', resources, this.db.tables.nodeCustomResourceIds, ['package_group_id', 'custom_resource_public_id', 'global', 'alias', 'node_id'], (resource) => {
            // For each resource, create a row for each of its nodes and global ids,
            // assigning each global id to every node
            let globalAliasRows = [];
            if (resource.globalCustomIds) {
                globalAliasRows = _.flatten(_.map(resource.globalCustomIds, (customId) => {
                    return _.map(resource.nodes, (node) => [
                        packageGroupId,
                        customId.toLowerCase(),
                        true,
                        true,
                        node.id
                    ]);
                }));
            }
            // If a resource has a package-scoped custom id create a row for each of its
            // nodes, assigning the custom id to every node
            let packageScopedPublicIdRows = [];
            if (resource.packageScopedCustomId) {
                packageScopedPublicIdRows = _.map(resource.nodes, (node) => [
                    packageGroupId,
                    resource.packageScopedCustomId.toLowerCase(),
                    false,
                    false,
                    node.id
                ]);
            }
            // For each resource, create a row for each of its nodes and package-scoped
            // aliases, assigning each alias to every node
            let packageScopedAliasRows = [];
            if (resource.packageScopedCustomAliases) {
                packageScopedAliasRows = _.flatten(_.map(resource.packageScopedCustomAliases, (packageScopedAliasId) => {
                    return _.map(resource.nodes, (node) => [
                        packageGroupId,
                        packageScopedAliasId.toLowerCase(),
                        false,
                        true,
                        node.id
                    ]);
                }));
            }
            // Delete node list to save memory as it's no longer needed
            delete resource.nodes;
            // Combine and return all of the rows
            return _.concat(globalAliasRows, packageScopedPublicIdRows, packageScopedAliasRows);
        }, { ignoreDuplicates: true, ignoreWarnings: true });
    }
    async writeResourceDevicesToDb(resources) {
        // Write devices to db
        await this.dbSession.getConnection().writeObjsToDb('write-resource-x-devices', resources, this.db.tables.resourceDevices, ['resource_id', 'device_id'], (resource) => {
            const rows = [];
            if (resource.devices != null) {
                for (const device of Object.values(resource.devices)) {
                    rows.push([resource.id, device.id]);
                }
            }
            return rows;
        }, { ignoreDuplicates: true, ignoreWarnings: true });
    }
    async writeResourceDevtoolsToDb(resources) {
        await this.dbSession.getConnection().writeObjsToDb('write-resource-x-devtools', resources, this.db.tables.resourceDevtools, ['resource_id', 'devtool_id'], (resource) => {
            const rows = [];
            if (resource.devtools != null) {
                for (const devtool of Object.values(resource.devtools)) {
                    rows.push([resource.id, devtool.id]);
                }
            }
            return rows;
        }, { ignoreDuplicates: true, ignoreWarnings: true });
    }
    async writeResourceGroupsToDb(resourceGroups) {
        // Write resource groups and associated table-view data to database
        let i = 0;
        for (const resourceGroupInfo of _.values(resourceGroups)) {
            // Write resource-group row to database, consisting of the resource group's path-based
            // id, context, and a few attributes common to its resources
            // Use one of the resource group's resources (should always have at least one) to get
            // properties common to all resources.
            const aResource = resourceGroupInfo.nodes[0].resource;
            const resourceGroup = {
                resourceGroupPath: resourceGroupInfo.groupId,
                groupCategoryContext: resourceGroupInfo.categoryContext,
                subClass: aResource.subClass || null,
                type: aResource.type || 'other',
                name: aResource.name,
                shortDescription: aResource.shortDescription || null,
                fileType: aResource.fileType || null,
                packageId: aResource.packageId,
                link: aResource.link || null,
                linkType: aResource.linkType || null,
                icon: aResource.icon || null,
                viewLimitations: aResource.viewLimitations || null
            };
            await this.dbSession
                .getConnection()
                .writeDbObjsToDb('write-resource-group', [resourceGroup], this.db.tables.resourceGroups, [
                'resource_grp',
                'cat_context',
                'resource_type',
                'resource_subclass',
                'name',
                'short_descr',
                'file_type',
                'package_id',
                'link_ext',
                'link_type',
                'icon',
                'view_limitations'
            ], (resourceGroup) => {
                return [
                    resourceGroup.resourceGroupPath,
                    resourceGroup.groupCategoryContext,
                    resourceGroup.type,
                    resourceGroup.subClass || null,
                    resourceGroup.name,
                    resourceGroup.shortDescription || null,
                    resourceGroup.fileType || null,
                    resourceGroup.packageId || null,
                    getLinkExt(resourceGroup.link),
                    getShortLinkType(resourceGroup.linkType),
                    resourceGroup.icon || null,
                    (0, types_js_1.decomposeStringArray)(resourceGroup.viewLimitations)
                ];
            });
            // Write one resource row for each of its devices and devtools, or just one if it has
            // none
            const resourceGroupNodes = _.reduce(resourceGroupInfo.nodes, (acc, node) => {
                if (!_.isEmpty(node.tvDevices) || !_.isEmpty(node.tvDevtools)) {
                    acc.push(..._.map(devicesAndDevtoolsToDevs(node.tvDevices, node.tvDevtools), (dev) => {
                        // Ensure that there aren't multiple compilers or kernels (not
                        // yet supported, but quite possible in future).
                        if (_.size(node.resource.compilers) > 1) {
                            throw new Error(`Resource ${node.resource.jsonId} has multiple ` +
                                `compilers`);
                        }
                        if (_.size(node.resource.kernels) > 1) {
                            throw new Error(`Resource ${node.resource.jsonId} has multiple kernels`);
                        }
                        // For now at least variant compiler and kernel should always
                        // be defined. This will likely change though if we expand
                        // table view support beyond Examples to Documents or other
                        // types.
                        if (_.isEmpty(node.resource.compilers)) {
                            throw new Error(`Resource ${node.resource.jsonId} has no compilers`);
                        }
                        if (_.isEmpty(node.resource.kernels)) {
                            throw new Error(`Resource ${node.resource.jsonId} has no kernels`);
                        }
                        const compiler = (0, types_js_1.compilerToDb)(node.resource.compilers[0]);
                        const kernel = (0, types_js_1.kernelToDb)(node.resource.kernels[0]);
                        return {
                            nodeId: node.id,
                            resourceId: node.resource.id,
                            resourceGroupId: resourceGroup.id,
                            isDevtool: dev.isDevTool,
                            devId: dev.devId,
                            compiler,
                            kernel,
                            hasReadme: node.resource.hasReadme || false,
                            hasChildren: !_.isEmpty(node.children)
                        };
                    }));
                }
                return acc;
            }, []);
            await this.dbSession
                .getConnection()
                .writeObjsToDb('write-tview-resource-x-devs', resourceGroupNodes, this.db.tables.resourceGroupNodes, [
                'resource_group_id',
                'compiler',
                'kernel',
                'resource_id',
                'node_id',
                'is_devtool',
                'dev_id',
                'has_readme',
                'has_children'
            ], (o) => [
                [
                    o.resourceGroupId,
                    o.compiler,
                    o.kernel,
                    o.resourceId,
                    o.nodeId,
                    o.isDevtool,
                    o.devId,
                    o.hasReadme,
                    o.hasChildren
                ]
            ]);
            // For each of the resource group nodes, insert into table node_dev_resgrps the
            // cartesian product of a) each node in the resource group node's path (from the node
            // itself up to the content head) and b) the resource group node's devices and
            // devtools. This table provides fast resource group lookup on node and device/devtool.
            let rows = [];
            for (const node of resourceGroupInfo.nodes) {
                // Get all of the node's table-view-targeted devices and devtools, merged into a
                // single array
                const devs = [
                    ..._.map(node.tvDevices, (device) => ({
                        isDevTool: false,
                        devId: device.id
                    })),
                    ..._.map(node.tvDevtools, (devtool) => ({
                        isDevTool: true,
                        devId: devtool.id
                    }))
                ];
                // Get ids of all nodes from target node up path to the content head node
                const nodeIds = [node.id];
                let ancestor = node;
                while (!ancestor.isContentSubTreeHead) {
                    ancestor = ancestor.parent;
                    nodeIds.push(ancestor.id);
                }
                // Create the cartesian product of the node's device/devtools and nodes on its path
                for (const dev of devs) {
                    for (const nodeId of nodeIds) {
                        rows.push([nodeId, resourceGroup.id, dev.isDevTool, dev.devId]);
                    }
                }
            }
            // Eliminate duplicates
            rows = _.uniqWith(rows, _.isEqual);
            // Write to database
            await this.dbSession
                .getConnection()
                .writeRowsToDb('write-tview-nodes-resgrps-x-devs', rows, this.db.tables.nodeDevResourceGroups, ['node_id', 'resource_group_id', 'is_devtool', 'dev_id']);
            if (i++ % 250 === 0) {
                this.console.progress(WRITE_CHAR);
            }
        }
        function devicesAndDevtoolsToDevs(devices, devtools) {
            return [
                ..._.map(devices, (device) => ({
                    isDevTool: false,
                    devId: device.id
                })),
                ..._.map(devtools, (devtool) => ({
                    isDevTool: true,
                    devId: devtool.id
                }))
            ];
        }
    }
    async writeNodesAndAncestorsToDb(nodes) {
        // Write nodes to database first
        await this.dbSession.getConnection().writeDbObjsToDb('write-nodes', nodes, this.db.tables.nodes, [
            'name',
            'public_id_w0',
            'public_id_w1',
            'parent_id',
            'is_foundation',
            'is_content_subtree_head',
            'content_source_id',
            'resource_id',
            'parent_sort',
            'leaf_order',
            'custom_order',
            'implicit_order',
            'descendant_count',
            'is_leaf',
            'resource_type',
            'file_type',
            'package_id',
            'link_ext',
            'link_type',
            'icon',
            'short_descr',
            'view_limitations',
            'readme_public_id_w0',
            'readme_public_id_w1'
        ], (node) => {
            // Convert public id from a 128 bit base64 string to two 64-bit words
            // (big-endian) in decimal string form to write to database.
            const { publicIdWord0, publicIdWord1 } = node.publicId != null
                ? (0, types_js_1.nodePublicIdToDbWords)(node.publicId)
                : { publicIdWord0: null, publicIdWord1: null };
            // Convert readme node's public id to two db-friendly 64-bit words
            const { publicIdWord0: readmePublicIdWord0, publicIdWord1: readmePublicIdWord1 } = node.readmeNodePublicId != null
                ? (0, types_js_1.nodePublicIdToDbWords)(node.readmeNodePublicId)
                : { publicIdWord0: null, publicIdWord1: null };
            const isLeaf = !node.isFoundation && _.isEmpty(node.children);
            // Parent sort
            const parentSort = (0, types_js_1.resourceSortToDb)(node.parent?.resource?.sort);
            // Leaf order is set as follows:
            //   0 - if intermixing leaf and non-leaf nodes
            //   1 - if grouping leaf and non-leaf nodes and the node is a leaf (so that it
            //       and other leaves come first)
            //   2 - if grouping leaf and non-leaf nodes and the node is not a leaf (so that
            //       it and other non-leaves comes last)
            const leafOrder = node.parent?.resource?.sort === 'filesAndFoldersAlphabetical' ||
                node.parent?.resource?.sort === 'manual'
                ? 0
                : isLeaf
                    ? 1
                    : 2;
            let packageId = null;
            if (node.resource) {
                // Node has a resource, so just use its packageId
                packageId = node.resource.packageId;
            }
            else if (node.packageGroup) {
                // Node belongs to a package group but has no resource, so use the packageId
                // of the node's first ancestor with a resource
                let ancestor = node;
                while (ancestor.parent) {
                    ancestor = ancestor.parent;
                    if (ancestor.resource) {
                        packageId = ancestor.resource.packageId;
                    }
                }
            }
            else {
                // Node doesn't belong to a package
            }
            return [
                node.name,
                publicIdWord0,
                publicIdWord1,
                node.parent ? node.parent.id : null,
                node.isFoundation === true,
                node.isContentSubTreeHead,
                node.packageGroup ? node.packageGroup.id : null,
                node.resource ? node.resource.id : null,
                parentSort,
                leafOrder,
                node.resource ? node.resource.customOrder : null,
                node.resource ? node.resource.implicitOrder : null,
                node.descendantCount,
                isLeaf,
                node.resource ? node.resource.type : null,
                node.resource ? node.resource.fileType : null,
                packageId,
                node.resource ? getLinkExt(node.resource.link) : null,
                node.resource ? getShortLinkType(node.resource.linkType) : null,
                node.resource ? node.resource.icon : null,
                node.resource ? node.resource.shortDescription : null,
                node.resource ? (0, types_js_1.decomposeStringArray)(node.resource.viewLimitations) : null,
                readmePublicIdWord0,
                readmePublicIdWord1
            ];
        }, { ignoreDuplicates: true, ignoreWarnings: true });
        // Next, determine and write the given nodes' ancestor relationships
        await this.dbSession.getConnection().writeObjsToDb('write-node-ancestors', nodes, this.db.tables.nodeAncestors, ['node_id', 'ancestor_node_id', 'is_node_counted'], (node) => {
            const rows = [];
            // Get node's ancestor DB IDs.
            const ancestorIds = new Set();
            let parent = node.parent;
            while (parent != null) {
                ancestorIds.add(parent.id);
                parent = parent.parent;
            }
            // Prepare node ancestor DB entries.
            for (const id of ancestorIds.values()) {
                rows.push([
                    node.id,
                    id,
                    node.resource != null ? node.resource.isCounted : false
                ]);
            }
            return rows;
        }, { ignoreDuplicates: true, ignoreWarnings: true });
    }
    async writePackageNodeFiltersToDb(dataToWriteMain) {
        await this.dbSession
            .getConnection()
            .writeRowsToDb('write-package-x-node-x-filters', dataToWriteMain, this.db.tables.filterAffectsNode, ['source_id', 'filter_id', 'node_id', 'is_node_counted', 'relationship'], { ignoreDuplicates: true, ignoreWarnings: true });
    }
    async writePackageNodeAncestorFiltersToDb(dataToWriteDescendants) {
        if (POPULATE_DESCENDANT_COUNT_TABLES) {
            await this.dbSession
                .getConnection()
                .writeRowsToDb('write-package-x-node-x-ancestor-x-resources', dataToWriteDescendants, this.db.tables.filterAffectsNodeCDesc, ['source_id', 'ancestor_node_id', 'node_id', 'filter_id'], { ignoreDuplicates: true, ignoreWarnings: true });
        }
    }
    /**
     * Determine node-filter associations for the given nodes and their filters, for later
     * persistence to database.
     *
     * @param nodes - the nodes
     * @param contentHeadNode - the content head node at the root of the content tree to which
     *     the given nodes belong
     */
    async prepareNodeFilters(nodes, contentHeadNode) {
        for (const node of nodes) {
            // Get node's filter and filter ancestor DB IDs.
            const nodeFilters = new Set();
            // Add the node's tree-targeted device filters and those devices' ancestor and
            // descendant device filters
            if (node.treeDevices) {
                for (const device of node.treeDevices) {
                    // Add device as filter
                    nodeFilters.add(device.filter); // TODO! eliminate device casts
                    // Add device's ancestors as filters
                    let ancestor = device.parent;
                    while (ancestor) {
                        nodeFilters.add(ancestor.filter);
                        ancestor = ancestor.parent;
                    }
                }
            }
            // Add the node's tree-targeted devtool filters
            if (node.treeDevtools) {
                for (const devtool of node.treeDevtools) {
                    nodeFilters.add(devtool.filter);
                }
            }
            // Prepare associations between node and its generic filters
            if (node.resource) {
                for (const filter of node.resource.genericFilters) {
                    nodeFilters.add(filter);
                }
            }
            // Prepare node / node-name filter associations
            for (const filter of _.values(node.nameFilters)) {
                nodeFilters.add(filter);
            }
            // Create the node's set of filter ids for persistence to the db
            const filterIds = new Set();
            const nodeNamefilterIds = new Set();
            for (const filter of nodeFilters) {
                // Add filter id
                filterIds.add(filter.id);
                // And add to node-name filter ids if a node
                if (filter.type === 'node') {
                    nodeNamefilterIds.add(filter.id);
                }
                // And the ids of any frequent-chunk filters associated with the filter
                const freqChunkFilters = this.freqChunkFiltersByStdFilters.get(filter);
                if (freqChunkFilters) {
                    for (const filter of freqChunkFilters) {
                        filterIds.add(filter.id);
                        if (filter.type === 'node') {
                            nodeNamefilterIds.add(filter.id);
                        }
                    }
                }
            }
            // Add the node's filter ids to its filter id set, as well as to its ancestor nodes
            // and descendant nodes (name filters only). This is for later persistence of the
            // filters-affects-nodes relationship to the database.
            // Add the node's filter ids to its filter id set
            if (!node.filters) {
                node.filters = new Set();
            }
            filterIds.forEach((id) => node.filters.add(id));
            // Add the node's filters to its ancestors' descendant-node-filter-set
            let ancestor = node.parent;
            let last = node;
            while (ancestor != null && last !== contentHeadNode) {
                if (!ancestor.descendantNodeFilters) {
                    ancestor.descendantNodeFilters = new Set();
                }
                // Add filter db ids to ancestor's descendant-node-filter-set
                filterIds.forEach((id) => ancestor.descendantNodeFilters.add(id));
                last = ancestor;
                ancestor = ancestor.parent;
            }
            // Add the node's name filters to its descendants' ancestor-node-filter-set
            propagateFiltersToNodeDescendents(node, nodeNamefilterIds);
            function propagateFiltersToNodeDescendents(node, filters) {
                for (const child of node.children || []) {
                    if (!child.ancestorNodeNameFilters) {
                        child.ancestorNodeNameFilters = new Set();
                    }
                    // Add filter db ids to ancestor's descendant-node-filter-set
                    filters.forEach((id) => child.ancestorNodeNameFilters.add(id));
                    // Propagate to child's descendants
                    propagateFiltersToNodeDescendents(child, filters);
                }
            }
        }
    }
    /**
     * Load Foundation Tree
     */
    async loadFoundationTree() {
        if (this.treeRoot != null) {
            return;
        }
        // TODO: Merge with Categories.getTreeRoot()
        // Query for root node
        const rows = await this.dbSession
            .getConnection()
            .query('load-foundation-get-root', `select * from ${this.db.tables.nodes} where parent_id is null`);
        // Get root node
        if (_.isEmpty(rows)) {
            throw new Error('Root Node Missing');
        }
        else {
            this.treeRoot = rowToInternalNode(rows[0]);
            this.treeRoot.parent = null;
            this.treeRoot.resource = null;
        }
        // Add root node's foundation node descendants
        await this.addFoundationChildren(this.treeRoot);
        // Add any additional subtree head nodes that are in the foundation tree definition; needed
        // by any package groups that use them to hang off foundation nodes
        const foundationTreeDefinitionFile = vars_1.Vars.FOUNDATION_TREE_FILE;
        this.console.log('Loading Foundation Tree definition from: ' + foundationTreeDefinitionFile);
        const foundationTreeDefinition = await fs.readJson(foundationTreeDefinitionFile);
        this.addChildrenToFoundationTree(this.treeRoot, foundationTreeDefinition.root.children, true);
    }
    /**
     * Recursively create child nodes as defined in the foundation tree's definition and add them
     * to the given foundation tree node.
     *
     * @param toParent - the parent node to add the children to
     * @param childrenDef - the child nodes to create and add
     * @param addPackageGroupHeadsOnly - add only package group subtree head nodes; foundation
     * nodes are expected to already exist in this case
     */
    addChildrenToFoundationTree(toParent, childrenDef, addPackageGroupHeadsOnly = false) {
        for (const childDef of childrenDef) {
            if (!childDef.name) {
                throw new Error('foundation tree node name is undefined');
            }
            else if (!childDef.publicId) {
                throw new Error(`foundation tree node ${childDef.name}'s publicId is undefined`);
            }
            // The node can only a foundation node or a package group subtree head node
            const isContentSubTreeHead = childDef.type && childDef.type === 'packageGroupHead';
            const isFoundation = !isContentSubTreeHead;
            let childNode;
            if (addPackageGroupHeadsOnly && isFoundation) {
                // Foundation node is expected to exist, and we're adding package group heads only
                // Find foundation node
                childNode = toParent.children.find((child) => child.name === childDef.name);
                if (!childNode) {
                    throw new Error(`Foundation node expected to already exist: ${childDef.name}`);
                }
            }
            else {
                // Create a new node based on the definition and add to parent
                childNode = {
                    ...createNode(childDef.name),
                    parent: toParent,
                    isFoundation,
                    isContentSubTreeHead,
                    publicId: (0, dbBuilderUtils_1.createPublicIdFromTreeNodePath)(childDef.publicId)
                };
                toParent.children.push(childNode);
            }
            if (!_.isEmpty(childDef.children)) {
                // Add the child node's descendants
                this.addChildrenToFoundationTree(childNode, childDef.children, addPackageGroupHeadsOnly);
            }
        }
    }
    async addFoundationChildren(node) {
        // Query db for foundation children and add them as children of node.
        node.children = [];
        // Query for children
        const rows = await this.dbSession
            .getConnection()
            .query('load-foundation-get-children', `select * from ${this.db.tables.nodes} ` +
            `where parent_id = ? ` +
            `and is_foundation`, [node.id]);
        // TODO Consider using Promise.all to parallelize this and speed it up -- but only
        // after replacing dbSession with connections obtained from the underlying pool
        for (const row of rows) {
            const child = {
                ...rowToInternalNode(row),
                resource: null,
                parent: node
            };
            node.children.push(child);
            await this.addFoundationChildren(child);
        }
    }
    createFilterDevSet(publicVId) {
        const { publicId, version } = (0, types_js_1.stringToVPublicId)(publicVId);
        return {
            publicVId,
            publicId,
            version,
            devices: {},
            devtools: {},
            priority: 1
        };
    }
    /**
     * Lookup FilterDevSet in database. Return as null if not found.
     */
    async lookupFilterDevSetInDb(uid) {
        const contentSources = await this.getContentSources('devset', {
            publicVId: uid,
            states: ['imported', 'published'],
            latest: true
        });
        if (_.isEmpty(contentSources)) {
            return null;
        }
        else if (contentSources.length > 1) {
            throw new Error('internal error: multiple latest dev sets found: vpublid-id: ' + uid);
        }
        else {
            return contentSources[0];
        }
    }
    /**
     * Get FilterDevSet. Read from database if not in cache.
     */
    async getFilterDevSet(uid) {
        // Lookup FilterDevSet in cache
        let devSet = this.filterDevSetCache.get(uid);
        if (devSet) {
            return devSet;
        }
        // FilterDevSet not in cache, get from db
        this.logger.info('Reading FilterDevSet from database');
        const devicesById = new Map();
        const filterDevSet0 = await this.lookupFilterDevSetInDb(uid);
        if (!filterDevSet0) {
            // devset not found
            return undefined;
        }
        devSet = {
            ...filterDevSet0,
            devices: {},
            devtools: {}
        };
        // Load devices
        this.logger.info('Reading devices from db');
        const deviceRows = await this.dbSession
            .getConnection()
            .query('get-devset-devices', `select d.* ` + `from ${this.db.tables.devices} d where d.devset_id = ? `, [devSet.id]);
        devSet.devices = {};
        deviceRows.forEach((row) => {
            // Create device
            const device = {
                ...(0, types_js_1.rowToDevice)(row),
                parent: null,
                children: {}
            };
            devicesById.set(device.id, device);
            devSet.devices[device.publicId] = device;
        });
        // Hookup device parents and children
        for (const [, device] of devicesById) {
            if (device.parentId != null) {
                const parent = devicesById.get(device.parentId);
                delete device.parentId;
                device.parent = parent;
                parent.children[device.publicId] = device;
            }
        }
        // Load devtools and devtool filters
        this.logger.info('Reading devtools and devtool filters from db');
        const devtoolRows = await this.dbSession
            .getConnection()
            .query('get-devset-devtools', `select d.* ` + `from ${this.db.tables.devtools} d where d.devset_id = ? `, [devSet.id]);
        devSet.devtools = {}; // by name
        devtoolRows.forEach((row) => {
            // Create devtool
            const devtool = {
                ...(0, types_js_1.rowToDevtool)(row),
                devices: []
            };
            devSet.devtools[devtool.name] = devtool;
        });
        // Read devtool-device associations from db, and use to hookup
        // devtools and devices in devtool.devices.
        this.logger.info('Reading devtools-device associations from db');
        const rows = await this.dbSession
            .getConnection()
            .query('get-devset-devtool-x-devices', `select dt.id, dt.name, x.device_id ` +
            `from ${this.db.tables.devtools} dt ` +
            `  join ${this.db.tables.devtoolDevices} x ` +
            `    on x.devtool_id = dt.id ` +
            `where dt.devset_id = ? ` +
            `order by 1, 2, 3 `, [devSet.id], { nestTables: true });
        let devtool = null;
        rows.forEach((row) => {
            if (devtool == null || devtool.id !== row.dt.id) {
                devtool = devSet.devtools[row.dt.name];
            }
            const device = devicesById.get(row.x.device_id);
            devtool.devices.push(device);
        });
        return devSet;
    }
    async parseDeviceFile(devicesPath, unfoundDevices, devices) {
        return new Promise((resolve, reject) => {
            // Import devices
            this.console.log('Importing Devices from: ' + devicesPath);
            let i = 0;
            // Streaming file instead of opening for performance and to minimize memory use.
            const deviceStream = fs
                .createReadStream(devicesPath, { encoding: 'utf8' })
                .pipe(StreamArray.withParser());
            deviceStream.on('data', (o) => {
                const value = o.value;
                if (i++ % 500 === 0) {
                    this.console.progress(READ_CHAR);
                }
                // TODO: When REX-1884 is complete, change following line to: publicId = value.id
                const deviceNameReallyPublicId = value.name;
                let minimalDevice;
                if (deviceNameReallyPublicId in unfoundDevices) {
                    minimalDevice = unfoundDevices[deviceNameReallyPublicId];
                    delete unfoundDevices[deviceNameReallyPublicId];
                }
                else {
                    // Create device
                    minimalDevice = createMinimalDevice(deviceNameReallyPublicId);
                }
                // Merge core type id array and core type name array into a single core type array
                const coreTypes = [];
                if (!_.isEmpty(value.coreTypes_id)) {
                    value.coreTypes_id.forEach((id, index) => {
                        coreTypes.push({
                            id,
                            name: value.coreTypes_name[index]
                        });
                    });
                }
                const device = {
                    ...minimalDevice,
                    jsonId: value._id,
                    // TODO: When REX-1884 is complete, change following line to:
                    // device.name = value.name
                    name: value.id,
                    packageUid: value.packageUId,
                    description: value.description || null,
                    image: value.image || null,
                    // Some BUs use type 'devices' instead of 'device'
                    type: value.type === 'devices' ? 'device' : value.type,
                    overviewPublicId: value.overviewPublicId,
                    coreTypes,
                    aliases: value.idAliases
                };
                // TODO: Update JSON entity references use id instead of name
                // once DB JSON is changed to use id
                // Get device's parent if already exists, otherwise create it
                if ('parent' in value) {
                    const parentNameReallyPublicId = value.parent;
                    if (parentNameReallyPublicId in devices) {
                        device.parent = devices[parentNameReallyPublicId];
                    }
                    else {
                        // Device's parent hasn't been created yet, need to keep track of it for later
                        // Create parent device
                        const undiscoveredDevice = createMinimalDevice(parentNameReallyPublicId);
                        device.parent = undiscoveredDevice;
                        // Track that parent hasn't been found yet.
                        unfoundDevices[parentNameReallyPublicId] = undiscoveredDevice;
                    }
                    device.parent.children[device.publicId] = device;
                }
                devices[device.publicId] = device;
            });
            deviceStream.on('end', () => {
                // If any parents are missing, report and abort
                let err = null;
                if (!_.isEmpty(unfoundDevices)) {
                    err = 'Device parents not found: ';
                    Object.keys(unfoundDevices).forEach((key) => {
                        err += key + '; ';
                    });
                }
                if ((0, callbacks_1.isError)(err)) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async parseDevtoolFile(devtoolsPath, devices, devtools) {
        return new Promise((resolve, reject) => {
            // Import devtools
            this.console.log('Importing Devtools from: ' + devtoolsPath);
            let i = 0;
            // Streaming file instead of opening for performance and to minimize memory use.
            const devtoolStream = fs
                .createReadStream(devtoolsPath, { encoding: 'utf8' })
                .pipe(StreamArray.withParser());
            devtoolStream.on('data', (o) => {
                try {
                    const value = o.value;
                    if (i++ % 500 === 0) {
                        this.console.progress(READ_CHAR);
                    }
                    const devtool = {
                        publicId: value.id,
                        jsonId: value._id,
                        type: value.type,
                        overviewPublicId: value.overviewPublicId,
                        name: value.name,
                        packageUid: value.packageUId,
                        description: value.description,
                        buyLink: value.buyLink,
                        image: value.image,
                        toolsPage: value.toolsPage,
                        connections: value.connections,
                        energiaBoards: value.energiaBoards,
                        aliases: value.idAliases,
                        devices: []
                    };
                    let deviceNames;
                    if (value.devices) {
                        deviceNames = value.devices;
                    }
                    else if (value.device) {
                        deviceNames = value.device;
                    }
                    if (deviceNames && !_.isEmpty(deviceNames)) {
                        deviceNames.forEach((deviceName) => {
                            const device = devices[deviceName];
                            if (device == null) {
                                throw new Error('device not found: ' + deviceName);
                            }
                            else {
                                devtool.devices.push(device);
                            }
                        });
                    }
                    devtools[devtool.name] = devtool;
                }
                catch (e) {
                    devtoolStream.pause();
                    devtoolStream.unpipe();
                    reject(e);
                }
            });
            devtoolStream.on('end', () => {
                resolve();
            });
        });
    }
    /**
     * Create the Package Group's tree by parsing it from the given Package
     * Group files
     *
     * @param packageGroup
     * @param packages
     * @param packageFiles
     * @param filterDevSet
     */
    async buildPackageGroupTree(packageGroup, packages, packageFiles, filterDevSet) {
        this.logger.info('DB JSON files to be imported: ' + util.inspect(packageGroup.packageFiles));
        packageGroup.treeRoot = createNode('ROOT');
        packageGroup.treeRoot.childrenByName = new Map();
        packageGroup.resourceGroups = {};
        const duplicateNodeInfo = [];
        for (const filepath of packageFiles) {
            if (fs.existsSync(filepath)) {
                const resources = await this.parseResourceJsonFile(filepath, packageGroup, filterDevSet, packages);
                await this.addResourcesToTree(packageGroup, resources, packages, duplicateNodeInfo);
                // Assign devices and devtools to nodes
                this.assignDevsToNodes(resources);
            }
            else {
                console.warn(`Resource db file not found: ${filepath}`);
            }
        }
        if (!_.isEmpty(duplicateNodeInfo)) {
            // TODO!!! Optionally instead fail on (should be default)
            this.logger.warning('WARNING: Duplicate resources found', {
                totalDuplicates: duplicateNodeInfo.length,
                duplicatesByPackage: _.mapValues(_.groupBy(duplicateNodeInfo, 'duplicatePackageUid'), 'length'),
                duplicatesOfByPackage: _.mapValues(_.groupBy(duplicateNodeInfo, 'existingPackageUid'), 'length')
            });
        }
    }
    async parseResourceJsonFile(filepath, packageGroup, devset, packages) {
        return new Promise((resolve, reject) => {
            this.console.fine('Parsing file: ' + filepath);
            const packageParseStart = process.hrtime();
            const resources = new Map();
            const resourcesByParent = new Map();
            const nonDuplicateResources = new Map();
            let duplicates = 0;
            let nonduplicates = 0;
            // Streaming file instead of opening for performance and to minimize memory use.
            const fileStream = fs
                .createReadStream(filepath, { encoding: 'utf8' })
                .pipe(StreamArray.withParser());
            let i = 0;
            fileStream.on('data', (o) => {
                try {
                    const value = o.value;
                    if (i++ % 1000 === 0) {
                        this.console.progress(READ_CHAR);
                    }
                    // Skip package if not in package group.
                    if (!packageGroup.packageUids.includes(value.packageUId)) {
                        return;
                    }
                    // If we're parsing a Package Overview, then create/update its corresponding
                    // Package.
                    function isOverview(e) {
                        return (e.resourceType === 'packageOverview' || e.resourceType === 'overview');
                    }
                    if (isOverview(value) && value.resourceType === 'packageOverview') {
                        let pkg = packages.get(value.packageUId);
                        if (pkg == null) {
                            // TODO: set uid using this instead?: value.id + '__' + value.version
                            pkg = { uid: value.packageUId };
                            packages.set(pkg.uid, pkg);
                            pkg.publicId = value.id;
                            pkg.version = value.version;
                            pkg.path = value.packagePath;
                        }
                        // TODO: Remove any duplicate info that's unnecessarily stored in both
                        // resource and package this.tables
                        pkg.installPath = value.installPath;
                        pkg.installCommand = value.installCommand;
                        pkg.installSize = value.installSize;
                        pkg.jsonId = value._id;
                        pkg.name = value.name;
                        pkg.description = value.description;
                        pkg.image = value.image;
                        pkg.metadataVersion = value.metadataVersion;
                        pkg.order = value.packageOrder;
                        pkg.type = value.type;
                        pkg.subType = value.subType;
                        pkg.featureType = value.featureType;
                        pkg.ccsVersion = value.ccsVersion;
                        pkg.ccsInstallLocation = value.ccsInstallLocation;
                        pkg.restrictions = value.restrictions;
                        pkg.semver = value.semver;
                        pkg.license = value.license;
                        pkg.hideNodeDirPanel = value.hideNodeDirPanel;
                        pkg.aliases = value.packageIdAliases;
                        pkg.moduleOf = value.moduleOf;
                        pkg.hideByDefault = value.hideByDefault ?? false;
                        pkg.originalRootCategory = value?.modifiedValues?.rootCategory;
                        pkg.rootCategory = value?.rootCategory;
                        pkg.packageDependencies = [
                            ..._.map(value.dependencies, (dependency) => {
                                return {
                                    refId: dependency.refId,
                                    require: dependency.require,
                                    versionRange: dependency.versionRange,
                                    message: dependency.message,
                                    type: 'd'
                                };
                            }),
                            ..._.map(value.modules, (module) => {
                                return {
                                    refId: module.refId,
                                    require: module.require,
                                    versionRange: module.versionRange,
                                    message: module.message,
                                    type: 'm'
                                };
                            }),
                            ..._.map(value.moduleGroups, (moduleGroup) => {
                                return {
                                    refId: moduleGroup.refId,
                                    require: moduleGroup.require,
                                    versionRange: moduleGroup.versionRange,
                                    message: moduleGroup.message,
                                    type: 'g'
                                };
                            })
                        ];
                        pkg.moduleGroup = value.moduleGroup;
                        if (value.featureType === 'deviceSupport') {
                            // Set the devices which this featureSupport package supports directly to the device public
                            // ids specified by the package overview
                            pkg.devices = value.devices;
                            // However in the case of devtools, the package overview instead specifies devtool names
                            // and not public ids. So we must map the devtool names to public ids.
                            pkg.devtools = _(value.devtools)
                                .map((devtoolName) => {
                                const devtool = devset.devtools[devtoolName];
                                if (!devtool) {
                                    this.logger.warning(`Devtool expected in devset: ${devtoolName}`);
                                    return null;
                                }
                                else {
                                    return devtool.publicId;
                                }
                            })
                                .compact()
                                .value();
                        }
                    }
                    // Read Resource / Package Overview
                    // Skip if device or devtool package overview, since these are not displayed
                    // in the resource tree.
                    if (isOverview(value) &&
                        value.resourceType === 'packageOverview' &&
                        ['devices', 'devtools'].includes(value.type)) {
                        return;
                    }
                    const compilers = _.map(value.compiler, (s) => {
                        if (dbTypes.isCompiler(s)) {
                            return s;
                        }
                        else {
                            throw new Error(`Invalid compiler in resource ${value._id}: ${value.compiler}`);
                        }
                    });
                    const kernels = _.map(value.kernel, (s) => {
                        if (dbTypes.isKernel(s)) {
                            return s;
                        }
                        else {
                            throw new Error(`Invalid kernel in resource ${value._id}: ${value.kernel}`);
                        }
                    });
                    const resource = {
                        parent: null,
                        children: [],
                        type: value.resourceType,
                        jsonId: value._id,
                        packageUid: value.packageUId,
                        globalCustomIds: value.customGlobalResourceUids,
                        packageScopedCustomId: value.customResourceUid,
                        packageScopedCustomAliases: value.customResourceAliasUids,
                        name: value.name,
                        description: value.description,
                        shortDescription: value.shortDescription,
                        viewLimitations: value.viewLimitations,
                        projectRestriction: value.projectRestriction,
                        kernels,
                        compilers,
                        overrideProjectSpecDeviceId: value.advanced && value.advanced.overrideProjectSpecDeviceId
                            ? value.advanced.overrideProjectSpecDeviceId
                            : null,
                        link: value.link,
                        linkType: value.linkType,
                        image: value.image,
                        isProject: [
                            'file.importable',
                            'folder.importable',
                            'project.ccs',
                            'project.iar',
                            'projectSpec'
                        ].includes(value.resourceType),
                        implicitOrder: value.order,
                        customOrder: value.customOrder,
                        sort: value.sort ? value.sort : 'default',
                        icon: value.icon,
                        root0: value.root0,
                        kitsAndBoards: !isOverview(value) ? value.kitsAndBoards : undefined,
                        isCounted: false,
                        devices: {},
                        devtools: {},
                        genericFilters: [],
                        fullPathInfoList: [],
                        nodes: [],
                        isDuplicate: false,
                        duplicates: []
                    };
                    if (!isOverview(value) && !_.isEmpty(value.resourceSubClass)) {
                        // there should just be one subclass
                        resource.subClass = value.resourceSubClass[0];
                    }
                    // Needed just temporarily for package tree creation
                    if (value.fullPaths.length !== value.fullPathsPublicIds.length) {
                        throw new Error('fullPaths and fullPathsPublicIds have ' +
                            'different lengths; resource: ' +
                            resource.jsonId);
                    }
                    const language = !_.isEmpty(value.language)
                        ? value.language[0]
                        : CHINESE_REGEX.test(value.name)
                            ? 'chinese'
                            : // assuming for now that language is english if no language is
                                // specified and name doesn't contain any chinese characters.
                                'english';
                    const isChinese = language === 'chinese';
                    for (let i = 0; i < value.fullPaths.length; i++) {
                        if (_.some(value.fullPaths[i], (segment) => !segment)) {
                            throw new Error(`Empty fullPaths element: _id: ${resource.jsonId}; ` +
                                `fullPath: ${value.fullPaths[i]}`);
                        }
                        resource.fullPathInfoList.push({
                            path: value.fullPaths[i],
                            publicId: value.fullPathsCustomPublicIds
                                ? value.fullPathsCustomPublicIds[i]
                                : value.fullPathsPublicIds[i],
                            // original generated public id, kept if overridden by custom so that
                            // we can use it as an alias later
                            origGeneratedPublicId: value.fullPathsCustomPublicIds
                                ? value.fullPathsPublicIds[i]
                                : undefined,
                            aliasPublicIds: value.fullPathsCustomAliasPublicIds
                                ? value.fullPathsCustomAliasPublicIds[i]
                                : undefined,
                            readmePublicId: !isOverview(value) && !_.isEmpty(value.readmeFullPathsPublicIds)
                                ? value.readmeFullPathsPublicIds[i]
                                : undefined,
                            resourceGroup: !isOverview(value) &&
                                !_.isEmpty(value.resourceGroup) &&
                                // REX-3099: exclude chinese resources from resource groups until
                                // we have language filtering
                                !isChinese
                                ? value.resourceGroup[i]
                                : undefined
                        });
                    }
                    if (!isOverview(value)) {
                        resource.isCounted = value.doNotCount != null ? !value.doNotCount : true;
                        resource.fileType = value.fileType;
                        resource.hasIncludes = value.hasIncludes;
                        resource.isIncludedFile = value.isIncludedFile;
                        resource.importProjectCCS = value._importProjectCCS;
                        resource.createProjectCCS = value._createProjectCCS;
                        resource.linkForDownload = value.linkForDownload;
                        resource.hasReadme = value.hasReadme;
                    }
                    const key = [resource.name, resource.link, language].toString();
                    const primaryResource = nonDuplicateResources.get(key);
                    if (primaryResource) {
                        // This is a duplicate resource (i.e. it has the same name and link as one
                        // that's already been created), so mark this resource as a duplicate and
                        // add it the non-duplicate resource's list of duplicates.
                        resource.isDuplicate = true;
                        resource.duplicates = undefined;
                        primaryResource.duplicates.push(resource);
                        duplicates++;
                    }
                    else {
                        // This resource is not a duplicate, so add it to the map of non-duplicates
                        nonDuplicateResources.set(key, resource);
                        nonduplicates++;
                    }
                    // Derive keyword filters from the resource's description and add them to the
                    // resource
                    if (resource.description) {
                        this.addResourceFilters(resource, 'descr', this.parseFilterKeywords(resource.description, DESCR_KEYWORDS_TO_EXCLUDE));
                    }
                    // Verify that resource isn't a duplicate.
                    if (resources.has(resource.jsonId)) {
                        throw new Error('Duplicate resource found with same _id: ' + resource.jsonId);
                    }
                    // Create maps of resources by ID and parent ID so that we can hook up
                    // parent-children later.
                    resources.set(resource.jsonId, resource);
                    if (!isOverview(value) && value.parentID != null) {
                        let siblings = resourcesByParent.get(value.parentID);
                        if (siblings == null) {
                            siblings = [];
                            resourcesByParent.set(value.parentID, siblings);
                        }
                        siblings.push(resource);
                    }
                    // Add devices matching resource's device variant names.
                    // Note: We're pulling in the resource's devices from attr "devicesVariants"
                    // and not attr "devices" as we only want the bottom level devices, and not
                    // the device parents, to be referenced directly by resources; device
                    // parents will instead be referenced from their children via their parent
                    // attribute.
                    resource.devices = {};
                    if (!_.isEmpty(value.devicesVariants)) {
                        for (const deviceName of value.devicesVariants) {
                            // Get device and add to resource.devices
                            const device = devset.devices[deviceName];
                            if (device == null) {
                                throw new Error('resource ' +
                                    resource.name +
                                    ': device not ' +
                                    'found: ' +
                                    deviceName);
                            }
                            resource.devices[deviceName] = device;
                            // Add the device's and the device ancestors' filters if missing
                            let device2 = device;
                            do {
                                if (!this.hasFilter('device', device2.name)) {
                                    const filter = {
                                        ...createFilter('device', device2.name),
                                        filterDevSet: devset,
                                        device: device2
                                    };
                                    this.addFilter(filter);
                                    device2.filter = filter;
                                }
                                device2 = device2.parent;
                            } while (device2);
                        }
                    }
                    // Add devtools matching resource's devtool names, and filters.
                    resource.devtools = {};
                    if (!_.isEmpty(value.devtools)) {
                        for (const devtoolName of value.devtools) {
                            // Get devtool and add to resource.devtools
                            const devtool = devset.devtools[devtoolName];
                            if (devtool == null) {
                                // TODO: throw Error?
                                this.logger.warning('devtool not found: ' + devtoolName);
                                continue;
                            }
                            resource.devtools[devtoolName] = devtool;
                            // And add devtool filter
                            if (!this.hasFilter('devtool', devtool.name)) {
                                const filter = {
                                    ...createFilter('devtool', devtool.name),
                                    filterDevSet: devset,
                                    devtool
                                };
                                this.addFilter(filter);
                                devtool.filter = filter;
                            }
                        }
                    }
                    // Flatten resource's nested tag array (just one level)
                    let flattenedTags;
                    if (!_.isEmpty(value.tags)) {
                        flattenedTags = [].concat.apply([], value.tags);
                    }
                    // Add resource's generic filters
                    const filterValuesByType = {
                        tag: flattenedTags,
                        ide: value.ide,
                        language: value.language,
                        compiler: value.compiler,
                        resClass: value.resourceClass,
                        kernel: value.kernel
                    };
                    for (const [filterType, filterValues] of Object.entries(filterValuesByType)) {
                        // TODO: Get rid of cast to FilterType
                        this.addResourceFilters(resource, filterType, filterValues);
                    }
                }
                catch (e) {
                    fileStream.pause();
                    fileStream.unpipe();
                    reject(e);
                }
            });
            fileStream.on('end', () => {
                // Hook up resources' parent/child relationships.
                for (const [parentId, childResources] of resourcesByParent) {
                    const parentResource = resources.get(parentId);
                    if (parentResource == null) {
                        reject(Error('Missing resource: ' + parentId));
                        return;
                    }
                    for (const child of childResources) {
                        child.parent = parentResource;
                        parentResource.children.push(child);
                    }
                }
                this.console.fine(`File parse time: ${(0, util_1.hrtimeToSec)(process.hrtime(packageParseStart))}s`);
                this.console.fine(`Non-duplicate resources: ${duplicates}; duplicates: ${nonduplicates}`);
                resolve(resources);
            });
        });
    }
    async addResourcesToTree(packageGroup, resources, packages, duplicateNodeInfo) {
        // Create package tree, consisting of a mix of resource nodes (tied directly to a
        // resource) and non-resource nodes. The tree branches are specified by resource attribute
        // fullpaths. A resource with multiple paths will have multiple packages nodes.
        //
        // Approach:
        //
        // First process resources without resource parents. Then process their children, and
        // their children and so on; sort of a top-down breadth-first search, except across all
        // resource subtrees (not to be confused with package tree) at once.
        //
        // For each resource and resource full path:
        // - Add a new resource node to the package tree; duplicate nodes (i.e. same path and
        //   name) are not allowed
        // - Create new non-resource nodes on the path if missing
        let resourcesToProcessNext = [];
        // Will be processing resources without parents first
        for (const [, resource] of resources) {
            if (resource.parent == null) {
                resourcesToProcessNext.push(resource);
            }
        }
        // Process resources in queue, while queueing up their children for next round
        while (!_.isEmpty(resourcesToProcessNext)) {
            const resourcesToProcess = resourcesToProcessNext;
            resourcesToProcessNext = [];
            for (const resource of resourcesToProcess) {
                // Add resource and its paths to package tree
                for (const fullPathInfo of resource.fullPathInfoList) {
                    if (!resource.fullPathInfoList) {
                        throw new Error('Resource public id empty: resource: ' + resource.jsonId);
                    }
                    this.addResourcePathToTree(resource, fullPathInfo, packageGroup, packages, duplicateNodeInfo);
                }
                // resource's fullPathInfoList no longer needed, remove to save memory
                delete resource.fullPathInfoList;
                // Queue up resource's children for next round
                Array.prototype.push.apply(resourcesToProcessNext, resource.children);
            }
        }
    }
    /**
     * Add a new node to the package tree for the given resource and at the given path, with
     * additional resource-less nodes added to the path where missing.
     *
     * @param resource
     * @param pathInfo
     * @param packageGroup
     * @param duplicateNodeNameFound
     */
    addResourcePathToTree(resource, pathInfo, packageGroup, packages, duplicateNodeInfo) {
        // Skip resource if it's a package overview belonging to a module package
        if (resource.type === 'packageOverview') {
            const pkg = packages.get(resource.packageUid);
            const mainPackage = packages.get(packageGroup.mainPackageUid);
            if (pkg?.moduleOf && pkg?.moduleOf.packageId === mainPackage?.publicId) {
                this.logger.fine(`Skipping creation of package overview node belonging to module ${pkg.uid}`);
                return;
            }
        }
        // Add new resource-less nodes to the path where missing (excluding the resource node)
        let pathNode = packageGroup.treeRoot;
        for (const pathSegment of pathInfo.path) {
            const parent = pathNode;
            pathNode = parent.childrenByName.get(pathSegment);
            if (!pathNode) {
                pathNode = createNode(pathSegment);
                parent.childrenByName.set(pathNode.name, pathNode);
                pathNode.childrenByName = new Map();
                pathNode.parent = parent;
                // default to false, will be set to true later if found to be subtree head
                pathNode.isContentSubTreeHead = false;
                pathNode.packageGroup = packageGroup;
            }
        }
        // Add resource node at end of path
        const nodeParent = pathNode;
        const nodeName = resource.name;
        let node = nodeParent.childrenByName.get(nodeName);
        if (node) {
            if (node.resource) {
                // A resource node already exists at this location
                duplicateNodeInfo.push({
                    duplicatePackageUid: resource.packageUid,
                    duplicateResourceId: resource.jsonId,
                    existingPackageUid: node.resource.packageUid,
                    existingResourceId: node.resource.jsonId
                });
                resource.duplicateOf = node.resource;
                // TODO!!! Optionally instead fail on (should be default)
                this.logger.warning('WARNING: Duplicate resource!', {
                    name: resource.name,
                    categoryPath: pathInfo.path.join('/'),
                    duplicatePackageUid: resource.packageUid,
                    duplicateResourceId: resource.jsonId,
                    existingPackageUid: node.resource.packageUid,
                    existingResourceId: node.resource.jsonId
                });
                return;
            }
            else {
                // Node aleady exists but as a resource-less node, so we'll just turn it into a
                // resource node further below
            }
        }
        else {
            // Node doesn't yet exist, so add it
            node = createNode(nodeName);
            nodeParent.childrenByName.set(nodeName, node);
            node.childrenByName = new Map();
            node.parent = nodeParent;
            // default to false, will be set to true later if found to be subtree head
            node.isContentSubTreeHead = false;
            node.packageGroup = packageGroup;
        }
        // Complete node contruction
        node.resource = resource;
        node.publicId = pathInfo.publicId;
        node.origGeneratedPublicId = pathInfo.origGeneratedPublicId;
        node.readmeNodePublicId = pathInfo.readmePublicId;
        if (!resource.nodes) {
            resource.nodes = [];
        }
        resource.nodes.push(node);
        if (resource.isCounted && pathInfo.resourceGroup) {
            // Get resource group, creating it if it doesn't yet exist
            let resourceGroup = packageGroup.resourceGroups[pathInfo.resourceGroup.id];
            if (!resourceGroup) {
                resourceGroup = {
                    groupId: pathInfo.resourceGroup.id,
                    categoryContext: pathInfo.resourceGroup.categoryContext,
                    nodes: []
                };
                packageGroup.resourceGroups[pathInfo.resourceGroup.id] = resourceGroup;
            }
            // Add node to the resource groups's node list
            resourceGroup.nodes.push(node);
        }
    }
    /**
     * Parse keywords from the given string, with single letter words and words on the keyword
     * exclusion list skipped.
     */
    parseFilterKeywords(s, keywordsToExclude) {
        // Split up filter into keywords
        let keywords = s.match(/[-_'.A-Za-z0-9]+/g);
        // Trim off characters [-'.] from each keyword
        keywords = _.map(keywords, (word) => word.replace(/^[-'.]+|[-'.]+$/g, ''));
        // Filter out unwanted keywords
        keywords = _.filter(keywords, (word) => {
            if (word.length < 2) {
                return false;
            }
            else {
                // omit word if lower or proper case and in keyword exclusion set
                const wordLc = word.toLowerCase();
                return ((word !== wordLc && word !== _.startCase(wordLc)) ||
                    !keywordsToExclude.has(wordLc));
            }
        });
        // And remove duplicates
        return _.uniq(keywords);
    }
    async preloadCaches(dir, filterDevSetId) {
        await this.dbSession.openConnection(true);
        try {
            // Get default FilterDevSet; tries to load from db if not in cache
            if (!(await this.getFilterDevSet(filterDevSetId))) {
                // FilterDevSet not in cache or db. So import into db.
                await this.importFilterDevSet(dir, filterDevSetId);
            }
            // NOTE: 2nd open necessary (for now) due to inner close
            await this.dbSession.openConnection(true);
            // Load foundation tree (if not yet loaded)
            if (this.treeRoot == null) {
                await this.loadFoundationTree();
            }
        }
        finally {
            await this.dbSession.closeConnection();
        }
    }
    async writeFilterDevSet(filterDevSet) {
        this.logger.info('writing devset');
        // TODO: Improve dev set priority: provide APIs to adjust, maybe consider version, ...
        // First get highest current priority
        const rows = await this.db.simpleQuery('get-max-devset-priority', `select max(priority) max_priority ` +
            `from ${this.db.tables.contentSources} ` +
            `where type = 'devset'`);
        if (rows[0].max_priority != null) {
            filterDevSet.priority = rows[0].max_priority + 1;
        }
        else {
            filterDevSet.priority = 1;
        }
        // Write FilterDevSet to db
        await this.dbSession
            .getConnection()
            .writeDbObjsToDb('write-devset', [filterDevSet], this.db.tables.contentSources, ['type', 'public_id', 'version', 'created', 'state_updated', 'state', 'priority'], (filterDevSet) => [
            'devset',
            filterDevSet.publicId,
            filterDevSet.version,
            filterDevSet.created,
            filterDevSet.stateUpdated,
            filterDevSet.state,
            filterDevSet.priority
        ]);
        this.console.progress(WRITE_CHAR);
        // Save in local cache
        this.filterDevSetCache.set(filterDevSet.publicVId, filterDevSet);
    }
    /**
     * Add filters with the given filter type and values to the given resource,
     * creating any filters that don't yet exist.
     *
     * @param resource
     * @param filterType
     * @param filterValues
     */
    addResourceFilters(resource, filterType, filterValues) {
        if (filterValues != null) {
            for (const filterValue of filterValues) {
                let filter = this.getFilter(filterType, filterValue);
                if (filter == null) {
                    filter = createFilter(filterType, filterValue);
                    this.addFilter(filter);
                }
                resource.genericFilters.push(filter);
            }
        }
    }
    createNodeNameFilters(contentNode) {
        // Break the node's name into keywords and create a node-name filter for each
        contentNode.nameFilters = {};
        for (const keyword of this.parseFilterKeywords(contentNode.name, NODE_NAME_KEYWORDS_TO_EXCLUDE)) {
            let keywordFilter = this.getFilter('node', keyword);
            if (!keywordFilter) {
                keywordFilter = createFilter('node', keyword);
                this.addFilter(keywordFilter);
            }
            contentNode.nameFilters[keyword] = keywordFilter;
        }
        // Then do the same for the node's descendants
        if (contentNode.children != null) {
            for (const child of contentNode.children) {
                this.createNodeNameFilters(child);
            }
        }
    }
    /**
     * Get filter
     */
    getFilter(type, name) {
        return this.filterCache.get(filterKey(type, name));
    }
    /**
     * Has filter?
     */
    // @ts-ignore
    hasFilter(type, name) {
        return this.filterCache.has(filterKey(type, name));
    }
    /**
     * Add filter to cache. Overwrites filter if one already exists; check isn't
     * performed for performance.
     */
    addFilter(filter) {
        this.filterCache.set(filterKey(filter.type, filter.name), filter);
    }
    /**
     * Flush pending filter writes to db.
     */
    async flushFiltersToDb(packageGroup) {
        this.logger.fine('flushing filters');
        const filtersToWrite = [];
        const chunksByFilter = new Map();
        const filtersByChunk = new Map();
        const trailingChunkMap = new Map();
        // Find filters that need to be written to database.
        for (const filter of this.filterCache.values()) {
            if (filter.id == null) {
                // Filter not in db, needs to be persisted
                filtersToWrite.push(filter);
            }
        }
        this.logger.fine('filters to write: ' + filtersToWrite.length);
        if (_.isEmpty(filtersToWrite)) {
            // No filters to write
            return;
        }
        // Chunkify filters and store filter-chunk associations for persistence.
        // New chunks not in db
        const newChunks = new Map();
        for (const filter of filtersToWrite) {
            // Break filter into chunks
            const chunks = this.chunkifyFilter(filter.name, trailingChunkMap);
            // And prepare chunks and filter/chunk associations for persistence to db
            const filterDbChunks = {
                simple: [],
                composite: [],
                fullWord: []
            };
            chunksByFilter.set(filter, filterDbChunks);
            prepareChunksOfType(filterDbChunks.simple, chunks.simple);
            prepareChunksOfType(filterDbChunks.composite, chunks.composite);
            prepareChunksOfType(filterDbChunks.fullWord, chunks.fullWord);
            function prepareChunksOfType(dbChunks, chunks) {
                for (const chunkValue of chunks) {
                    // Get db chunk, create if new
                    let dbChunk = newChunks.get(chunkValue);
                    if (!dbChunk) {
                        // Not found, add it to the set of chunks to be written
                        dbChunk = { chunk: chunkValue };
                        newChunks.set(chunkValue, dbChunk);
                    }
                    // Add chunk obj to filter so that their association can be written
                    dbChunks.push(dbChunk);
                    // Add chunk's filter to filters-by-chunk map
                    let filters = filtersByChunk.get(dbChunk);
                    if (!filters) {
                        filters = new Set();
                        filtersByChunk.set(dbChunk, filters);
                    }
                    filters.add(filter);
                }
            }
        }
        // Determine which chunks are to become frequent-chunk filters
        this.freqChunkFiltersByStdFilters = new Map();
        const freqChunks = new Set();
        const freqChunksByFilter = new Map();
        // TODO!: Move this into parameter or config
        // Top search keywords, based on REX 3 searches from 2018-02-01 to 2019-01-31
        // 200+ searches each over 1 year period
        const mostCommonSearchChunks = [
            'compiler',
            'installation',
            'msp432',
            'i2c',
            'project',
            'zero',
            'uart',
            'spi',
            'msp430',
            'timer',
            'interrupt',
            'adc',
            'rtos',
            'cc2650',
            'pwm',
            'mmwave',
            'ble',
            'flash',
            'simplelink',
            'academy'
        ];
        // 90+ searches each over 1 year period
        const commonSearchChunks = [
            'driverlib',
            'examples',
            'example',
            'led',
            'bluetooth',
            'dynamic',
            'multiprotocol',
            'blink',
            'msp430ware',
            'gpio',
            'oad',
            'cc2640',
            'zigbee',
            'tiva',
            'mspware',
            'sensortag',
            'controlsuite',
            'cc1310'
        ];
        for (const [chunk, filters] of filtersByChunk) {
            if (filters.size >= 10 ||
                (filters.size > 1 && mostCommonSearchChunks.includes(chunk.chunk)) ||
                (filters.size > 3 && commonSearchChunks.includes(chunk.chunk))) {
                // Create a frequent-chunk filter from the chunk, and save in map by all of the
                // filters that it will replace when searching on that chunk
                const freqChunkFilter = {
                    type: 'freq-chunk',
                    name: chunk.chunk
                };
                filtersToWrite.push(freqChunkFilter);
                for (const filter of filters) {
                    let freqChunkFilters = this.freqChunkFiltersByStdFilters.get(filter);
                    if (!freqChunkFilters) {
                        freqChunkFilters = new Set();
                        this.freqChunkFiltersByStdFilters.set(filter, freqChunkFilters);
                    }
                    freqChunkFilters.add(freqChunkFilter);
                }
                // Also cache chunk for later
                freqChunks.add(chunk);
                freqChunksByFilter.set(freqChunkFilter, chunk);
            }
        }
        // Persist new chunks
        this.logger.fine('filter chunks to write: ' + newChunks.size);
        // Write new filters
        this.logger.fine('Writing filters to db');
        await this.dbSession
            .getConnection()
            .writeDbObjsToDb('write-filters', filtersToWrite, this.db.tables.filters, ['package_group_id', 'type', 'name', 'name_search', 'device_id', 'devtool_id'], (filter) => [
            packageGroup.id,
            filter.type,
            filter.name,
            filter.nameSearch,
            filter.device ? filter.device.id : null,
            filter.devtool ? filter.devtool.id : null
        ]);
        // Write new filter chunks
        this.logger.fine('Writing filter chunks to db');
        await this.dbSession
            .getConnection()
            .writeDbObjsToDb('write-filter-chunks', Array.from(newChunks.values()), this.db.tables.chunks, ['package_group_id', 'chunk'], (chunk) => [packageGroup.id, chunk.chunk]);
        // Write chunks' trailing sub-chunks
        this.logger.fine('Writing trailing subchunks to db');
        await this.dbSession
            .getConnection()
            .writeObjsToDb('write-trailing-subchunks', Array.from(newChunks.values()), this.db.tables.trailingSubChunks, ['chunk_id', 'subchunk'], (newChunk) => {
            const rows = [];
            const trailingChunks = trailingChunkMap.get(newChunk.chunk);
            if (trailingChunks) {
                for (const subchunk of trailingChunks) {
                    rows.push([newChunk.id, subchunk]);
                }
            }
            return rows;
        });
        // Write filter-chunk associations
        this.logger.fine('Writing filter-chunk associations to db');
        await this.dbSession
            .getConnection()
            .writeObjsToDb('write-filters-x-chunks', filtersToWrite, this.db.tables.filtersXChunks, [
            'filter_id',
            'chunk_id',
            'chunk_type',
            'search_on_filter',
            'filter_type',
            'filter_segment'
        ], (filter) => {
            const rows = [];
            if (filter.type === 'freq-chunk') {
                // Write a single filter/association between the filter and its chunk, the one
                // that'll be used for tree queries
                const chunk = freqChunksByFilter.get(filter);
                rows.push([filter.id, chunk.id, 'x', true, 'x', chunk.chunk]);
            }
            else {
                // Write filter/chunk association for all of the filter's chunk types, simple,
                // composite, and full.
                const chunks = chunksByFilter.get(filter);
                if (chunks) {
                    addFilterXChunkRows('s', chunks.simple);
                    addFilterXChunkRows('c', chunks.composite);
                    addFilterXChunkRows('f', chunks.fullWord);
                }
            }
            return rows;
            function addFilterXChunkRows(chunkType, chunks) {
                for (const dbChunk of chunks) {
                    // Extract the part of the filter that corresponds to the chunk, so that it
                    // can be stored in the database with the association between the chunk and
                    // filter for search suggestions.
                    // E.g. Chunk "dafoo" in Filter "_Da_FooBar" => "Da_Foo"
                    // Find start position of chunk in the real filter (i.e. in original case
                    // and with non-alphanumeric characters)
                    const lowerCaseFilter = filter.name.toLowerCase();
                    const chunkPos = filter.nameSearch.indexOf(dbChunk.chunk);
                    const beforeChunk = filter.nameSearch.substring(0, chunkPos);
                    let startPos = 0;
                    for (const c of beforeChunk) {
                        startPos = lowerCaseFilter.indexOf(c, startPos) + 1;
                    }
                    // Find end position of chunk in real filter
                    const afterChunk = filter.nameSearch.substring(chunkPos + dbChunk.chunk.length);
                    let endPos = lowerCaseFilter.length - 1;
                    for (let i = afterChunk.length - 1; i >= 0; i--) {
                        const c = afterChunk.charAt(i);
                        endPos = lowerCaseFilter.lastIndexOf(c, endPos) - 1;
                    }
                    // Extract segment from filter corresponding to chunk, with all adjacent
                    // non-alphanumeric characters stripped.
                    const filterSegment = filter.name
                        .substring(startPos, endPos + 1)
                        .replace(/^[^a-zA-Z0-9]/, '')
                        .replace(/[^a-zA-Z0-9]$/, '');
                    // Search_on_filter is false only if the chunk has a frequent chunk filter',
                    // in which case only the association between the chunk and that filter may
                    // be used for search
                    const searchOnFilter = !freqChunks.has(dbChunk);
                    let ChunkXFilterType;
                    (function (ChunkXFilterType) {
                        ChunkXFilterType["Enum"] = "e";
                        ChunkXFilterType["Keyword"] = "k";
                        ChunkXFilterType["Device"] = "d";
                        ChunkXFilterType["Board"] = "b";
                        ChunkXFilterType["Devtool"] = "t";
                        ChunkXFilterType["FreqChunk"] = "x";
                        ChunkXFilterType["Tag"] = "g";
                    })(ChunkXFilterType || (ChunkXFilterType = {}));
                    let chunkXFilterType;
                    switch (filter.type) {
                        case 'compiler':
                        case 'ide':
                        case 'kernel':
                        case 'language':
                        case 'resClass':
                            chunkXFilterType = ChunkXFilterType.Enum;
                            break;
                        case 'descr':
                        case 'node':
                            chunkXFilterType = ChunkXFilterType.Keyword;
                            break;
                        case 'device':
                            chunkXFilterType = ChunkXFilterType.Device;
                            break;
                        case 'devtool':
                            // TODO: Get rid of cast to Filter
                            chunkXFilterType =
                                filter.devtool.type === 'board'
                                    ? ChunkXFilterType.Board
                                    : ChunkXFilterType.Tag;
                            break;
                        case 'freq-chunk':
                            chunkXFilterType = ChunkXFilterType.FreqChunk;
                            break;
                        case 'tag':
                            chunkXFilterType = ChunkXFilterType.Tag;
                            break;
                        default:
                            (0, util_2.assertNever)(filter.type);
                            throw new Error('Invalid filter type: ' + filter.type);
                    }
                    rows.push([
                        filter.id,
                        dbChunk.id,
                        chunkType,
                        searchOnFilter,
                        chunkXFilterType,
                        filterSegment
                    ]);
                }
            }
        });
        this.console.progress(WRITE_CHAR);
    }
    chunkifyFilter(filter, trailingChunkMap) {
        let simpleChunks = [];
        let compositeChunks = [];
        let fullWordChunks = [];
        // Break up filter into words
        const words = filter.match(/\S+/g);
        // And break each of the filter's words into simple and composite chunks
        if (words) {
            for (const word of words) {
                const wordSimpleChunks = _.chain(
                // Break up into pure alphanumeric substrings, discarding all other characters
                // including underscores and hyphens
                word.match(/[A-Za-z0-9]+/g))
                    // Then break up on predefined keywords, e.g. udma => [u, dma]
                    .flatMap((s) => s.split(FILTER_CHUNKING_REGEX))
                    // Remove empty string chunks and undefines
                    .compact()
                    // And then break up on alpha/numeric boundaries (must occur after keywords),
                    // e.g. msp430 => [msp, 430]
                    .flatMap((s) => s.split(/([A-Za-z]+|\d+)/))
                    // Remove empty string chunks and undefines
                    .compact()
                    // Then break up on camel case and all caps
                    // e.g. xLEDBlinkMyCamel => [x, LED, Blink, My, Camel]
                    .flatMap((s) => s.split(/([A-Z]{2,})(?![a-z])|(?=[A-Z])/))
                    // Remove empty string chunks and undefines
                    .compact()
                    // Lowercase all chunks
                    .map((s) => s.toLowerCase())
                    .value();
                // Create composite chunks by concatenating all ordered simple chunk permutations...
                const wordCompositeChunks = [];
                // And the 'full filter' chunk, which is a filter word stripped of non-chunk
                // characters
                let fullWordChunk = null;
                if (wordSimpleChunks.length > 1) {
                    for (let i = 0; i < wordSimpleChunks.length; i++) {
                        for (let j = i + 1; j < wordSimpleChunks.length; j++) {
                            const compositeChunk = wordSimpleChunks.slice(i, j + 1).join('');
                            if (i === 0 && j === wordSimpleChunks.length - 1) {
                                fullWordChunk = compositeChunk;
                            }
                            else {
                                wordCompositeChunks.push(compositeChunk);
                            }
                            // Array of trailing substrings of compositeChunk, with the first
                            // being the full composite chunk with just the leftmost chunk removed,
                            // and subsequent elements removing further chunks until only the
                            // rightwards remains.
                            // E.g. 'foo123abc' => [ '123abc', 'abc' ]
                            // Used in chunk db queries for composite chunks on subchunks
                            if (!trailingChunkMap.has(compositeChunk)) {
                                const trailingChunks = [];
                                for (let k = i + 1; k <= j; k++) {
                                    trailingChunks.push(wordSimpleChunks.slice(k, j + 1).join(''));
                                }
                                stripOutBadChunks(trailingChunks);
                                trailingChunkMap.set(compositeChunk, trailingChunks);
                            }
                        }
                    }
                }
                // Strip out unwanted simple and composite chunks
                stripOutBadChunks(wordSimpleChunks);
                stripOutBadChunks(wordCompositeChunks);
                // Set word chunk to the simple chunk (if it wasn't already stripped out). Only
                // necessary if there was just a single simple chunk, otherwise it would've already
                // been created.
                if (fullWordChunk == null && wordSimpleChunks.length === 1) {
                    fullWordChunk = wordSimpleChunks[0];
                }
                // Merge the word's simple, composite, and full word chunks into their corresponding
                // aggregate arrays for the full filter
                simpleChunks = _.union(simpleChunks, wordSimpleChunks);
                compositeChunks = _.union(compositeChunks, wordCompositeChunks);
                if (fullWordChunk) {
                    const fullWordChunks0 = [fullWordChunk];
                    stripOutBadChunks(fullWordChunks0);
                    if (fullWordChunks0.length > 0) {
                        fullWordChunks = _.union(fullWordChunks, fullWordChunks0);
                    }
                }
                function stripOutBadChunks(chunks) {
                    // Remove all chunks 1 character in length
                    return _.remove(chunks, (s) => s.length < 2);
                }
            }
        }
        return {
            simple: simpleChunks,
            composite: compositeChunks,
            fullWord: fullWordChunks,
            trailingChunks: trailingChunkMap
        };
    }
    reportMemUsage() {
        let memUsage = process.memoryUsage();
        this.logger.debug('Memory Usage (pre-gc): ' + JSON.stringify(memUsage));
        if (REPORT_MEM_USAGE) {
            this.console.log('Memory Usage (pre-gc):  ' + JSON.stringify(memUsage));
        }
        if (PERFORM_GC) {
            if (global.gc) {
                // Keep performing garbage collection until heap use stabilizes
                // or excessive attempts
                const MAX_GC_CALLS = 100;
                if (memUsage == null) {
                    memUsage = process.memoryUsage();
                }
                let prevHeapUsed = memUsage.heapUsed;
                let gcCalls = 0;
                const start = process.hrtime();
                do {
                    global.gc();
                    prevHeapUsed = memUsage.heapUsed;
                    memUsage = process.memoryUsage();
                    ++gcCalls;
                } while (Math.abs(prevHeapUsed - memUsage.heapUsed) >= 1024 &&
                    gcCalls < MAX_GC_CALLS);
                if (gcCalls === MAX_GC_CALLS) {
                    console.warn(`Aborting forced garbage collection, free heap did not stabilize after ` +
                        `${MAX_GC_CALLS} gc() calls`);
                }
                else {
                    this.console.log(`Forced garbage collection (%d calls, %ds) ${gcCalls} ` +
                        `${(0, util_1.hrtimeToSec)(process.hrtime(start))}`);
                }
                if (REPORT_MEM_USAGE) {
                    this.console.log('Memory Usage (post-gc): ' + JSON.stringify(memUsage));
                }
                this.logger.debug('Memory Usage (post-gc): ' + JSON.stringify(memUsage));
            }
            else {
                console.warn('Cannot force garbage collection as global.gc() is unavailable, try passing ' +
                    '--expose-gc to node');
            }
            if (CREATE_HEAPDUMP_SNAPSHOTS) {
                this.console.log('Creating heapdump snapshot');
                const heapdump = require('heapdump');
                heapdump.writeSnapshot();
            }
        }
    }
}
exports.Manage = Manage;
function createFilter(type, name) {
    return {
        type,
        name,
        nameSearch: name.toLowerCase().replace(/([^a-z0-9 ]+)/g, '')
    };
}
function filterKey(type, name) {
    return type + '__' + name;
}
function createMinimalDevice(publicId) {
    return {
        publicId,
        children: {}
    };
}
function packageGroupFromJson(json) {
    // TODO: add error checking
    let uid;
    let packageUids;
    let mainPackageUid = null;
    if (typeof json === 'object') {
        if (json.uid != null) {
            uid = json.uid;
            // In this form (i.e. when the group's uid is specified), the main
            // package must be explicitly specified or it will not be assigned
            // one.
            if (json.mainPackage != null) {
                mainPackageUid = json.mainPackage;
            }
        }
        else {
            // The group uid defaults to that of the first package if not
            // specified.
            uid = json.packages[0];
            // And in this case, the first package is also the main package,
            // unless specified.
            if (json.mainPackage != null) {
                mainPackageUid = json.mainPackage;
            }
            else {
                mainPackageUid = json.packages[0];
            }
        }
        packageUids = json.packages;
    }
    else {
        // Just a single package uid
        uid = json;
        mainPackageUid = json;
        packageUids = [json];
    }
    const publicVId = (0, types_js_1.stringToVPublicId)(uid);
    return {
        publicVId: (0, types_js_1.publicVIdToString)(publicVId),
        publicId: publicVId.publicId,
        version: publicVId.version,
        type: 'pkggrp',
        mainPackageUid,
        packageUids,
        contentHeadNodes: [],
        packageFiles: [],
        resourceGroups: {}
    };
}
function createNode(name) {
    return {
        name,
        children: [],
        treeDevices: [],
        treeDevtools: [],
        tvDevices: [],
        tvDevtools: []
    };
}
// TODO: Move this
function nodePathToString(node) {
    let path = '';
    let curr = node;
    do {
        path = '/' + node.name + path;
        curr = curr.parent;
    } while (curr && curr.parent); // checking node.parent as we don't want to print the root
    return path;
}
/**
 * Process nodes of the given tree (or subtree) in top-down breadth-first
 * traversal.
 *
 * Nodes are processed in batches (via processNodeBatch()), with each
 * batch limited to from a single level of the tree.
 *
 * This top-down, one level at a time approach is taken due to dependencies on
 * parent and ancestor nodes.
 *
 * @param topNode          tree/subtree root
 * @param batchSize        batch size
 * @param onLevel          notification of level change
 * @param processNodeBatch node batch processing function
 */
async function processTree(topNode, batchSize, onLevel, processNodeBatch) {
    let currentQueue = [topNode]; // nodes to be processed first
    let nextQueue = []; // nodes to be processed after currentQueue's nodes
    let treeLevel = 1;
    let batchNo = 0;
    onLevel(treeLevel);
    do {
        batchNo++;
        if (_.isEmpty(currentQueue)) {
            // The current tree level's has been processed, move on to the next.
            treeLevel++;
            batchNo = 1;
            onLevel(treeLevel);
            currentQueue = nextQueue;
            nextQueue = [];
        }
        const currentBatch = [];
        while (!_.isEmpty(currentQueue) && currentBatch.length < batchSize) {
            const node = currentQueue.shift();
            // Add node to current batch
            currentBatch.push(node);
            // If node has children, add them to nextQueue for processing later
            if (node.children != null) {
                nextQueue.push(...node.children);
            }
        }
        // Process batch
        await processNodeBatch(currentBatch, batchNo);
    } while (!_.isEmpty(currentQueue) || !_.isEmpty(nextQueue));
}
function rowToInternalNode(row) {
    return {
        ...(0, types_js_1.rowToNode)(row),
        children: [],
        descendantCount: row.descendant_count
    };
}
function getLinkExt(link) {
    let linkExt = null;
    if (link) {
        const linkUrl = url.parse(link);
        // Parse extension from url pathname; use even in case of query, non-file
        // extensions (e.g. .tsp?, .page?) will be handled on server/ui side
        if (linkUrl.pathname) {
            linkExt = path.extname(linkUrl.pathname);
            if (linkExt.charAt(0) === '.') {
                // Link extension WRITE_CHAR prefix stripped so that it's not stored in db,
                // but will be added back by queries
                linkExt = linkExt.substring(1);
            }
            // Truncate in case it exceeds db field length
            linkExt = linkExt.substring(0, 15);
            if (linkExt === '') {
                linkExt = null;
            }
        }
    }
    return linkExt;
}
function getShortLinkType(linkType) {
    let shortenedLinkType = null;
    if (linkType) {
        switch (linkType) {
            case 'local':
                shortenedLinkType = 'l';
                break;
            case 'external':
                shortenedLinkType = 'e';
                break;
            default:
                throw new Error('Unknown link type: ' + linkType);
        }
    }
    return shortenedLinkType;
}
