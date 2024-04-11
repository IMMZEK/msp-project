"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
// 3rd party
const classnames_1 = require("classnames");
const React = require("react");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
const material_ui_styles_imports_1 = require("../imports/material-ui-styles-imports");
// our modules
const context_1 = require("../component-helpers/context");
const errors_1 = require("../../shared/errors");
const styles_1 = require("../component-helpers/styles");
const util_1 = require("../component-helpers/util");
// our components
const iframe_1 = require("./iframe");
const message_1 = require("./message");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }
    componentDidCatch(error, info) {
        this.setState({ error, errorInfo: info });
    }
    render() {
        const { children } = this.props;
        const { error, errorInfo } = this.state;
        let content = children;
        if (error) {
            content = React.createElement(ErrorBoundaryInner, { error: error, errorInfo: errorInfo });
        }
        return (React.createElement(context_1._ErrorContext.Provider, { value: this.handleInboundError }, content));
    }
    handleInboundError = (error) => {
        this.setState({ error, errorInfo: null });
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
}
exports.ErrorBoundary = ErrorBoundary;
const useErrorBoundaryInnerStyles = (0, material_ui_styles_imports_1.makeStyles)((theme) => {
    const {} = (0, styles_1.stylesCommon)(theme);
    return {
        root: { height: '100%' },
        body: {
            margin: '24px'
        },
        details: {
            whiteSpace: 'pre-wrap',
            margin: '24px'
        },
        iframe: {
            width: '100%',
            border: 'none',
            height: '200px'
        },
        responseText: {
            marginTop: '16px',
            fontWeight: 'bold'
        }
    };
});
const ErrorBoundaryInner = (props) => {
    const { error, errorInfo, classes: _classes, className, ...rest } = props;
    // Use the fallback check here since we've had an error so we want to minimize our dependencies.
    const isDesktop = (0, util_1.fallbackIsDesktop)();
    // Hooks
    const classes = useErrorBoundaryInnerStyles(props);
    // Render
    let msg;
    if (error instanceof errors_1.NetworkError) {
        msg = isDesktop
            ? 'There was an error connecting to Resource Explorer. Check your internet connection, use offline Resource Explorer (available in view menu), or try again later.'
            : 'There was an error connecting to Resource Explorer. Check your internet connection or try again later.';
    }
    else if (error instanceof errors_1.SessionIdError) {
        msg = 'New content has been added to Resource Explorer. Refresh the page to continue.';
    }
    else if (error instanceof errors_1.CloudAgentError) {
        msg = 'Error communicating with cloud agent';
    }
    else {
        msg = 'Resource Explorer encountered an error.';
    }
    return (React.createElement("div", { className: (0, classnames_1.default)(classes.root, className), onMouseMove: () => {
            // These errors can happen to a user due to normal usage (db update, cloudagent connection drops during sleep).
            // Refresh the page automatically in these cases.
            if (error instanceof errors_1.CloudAgentError || error instanceof errors_1.SessionIdError) {
                const currentTime = new Date().getTime();
                const previousTime = parseInt(localStorage.getItem("LastAutomaticPageRefresh" /* LocalStorageKey.LAST_AUTOMATIC_PAGE_REFRESH */) ||
                    '0', 10) || 0;
                localStorage.setItem("LastAutomaticPageRefresh" /* LocalStorageKey.LAST_AUTOMATIC_PAGE_REFRESH */, currentTime.toString());
                // Only refresh, if we haven't tried to do so in the last 30 seconds
                if (currentTime - previousTime > 30000) {
                    (0, message_1.refreshTirexPage)();
                }
            }
        }, ...rest },
        React.createElement(message_1.Message, { message: msg, messageType: message_1.MESSAGE_TYPE.ERROR }),
        error instanceof errors_1.NetworkError ? (React.createElement("div", { className: classes.body },
            React.createElement("strong", null,
                "Received status code ",
                error.statusCode),
            React.createElement("br", null),
            React.createElement(material_ui_imports_1.Typography, { className: classes.responseText }, "Response:"),
            React.createElement(iframe_1.Iframe, { srcDoc: error.message, className: classes.iframe }))) : (React.createElement("div", { className: classes.body }, error.message)),
        (error.stack || (errorInfo && errorInfo.componentStack)) && (React.createElement("details", { className: classes.details },
            error.stack,
            React.createElement("br", null),
            errorInfo && errorInfo.componentStack))));
};
