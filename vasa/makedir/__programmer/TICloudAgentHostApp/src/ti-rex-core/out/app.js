"use strict";
/**
 * TIREX Server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTirex = void 0;
///////////////////////////////////////////////////////////////////////////////
/// 3rd party
///////////////////////////////////////////////////////////////////////////////
const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const basicAuth = require("express-basic-auth");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");
const async = require("async");
const history = require("./3rd_party/connect-history-api-fallback/lib");
const pathToRegexp = require("path-to-regexp");
const compression = require("compression");
const onHeaders = require("on-headers");
const os = require("os");
const mung = require("express-mung");
const responseTime = require("response-time");
const si = require("systeminformation");
const url = require("url");
///////////////////////////////////////////////////////////////////////////////
/// Internal Modules
///////////////////////////////////////////////////////////////////////////////
const logger_1 = require("./utils/logger");
const vars_1 = require("./lib/vars");
const state = require("./lib/state");
const appConfig_1 = require("./lib/appConfig");
const rex_1 = require("./lib/rex");
const refresh_1 = require("./lib/dbBuilder/refresh");
const dbSession_1 = require("./lib/dbSession");
const page_1 = require("./shared/routes/page");
// Routes
const routes_1 = require("./routes/routes");
const dbUpdateInfo_1 = require("./lib/dbImporter/dbUpdateInfo");
const executeRoute_1 = require("./routes/executeRoute");
const rexError_1 = require("./utils/rexError");
const routing_helpers_1 = require("./frontend/component-helpers/routing-helpers");
let serverMetrics;
let metricsReady = false;
let metricsInterval;
let metricsErrors = 0;
const metricsFrequency = 10000;
// @ts-ignore old mime typings
express.static.mime.define(vars_1.Vars.TIREX_MIME_TYPES, true);
function setupTirex({ config: configPassedIn, dconfig, dinfraPath }, callback) {
    const dinfra = require(dinfraPath);
    const config = (0, appConfig_1.processConfig)(configPassedIn);
    const logger = (0, logger_1.createDefaultLogger)(dinfra);
    if (config.useConsole === 'true') {
        // duplicate all messages to console; set already when using dcontrol run
        dinfra.dlog.console();
    }
    if (config.logsDir && !fs.existsSync(config.logsDir)) {
        console.log('Creating logs dir: ' + config.logsDir);
        fs.ensureDirSync(config.logsDir);
        fs.chmodSync(config.logsDir, '0777'); // when we install as root, run as user
    }
    if (config.logsDir && !dconfig.logging) {
        dconfig.logging = {};
        dconfig.logging.indent = 4;
        dconfig.logging.loose = true;
        dconfig.logging['base-path'] = path.join(config.logsDir, 'tirex');
    }
    if (dconfig.databases &&
        dconfig.databases.defaults &&
        dconfig.databases.defaults.type === 'mysql') {
        Object.assign(dconfig.databases.defaults, appConfig_1.tirexDatabasesDefaults);
    }
    let sqldbFactory;
    let rex = null;
    let varsInstance;
    async.series([
        callback => {
            dinfra.configure(dconfig, callback);
        },
        callback => {
            // the remainder of the dinfra stuff is for cloud landscape deployment only
            //  - for desktop dconfig.paths should be set to {};
            //  - for standalone or debug remote server dconfig.paths can also be set to {} to be able to
            //    use abs. paths in the tirex config
            // prefix our paths based on dinfra
            if (config.mode === 'remoteserver') {
                if (dinfra.paths != null) {
                    if (dinfra.paths.data != null) {
                        config.contentPath = path.join(dinfra.paths.data, config.contentPath);
                        config.dbPath = path.join(dinfra.paths.data, config.dbPath);
                        config.seoPath = path.join(dinfra.paths.data, config.seoPath);
                    }
                }
                config.ccsCloudUrl = dinfra.landscape;
                // the section patched in by dcontrol in front ouf the tirex config properties
                if (config.dcontrol != null) {
                    config.seaportHostIP = config.dcontrol.legacy.seaport.address;
                    config.seaportPort = config.dcontrol.legacy.seaport.port;
                }
            }
            varsInstance = new vars_1.Vars(config);
            setImmediate(callback);
        },
        callback => {
            if (config.dbTablePrefix && config.dbTablePrefix !== vars_1.Vars.DB_TABLE_PREFIX_AUTO) {
                sqldbFactory = new dbSession_1.DbSessionFactory(dinfraPath, config.dbTablePrefix);
                logger.info('Using fixed SQLDB table prefix ' + config.dbTablePrefix);
                setImmediate(callback);
            }
            else if (config.dbTablePrefix === vars_1.Vars.DB_TABLE_PREFIX_AUTO) {
                (0, dbUpdateInfo_1.fetchLastUpdateInfoCb)(dinfra, (err, dbLastUpdateInfo) => {
                    if (dbLastUpdateInfo != null && dbLastUpdateInfo.liveTablePrefix) {
                        sqldbFactory = new dbSession_1.DbSessionFactory(dinfraPath, dbLastUpdateInfo.liveTablePrefix);
                        logger.info('SQLDB table prefix is auto managed. Using ' +
                            dbLastUpdateInfo.liveTablePrefix);
                    }
                    else {
                        logger.info('SQLDB table prefix is auto managed, but not yet initialized because' +
                            'no data has been imported yet. Not creating a DB session');
                    }
                    callback(err);
                });
            }
            else {
                logger.info('No SQLDB table prefix specified. Not creating a DB session');
                setImmediate(callback);
            }
        },
        callback => {
            const myHttpPort = config.myHttpPort ? parseInt(config.myHttpPort) : undefined;
            initApp({
                myHttpPort,
                config,
                varsInstance,
                dinfra,
                sqldbFactory,
                dinfraLogger: logger
            }, (err, _rex) => {
                rex = _rex;
                callback(err);
            });
        },
        callback => {
            registerPort(config, dinfra, dconfig, logger, sqldbFactory, callback);
        }
    ], err => {
        callback(err, rex);
    });
}
exports.setupTirex = setupTirex;
/**
 * initApp
 *
 * @param init param object
 * @param callback
 */
