"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleResponse = exports.EntryModuleBase = void 0;
// native modules
const path = require("path");
// 3rd party
const fs = require("fs-extra");
const PQueue = require("p-queue");
// our modules
const appConfig_1 = require("../lib/appConfig");
const vars_1 = require("../lib/vars");
const util_1 = require("./util");
const logging_1 = require("../utils/logging");
const logger_1 = require("../utils/logger");
const logging_types_1 = require("../utils/logging-types");
const util_2 = require("../shared/util");
const response_data_1 = require("../shared/routes/response-data");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class EntryModuleBase {
    triggerEvent;
    loggerInput;
    eventBroker;
    getProxy;
    commonParams;
    logger;
    vars;
    config;
    rex3Config;
    isInitalized;
    constructor(triggerEvent, loggerInput, eventBroker, getProxy, config, rex3Config) {
        this.triggerEvent = triggerEvent;
        this.loggerInput = loggerInput;
        this.eventBroker = eventBroker;
        this.getProxy = getProxy;
        if (config) {
            this.config = config;
        }
        if (rex3Config) {
            this.rex3Config = rex3Config;
        }
    }
    async init({ ccsPort, proxy }) {
        if (this.isInitalized) {
            return;
        }
        // Setup configs
        this.config = await this.getConfig();
        this.vars = new vars_1.Vars(this.config);
        this.rex3Config = (0, appConfig_1.processConfig)(this.rex3Config || (await fs.readJSON(this.vars.rex3Config)));
        //
        this.logger = new logging_1.Logger('tirex-cloudagent-module', (0, logger_1.createDefaultLogger)(new LoggerAdapter(this.loggerInput)));
        await this._setupProxy(proxy);
        this.commonParams = {
            logger: this.logger,
            rex3Config: this.rex3Config,
            vars: this.vars,
            triggerEvent: this.triggerEvent,
            desktopQueue: new PQueue({ concurrency: 1 })
        };
        ccsPort = this.config.ccs_port ? parseInt(this.config.ccs_port, 10) : ccsPort;
        this.isInitalized = true;
    }
    /**
     * Called by cloud agent when the last client is gone to perform any clean up
     * Must be synchronous, or else cloud agent must be updated
     *
     */
    onClose() {
        if (!this.isInitalized) {
            return;
        }
        this.logger.close();
    }
    async getConfig() {
        if (this.isInitalized) {
            return this.config;
        }
        else {
            return (0, appConfig_1.processConfig)(this.config || (await getConfig()));
        }
    }
    // Getters
    async getVersion() {
        return handleResponse(Promise.resolve(vars_1.Vars.VERSION_TIREX));
    }
    // For test purposes only
    async _addProgressTask() {
        // Should be implemented in the mock module
        throw new Error('Method for testing only');
    }
    /**
     * Private Functions
     * Note: all private functions must start with _ or will be exposed by agent.js (which uses
     * run time reflection, not typescript)
     */
    async _setupProxy(proxy) {
        proxy = proxy || (this.getProxy ? await this.getProxy(this.vars.remoteserverUrl) : null);
        const httpProxy = proxy || '';
        const httpsProxy = proxy || '';
        const noProxy = 'localhost,127.0.0.1,.toro.design.ti.com,.dhcp.ti.com';
        process.env.HTTP_PROXY = httpProxy || process.env.HTTP_PROXY || process.env.http_proxy;
        process.env.HTTPS_PROXY = httpsProxy || process.env.HTTPS_PROXY || process.env.https_proxy;
        process.env.NO_PROXY = noProxy || process.env.NO_PROXY || process.env.no_proxy;
        // IMPORTANT: must delete the property if it's falsey
        if (!process.env.HTTP_PROXY || process.env.HTTP_PROXY === 'undefined') {
            delete process.env.HTTP_PROXY;
        }
        if (!process.env.HTTPS_PROXY || process.env.HTTPS_PROXY === 'undefined') {
            delete process.env.HTTPS_PROXY;
        }
        if (!process.env.NO_PROXY || process.env.NO_PROXY === 'undefined') {
            delete process.env.NO_PROXY;
        }
        this.logger.info(`httpProxy ${httpProxy} httpsProxy ${httpsProxy}`);
        this.logger.info(`process.env values (final): HTTP_PROXY ${process.env.HTTP_PROXY} NO_PROXY ${process.env.NO_PROXY} HTTPS_PROXY ${process.env.HTTPS_PROXY}`);
    }
}
exports.EntryModuleBase = EntryModuleBase;
async function getConfig() {
    const isWindows = (0, util_1.getPlatform)() === response_data_1.Platform.WINDOWS;
    const fileName = `app_localserver${isWindows ? '_win' : ''}.json`;
    const filePath = path.join((0, util_1.getConfigFolder)(), fileName);
    return fs.readJSON(filePath);
}
async function handleResponse(promise) {
    // await delay(1000); // For testing only
    return promise;
}
exports.handleResponse = handleResponse;
/**
 * Adapts cloud agent logger to the internal rex logger
 */
class LoggerAdapter {
    cloudAgentLogger;
    constructor(cloudAgentLogger) {
        this.cloudAgentLogger = cloudAgentLogger;
    }
    logger(name) {
        return {
            ...(0, util_2.mapValues)(logging_types_1.loggerLevelsDef, () => (...toLog) => {
                this.cloudAgentLogger.info(`${name}: ${toLog.map((item) => JSON.stringify(item)).join(', ')}`);
                return {
                    stamp: Date.now()
                };
            }),
            setPriority: () => ({ stamp: Date.now() })
        };
    }
}
