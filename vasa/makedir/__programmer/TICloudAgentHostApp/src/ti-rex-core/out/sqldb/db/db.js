'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Db = exports.DbError = void 0;
const sqlStats = require("./sql-stats");
const callbacks_1 = require("../../utils/callbacks");
const connection_1 = require("./connection");
const promisifyAny_1 = require("../../utils/promisifyAny");
// TODO: Use this in all SQL related code
class DbError extends Error {
    sql;
    constructor(message, sql) {
        super(message);
        this.sql = sql;
    }
}
exports.DbError = DbError;
class Db {
    logger;
    tables;
    sqlStats;
    dinfra;
    mysql;
    constructor(config, logger, dinfraLibPath) {
        this.logger = logger;
        if (!config.tablePrefix) {
            throw new Error('Config property tablePrefix is empty');
        }
        else if (!config.tablePrefix.match(/^\w+$/)) {
            throw new Error(`Illegal character in config property tablePrefix '${config.tablePrefix}' - ` +
                `only alphanumerics and underscores are allowed`);
        }
        this.dinfra = require(config.dinfraPath);
        this.mysql = require(dinfraLibPath + '/node_modules/mysql');
        this.tables = {
            filters: config.tablePrefix + 'filters',
            chunks: config.tablePrefix + 'chunks',
            trailingSubChunks: config.tablePrefix + 'trailing_subchunks',
            filtersXChunks: config.tablePrefix + 'filters_x_chunks',
            nodes: config.tablePrefix + 'nodes',
            nodeAncestors: config.tablePrefix + 'node_ancestors',
            resources: config.tablePrefix + 'resources',
            devices: config.tablePrefix + 'devices',
            devtools: config.tablePrefix + 'devtools',
            packages: config.tablePrefix + 'packages',
            packageDepends: config.tablePrefix + 'package_depends',
            devtoolDevices: config.tablePrefix + 'devtool_devices',
            resourceDevtools: config.tablePrefix + 'resource_devtools',
            resourceDevices: config.tablePrefix + 'resource_devices',
            filterAffectsNode: config.tablePrefix + 'filter_affects_node',
            filterAffectsNodeCDesc: config.tablePrefix + 'filter_affects_node_cdesc',
            contentSources: config.tablePrefix + 'content_sources',
            contentSourcePackages: config.tablePrefix + 'content_source_packages',
            nodeDevResourceGroups: config.tablePrefix + 'node_dev_resgrps',
            resourceFilters: config.tablePrefix + 'res_filters',
            resourceGroups: config.tablePrefix + 'resource_groups',
            resourceGroupNodes: config.tablePrefix + 'resgrp_nodes',
            nodePublicIds: config.tablePrefix + 'node_public_ids',
            nodeCustomResourceIds: config.tablePrefix + 'node_custom_res_ids',
            deviceAliases: config.tablePrefix + 'device_aliases',
            devtoolAliases: config.tablePrefix + 'devtool_aliases',
            packageAliases: config.tablePrefix + 'package_aliases'
        };
        this.sqlStats = new sqlStats.SqlStats();
    }
    async simpleQuery(qid, sql, args, 
    // index (0-based) of main statement within multi-statement sql
    mainStatementPos, options) {
        const start = Date.now();
        const conn = new connection_1.DbConnection(await this.dinfra.openReadableDB(), this.logger);
        let results;
        let err;
        try {
            results = await conn.query(qid, sql, args, options);
        }
        catch (error) {
            err = error;
            this.logger.error(null, {
                logType: 'sql.err',
                qid,
                start,
                error,
                sql
            });
            throw err;
        }
        finally {
            const closeStart = Date.now();
            try {
                await conn.getDMysqlConnection().close();
            }
            catch (closeErr) {
                this.logger.error(null, {
                    logType: 'sql.err',
                    qid: 'conn-close',
                    start: closeStart,
                    error: closeErr
                });
                if (!err) {
                    err = Array.isArray(closeErr) ? closeErr[0] : closeErr;
                }
            }
        }
        const rows = mainStatementPos === undefined
            ? results
            : results[mainStatementPos];
        // if (qid === 'get-tableview-items') {
        // console.error(`ms: ${Date.now() - start}`);
        // console.error(`rows: ${util.inspect(results)}`);
        // }
        this.logger.debug(null, {
            logType: 'sql.query',
            qid,
            args,
            start,
            queryRows: rows.length
        });
        this.logger.finer(null, {
            logType: 'sql.query.ext',
            sql
        });
        return rows;
    }
    async manipulate(qid, sql, args = null) {
        const start = Date.now();
        const conn = await this.dinfra.openWritableDB();
        let result;
        let duration;
        let error;
        let closeStart;
        let closeErr;
        let closeDuration;
        try {
            // Execute manipulate statement
            result = await (0, promisifyAny_1.promisifyAny)(conn.query).bind(conn)(sql, args);
        }
        catch (e) {
            error = e;
        }
        finally {
            duration = Date.now() - start;
            // Close connection, before logging
            closeStart = Date.now();
            try {
                await conn.close();
            }
            catch (e) {
                closeErr = Array.isArray(e) ? e[0] : e;
            }
            finally {
                closeDuration = Date.now() - closeStart;
            }
        }
        // Logging
        try {
            if ((0, callbacks_1.isError)(error, result)) {
                this.logger.error(null, {
                    logType: 'sql.err',
                    qid,
                    start,
                    duration,
                    error,
                    sql
                });
                throw error;
            }
            else {
                this.logger.debug(null, {
                    logType: 'sql.manipulate',
                    qid,
                    args,
                    start,
                    duration,
                    affectedRows: result && result.affectedRows ? result.affectedRows : 0,
                    changedRows: result && result.changedRows ? result.changedRows : undefined
                });
                return result;
            }
        }
        finally {
            if (closeErr) {
                // Log close errors, but don't throw
                this.logger.error(null, {
                    logType: 'sql.err',
                    qid: 'conn-close',
                    start: closeStart,
                    duration: closeDuration,
                    error: closeErr
                });
            }
        }
    }
    nullSafeSqlComparison(value) {
        return value ? '= ' + this.mysql.escape(value) : 'is null';
    }
}
exports.Db = Db;
