"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudAgentInit = void 0;
// 3rd party
const React = require("react");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
const util_1 = require("../component-helpers/util");
const util_2 = require("../../shared/util");
const use_cloud_agent_1 = require("../component-helpers/use-cloud-agent");
const use_async_operation_1 = require("../component-helpers/use-async-operation");
// our components
const unknown_error_1 = require("./unknown-error");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function CloudAgentInit(props) {
    // TODO need to test for cloudagent version, prompt to update cloudagent / tirex if not installed
    // Beyond this no need to handle agent installed / present but no tirex module (throw error)
    // Also do this in any place we get the agent , check version and return null if version too old
    // (but need a flag to return anyways in this case, then do the 2nd check here to prompt to install )
    const agentState = props.agentState || (0, use_cloud_agent_1.getInitialAgentState)();
    switch (agentState.cloudAgentInitState) {
        case "Success" /* CloudAgentInitState.SUCCESS */:
        case "NotInitialized" /* CloudAgentInitState.NOT_INITIALIZED */:
            return props.children;
        case "AgentNotInstalled" /* CloudAgentInitState.AGENT_NOT_INSTALLED */:
            if (!agentState.cloudAgentInitErrors) {
                throw new Error(`init state is ${agentState.cloudAgentInitState} but there are no errors`);
            }
            return (React.createElement(InstallCloudAgent, { cloudAgentInitErrors: agentState.cloudAgentInitErrors, mountComponentTemporarily: props.mountComponentTemporarily, onClose: props.onChange, errorCallback: props.errorCallback }, props.children));
        case "UnknownError" /* CloudAgentInitState.UNKNOWN_ERROR */:
            const errors = agentState.cloudAgentInitErrors;
            if (!errors || errors.length === 0) {
                throw new Error(`init state is ${agentState.cloudAgentInitState} but there are no errors`);
            }
            return (React.createElement(material_ui_imports_1.Tooltip, { title: "An error occured while initalizing cloud agent", onClick: (evt) => {
                    evt.preventDefault();
                    props.mountComponentTemporarily.mountDialogTemporarily(unknown_error_1.UnknownError, {
                        error: errors[0].msg,
                        onClose: () => { }
                    });
                } },
                React.createElement("div", null, props.children)));
        default:
            (0, util_2.assertNever)(agentState.cloudAgentInitState);
            throw new Error(`Unknown init state ${agentState.cloudAgentInitState}`);
    }
}
exports.CloudAgentInit = CloudAgentInit;
/**
 * Responsible for rendering the dialog with the various steps to install cloud agent
 *
 */
const InstallCloudAgent = React.forwardRef((props, ref) => {
    const { children, errorCallback, cloudAgentInitErrors: _cloudAgentInitErrors, onClose: _onClose, mountComponentTemporarily: _mountComponentTemp, ...rest } = props;
    // Events
    const onOpen = React.useCallback((0, util_1.evtHandler)((evt) => {
        evt.preventDefault();
        props.mountComponentTemporarily.mountDialogTemporarily(InstallWizard, props);
    }, errorCallback), []);
    // Render
    return (React.createElement("div", { ...rest, ref: ref },
        React.createElement(material_ui_imports_1.Tooltip, { title: 'Click to setup TICloudAgent', onClick: onOpen },
            React.createElement("div", null, children))));
});
const InstallWizard = React.forwardRef((props, ref) => {
    // Hooks
    const { result: installWizard } = (0, use_async_operation_1.useAsyncOperation)({
        operation: async () => {
            return TICloudAgent.Install.getInstallWizard({
                errors: props.cloudAgentInitErrors
            });
        },
        errorCallback: props.errorCallback,
        dependencies: [props.cloudAgentInitErrors]
    });
    // Render
    const { cloudAgentInitErrors, onClose, children: _children, mountComponentTemporarily: _mountComponentTemp, ...rest } = props;
    return installWizard ? (React.createElement("div", { ...rest, ref: ref },
        React.createElement(material_ui_imports_1.DialogTitle, null, installWizard.title),
        React.createElement(material_ui_imports_1.DialogContent, { id: util_1.TEST_ID.autoDetectDialogContent },
            React.createElement(material_ui_imports_1.List, null,
                React.createElement(material_ui_imports_1.ListItem, { button: false },
                    React.createElement(material_ui_imports_1.ListItemText, { primary: installWizard.description })),
                [...installWizard.steps, installWizard.finishStep].map((step, index) => {
                    if (step.action.handler) {
                        const [, buttonName, remainingText] = step.action.text.split('$');
                        return (React.createElement(material_ui_imports_1.ListItem, { button: false, key: step.description, style: { marginLeft: 20 } },
                            React.createElement(material_ui_imports_1.ListItemText, { primary: React.createElement(React.Fragment, null,
                                    `Step ${index + 1}: `,
                                    React.createElement(material_ui_imports_1.Button, { variant: "outlined", onClick: step.action.handler, title: step.description }, buttonName),
                                    remainingText) })));
                    }
                    else {
                        return (React.createElement(material_ui_imports_1.ListItem, { button: false, key: step.description, style: { marginLeft: 20 } },
                            React.createElement(material_ui_imports_1.ListItemText, { primary: `Step ${index}: ${step.action.text}` })));
                    }
                }),
                React.createElement(material_ui_imports_1.ListItem, { button: false },
                    React.createElement(material_ui_imports_1.ListItemText, { primary: React.createElement("a", { target: "_blank", href: installWizard.helpLink.url }, installWizard.helpLink.text) })))),
        React.createElement(material_ui_imports_1.DialogActions, null,
            React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.autoDetectDialogClose, onClick: onClose }, "Cancel")))) : (React.createElement("div", { ...rest, ref: ref }));
});
