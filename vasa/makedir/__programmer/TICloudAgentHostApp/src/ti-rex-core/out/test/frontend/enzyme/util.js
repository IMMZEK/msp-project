"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doAct = exports.waitForHookWrapperResult = exports.waitForHookResult = exports.getDataFromHookWrapper = exports.getDataFromHook = void 0;
// 3rd party
const React = require("react");
const test_utils_1 = require("react-dom/test-utils");
const enzyme_1 = require("enzyme");
// our modules
const util_1 = require("../../util");
const delay_1 = require("../../delay");
function getDataFromHook(hook) {
    const wrapper = doAct(() => (0, enzyme_1.mount)(React.createElement(HookWrapper, { hook: hook })));
    const hookResult = getDataFromHookWrapper(wrapper, hook);
    (0, util_1.afterTest)(() => {
        doAct(() => {
            wrapper.unmount();
        });
    });
    return { data: hookResult, wrapper };
}
exports.getDataFromHook = getDataFromHook;
function getDataFromHookWrapper(wrapper, _hook) {
    doAct(() => {
        wrapper.update();
    });
    const divWrapper = wrapper.find('div');
    const { hook: hookResult } = divWrapper.props();
    if (hookResult instanceof HookError) {
        throw hookResult.error;
    }
    return hookResult;
}
exports.getDataFromHookWrapper = getDataFromHookWrapper;
/**
 * Trigger the hook, wait until the result is truthly (assuming that means it's done)
 *
 */
async function waitForHookResult(hook, getResult) {
    const { wrapper, data } = getDataFromHook(hook);
    let result = getResult(data);
    if (!result) {
        result = await waitForHookWrapperResult(wrapper, hook, getResult);
    }
    return { result, wrapper };
}
exports.waitForHookResult = waitForHookResult;
async function waitForHookWrapperResult(wrapper, hook, getResult) {
    let result;
    do {
        result = getResult(getDataFromHookWrapper(wrapper, hook));
        if (!result) {
            await (0, delay_1.delay)(20);
        }
    } while (!result);
    return result;
}
exports.waitForHookWrapperResult = waitForHookWrapperResult;
function doAct(getVal) {
    const valInit = {};
    let val = valInit;
    (0, test_utils_1.act)(() => {
        val = getVal();
    });
    if (val === valInit) {
        throw new Error('Called act but never got val');
    }
    return val;
}
exports.doAct = doAct;
function HookWrapper(props) {
    let hook;
    try {
        hook = props.hook();
    }
    catch (e) {
        hook = new HookError(e);
    }
    // @ts-ignore Add a custom attribute to div for the hook return value
    return React.createElement("div", { hook: hook });
}
class HookError {
    error;
    constructor(error) {
        this.error = error;
    }
}
