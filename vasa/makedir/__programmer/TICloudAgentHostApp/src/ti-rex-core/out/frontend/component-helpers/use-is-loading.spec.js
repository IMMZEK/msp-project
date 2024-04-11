"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const expect_1 = require("../../test/expect");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const Data = require("../../test/server-harness/server-harness-data");
const util_1 = require("../../test/frontend/util");
const util_2 = require("../../test/frontend/enzyme/util");
const delay_1 = require("../../test/delay");
const util_3 = require("./util");
const use_is_loading_1 = require("./use-is-loading");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
const { rootNode, emptyFilterData } = Data;
const data1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData
    },
    rootNode,
    hierarchy: {
        [rootNode]: []
    },
    nodeData: {}
};
const errorCallback = { current: sinon.stub() };
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] useIsLoading', function () {
    before(async () => {
        (0, browser_emulator_1.browserEmulator)();
        await (0, util_1.setupEnzymeTest)({ data: data1 });
    });
    after(() => {
        (0, util_1.cleanupEnzymeTest)();
    });
    afterEach(() => {
        errorCallback.current.resetHistory();
    });
    it('Should mark something as loading if it takes beyond the threshold wait time', async function () {
        this.timeout(util_3.LOADING_DELAY_MS * 10);
        const deps = {
            result: null,
            dep1: 0
        };
        const hook = () => {
            const { result, dep1 } = deps;
            return (0, use_is_loading_1.useIsLoading)({
                result,
                inputDeps: [dep1],
                errorCallback,
                trigger: true
            });
        };
        const { wrapper } = (0, util_2.getDataFromHook)(hook);
        {
            const shouldDisplayLoadingUI = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.false;
        }
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS);
        {
            const shouldDisplayLoadingUI = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.true;
        }
    });
    it("Should handle multiple back to back operations well (2 operations who separately don't equal the loading delay but together do)", async function () {
        this.timeout(util_3.LOADING_DELAY_MS * 10);
        const deps = {
            result: null,
            dep1: 0
        };
        const hook = () => {
            const { result, dep1 } = deps;
            return (0, use_is_loading_1.useIsLoading)({
                result,
                inputDeps: [dep1],
                errorCallback,
                trigger: true
            });
        };
        const { wrapper } = (0, util_2.getDataFromHook)(hook);
        // First load
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 0.4);
        deps.result = true;
        wrapper.setProps({ hook });
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 0.2);
        {
            const shouldDisplayLoadingUI = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.false;
        }
        // Second load
        deps.result = false;
        deps.dep1++; // It will only start the timer when dependencies change
        wrapper.setProps({ hook });
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 0.6);
        deps.result = true;
        wrapper.setProps({ hook });
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 0.2);
        {
            const shouldDisplayLoadingUI = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.false;
        }
    });
    it('Should not mark something as loading if the trigger is not set', async function () {
        this.timeout(util_3.LOADING_DELAY_MS * 10);
        const deps = {
            result: null,
            dep1: 0
        };
        const hook = () => {
            const { result, dep1 } = deps;
            return (0, use_is_loading_1.useIsLoading)({
                result,
                inputDeps: [dep1],
                errorCallback,
                trigger: false
            });
        };
        const { wrapper } = (0, util_2.getDataFromHook)(hook);
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS);
        deps.result = true;
        wrapper.setProps({ hook });
        await (0, delay_1.delay)(10); // So react can respond to dependency changes
        {
            const shouldDisplayLoadingUI = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.false;
        }
    });
});
