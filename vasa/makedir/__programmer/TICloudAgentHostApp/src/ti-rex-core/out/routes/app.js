"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.components = exports.getRoutes = void 0;
// 3rd party
const express_1 = require("express");
const path = require("path");
const urlParser = require("url");
const fs = require("fs-extra");
const cors = require("cors");
// our modules
const request_1 = require("../lib/request");
const logger_1 = require("../utils/logger");
const vars_1 = require("../lib/vars");
const state = require("../lib/state");
const promise_utils_1 = require("../utils/promise-utils");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function getRoutes(dinfra, config, desktopServer) {
    const routes = (0, express_1.Router)();
    // use
    routes.use((0, express_1.static)(path.join(vars_1.Vars.projectRoot, 'public')));
    routes.use('/components', components(config));
    routes.use('/content', getContentRoutes(dinfra, config, desktopServer));
    routes.use('/scripts', (0, express_1.static)(path.join(vars_1.Vars.projectRoot, 'node_modules') + path.sep));
    routes.use('/zips', (0, express_1.static)(vars_1.Vars.ZIPS_FOLDER + path.sep));
    // TODO: Duplication in these constants!!
    // TODO!!! Keep? If so, get rid of hardcoded path!!!
    routes.use('/zipcache', (0, express_1.static)('/home/auser/tirex-dl-data/out-cache'));
    routes.use('/api/exit', exitTirex(config));
    routes.use('/api/serverstate', cors(), serverState());
    return routes;
}
exports.getRoutes = getRoutes;
// API : /api/exit kill tirex process
function exitTirex(config) {
    return (_req, res) => {
        if (config.mode === 'localserver' || config.allowExit) {
            function exit() {
                if (res.finished) {
                    process.exit();
                }
                else {
                    setTimeout(exit, 500);
                }
            }
            res.sendStatus(200);
            exit();
        }
        else {
            res.sendStatus(404);
        }
    };
}
// FIXME: API : /api/serverstate always return serverStatus as ready
function serverState() {
    return (_req, res) => {
        res.sendStatus(200);
    };
}
// API : /components static file forwarding from cloud web components server
function components(config) {
    return (req, res) => {
        let alreadyResSend = false;
        // will only happen if tirex runs as a standalone remote server
        if (config.mode === 'remoteserver' ||
            (config.mode === 'localserver' &&
                state.serverState.useRemoteContent === true &&
                vars_1.Vars.WEBCOMPONENTSSERVER_BASEURL != null)) {
            // temporary block flash tools until supported
            if (config.mode === 'localserver' &&
                (req.url.indexOf('ti-widget-flashtool') >= 0 ||
                    req.url.indexOf('ti-core-backplane') >= 0)) {
                res.send(404);
                return;
            }
            (0, request_1.getRequest)()
                .get(vars_1.Vars.WEBCOMPONENTSSERVER_BASEURL + req.url)
                .on('error', handleStreamError)
                .pipe(res)
                .on('error', handleStreamError);
        }
        else {
            res.send(404);
        }
        function handleStreamError(err) {
            logger_1.logger.error('/content stream error:' + JSON.stringify(err));
            if (!alreadyResSend) {
                alreadyResSend = true;
                res.send(404); // pipe not closed automatically on error
            }
        }
    };
}
exports.components = components;
function getContentRoutes(dinfra, config, desktopServer) {
    const routes = (0, express_1.Router)();
    if (config.mode === 'localserver') {
        routes.use('/', serveLocalContent(desktopServer));
    }
    else if (config.mode === 'remoteserver') {
        if (!config.serveContentFromFs) {
            routes.use('/', (req, res, next) => {
                if (req.headers.origin != null) {
                    // Echos the origin domain which effectively allows ALL domains access
                    // Needed because request may come from a tirex server on a user's desktop
                    res.set({ 'Access-Control-Allow-Origin': req.headers.origin });
                }
                next();
            });
            // Let dinfra serve directly from the database
            // Note that dinfra is passed "routes" and will call routes.use() to add stuff
            dinfra
                .newResourceService(vars_1.Vars.DB_RESOURCE_PREFIX + '/', { archive: true })
                .withExpressHandler(routes, '/');
        }
        else if (config.serveContentFromFs) {
            // intended for development / debug
            logger_1.logger.info(`serveContentFromFs=true: serving content from filesystem at ${vars_1.Vars.CONTENT_BASE_PATH}`);
            routes.use('/', (0, express_1.static)(vars_1.Vars.CONTENT_BASE_PATH + path.sep));
        }
    }
    return routes;
}
// API : /content static file serving; if file doesn't exist locally, pipe it from remoteserver
function serveLocalContent(desktopServer) {
    return async (req, res) => {
        try {
            // Figure out what file we're trying to access
            const urlParts = urlParser.parse(req.url, true);
            const url = urlParts.search ? urlParts.pathname : req.url;
            const filePath = desktopServer.translateContentPath(url);
            // If the file exists locally, send it on with the correct mime type
            // Otherwise, optionally fetch it from the remote server
            if (await fs.pathExists(filePath)) {
                // note: By default express types for mime are wrong because express specifically depends on
                // mime 1.x but @types picks ups the latest mime 2.x because of "*" in the dependency.
                // We manually installed @types/mime@1.3.1 to work around this.
                const type = express_1.static.mime.lookup(filePath);
                if (type) {
                    res.setHeader('content-type', type);
                }
                await (0, promise_utils_1.promisePipe)([fs.createReadStream(filePath), res]);
            }
            else if (state.serverState.useRemoteContent) {
                await (0, promise_utils_1.promisePipe)([
                    (0, request_1.getRequest)().get({ url: vars_1.Vars.REMOTESERVER_BASEURL + req.originalUrl }),
                    res
                ]);
            }
            else {
                res.send(404);
            }
        }
        catch (e) {
            res.send(500); // pipe not closed automatically on error
        }
    };
}
