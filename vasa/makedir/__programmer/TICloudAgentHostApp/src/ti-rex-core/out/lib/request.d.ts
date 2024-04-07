/// <reference types="multer" />
import { Request as ExpressRequest } from 'express';
import * as request from 'request';
type StringBool = 'true' | 'false';
export interface RequestQuery {
    search?: string;
    device?: string;
    devtool?: string;
    package?: string;
    language?: string;
    ide?: string;
    id?: string;
    path?: string;
    includechildren?: StringBool;
    maincategory?: string;
    download?: StringBool;
    makeoffline?: StringBool;
    removeoffline?: StringBool;
    analyticsPath?: string;
    analyticsDevice?: string;
    analyticsDevtool?: string;
    analyticsName?: string;
    makeOffline?: StringBool;
    analyticsServerMode?: 'remote' | 'local';
    vid?: string;
    openInBrowser?: StringBool;
    connection?: string;
    scan?: boolean;
    discovered?: boolean;
    importAll?: boolean;
    progressId?: string;
    switch?: string;
    version?: string;
    email?: string;
    os?: string;
    vids?: string;
    location?: string;
    cancel?: 'true' | 'false';
    source?: 'cache' | 'content' | 'local';
    file?: string;
    clientfile?: string;
    dumpImportables?: 'true' | 'false';
    searchpath?: string;
    p?: string[] | string;
    mode?: string;
}
export interface Route {
    path: string;
}
export interface Cookie {
    visitorId: string;
}
export interface Request extends Omit<ExpressRequest, 'query'> {
    query: RequestQuery;
    route: Route;
    path: string;
    ip: string;
    url: string;
    files: Express.Multer.File[];
}
export declare function getRequest(httpProxy?: string): request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
export {};
