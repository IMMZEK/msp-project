import { Db } from './db/db';
import { Packages } from './packages';
import { Devices } from './devices';
import { Devtools } from './devtools';
import { Resources } from './resources';
import { Tree } from './tree';
import { Manage } from './manage';
import { PartialConfig } from './config';
import { TableViews } from './table-views';
import { ConsoleLogger } from './console';
export declare class SqlDb {
    private readonly logger;
    readonly packages: Packages;
    readonly tree: Tree;
    readonly tableViews: TableViews;
    readonly resources: Resources;
    readonly devices: Devices;
    readonly devtools: Devtools;
    readonly manage: Manage;
    readonly db: Db;
    readonly console: ConsoleLogger;
    private static inst;
    static instance(config: PartialConfig): Promise<SqlDb>;
    private constructor();
    /**
     * Reset state/caches
     */
    reset(): void;
}