function initApp({ config, varsInstance, dinfra, sqldbFactory, myHttpPort, dinfraLogger }, callback) {
    dinfraLogger.setPriority(dinfra.dlog.PRIORITY.INFO);
    process.on('exit', (code) => {
        dinfraLogger.info('About to exit with code: ' + code);
    });
    // uncaught exceptions are not reliably logged by dinfra: force it to all possible streams...
    // dinfra.uncaught(true);
    process.on('uncaughtException', (err) => {
        console.error(err);
        dinfraLogger.error(err); // not reliable ...
        if (config.logsDir) {
            const date = new Date().toISOString().replace(/:/g, '');
            const errMsg = JSON.stringify(err, Object.getOwnPropertyNames(err));
            fs.writeFileSync(path.join(config.logsDir, 'tirex_uncaughtException_' + date + '.log'), errMsg);
        }
        else {
            console.error('config.logsDir not defined, not generating a tirex_uncaughtException log file');
        }
        process.exit(1);
    });
    const startUpMessage = '-----TI-REX started at ' + new Date().toString();
    dinfraLogger.info(startUpMessage);
    console.log(startUpMessage);
    console.error(startUpMessage);
    // support for basic authentication (needed for external server)
    const development = process.env.NODE_ENV === 'development';
    if (development) {
        try {
            const userid = new RegExp(process.env.BASIC_AUTH_USERID.toLowerCase());
            const password = new RegExp(process.env.BASIC_AUTH_PASSWORD.toLowerCase());
            basicAuth({
                authorizer: (user, pass) => {
                    return userid.test(user.toLowerCase()) && password.test(pass.toLowerCase());
                },
                unauthorizedResponse: 'Development authentication is required!'
            });
        }
        catch (e) {
            dinfraLogger.error('Invalid BasicAuth credential! ' +
                "Please set 'BASIC_AUTH_USERID' and 'BASIC_AUTH_PASSWORD' environment " +
                'variables and restart server.');
        }
    }
    const app = express();
    // get the Sqldb session and attach to the req object (all middleware and
    // the route need to use the same DB session)
    // if the DB is empty req.sqldb is set to undefined
    app.use(async (req, res, next) => {
        try {
            req.sqldb = await sqldbFactory.getCurrentSessionPromise();
            next();
        }
        catch (err) {
            if (varsInstance.handoffServer) {
                dinfraLogger.info('Allowing empty/invalid SQLDB because server is in handoff mode');
                next();
                return;
            }
            (0, executeRoute_1.sendError)(res, new rexError_1.RexError({
                message: `Error obtaining SqldbSession`,
                httpCode: 500,
                causeError: err
            }));
        }
    });
    app.use(history({
        rewrites: [
            {
                from: /.*/,
                to: context => {
                    let path = context.parsedUrl.path;
                    const frontendRouteRegexes = [
                        pathToRegexp(`/${page_1.Page.EXPLORE}`),
                        pathToRegexp(`/${page_1.Page.EXPLORE}/node`),
                        pathToRegexp(`/${page_1.Page.NODE_CONTENT}`),
                        pathToRegexp(`/${page_1.Page.DEPENDENCY_MANAGER}`),
                        pathToRegexp(`/${page_1.Page.WIZARD}`),
                        pathToRegexp(`/${page_1.Page.WIZARD}/end`),
                        pathToRegexp(`/${page_1.Page.WIZARD}/select`),
                        pathToRegexp(`/${page_1.Page.CUSTOM_URL_GLOBAL_RESOURCE_ID}`),
                        pathToRegexp(`/${page_1.Page.CUSTOM_URL_PACKAGE_SCOPED_RESOURCE_ID}`)
                    ];
                    if (config.testingServer) {
                        frontendRouteRegexes.push(pathToRegexp(`/${page_1.Page.TEST_LANDING_PAGE}`));
                        frontendRouteRegexes.push(pathToRegexp(`/${page_1.Page.BLANK}`));
                    }
                    // for re-routing things like /wizard/api/packages -> /api/packages
                    const frontendRoutePrefixes = [
                        `/${page_1.Page.EXPLORE}/node`,
                        `/${page_1.Page.EXPLORE}`,
                        `/${page_1.Page.NODE_CONTENT}`,
                        `/${page_1.Page.DEPENDENCY_MANAGER}`,
                        `/${page_1.Page.WIZARD}`,
                        `/${page_1.Page.WIZARD}/end`,
                        `/${page_1.Page.WIZARD}/select`,
                        `/${page_1.Page.CUSTOM_URL_GLOBAL_RESOURCE_ID}`,
                        `/${page_1.Page.CUSTOM_URL_PACKAGE_SCOPED_RESOURCE_ID}`
                    ];
                    if (config.testingServer) {
                        frontendRoutePrefixes.push(`/${page_1.Page.TEST_LANDING_PAGE}`);
                        frontendRoutePrefixes.push(`/${page_1.Page.BLANK}`);
                    }
                    path = routePath(path, frontendRouteRegexes, frontendRoutePrefixes);
                    return path;
                }
            }
        ]
    }));
    // Suppress TypeScript warning for unused 'res' parameter
    // @ts-ignore
    app.use(async (req, res, next) => {
        try {
            if (req.url === 'index.html') {
                const parsedUrl = url.parse(req.originalUrl);
                const modifiedUrlQuery = (0, routing_helpers_1.getUrlQuery)(parsedUrl.query);
                req.query.node = modifiedUrlQuery.node;
            }
            next();
        }
        catch (err) {
            (0, executeRoute_1.sendError)(res, new rexError_1.RexError({
                message: `Error modifying node query param`,
                httpCode: err.code,
                causeError: err
            }));
        }
    });
    // begin gathering server metrics
    if (config.enableMetricsMiddleware) {
        metricsInterval = setInterval(() => {
            metricsReady = false;
            retrieveServerMetrics()
                .then(data => {
                metricsErrors = 0;
                serverMetrics = data;
                metricsReady = true;
            })
                .catch(err => {
                metricsErrors++;
                metricsReady = false;
                dinfraLogger.error('An error occured while retrieving server metrics.', err);
                // Stop collecting metrics after 3 consecutive errors
                if (metricsErrors >= 3) {
                    clearInterval(metricsInterval);
                    dinfraLogger.info('3 consecutive errors occured while retrieving server metrics. Disabling collection of metrics.');
                }
            });
        }, metricsFrequency);
    }
    dinfra
        .registerStatusResponder('TIREX', vars_1.Vars.VERSION_TIREX)
        .withDefaultChecks()
        .withExpressHandler(app, '/status/');
    const serverState = state.serverState;
    // include version in serverState
    serverState.version = require('../package.json').version;
    dinfraLogger.info('Version: ' + serverState.version);
    //
    serverState.updateServerStatus(state.ServerStatus.INITIALIZING, config);
    // include default package-offline path
    serverState.defaultContentPath = vars_1.Vars.CONTENT_BASE_PATH;
    // delete DBs and/or content folders if requested
    if (config.deleteContent) {
        dinfraLogger.info('DELETING content dir');
        fs.removeSync(config.contentPath);
    }
    if (config.deleteDb) {
        dinfraLogger.info('DELETING db dir');
        fs.removeSync(config.dbPath);
    }
    const rex = (0, rex_1.Rex)({ dinfraLogger, vars: varsInstance });
    // tell express we're sitting behind the seaport proxy (needed by analytics to get clients' IP
    // addresses) TODO: this may no longer be needed since we're no longer doing server-side analytics
    app.enable('trust proxy');
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');
    // return response time and server metrics
    if (config.enableMetricsMiddleware) {
        dinfraLogger.info('Metrics middleware enabled');
        app.use(mung.json((body, _req, _res) => {
            // Only use this middleware if we are a request with sideband data
            // TODO should have a way to identify requests which follow the payload / sideband format
            if (!body.sideBand) {
                return body;
            }
            // send server metrics once they are collected
            if (metricsReady) {
                body.sideBand.metrics = serverMetrics;
                metricsReady = false;
            }
            body.sideBand.machine = os.hostname();
            body.sideBand.file = 'TIREX-SERVER';
            return body;
        }));
        app.use(responseTime({ suffix: false }));
    }
    else {
        dinfraLogger.info('Metrics middleware disabled');
    }
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
    app.use(methodOverride());
    const desktopServer = new Object(); // placeholder, TODO
    if (config.mode !== 'localserver') {
        // There's no point compressing local responses
        compressResponses(app);
    }
    app.use('/', (0, routes_1.getRoutes)({ dinfra, config, desktopServer, rex }));
    // refresh and exit
    if (config.refreshDB === 'true') {
        const refreshManager = new refresh_1.RefreshManager(vars_1.Vars.DB_BASE_PATH, rex.log.userLogger);
        refreshManager.refreshUsingConfigFileCb(vars_1.Vars.CONTENT_PACKAGES_CONFIG, vars_1.Vars.CONTENT_BASE_PATH, config.validationType, (err) => {
            if (err) {
                dinfraLogger.error('Error: ' + err);
            }
            dinfraLogger.info('Not starting a server: exiting...');
            dinfra.shutdown(0);
        });
    }
    // if myHttpPort is undefined or 0 a port will be automatically assigned by the OS
    if (myHttpPort && myHttpPort !== 0) {
        console.warn(`Creating server with a hard-coded port (${myHttpPort}) which is unsuited for production environments.`);
    }
    // bind to 0.0.0.0 to force IPv4, see REX-1614 TIREX Listening on IPv6, not IPv4
    const _httpserver = http.createServer(app).listen(myHttpPort, '0.0.0.0', () => {
        const address = _httpserver.address();
        if (address && typeof address !== 'string') {
            vars_1.Vars.PORT = address.port;
        }
        dinfraLogger.info(`Express server listening on port ${vars_1.Vars.PORT}`);
        console.log(`TIREX server listening on ${os.hostname()}:${vars_1.Vars.PORT}`);
        serverState.updateServerStatus(state.ServerStatus.UP, config);
        callback(null, rex);
    });
    process.once('exit', () => {
        clearInterval(metricsInterval);
        _httpserver.close();
    });
}
function registerPort(config, dinfra, dconfig, logger, sqldbFactory, callback) {
    const serviceName = dconfig.origin.serviceName; // always "<scope>/<service>"
    const serviceVersion = vars_1.Vars.VERSION_TIREX;
    const params = {
        type: 'application',
        protocol: config.serverMode,
        port: vars_1.Vars.PORT,
        role: config.myRole,
        host: dinfra.address
    };
    logger.info('Registering service with dinfra', params);
    dinfra.registerService(serviceName, serviceVersion, params).on('registered', () => {
        logger.info('Registered with dinfra.services.');
        // only now that we have a session can we listen to global events
        (0, dbUpdateInfo_1.registerDatabaseUpdateHandler)(dinfra, () => {
            logger.info('invalidating database cache');
            if (sqldbFactory) {
                sqldbFactory.invalidate();
            }
        });
        callback(null);
    });
}
function routePath(path, frontendRouteRegexes, frontendRoutePrefixes) {
    // Note the frontendRouteRegexes won't handle query strings,
    // so we need to strip them out before testing the regex
    const testPath = path.split('?')[0];
    const isFrontendRoute = !!frontendRouteRegexes.find(regex => regex.test(testPath));
    if (isFrontendRoute) {
        return 'index.html';
    }
    const isPrefixedBy = frontendRoutePrefixes.find(prefix => path.startsWith(prefix));
    if (isPrefixedBy) {
        return path.replace(isPrefixedBy, '');
    }
    return path;
}
function compressResponses(app) {
    // Workaround compression middleware bug with etags
    // See https://github.com/expressjs/compression/issues/45
    app.use('/', (_req, res, next) => {
        onHeaders(res, function serverResponse() {
            if (this.getHeader('content-encoding')) {
                // We're going to compress this response.  If it has an etag associated with it,
                // change it to a weak etag.  Since we compress on the fly, and thus  can't
                // guarantee that the compression algorithm is the same as last time.  Thus the
                // byte stream may not be byte-for-byte identical, and hence the etag should be
                // weak.
                // See https://en.wikipedia.org/wiki/HTTP_ETag#Strong_and_weak_validation
                const etag = this.getHeader('etag');
                if (etag) {
                    this.setHeader('etag', 'W/' + etag);
                }
            }
        });
        next();
    });
    app.use(compression());
}
/**
 * Retrieve server metrics
 *
 * @returns {Promise} ServerMetrics
 */
async function retrieveServerMetrics() {
    const cpuLoad = await si.currentLoad();
    return {
        timeStamp: new Date().toString(),
        cpuUsage: cpuLoad.currentload,
        memUsage: process.memoryUsage().rss
    };
}
