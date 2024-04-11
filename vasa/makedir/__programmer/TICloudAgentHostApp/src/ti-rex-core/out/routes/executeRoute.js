"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.getSqldbFromRequest = exports.executeRoute = void 0;
const rexError_1 = require("../utils/rexError");
const logger_1 = require("../utils/logger");
const http_status_codes_1 = require("http-status-codes");
const dbUpdateInfo_1 = require("../lib/dbImporter/dbUpdateInfo");
/**
 * Execute  the route
 *
 * @param processDbReqFn
 * @param respondCustomFn
 */
function executeRoute(processDbReqFn, respondCustomFn) {
    return async (req, res) => {
        let data;
        try {
            const sqldb = await getSqldbFromRequest(req);
            data = {
                payload: await processDbReqFn(sqldb, req.query, req),
                sideBand: {
                    sessionId: sqldb.getSessionId()
                }
            };
            if (respondCustomFn) {
                const potentialPromise = respondCustomFn(req, res, data);
                if (potentialPromise) {
                    await potentialPromise;
                }
            }
            else {
                res.send(data);
            }
        }
        catch (err) {
            sendError(res, err);
            // if the root cause exception was thrown by rex it's error handling,
            // otherwise it's deemed an unexpected error and we let it crash
            if (!(getRootCauseError(err) instanceof rexError_1.RexError)) {
                throw err;
            }
            return;
        }
    };
}
exports.executeRoute = executeRoute;
function getRootCauseError(err) {
    if (!err) {
        return;
    }
    let rootCause = err;
    while (rootCause.causeError) {
        rootCause = rootCause.causeError;
    }
    return rootCause;
}
async function getSqldbFromRequest(req, dinfra) {
    if (!req.sqldb) {
        const tablePrefix = dinfra
            ? (await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(dinfra)).liveTablePrefix
            : 'unknown';
        throw new rexError_1.RexError({
            message: `Cannot process request sqldb session not available (db with prefix '${tablePrefix}' possibly empty)`,
            httpCode: 500
        });
    }
    else {
        return req.sqldb;
    }
}
exports.getSqldbFromRequest = getSqldbFromRequest;
/**
 * err is any because we don't know what to expect at run-time
 *
 */
function sendError(res, err) {
    if (err instanceof rexError_1.RexError) {
        res.status(err.httpCode || http_status_codes_1.INTERNAL_SERVER_ERROR);
        res.send(err.message);
    }
    else {
        // if it's not thrown by us, don't leak exception messages
        res.status(http_status_codes_1.INTERNAL_SERVER_ERROR);
        res.send('Tirex Server Error: see log for details - ' + new Date().toISOString());
    }
    // log the actual error in either case
    logger_1.logger.error(err);
}
exports.sendError = sendError;
