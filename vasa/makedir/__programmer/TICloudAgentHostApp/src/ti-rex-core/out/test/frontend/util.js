"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinkForTest = exports.getNodeLinkForTest = exports.logBrowserConsole = exports.cleanupProtractorTest = exports.lightSetupProtractorTest = exports.setupProtractorTest = exports.cleanupEnzymeTest = exports.setupEnzymeTest = exports.PROTRACTOR_TEST_TIMEOUT = void 0;
// 3rd party
const Enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");
const fs = require("fs-extra");
const path = require("path");
const protractor_1 = require("protractor");
const QueryString = require("query-string");
const browser_scripts_1 = require("./browser-scripts");
const create_app_props_1 = require("../../frontend/testing-helpers/create-app-props");
const fake_server_helpers_1 = require("../../frontend/testing-helpers/fake-server-helpers");
const page_1 = require("../../shared/routes/page");
const promise_syncronization_helpers_1 = require("../../frontend/testing-helpers/promise-syncronization-helpers");
const routing_helpers_1 = require("../../frontend/component-helpers/routing-helpers");
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const util_1 = require("../../scripts-lib/util");
const util_2 = require("../../frontend/component-helpers/util");
const util_3 = require("./page-objects/util");
///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////
exports.PROTRACTOR_TEST_TIMEOUT = 120000;
// Enzyme specific
async function setupEnzymeTest({ data }) {
    // Setup enzyme with react 16
    Enzyme.configure({ adapter: new Adapter() });
    // Other setup
    await (0, fake_server_helpers_1.setupFakeServer)(data, '');
    (0, promise_syncronization_helpers_1.setupPromiseSyncronization)();
}
exports.setupEnzymeTest = setupEnzymeTest;
function cleanupEnzymeTest() {
    (0, fake_server_helpers_1.cleanupFakeServer)();
    (0, promise_syncronization_helpers_1.cleanupPromiseSyncronization)();
}
exports.cleanupEnzymeTest = cleanupEnzymeTest;
// Protractor specific
async function setupProtractorTest({ data, apis, node, urlQuery, clearLocalStorage = true, additionalSetup }) {
    await (0, fake_server_helpers_1.setupFakeServer)(data, '');
    const link = node
        ? await getNodeLinkForTest(node, urlQuery || {}, apis)
        : getLinkForTest(urlQuery || {});
    await setupProtractorTestInner(data, clearLocalStorage, link, additionalSetup);
}
exports.setupProtractorTest = setupProtractorTest;
/**
 * A lightweight setup.
 *   Does not refresh page & load scripts like the fake server.
 *   Clears as much from memory as needed.
 *   Useful for setting up tests within a suite which we are ok with not doing a full refresh / setup. This is much faster.
 *
 */
async function lightSetupProtractorTest({ apis, node, urlQuery, additionalSetup, page, customUrl }) {
    await (0, browser_scripts_1.clearCaches)();
    await (0, util_3.updateBrowserUrl)({ apis, urlQuery: {}, page: page_1.Page.BLANK });
    /*
          Why we need to do this a second time:
          - First one clears all state / caches, as well as components on mountComponentTemporarily (aborting the promise in it)
          - There can be events which get fired off after clearing the caches, on the blank page this will settle down (waiting on promises to resolve)
          - We clear again to ensure any events that triggered did not mess things up
         */
    await (0, browser_scripts_1.clearCaches)();
    if (additionalSetup) {
        await additionalSetup();
    }
    if (customUrl) {
        await (0, browser_scripts_1.updateUrlForTesting)(customUrl);
    }
    else {
        await (0, util_3.updateBrowserUrl)({
            apis,
            urlQuery: urlQuery || {},
            node,
            page
        });
    }
}
exports.lightSetupProtractorTest = lightSetupProtractorTest;
async function cleanupProtractorTest() {
    (0, fake_server_helpers_1.cleanupFakeServer)();
    await (0, browser_scripts_1.cleanupPromiseSyncronization)();
}
exports.cleanupProtractorTest = cleanupProtractorTest;
async function logBrowserConsole(testName) {
    const capabilities = await protractor_1.browser.getCapabilities();
    const browserName = capabilities.get('browserName');
    const browserConsolePath = path.parse(util_1.browserConsoleLog);
    const browserConsoleLogPath = path.join(browserConsolePath.dir, `${browserConsolePath.name}-${browserName}${browserConsolePath.ext}`);
    let browserConsoleMessage = `${'*'.repeat(80)}\n${testName}\n${'*'.repeat(80)}\n`;
    try {
        const browserLogs = await protractor_1.browser
            .manage()
            .logs()
            .get('browser');
        browserLogs.forEach(log => {
            browserConsoleMessage += `${log.message}\n`;
        });
        browserConsoleMessage = `${browserConsoleMessage.replace(/\\n/g, '\n')}`;
        browserConsoleMessage = `${browserConsoleMessage.replace(/\\t/g, '\t')}`;
    }
    catch (err) {
        browserConsoleMessage += 'Failed to retrieve browser logs.\n';
    }
    fs.writeFileSync(browserConsoleLogPath, `${browserConsoleMessage}`, { flag: 'a' });
}
exports.logBrowserConsole = logBrowserConsole;
// Common
async function getNodeLinkForTest(nodeInput, urlQuery, apis, page = page_1.Page.EXPLORE) {
    const [node] = await apis.getNodes([nodeInput.nodeDbId]);
    const link = (0, routing_helpers_1.getNodeLinkFromNode)(node, await (0, create_app_props_1.createAppProps)({
        page,
        urlQuery
    }), true);
    return link;
}
exports.getNodeLinkForTest = getNodeLinkForTest;
function getLinkForTest(urlQuery, page = page_1.Page.EXPLORE) {
    const prefix = (0, routing_helpers_1.getLinkPrefix)();
    return Object.keys(urlQuery).length > 0
        ? `${prefix}/${page}?${QueryString.stringify(urlQuery)}`
        : `${prefix}/${page}`;
}
exports.getLinkForTest = getLinkForTest;
// Helpers
async function setupProtractorTestInner(data, clearLocalStorage, initialPage = '', additionalSetup) {
    // Go to the test page
    await protractor_1.browser.get(`${test_helpers_1.testingGlobals.remoteserverUrl}/${page_1.Page.TEST_LANDING_PAGE}`);
    protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf((0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.testLandingPageButton))), 10000, "Landing page button didn't show up"); // Button will be loaded once page is ready
    // Hook in our promise replacement
    await (0, browser_scripts_1.setupPromiseSyncronization)();
    // Setup the fake server
    await (0, browser_scripts_1.setupFakeServer)(data, initialPage);
    const indicies = await (0, browser_scripts_1.getActivePromiseIndicies)();
    await (0, browser_scripts_1.waitForPromisesToResolve)(indicies);
    // Clear cookies
    if (clearLocalStorage) {
        // tslint:disable-next-line only-arrow-functions
        await protractor_1.browser.executeScript(function () {
            window.localStorage.clear();
        });
    }
    if (additionalSetup) {
        await additionalSetup();
    }
    // Click on button to go to main page (will fetch data from fake server)
    await (0, protractor_1.element)(protractor_1.by.id(util_2.TEST_ID.testLandingPageButton)).click();
    const indicies2 = await (0, browser_scripts_1.getActivePromiseIndicies)();
    await (0, browser_scripts_1.waitForPromisesToResolve)(indicies2);
}
