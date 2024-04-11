/**
 * A helper function to execute routes that make Sqldb datbase accesses. It helps keeping
 * DB calls and error handling consistent for all routes.
 *
 * executeRoute returns a (req: Request, res: Response) function that can be passed to the router.
 *
 * Important: The req object must have a SqldbSession attached (see the type RequestSqldb)
 *
 * Signature:
 * executeRoute<T, R>(processDbReqFn: ProcessDbReq<T, R>, respondCustomFn?: RespondCustom<R>)
 *
 * Usage example:
 * Routes().get(`/api/linkTo/:id`, executeRoute(linkTo, redirect)
 *
 * Put as much processing as possible into the processReqFn function. If no respondCustomFn is
 * provided executeRoute sends the returned data as response. The respondCustomFn should
 * only be used in rare cases and kept to a minimum such as sending the final response only.
 *
 * processReqFn should
 *  - make all DB calls
 *  - contain all processing needed to form the response and return the response data
 *    (which is automatically send as response or passed into customResFn if provided)
 *  - contain all error handling and throw RexError if an error occurs
 *
 */
import * as Sqldb from '../lib/dbSession';
import { Request, Response } from 'express';
import { DatabaseResponse } from '../shared/routes/database-response';
import DinfraTypes = require('dinfra');
/**
 * The req object must have a SqldbSession attached
 */
export interface RequestSqldb extends Request {
    sqldb?: Sqldb.DbSession;
}
/**
 * Main request processing function
 */
export type ProcessDbReq<T, R> = (sqldb: Sqldb.DbSession, reqQuery: T, req?: Request) => Promise<R>;
/**
 * Optional function to provide custom response other than the default res.send
 */
export type RespondCustom<R> = (req: Request, res: Response, data: DatabaseResponse<R>, extra?: any) => void | Promise<void>;
/**
 * Execute  the route
 *
 * @param processDbReqFn
 * @param respondCustomFn
 */
export declare function executeRoute<T, R>(processDbReqFn: ProcessDbReq<T, R>, respondCustomFn?: RespondCustom<R>): (req: Request, res: Response) => Promise<void>;
export declare function getSqldbFromRequest(req: RequestSqldb, dinfra?: typeof DinfraTypes): Promise<Sqldb.DbSession>;
/**
 * err is any because we don't know what to expect at run-time
 *
 */
export declare function sendError(res: Response, err: any): void;
