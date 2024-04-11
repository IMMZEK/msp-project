"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDb = void 0;
const db_1 = require("./db/db");
const packages_1 = require("./packages");
const devices_1 = require("./devices");
const devtools_1 = require("./devtools");
const resources_1 = require("./resources");
const tree_1 = require("./tree");
const manage_1 = require("./manage");
const dblogger_1 = require("./dblogger");
const path_1 = require("path");
const table_views_1 = require("./table-views");
const console_1 = require("./console");
class SqlDb {
    logger;
    packages;
    tree;
    tableViews;
    resources;
    devices;
    devtools;
    manage;
    db;
    console;
    static inst;
    // TODO REX-2268 Should allow multiple instances of sqldb
    static async instance(config) {
        if (!SqlDb.inst) {
            const fullConfig = {
                trace: false,
                consoleVerbosity: manage_1.ConsoleVerbosity.ProgressOnly,
                ...config
            };
            const dinfraLibPath = (0, path_1.dirname)(config.dinfraPath);
            const logger = await dblogger_1.DbLogger.instance(dinfraLibPath, 'rexdb', fullConfig.logConfigPath);
            SqlDb.inst = new SqlDb(fullConfig, logger, dinfraLibPath);
        }
        return SqlDb.inst;
    }
    constructor(fullConfig, logger, dinfraLibPath) {
        this.logger = logger;
        this.console = new console_1.ConsoleLogger(fullConfig.consoleVerbosity);
        this.db = new db_1.Db(fullConfig, this.logger, dinfraLibPath);
        this.packages = new packages_1.Packages(this.db, dinfraLibPath);
        this.tree = new tree_1.Tree(this.db, dinfraLibPath);
        this.tableViews = new table_views_1.TableViews(this.db, dinfraLibPath, this.tree);
        this.resources = new resources_1.Resources(this.db);
        this.devices = new devices_1.Devices(this.db);
        this.devtools = new devtools_1.Devtools(this.db);
        this.manage = new manage_1.Manage(this.db, this.logger, this.console, fullConfig, dinfraLibPath, this.packages);
    }
    /**
     * Reset state/caches
     */
    reset() {
        this.manage.reset();
        this.tree.reset();
    }
}
exports.SqlDb = SqlDb;
