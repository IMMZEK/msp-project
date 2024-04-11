import * as sqlStats from './sql-stats';
import * as mysqlTypes from 'mysql';
import { Config } from '../config';
import { DbLogger } from '../dblogger';
export interface MySqlInsertResult {
    affectedRows: number;
    warningCount?: number;
}
export type MySqlWriteResult = MySqlInsertResult & {
    changedRows?: number;
};
export declare class DbError extends Error {
    readonly sql?: string | undefined;
    constructor(message: string, sql?: string | undefined);
}
export interface Tables {
    filters: string;
    chunks: string;
    trailingSubChunks: string;
    filtersXChunks: string;
    nodes: string;
    nodeAncestors: string;
    resources: string;
    devices: string;
    devtools: string;
    packages: string;
    packageDepends: string;
    devtoolDevices: string;
    resourceDevtools: string;
    resourceDevices: string;
    filterAffectsNode: string;
    filterAffectsNodeCDesc: string;
    contentSources: string;
    contentSourcePackages: string;
    nodeDevResourceGroups: string;
    resourceFilters: string;
    resourceGroups: string;
    resourceGroupNodes: string;
    nodePublicIds: string;
    nodeCustomResourceIds: string;
    deviceAliases: string;
    devtoolAliases: string;
    packageAliases: string;
}
export declare class Db {
    private readonly logger;
    readonly tables: Tables;
    readonly sqlStats: sqlStats.SqlStats;
    private readonly dinfra;
    private readonly mysql;
    constructor(config: Config, logger: DbLogger, dinfraLibPath: string);
    simpleQuery<ROW>(qid: string, sql: string, args?: (string | number | string[] | number[])[], mainStatementPos?: number, options?: Omit<mysqlTypes.QueryOptions, 'sql' | 'values'>): Promise<ROW[]>;
    manipulate(qid: string, sql: string, args?: (string | number | string[] | number[])[] | null): Promise<MySqlWriteResult>;
    nullSafeSqlComparison(value: number | null): string;
}
