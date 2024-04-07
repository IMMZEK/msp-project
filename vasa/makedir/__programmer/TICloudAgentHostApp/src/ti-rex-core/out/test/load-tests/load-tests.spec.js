"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const _ = require("lodash");
const fs = require("fs-extra");
const path = require("path");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.LOADREMOTESERVER) {
    // @ts-ignore
    return;
}
const expect_1 = require("../../test/expect");
const ajax_harness_1 = require("../ajax-harness/ajax-harness");
const simulate_user_1 = require("./simulate-user");
const settings_1 = require("./settings");
const apis_1 = require("../../frontend/apis/apis");
const util_1 = require("./util");
const loadStatistics_1 = require("./loadStatistics");
const delay_1 = require("../delay");
const browser_emulator_1 = require("../frontend/browser-emulator");
// allow expect().to.be.empty
// tslint:disable:no-unused-expression
const durationInMs = settings_1.totalDuration * 60 /* seconds in a minute */ * 1000 /* ms in a second */;
const logsDir = scriptsUtil.logsDir;
describe('Load tests', () => {
    before(() => (0, browser_emulator_1.browserEmulator)());
    [
        defineTest(settings_1.numUsersAvg, 'average'),
        defineTest(settings_1.numUsersPeak, 'peak'),
        defineTest(settings_1.numUsersPeak * 5, 'extreme'),
        defineTest(settings_1.numUsersPeak, 'peak-search-heavy', {
            filterPercentage: 0,
            searchPercentage: 100
        })
    ].forEach(({ numUsers, description, seed, filterPercentage, searchPercentage }) => {
        // Traverse part of the tirex tree
        it(`Simulate ${description} load (${numUsers} users) on ${test_helpers_1.testingGlobals.remoteserverUrl}`, async function () {
            this.timeout(durationInMs * 2); // extra is to give us time to shutdown
            const setupData = await setup(description);
            try {
                // Get root node ID
                const { rootNode, filterOptions } = await getInitialData();
                // Create n simulated users
                const simulatedUsers = [];
                _.times(numUsers, index => {
                    simulatedUsers.push(new simulate_user_1.SimulatedUser(index + seed, rootNode, filterOptions, setupData.stats, filterPercentage, searchPercentage));
                });
                // Stop the simulation after m seconds
                setTimeout(() => simulatedUsers.forEach(s => s.stop()), durationInMs);
                // Start simulating
                const exceptions = _.flatten(await Promise.all(simulatedUsers.map(s => s.go())));
                (0, expect_1.expect)(exceptions).to.be.empty;
            }
            finally {
                await cleanup(setupData);
            }
        });
    });
});
function defineTest(numUsers, description, options = {}) {
    return {
        numUsers,
        description,
        filterPercentage: undefined !== options.filterPercentage ? options.filterPercentage : settings_1.filterPercentage,
        searchPercentage: undefined !== options.searchPercentage ? options.searchPercentage : settings_1.searchPercentage,
        seed: options.seed || 0
    };
}
async function getRootNode() {
    const response = await expect_1.chai.request(test_helpers_1.testingGlobals.remoteserverUrl).get("api/rootNode" /* API.GET_ROOT_NODE */);
    const parsedData = JSON.parse(response.text);
    return parsedData.payload;
}
async function getInitialData() {
    try {
        const rootNode = await getRootNode();
        const filterOptions = await new apis_1.APIs().getFilterOptions();
        return { rootNode, filterOptions };
    }
    catch (e) {
        console.log('Error occurred fetching initial data - waiting two minutes for server to recover before proceeding');
        await (0, delay_1.delay)(2 * 60 /* seconds in a minute */ * 1000 /* ms in a second */);
        throw e;
    }
}
async function setup(description) {
    // Setup log file
    // Note that I had to patch fs-extra's types to make write work
    // If you see a typescript error on that line, likely you updated
    // that node module and they haven't fixed it yet
    const fileName = `load-test-${description}-${new Date().toLocaleDateString()}.log.json`.replace(new RegExp('/', 'g'), '-');
    const logStream = fs.createWriteStream(path.join(logsDir, fileName));
    logStream.write('[');
    // Setup proxy server
    const ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.PROXY_SERVER });
    await ajaxHarness.setupTestProxyServer(test_helpers_1.testingGlobals.remoteserverUrl, (0, util_1.createLoggingResponseHandler)(logStream));
    // Setup statistics
    const stats = new loadStatistics_1.LoadStatistics();
    return { logStream, ajaxHarness, stats };
}
async function cleanup({ logStream, ajaxHarness, stats }) {
    stats.log();
    ajaxHarness.cleanup();
    logStream.write(']');
    logStream.end();
}
