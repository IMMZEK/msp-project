"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbSession = void 0;
const connection_js_1 = require("./connection.js");
// Note: Do NOT use this object outside of the import code unless it is
// refactored to guard against connection deadlocks.
// For instance, if an asynchronous call chain were to create one of these,
// open it, and keep it around for multiple queries, that's likely quite
// performant.  However, if that chain happened to create more than one, then
// it is very likely we'll run into a deadlock.  There are only 30 connections
// possible at any one time, and calls to open a 31st connection will never
// fire the callback until one of those 30 closes.  As such, any single async
// sequence that creates/opens more than one of these objects can lead to
// deadlock if over 30 calls are made to that sequence at a time.  All code
// outside of import is meant to handle multiple incoming requests
// concurrently, so this is always possible.
//
// A solution is to have one (and only one) of these objects per top level
// async sequence (hard to enforce outside of associating it with the express
// request).  Another is to have a singleton version of this object that
// creates connections as needed (ie it wouldn't close them immediately).  It
// isn't known if either would actually improve performance.
//
// Please see https://jira.itg.ti.com/browse/REX-2351 for details
class DbSession {
    logger;
    dinfra;
    conn;
    constructor(logger, config) {
        this.logger = logger;
        this.dinfra = require(config.dinfraPath);
    }
    async openConnection(writable) {
        if (!this.conn) {
            if (writable) {
                // Open writable DB connection
                this.conn = new connection_js_1.DbConnection(await this.dinfra.openWritableDB(), this.logger);
            }
            else {
                // Open readable DB connection
                this.conn = new connection_js_1.DbConnection(await this.dinfra.openReadableDB(), this.logger);
            }
        }
    }
    /**
     * Close connection, if open.
     *
     * Because this function is called on cleanup (including on error handling), errors are logged
     * and swallowed instead of re-thrown.
     */
    async closeConnection() {
        if (this.conn) {
            try {
                // close database connection
                await this.conn.getDMysqlConnection().close();
            }
            catch (e) {
                // log and swallow error
                this.logger.error(e);
            }
            finally {
                // clear connection regardless
                this.conn = null;
            }
        }
    }
    getConnection() {
        return this.conn;
    }
}
exports.DbSession = DbSession;
