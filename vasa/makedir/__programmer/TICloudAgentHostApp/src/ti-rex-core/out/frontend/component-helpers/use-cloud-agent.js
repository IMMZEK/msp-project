"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialAgentState = exports.useCloudAgent = void 0;
// our modules
const use_async_operation_1 = require("./use-async-operation");
const use_state_1 = require("./use-state");
const util_1 = require("./util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function useCloudAgent({ dependencies, errorCallback }) {
    const [getState, setState] = (0, use_state_1.useState)(getInitialAgentState());
    return (0, use_async_operation_1.useAsyncOperation)({
        operation: async () => {
            try {
                const state = await getAgentState();
                setState(state);
                return state;
            }
            catch (e) {
                throw (0, util_1.convertToCloudAgentError)(e);
            }
        },
        dependencies,
        errorCallback
    });
    async function getAgentState() {
        const CloudAgent = await (0, util_1.getTICloudAgentObject)();
        if (getState().agent) {
            return getState();
        }
        else if (typeof CloudAgent === 'undefined') {
            return {
                agent: null,
                cloudAgentInitState: "UnknownError" /* CloudAgentInitState.UNKNOWN_ERROR */,
                cloudAgentInitErrors: [
                    { name: 'Error', msg: 'The ticloudagent service is not running' }
                ]
            };
        }
        else {
            return CloudAgent.Init().then(agent => {
                return {
                    agent,
                    cloudAgentInitState: "Success" /* CloudAgentInitState.SUCCESS */,
                    cloudAgentInitErrors: null
                };
            }, err => {
                return {
                    agent: null,
                    cloudAgentInitState: "AgentNotInstalled" /* CloudAgentInitState.AGENT_NOT_INSTALLED */,
                    cloudAgentInitErrors: Array.isArray(err) ? err : [err]
                };
            });
        }
    }
}
exports.useCloudAgent = useCloudAgent;
function getInitialAgentState() {
    return {
        agent: null,
        cloudAgentInitState: "NotInitialized" /* CloudAgentInitState.NOT_INITIALIZED */,
        cloudAgentInitErrors: null
    };
}
exports.getInitialAgentState = getInitialAgentState;
