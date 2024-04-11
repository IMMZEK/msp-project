"use strict";
/*
  For faking out ajax requests in a nodejs environment.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AjaxHarness = exports.ServerType = void 0;
// 3rd party
const sinon = require("sinon");
// Our modules
const fake_server_1 = require("./fake-server");
const proxy_server_1 = require("./proxy-server");
const server_harness_1 = require("../server-harness/server-harness");
const util_1 = require("../../frontend/component-helpers/util");
var ServerType;
(function (ServerType) {
    ServerType["PROXY_SERVER"] = "proxyServer";
    ServerType["FAKE_SERVER"] = "fakeServer";
})(ServerType || (exports.ServerType = ServerType = {}));
class AjaxHarness {
    getElementByIdStub;
    setupTestCalled = false;
    serverMode;
    fakeXML;
    server;
    // Specific to ServerType.FAKE_SERVER
    serverHarness;
    serverHarnessInner;
    /**
     * @param config The configuration settings for the ajax harness
     */
    constructor({ serverType, mode = 'remoteserver', role = '' }) {
        // Note: we need to save global.XMLHttpRequest, then set it to its value since
        // sinon.useFakeXMLHttpRequest will set it to theirs, which will prevent
        // use from sending out actual requests (it breaks their own .useFilters feature).
        // @ts-ignore - typings on global
        const originalXML = global.XMLHttpRequest;
        this.server = sinon.fakeServer.create();
        this.fakeXML = sinon.useFakeXMLHttpRequest();
        // @ts-ignore - typings on global
        global.XMLHttpRequest = originalXML;
        this.serverMode = serverType;
        this.serverHarness = () => {
            if (!this.serverHarnessInner) {
                this.serverHarnessInner = new server_harness_1.ServerHarness({ mode, role });
            }
            return this.serverHarnessInner;
        };
    }
    /**
     * Call this before running the test code with the data set you want to set with.
     *
     * @param data
     *
     * @returns {Promise} void
     */
    setupTestFakeServer(dataIn) {
        if (this.serverMode === ServerType.FAKE_SERVER) {
            this.fakeXML.useFilters = true;
            this.fakeXML.addFilter((_method, url) => {
                return /^(?!api).*/.test(url);
            });
            if ((0, util_1.isBrowserEnvironment)() || window) {
                // @ts-ignore typing incompatibility
                window.fakeXML = this.fakeXML;
            }
            else {
                throw new Error('Need to setup window object');
            }
            const data = (0, fake_server_1.fakeServerInit)(this.server, dataIn, this.serverHarness());
            const originalById = document.getElementById.bind(document);
            this.getElementByIdStub = sinon
                .stub(document, 'getElementById')
                .callsFake((id) => {
                if (id === 'server-config') {
                    const serverConfig = {
                        innerHTML: JSON.stringify(this.serverHarness().getServerConfig({ data }).payload)
                    };
                    return serverConfig;
                }
                else {
                    return originalById(id);
                }
            });
            this.setupTestCalled = true;
            return Promise.resolve();
        }
        else {
            return Promise.reject('Unable to set up fake server, AjaxHarness is configured for a proxy server.');
        }
    }
    /**
     * Call this before running the load tests.
     *
     * @param remoteserverUrl
     * @param onResponse Callback that gets passed the full response object
     *
     * @returns {Promise} void
     */
    setupTestProxyServer(remoteserverUrl, onResponse) {
        if (this.serverMode === ServerType.PROXY_SERVER) {
            (0, proxy_server_1.proxyServerInit)(this.server, remoteserverUrl, onResponse);
            const originalById = document.getElementById.bind(document);
            this.getElementByIdStub = sinon
                .stub(document, 'getElementById')
                .callsFake((id) => {
                if (id === 'server-config') {
                    throw new Error('Getting server config from real server not implmemented');
                }
                else {
                    return originalById(id);
                }
            });
            this.setupTestCalled = true;
            return Promise.resolve();
        }
        else {
            return Promise.reject('Unable to set up proxy server, AjaxHarness is configured for a fake server.');
        }
    }
    getRequests() {
        return this.server.requests;
    }
    /**
     * Call this when you are done running the test
     *
     */
    cleanup() {
        this.cleanupWithoutSetupTest();
        if (!this.setupTestCalled) {
            throw new Error('Never called setupTest');
        }
        this.cleanupWithSetupTest();
    }
    ////////////////////////////////////////////////////////////////////////////
    /// Private methods
    ////////////////////////////////////////////////////////////////////////////
    /**
     * All the cleanup which doesn't require setupTest to be called
     *
     */
    cleanupWithoutSetupTest() {
        this.server.restore();
        window.fakeXML = null;
    }
    /**
     * All the setup which requires setupTest to be called
     *
     */
    cleanupWithSetupTest() {
        this.getElementByIdStub.restore();
    }
}
exports.AjaxHarness = AjaxHarness;
