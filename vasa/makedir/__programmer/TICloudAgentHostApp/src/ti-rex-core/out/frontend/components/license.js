"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.License = void 0;
// 3rd party
const React = require("react");
const classnames_1 = require("classnames");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
const material_ui_styles_imports_1 = require("../imports/material-ui-styles-imports");
// our modules
const styles_1 = require("../component-helpers/styles");
const use_state_1 = require("../component-helpers/use-state");
const util_1 = require("../component-helpers/util");
// our components
const iframe_1 = require("./iframe");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const useStyles = (0, material_ui_styles_imports_1.makeStyles)((theme) => {
    const { flexItem, verticalFlexContainer } = (0, styles_1.stylesCommon)(theme);
    return {
        root: {},
        agreeButton: {
            backgroundColor: '#5bc0de',
            borderColor: '#46b8da',
            '&:hover': {
                backgroundColor: '#39b3d7',
                borderColor: '#269abc'
            },
            '&:enabled': {
                color: '#fff'
            }
        },
        disagreeButton: {
            color: '#fff',
            backgroundColor: '#d2322d',
            borderColor: '#ac2925',
            '&:hover': {
                backgroundColor: '#d2322d',
                borderColor: '#ac2925'
            },
            '&:enabled': {
                color: '#fff'
            }
        },
        dialogContent: {
            ...flexItem,
            ...verticalFlexContainer,
            height: '75vh'
        },
        iframe: {
            ...flexItem,
            width: '100%',
            height: '100%'
        }
    };
});
exports.License = React.forwardRef((props, ref) => {
    // State
    const [getState, setState] = (0, use_state_1.useState)({
        activeStep: 0
    });
    // Hooks
    const classes = useStyles(props);
    // Render
    const { className, onAgree, onDisagree, license, ref: _ref, ...rest } = props;
    const { activeStep } = getState();
    return (React.createElement("div", { className: (0, classnames_1.default)(classes.root, className), ref: ref, ...rest },
        React.createElement(material_ui_imports_1.Dialog, { id: util_1.TEST_ID.licenseDialog, maxWidth: 'md', scroll: 'paper', fullWidth: true, open: true },
            React.createElement(material_ui_imports_1.DialogContent, { className: classes.dialogContent },
                React.createElement(iframe_1.Iframe, { className: classes.iframe, src: license[activeStep] })),
            license.length > 1 ? (React.createElement(material_ui_imports_1.MobileStepper, { steps: license.length, position: "static", activeStep: activeStep, style: { background: '#fff' }, nextButton: React.createElement(material_ui_imports_1.Button, { onClick: () => setState({
                        activeStep: activeStep + 1
                    }), disabled: activeStep === license.length - 1 }, "Next"), backButton: React.createElement(material_ui_imports_1.Button, { onClick: () => setState({
                        activeStep: activeStep - 1
                    }), disabled: activeStep === 0 }, "Prev") })) : null,
            activeStep === license.length - 1 ? (React.createElement(material_ui_imports_1.DialogActions, null,
                React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.licenseAcceptButton, onClick: onAgree, className: classes.agreeButton }, "I have Read And Agree"),
                React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.licenseDeclineButton, onClick: onDisagree, className: classes.disagreeButton }, "Disagree"))) : null)));
});
