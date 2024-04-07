"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const _ = require("lodash");
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
const use_async_operation_1 = require("./use-async-operation");
const util_2 = require("../../test/frontend/enzyme/util");
const hook_tests_1 = require("./hook-tests");
const delay_1 = require("../../test/delay");
const promise_syncronization_helpers_1 = require("../testing-helpers/promise-syncronization-helpers");
const util_3 = require("./util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// so we can await on chai-as-promised statements
// tslint:disable:await-promise
// tslint:disable:forin
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
const operationResult1 = 'I am the result';
const operationError1 = new Error('I am the error');
const operation1 = (pass = true) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (pass) {
                resolve(operationResult1);
            }
            else {
                reject(operationError1);
            }
        }, 10);
    });
};
const errorCallback = { current: sinon.stub() };
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] useAsyncOperation', function () {
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
    it('Should return the result when ready', async function () {
        const operation = operation1;
        const operationResult = operationResult1;
        const { result } = await (0, util_2.waitForHookResult)(() => (0, use_async_operation_1.useAsyncOperation)({ operation, dependencies: [], errorCallback }), val => (0, hook_tests_1.getResult)(val.result, errorCallback));
        (0, expect_1.expect)(result).to.deep.equal(operationResult);
    });
    it('Should report a rejected operation', async function () {
        const operation = () => operation1(false);
        const operationResult = operationError1;
        await (0, expect_1.expect)((0, util_2.waitForHookResult)(() => (0, use_async_operation_1.useAsyncOperation)({ operation, dependencies: [], errorCallback }), val => (0, hook_tests_1.getResult)(val.result, errorCallback))).to.eventually.be.rejectedWith(operationResult.message);
    });
    it('Should return null initially', function () {
        const operation = operation1;
        const { data } = (0, util_2.getDataFromHook)(() => (0, use_async_operation_1.useAsyncOperation)({ operation, dependencies: [], errorCallback }));
        (0, expect_1.expect)(data.result).to.be.null;
    });
    it('Should update the result when dependencies change', async function () {
        const operResult = operationResult1;
        const operResult2 = operationError1;
        let pass = true;
        const hook = () => (0, use_async_operation_1.useAsyncOperation)({
            operation: () => operation1(pass),
            dependencies: [pass],
            errorCallback
        });
        const { wrapper, result } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val.result, errorCallback));
        (0, expect_1.expect)(result).to.deep.equal(operResult);
        (0, expect_1.expect)(errorCallback.current.called).to.be.false;
        // Update dep and see if result is updated
        pass = false;
        wrapper.setProps({ hook });
        await (0, expect_1.expect)((0, util_2.waitForHookWrapperResult)(wrapper, hook, val => (0, hook_tests_1.getResult)(val.result, errorCallback))).to.eventually.be.rejectedWith(operResult2.message);
    });
    it('Should reset the state when the dependencies change (i.e result should be null)', async function () {
        const operResult = operationResult1;
        let pass = true;
        const hook = () => (0, use_async_operation_1.useAsyncOperation)({
            operation: () => operation1(pass),
            dependencies: [pass],
            errorCallback
        });
        const { wrapper, result } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val.result, errorCallback));
        (0, expect_1.expect)(result).to.deep.equal(operResult);
        (0, expect_1.expect)(errorCallback.current.called).to.be.false;
        // Update dep and see if result is updated
        pass = false;
        wrapper.setProps({ hook });
        const { result: updatedResult } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
        (0, expect_1.expect)(updatedResult).to.be.null;
    });
    it('Should not update the state when dependencies change but keepResultsBetweenUpdates is true', async function () {
        const operResult = operationResult1;
        let pass = true;
        const hook = () => (0, use_async_operation_1.useAsyncOperation)({
            operation: () => operation1(pass),
            dependencies: [pass],
            errorCallback,
            keepResultBetweenUpdates: true
        });
        const { wrapper, result } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val.result, errorCallback));
        (0, expect_1.expect)(result).to.deep.equal(operResult);
        (0, expect_1.expect)(errorCallback.current.called).to.be.false;
        // Update dep and see if we keep previous result
        pass = false;
        wrapper.setProps({ hook });
        const { result: updatedResult } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
        (0, expect_1.expect)(updatedResult).to.equal(operResult);
    });
    it('Should skip updates if multiple updates get queued', async function () {
        const deps = {
            dep1: 0
        };
        let count = 1;
        const operation = async () => {
            await (0, delay_1.delay)(200);
            return count++;
        };
        const hook = () => {
            const { dep1 } = deps;
            return (0, use_async_operation_1.useAsyncOperation)({
                operation,
                dependencies: [dep1],
                errorCallback
            });
        };
        // Let first update go through
        const { wrapper, result: result1 } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val.result, errorCallback));
        (0, expect_1.expect)(result1).to.equal(1);
        // Update 3 times in a row, with a small delay in between to ensure
        // We give control to the hook inbetween to handle the update to props
        let x;
        for (x in _.range(3)) {
            deps.dep1++;
            wrapper.setProps({ hook });
            await (0, delay_1.delay)(10);
        }
        // Wait for promises
        let activePromiseIndicies;
        do {
            activePromiseIndicies = (0, promise_syncronization_helpers_1.getActivePromiseIndicies)();
            await (0, promise_syncronization_helpers_1.waitForPromisesToResolvePromise)(activePromiseIndicies);
        } while (!_.isEmpty(activePromiseIndicies));
        // Expect only 2 updates to go though (initial one, second skipped, then third)
        (0, expect_1.expect)(count).to.equal(4);
    });
    it('Should do all updates if doAllUpdates is true', async function () {
        const deps = {
            dep1: 0
        };
        let count = 1;
        const operation = async () => {
            await (0, delay_1.delay)(200);
            return count++;
        };
        const hook = () => {
            const { dep1 } = deps;
            return (0, use_async_operation_1.useAsyncOperation)({
                operation,
                dependencies: [dep1],
                errorCallback,
                doAllUpdates: true
            });
        };
        // Let first update go through
        const { wrapper, result: result1 } = await (0, util_2.waitForHookResult)(hook, val => (0, hook_tests_1.getResult)(val.result, errorCallback));
        (0, expect_1.expect)(result1).to.equal(1);
        // Update 3 times in a row, with a small delay in between to ensure
        // We give control to the hook in-between to handle the update to props
        let x;
        for (x in _.range(3)) {
            deps.dep1++;
            wrapper.setProps({ hook });
            await (0, delay_1.delay)(10);
        }
        // Wait for promises
        let activePromiseIndicies;
        do {
            activePromiseIndicies = (0, promise_syncronization_helpers_1.getActivePromiseIndicies)();
            await (0, promise_syncronization_helpers_1.waitForPromisesToResolvePromise)(activePromiseIndicies);
        } while (!_.isEmpty(activePromiseIndicies));
        // Expect all updates to go though
        (0, expect_1.expect)(count).to.equal(5);
    });
    // Loading
    it('Should mark something as loading if it takes beyond the threshold wait time', async function () {
        this.timeout(util_3.LOADING_DELAY_MS * 10);
        const deps = {
            dep1: 0
        };
        let count = 1;
        const operation = async () => {
            await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 2);
            return count++;
        };
        const hook = () => {
            const { dep1 } = deps;
            return (0, use_async_operation_1.useAsyncOperation)({
                operation,
                dependencies: [dep1],
                errorCallback
            });
        };
        const { wrapper } = (0, util_2.getDataFromHook)(hook);
        {
            const { shouldDisplayLoadingUI, result } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(result).to.be.null;
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.false;
        }
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS);
        {
            const { shouldDisplayLoadingUI, result } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(result).to.be.null;
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.true;
        }
    });
    it('Should only set initial loading values for first load', async function () {
        this.timeout(util_3.LOADING_DELAY_MS * 10);
        const deps = {
            dep1: 0
        };
        let count = 1;
        const operation = async () => {
            await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 2);
            return count++;
        };
        const hook = () => {
            const { dep1 } = deps;
            return (0, use_async_operation_1.useAsyncOperation)({
                operation,
                dependencies: [dep1],
                errorCallback
            });
        };
        const { wrapper } = (0, util_2.getDataFromHook)(hook);
        // First load
        {
            const { shouldDisplayInitalLoadingUI, initalLoadInProgress } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(shouldDisplayInitalLoadingUI).to.be.false;
            (0, expect_1.expect)(initalLoadInProgress).to.be.true;
        }
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS);
        {
            const { shouldDisplayInitalLoadingUI, initalLoadInProgress, result } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(result).to.be.null;
            (0, expect_1.expect)(shouldDisplayInitalLoadingUI).to.be.true;
            (0, expect_1.expect)(initalLoadInProgress).to.be.true;
        }
        await (0, promise_syncronization_helpers_1.waitForPromisesToResolvePromise)((0, promise_syncronization_helpers_1.getActivePromiseIndicies)());
        // Second load
        deps.dep1++;
        wrapper.setProps({ hook });
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS);
        {
            const { shouldDisplayInitalLoadingUI, initalLoadInProgress, shouldDisplayLoadingUI, result } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(result).to.be.null;
            (0, expect_1.expect)(shouldDisplayInitalLoadingUI).to.be.false;
            (0, expect_1.expect)(initalLoadInProgress).to.be.false;
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.true;
        }
    });
    it("Should handle multiple back to back operations well (2 operations who separately don't equal the loading delay but together do)", async function () {
        this.timeout(util_3.LOADING_DELAY_MS * 10);
        const deps = {
            dep1: 0
        };
        let count = 1;
        const operation = async () => {
            await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 0.6);
            return count++;
        };
        const hook = () => {
            const { dep1 } = deps;
            return (0, use_async_operation_1.useAsyncOperation)({
                operation,
                dependencies: [dep1],
                errorCallback
            });
        };
        const { wrapper } = (0, util_2.getDataFromHook)(hook);
        // First load
        await (0, promise_syncronization_helpers_1.waitForPromisesToResolvePromise)((0, promise_syncronization_helpers_1.getActivePromiseIndicies)());
        // Second load
        deps.dep1++;
        wrapper.setProps({ hook });
        await (0, delay_1.delay)(util_3.LOADING_DELAY_MS * 0.4);
        {
            const { shouldDisplayLoadingUI, result } = (0, util_2.getDataFromHookWrapper)(wrapper, hook);
            (0, expect_1.expect)(result).to.be.null;
            (0, expect_1.expect)(shouldDisplayLoadingUI).to.be.false;
        }
    });
});
