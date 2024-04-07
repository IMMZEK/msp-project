"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDetect = exports.SELECT_TEXT = exports.BEGIN_TEXT = void 0;
// 3rd party
const React = require("react");
const _ = require("lodash");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
const util_1 = require("../../shared/util");
const util_2 = require("../component-helpers/util");
const use_async_operation_1 = require("../component-helpers/use-async-operation");
const counter_1 = require("../component-helpers/counter");
const use_state_1 = require("../component-helpers/use-state");
// our components
const drop_down_list_1 = require("./drop-down-list");
const with_cloud_agent_1 = require("./with-cloud-agent");
const unknown_error_1 = require("./unknown-error");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
// exported for testing
exports.BEGIN_TEXT = 'Detect my board';
exports.SELECT_TEXT = 'Use my board';
const _AutoDetect = (props, ref) => {
    // Hooks
    const { shouldDisplayLoadingUI, detectionResult, progress } = useAutoDetect(props);
    // Render
    const isLoading = props.isLoading && shouldDisplayLoadingUI;
    let content = React.createElement("div", null);
    if (progress) {
        content = (React.createElement("div", { ref: ref },
            React.createElement(material_ui_imports_1.Typography, { variant: "subtitle1" }, progress.name),
            React.createElement(material_ui_imports_1.Typography, { variant: "caption" }, progress.subActivity),
            React.createElement(material_ui_imports_1.LinearProgress, { id: util_2.TEST_ID.autoDetectDownloadProgressBar, variant: "determinate", value: progress.percent })));
    }
    else if (isLoading) {
        content = (React.createElement("span", { ref: ref },
            React.createElement(material_ui_imports_1.Typography, null, 'Detecting boards '),
            React.createElement(material_ui_imports_1.CircularProgress, { size: 16 })));
    }
    else if (!detectionResult) {
        content = (React.createElement(material_ui_imports_1.Button, { id: util_2.TEST_ID.autoDetectButton, variant: "outlined", ref: ref }, exports.BEGIN_TEXT));
    }
    else {
        switch (detectionResult.type) {
            case "SUCCESS" /* DetectionResultType.SUCCESS */:
                content = (React.createElement(SelectDevice, { detectedDevices: detectionResult.detectedDevices, onSelect: props.onSelect, ref: ref }));
                break;
            case "HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */:
                content = (React.createElement(material_ui_imports_1.Tooltip, { title: "Additional files are required to detect your device(s)" },
                    React.createElement(material_ui_imports_1.Button, { id: util_2.TEST_ID.autoDetectButton, variant: "outlined", onClick: (0, util_2.evtHandler)(() => {
                            detectionResult.handler();
                        }, props.appProps.errorCallback), ref: ref }, exports.BEGIN_TEXT)));
                break;
            case "UNKNOWN_ERROR" /* DetectionResultType.UNKNOWN_ERROR */:
                content = (React.createElement(material_ui_imports_1.Tooltip, { title: "An error occured while detecting your device(s)", ref: ref },
                    React.createElement(material_ui_imports_1.Button, { id: util_2.TEST_ID.autoDetectButton, variant: "outlined", onClick: (0, util_2.evtHandler)(() => {
                            props.appProps.mountComponentTemporarily.mountDialogTemporarily(unknown_error_1.UnknownError, {
                                error: detectionResult.error,
                                onClose: () => { }
                            });
                        }, props.appProps.errorCallback) }, exports.BEGIN_TEXT)));
                break;
            default:
                (0, util_1.assertNever)(detectionResult);
                throw new Error('Unknown result');
        }
    }
    return content;
};
exports.AutoDetect = (0, with_cloud_agent_1.withCloudAgent)({})(React.forwardRef(_AutoDetect));
function useAutoDetect(props) {
    // State
    const [getState, setState] = (0, use_state_1.useState)({
        updateCounter: new counter_1.Counter(),
        forceUpdate: {},
        detectionResult: null,
        progress: null
    });
    // Events
    const onChanged = React.useCallback((0, util_2.evtHandler)(() => {
        getState().updateCounter.setValue();
        setState({ forceUpdate: {} });
    }, props.appProps.errorCallback), []);
    const onProgress = React.useCallback((0, util_2.evtHandler)((progress) => {
        const progressFinal = progress.isComplete ? null : progress;
        setState({ progress: progressFinal });
    }, props.appProps.errorCallback), []);
    // Hooks
    const { appProps, agent } = props;
    React.useEffect(() => {
        appProps.autoDetect.addChangeListener(onChanged);
        appProps.autoDetect.addProgressListener(onProgress);
        return () => {
            appProps.autoDetect.removeChangeListener(onChanged);
            appProps.autoDetect.removeProgressListener(onProgress);
        };
    }, []);
    const { result: detectionResultInner, ...rest } = (0, use_async_operation_1.useAsyncOperation)({
        operation: async () => {
            if (!agent) {
                return null;
            }
            return appProps.autoDetect.detect(agent);
        },
        dependencies: [agent, appProps.autoDetect, getState().updateCounter.getValue()],
        errorCallback: props.appProps.errorCallback
    });
    React.useEffect(() => {
        setState({ detectionResult: detectionResultInner });
    }, [detectionResultInner]);
    const { detectionResult, progress } = getState();
    return { detectionResult, progress, ...rest };
}
/**
 * Responsible for rendering the detected devices in a way they can be clicked to select them
 *
 */
function SelectDevice(props) {
    const detectedDevices = props.detectedDevices.filter((d) => d.name);
    if (_.isEmpty(detectedDevices)) {
        return React.createElement(material_ui_imports_1.Typography, { ref: props.ref }, "No boards detected");
    }
    else if (_.size(detectedDevices) === 1) {
        const device = detectedDevices[0];
        return (React.createElement(material_ui_imports_1.Button, { component: "button", id: util_2.TEST_ID.autoDetectButton, variant: "outlined", onClick: () => {
                props.onSelect({
                    name: device.name,
                    publicId: device.id
                });
            }, ref: props.ref }, `${exports.SELECT_TEXT} (Detected ${device.name})`));
    }
    return (React.createElement("div", { ref: props.ref },
        React.createElement(drop_down_list_1.DropDownList, { headerButtonProps: { id: util_2.TEST_ID.autoDetectButton }, name: `${exports.SELECT_TEXT} (Detected ${detectedDevices.length} boards)`, variant: "outlined", items: detectedDevices.map((device, index) => {
                const option = {
                    label: device.name,
                    id: index.toString(),
                    onClick: () => props.onSelect({
                        name: device.name,
                        publicId: device.id
                    }),
                    elementType: "NonNested" /* DropDownType.NON_NESTED */,
                    listItemProps: {
                        id: util_2.TEST_ID.autoDetectDetectedMenuItem(device.id || 'unknown-device')
                    }
                };
                return option;
            }), listProps: { id: util_2.TEST_ID.autoDetectDetectedMenu } })));
}
