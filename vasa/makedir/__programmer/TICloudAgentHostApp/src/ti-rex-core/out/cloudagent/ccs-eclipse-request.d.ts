/// <reference types="node" />
import * as url from 'url';
import { Logger } from '../utils/logging';
import { CCSProduct } from './util';
/**
 * Some CCS API names
 */
export declare const enum CCS_ECLIPSE_API {
    REDISCOVER_PRODUCTS = "/ide/rediscoverProducts",
    GET_PRODUCTS = "/ide/getProducts",
    REGISTER_LISTENER = "/ide/registerListener",
    SYNC_SEARCH_PATH = "/ide/syncProductDiscoveryPath",
    IMPORT_PROJECT = "/ide/importProject",
    CREATE_PROJECT = "/ide/createProject",
    IMPORT_SKETCH = "/ide/importSketch"
}
export declare class CCSEclipseRequest {
    private readonly logger;
    private readonly ccsPort;
    private readonly httpServer;
    constructor(logger: Logger, ccsPort: number, onIdeEvent: (url: url.UrlWithParsedQuery) => void);
    close(): Promise<unknown>;
    start(): Promise<void>;
    rediscoverProducts(): Promise<void>;
    getProducts(): Promise<CCSProduct[]>;
    registerListener(localPort: string, path: string): Promise<void>;
    syncSearchPath(): Promise<string[]>;
    importProject(location: string, targetId?: string): Promise<void>;
    createProject(location: string, targetId?: string): Promise<void>;
    importSketch(location: string, targetId: string): Promise<void>;
    private ccsRequest;
}
