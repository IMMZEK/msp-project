"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModule = exports.createCCSAdapter = exports.createProgressManager = exports.waitForCallWithArgs = exports.waitForCall = exports.calledWithExactlyDeep = void 0;
// 3rd party
const http = require("http");
const url = require("url");
const _ = require("lodash");
// our modules
const progress_manager_1 = require("./progress-manager");
const ccs_adapter_1 = require("./ccs-adapter");
const entry_module_inner_desktop_1 = require("./entry-module-inner-desktop");
const util_1 = require("../test/util");
const create_mock_common_params_1 = require("./create-mock-common-params");
const offline_metadata_manager_1 = require("./offline-metadata-manager");
const expect_1 = require("../test/expect");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
// Sinon generic helpers
function calledWithExactlyDeep(spy, args) {
    const call = spy.args.find((argsInner) => {
        return _.isEqual(argsInner, args);
    });
    (0, expect_1.expect)(!!call).to.be.true;
}
exports.calledWithExactlyDeep = calledWithExactlyDeep;
function waitForCall(stub) {
    return new Promise((resolve) => {
        if (stub.called) {
            resolve();
        }
        stub.callsFake(() => {
            resolve();
        });
    });
}
exports.waitForCall = waitForCall;
function waitForCallWithArgs(stub, matchingArg) {
    return new Promise((resolve) => {
        if (stub.withArgs(matchingArg).called) {
            resolve();
        }
        stub.callsFake((arg) => {
            if (matchingArg === arg) {
                resolve();
            }
        });
    });
}
exports.waitForCallWithArgs = waitForCallWithArgs;
// For our classes
async function createProgressManager({ triggerEventSpy }) {
    const commonParams = await (0, create_mock_common_params_1.createMockCommonParams)({ triggerEventSpy });
    return new progress_manager_1.ProgressManager(commonParams.triggerEvent, commonParams.logger);
}
exports.createProgressManager = createProgressManager;
async function createCCSAdapter({ metadata, triggerEventSpy, onIDERequest }) {
    const commonParams = await (0, create_mock_common_params_1.createMockCommonParams)({ metadata, triggerEventSpy });
    const port = await startMockIDEServer(onIDERequest);
    const progressManager = await createProgressManager({ triggerEventSpy });
    const offlineMetadataManager = new offline_metadata_manager_1.OfflineMetadataManager(commonParams);
    const ccsAdapter = new ccs_adapter_1.CCSAdapter(commonParams.logger, commonParams.desktopQueue, port, false, commonParams.vars, offlineMetadataManager, progressManager, commonParams.triggerEvent);
    return { ccsAdapter, progressManager, offlineMetadataManager, commonParams };
}
exports.createCCSAdapter = createCCSAdapter;
/**
 * Get the tirex cloud agent module with the given metadata and an optional spy on events
 *
 */
async function getModule(args) {
    const commonParams = await (0, create_mock_common_params_1.createMockCommonParams)(args);
    const port = await startMockIDEServer();
    const entryModule = new entry_module_inner_desktop_1.EntryModuleDesktop(commonParams.triggerEvent, commonParams.logger, new MockEventBroker(port), () => Promise.resolve(''), { ...(0, create_mock_common_params_1.getLocalServerConfig)(), ccs_port: port.toString() }, commonParams.rex3Config);
    (0, util_1.afterTest)(() => entryModule.onClose());
    return entryModule;
}
exports.getModule = getModule;
// Helpers
function startMockIDEServer(onIDERequest = () => { }) {
    function onRequest(req, res) {
        try {
            if (!req.url) {
                throw new Error('no url in request');
            }
            const parsed = url.parse(req.url, true);
            if (!parsed.pathname) {
                throw new Error('no pathname in url');
            }
            const result = onIDERequest(parsed.pathname, parsed.query);
            res.writeHead(200, { 'content-type': 'application/json' });
            // Everything returns void or some sort of array, so we use an empty array if nothing was returned
            res.end(JSON.stringify(result || []));
        }
        catch (e) {
            res.writeHead(404, { 'content-type': 'text/html; charset=utf8' });
            res.end(e.message);
        }
    }
    return new Promise((resolve) => {
        const httpServer = http.createServer(onRequest).listen(0, '0.0.0.0', () => {
            const address = httpServer.address();
            if (address && typeof address !== 'string') {
                resolve(address.port);
            }
            else {
                resolve(0);
            }
        });
        (0, util_1.afterTest)(() => {
            // This isn't a synchronous shutdown, but it makes the tests run REALLY slow
            // if it is done synchronously.  Since it won't harm the tests to have a couple
            // extra http servers shutting down, I'm not going to worry about this (and thus
            // let the tests run a LOT faster).
            httpServer.close();
        });
    });
}
// Mock classes
class MockEventBroker {
    port;
    constructor(port) {
        this.port = port;
    }
    fetchData(dataName) {
        if (dataName === entry_module_inner_desktop_1._IDE_SERVER_PORT) {
            return this.port;
        }
        throw new Error('Unknown data: ' + dataName);
    }
    hasData(dataName) {
        return dataName === entry_module_inner_desktop_1._IDE_SERVER_PORT;
    }
}
