"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbConnection = void 0;
const _ = require("lodash");
const callbacks_1 = require("../../utils/callbacks");
const defaultWriteOptions = { ignoreDuplicates: false, ignoreWarnings: false };
const defaultWriteDbObjOptions = {
    ...defaultWriteOptions,
    getAutoIncrementId: true
};
class DbConnection {
    conn;
    logger;
    constructor(conn, logger) {
        this.conn = conn;
        this.logger = logger;
    }
    getDMysqlConnection() {
        return this.conn;
    }
    async query(qid, sql, args, options) {
        const start = Date.now();
        return new Promise((resolve, reject) => {
            this.conn.query({
                sql,
                values: args || null,
                ...options
            }, (error, rows) => {
                if ((0, callbacks_1.isError)(error, rows)) {
                    this.logger.error(null, {
                        logType: 'sql.err',
                        qid,
                        start,
                        error,
                        sql
                    });
                    reject(error);
                }
                else {
                    this.logger.debug(null, {
                        logType: 'sql.query',
                        qid,
                        args,
                        start,
                        queryRows: rows ? rows.length : undefined
                    });
                    resolve(rows);
                }
            });
        });
    }
    async writeDbObjsToDb(qid, objs, tableName, columnNames, mapObjToDbRow, options = {}) {
        const fullOptions = { ...defaultWriteDbObjOptions, ...options };
        if (_.isEmpty(objs)) {
            return;
        }
        // Map db objects to data records to be written to database
        const rowsToInsert = _.map(objs, mapObjToDbRow);
        // Write to db
        await this.writeRowsToDb(qid, rowsToInsert, tableName, columnNames, fullOptions);
        // Get the first autogenerated ID of the last insert statement
        if (fullOptions.getAutoIncrementId) {
            const rows = await this.query('get-last-insert-id', "SELECT LAST_INSERT_ID() AS 'last'");
            if (_.isEmpty(rows)) {
                throw new Error('No rows returned by SQL LAST_INSERT_ID() query');
            }
            // Assign the autoincrement IDs to objects
            let id = rows[0].last;
            _.each(objs, o => {
                o.id = id++;
            });
        }
    }
    async writeObjsToDb(qid, objs, tableName, columnNames, mapToDbRows, options = {}) {
        // Write objects to db, with each object mapped to 0-many records.
        const rowsToInsert = _.flatMap(objs, mapToDbRows);
        await this.writeRowsToDb(qid, rowsToInsert, tableName, columnNames, options);
    }
    async writeRowsToDb(qid, rowsToInsert, tableName, columnNames, options = {}) {
        return new Promise((resolve, reject) => {
            if (_.isEmpty(rowsToInsert)) {
                return resolve();
            }
            const fullOptions = { ...defaultWriteOptions, ...options };
            // TODO: Remove most or all use of ignoreDuplicates -- slows down inserts and is
            // unnecessary except *possibly* for some associative table writes where multiple tree
            // passes would require high memory use to keep track what's been written.
            let error;
            let insertResult;
            const start = Date.now();
            const sql = 'INSERT' +
                (fullOptions.ignoreDuplicates ? ' IGNORE' : '') +
                ' INTO ' +
                tableName +
                ' (' +
                columnNames.join() +
                ') VALUES ?';
            this.conn.query(sql, [rowsToInsert])
                .on('result', (result) => {
                insertResult = result;
            })
                .on('error', (err) => {
                error = err;
            })
                .on('end', () => {
                if (error) {
                    this.logger.error(null, {
                        logType: 'sql.err',
                        qid,
                        start,
                        error,
                        sql
                    });
                    return reject(error);
                }
                this.logger.debug(null, {
                    logType: 'sql.manipulate',
                    qid,
                    start,
                    insertRows: rowsToInsert.length,
                    affectedRows: insertResult ? insertResult.affectedRows : 0
                });
                if (!fullOptions.ignoreWarnings && insertResult.warningCount) {
                    this.query('show-insert-warnings', 'show warnings')
                        .then(rows => {
                        if (!_.isEmpty(rows)) {
                            const reducedRows = rows.length > 10 ? rows.slice(0, 10) : rows;
                            return reject(new Error(rows.length +
                                ' SQL Warnings on ' +
                                qid +
                                ': ' +
                                _.join(_.map(reducedRows, row => `${row.Level} (${row.Code}): ` +
                                    `${row.Message}`), '; ') +
                                (rows.length > reducedRows.length ? '; ...' : '')));
                        }
                        else {
                            return resolve();
                        }
                    })
                        .catch(error => {
                        return reject(error);
                    });
                }
                else {
                    return resolve();
                }
            });
        });
    }
}
exports.DbConnection = DbConnection;