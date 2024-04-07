import * as _ from 'lodash';
import { QueryOptions } from 'mysql/index.js';
import * as dinfraTypes from 'dinfra';
import { DbValue, DbObj } from './types';
import { DbLogger } from '../dblogger';
import { Omit } from '../../shared/generic-types';
interface WriteOptions {
    ignoreDuplicates?: boolean;
    ignoreWarnings?: boolean;
}
type DbObjWriteOptions = WriteOptions & {
    getAutoIncrementId?: boolean;
};
export declare class DbConnection {
    private readonly conn;
    private readonly logger;
    constructor(conn: dinfraTypes.DMysqlConnection, logger: DbLogger);
    getDMysqlConnection(): dinfraTypes.DMysqlConnection;
    query<ROW>(qid: string, sql: string, args?: (string | string[] | number | number[])[], options?: Omit<QueryOptions, 'sql' | 'values'>): Promise<ROW[]>;
    writeDbObjsToDb<T extends DbObj>(qid: string, objs: T[], tableName: string, columnNames: string[], mapObjToDbRow: (obj: T) => DbValue[], options?: DbObjWriteOptions): Promise<void>;
    writeObjsToDb<T>(qid: string, objs: T[], tableName: string, columnNames: string[], mapToDbRows: _.ListIterator<T, DbValue[][]>, options?: WriteOptions): Promise<void>;
    writeRowsToDb(qid: string, rowsToInsert: DbValue[][], tableName: string, columnNames: string[], options?: WriteOptions): Promise<void>;
}
export {};
