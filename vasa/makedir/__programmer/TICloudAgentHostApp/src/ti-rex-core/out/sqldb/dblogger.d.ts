import { MysqlError } from 'mysql';
interface TimedLogData {
    start: number;
    duration?: number;
}
interface SqlLogData extends TimedLogData {
    qid: string;
    args?: (string | string[] | number | number[])[] | null;
}
export interface SqlQueryLogData extends SqlLogData {
    logType: 'sql.query';
    queryRows?: number;
    sql?: string;
}
export interface SqlQueryLogExtraData {
    logType: 'sql.query.ext';
    sql: string;
}
export interface SqlManipulateLogData extends SqlLogData {
    logType: 'sql.manipulate';
    affectedRows: number;
    insertRows?: number;
    changedRows?: number;
}
export interface SqlErrorLogData extends SqlLogData {
    logType: 'sql.err';
    error?: MysqlError | Error | Error[] | null;
    sql?: string;
}
export declare class DbLogger {
    private readonly category;
    private readonly logConfigPath;
    private readonly dinfraLogger;
    private readonly readableLogger?;
    private fileLogPriorities;
    static inst: DbLogger;
    static instance(dinfraLibPath: string, category: string, logConfigPath?: string): Promise<DbLogger>;
    private constructor();
    emergency(message: string | null, data?: {}): void;
    alert(message: string | null, data?: {}): void;
    critical(message: string | null, data?: {}): void;
    error(message: string | null, data?: {}): void;
    warning(message: string | null, data?: {}): void;
    notice(message: string | null, data?: {}): void;
    info(message: string | null, data?: {}): void;
    debug(message: string | null, data?: {}): void;
    fine(message: string | null, data?: {}): void;
    finer(message: string | null, data?: {}): void;
    finest(message: string | null, data?: {}): void;
    /**
     * Log the given message or/and data at the given priority.
     *
     * @param {Integer} priority
     */
    private log;
    /**
     * Reload configuration file.
     *
     * NOTE: Currently reloads only priorities
     */
    private reloadConfig;
}
export {};
