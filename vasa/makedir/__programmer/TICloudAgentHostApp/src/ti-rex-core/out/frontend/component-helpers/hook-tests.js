"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResult = exports.doWaitUntilOptionsSetTest = exports.doDependencyTest = exports.doTriggerTest = exports.doUpdateTest = exports.doCommonTests = void 0;
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const expect_1 = require("../../test/expect");
const util_1 = require("../../test/frontend/enzyme/util");
const delay_1 = require("../../test/delay");
const util_2 = require("../../shared/util");
const promise_utils_1 = require("../../utils/promise-utils");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Do the common tests for data fetching apis
 *
 */
function doCommonTests(setup, getHook, verifyResult, errorCallback, expectedCallCountAfterSingleCall = 1) {
    const doCall = async (data) => {
        const { result } = await (0, util_1.waitForHookResult)(getHook(data), val => getResult(val, errorCallback));
        return result;
    };
    it('Should get the result', async function () {
        const { data } = await setup();
        const result = await doCall(data);
        verifyResult(result);
    });
    it('Should cache the result', async function () {
        const { data, spy } = await setup();
        await doCall(data);
        await doCall(data);
        (0, expect_1.expect)(spy.callCount).to.equal(expectedCallCountAfterSingleCall);
    });
    it('Should handle multiple parallel requests', async function () {
        const { data, spy } = await setup();
        await Promise.all([doCall(data), doCall(data)]);
        (0, expect_1.expect)(spy.callCount).to.equal(expectedCallCountAfterSingleCall);
    });
}
exports.doCommonTests = doCommonTests;
function doUpdateTest(setup, getHook, verifyResult, errorCallback, eventDelayMs) {
    const doCall = async (data) => {
        const { result } = await (0, util_1.waitForHookResult)(getHook(data), val => getResult(val, errorCallback));
        return result;
    };
    it('Should handle update events', async function () {
        const { data } = await setup();
        const result1 = await doCall(data);
        verifyResult(result1, false);
        await (0, delay_1.delay)(eventDelayMs * 2);
        const result2 = await doCall(data);
        verifyResult(result2, true);
    });
}
exports.doUpdateTest = doUpdateTest;
function doTriggerTest(setup, getHook, verifyResult, errorCallback, dependencies) {
    it('Should make a single call when trigger is set', async function () {
        const { data, spy } = await setup();
        const hook = getHook(data);
        const { wrapper } = (0, util_1.getDataFromHook)(hook);
        // Update trigger then wait
        dependencies.trigger = true;
        wrapper.setProps({ hook });
        const result = await (0, util_1.waitForHookWrapperResult)(wrapper, hook, val => getResult(val, errorCallback));
        // Verify
        await verifyResult(1, result, spy, data);
    });
}
exports.doTriggerTest = doTriggerTest;
function doDependencyTest(setup, getHook, verifyResult, errorCallback, dependencies, updatedDependencyValues) {
    it('Should handle dependencies changing', async function () {
        const { data, spy } = await setup();
        const hook = getHook(data);
        const { wrapper } = (0, util_1.getDataFromHook)(hook);
        await (0, util_1.waitForHookWrapperResult)(wrapper, hook, val => getResult(val, errorCallback));
        const updateWaitAndVerify = async (count) => {
            wrapper.setProps({ hook });
            const result = await (0, util_1.waitForHookWrapperResult)(wrapper, hook, val => getResult(val, errorCallback));
            await verifyResult(count, result, spy, data);
        };
        // Update, wait, verify, repeat
        const depKeys = (0, util_2.getObjectKeys)(dependencies);
        for (let i = 0; i < depKeys.length; i++) {
            const depKey = depKeys[i];
            (0, util_2.setValueForPair)(dependencies, updatedDependencyValues, depKey, val => val);
            // Account for initial call (so for i = 0 we are the second call)
            await updateWaitAndVerify(i + 2);
        }
    });
}
exports.doDependencyTest = doDependencyTest;
function doWaitUntilOptionsSetTest(setup, getHook, verifyResult, errorCallback, dependencies, updatedDependencyValues) {
    it('Should wait until all options are set', async function () {
        const { data, spy } = await setup();
        const hook = getHook(data);
        const { wrapper } = (0, util_1.getDataFromHook)(hook);
        // Update, with delays in between
        const depKeys = (0, util_2.getObjectKeys)(dependencies);
        await (0, promise_utils_1.mapSerially)(depKeys, async (depKey) => {
            (0, util_2.setValueForPair)(dependencies, updatedDependencyValues, depKey, val => val);
            wrapper.setProps({ hook });
            await (0, delay_1.delay)(10);
        });
        const result = await (0, util_1.waitForHookWrapperResult)(wrapper, hook, // We don't use getResult here since we expect the final call to complete but we had errors earlier
        // We don't use getResult here since we expect the final call to complete but we had errors earlier
        val => val);
        await verifyResult(1, result, spy, data);
        (0, expect_1.expect)(errorCallback.current.called);
        (0, expect_1.expect)(errorCallback.current.args[0][0].message).to.deep.equal('Missing input param');
    });
}
exports.doWaitUntilOptionsSetTest = doWaitUntilOptionsSetTest;
function getResult(val, errorCallback) {
    if (errorCallback.current.called) {
        throw errorCallback.current.args[0][0];
    }
    else {
        return val;
    }
}
exports.getResult = getResult;
