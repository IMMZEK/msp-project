"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTirexPage = exports.Message = exports.MESSAGE_TYPE = void 0;
// 3rd party
const classnames_1 = require("classnames");
const React = require("react");
const _ = require("lodash");
// 3rd party components
const material_ui_icons_imports_1 = require("../imports/material-ui-icons-imports");
const material_ui_imports_1 = require("../imports/material-ui-imports");
const material_ui_styles_imports_1 = require("../imports/material-ui-styles-imports");
// our modules
const util_1 = require("../component-helpers/util");
const routing_helpers_1 = require("../component-helpers/routing-helpers");
const util_2 = require("../../shared/util");
var MESSAGE_TYPE;
(function (MESSAGE_TYPE) {
    MESSAGE_TYPE["ERROR"] = "error";
    MESSAGE_TYPE["INFO"] = "INFO";
})(MESSAGE_TYPE || (exports.MESSAGE_TYPE = MESSAGE_TYPE = {}));
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const useStyles = (0, material_ui_styles_imports_1.makeStyles)((theme) => {
    return {
        root: { margin: 10 },
        errorIcon: {
            color: theme.palette.error.main,
            verticalAlign: 'middle'
        },
        refreshButton: {
            marginTop: 10
        },
        warningIcon: {
            marginRight: 5,
            verticalAlign: 'middle',
            color: material_ui_imports_1.orange[500]
        },
        messageBody: {
            padding: 10
        },
        messageText: {
            fontWeight: 500
        },
        paper: { padding: 10 },
        text: {
            verticalAlign: 'middle'
        }
    };
});
exports.Message = React.forwardRef((props, ref) => {
    // Hooks
    const classes = useStyles(props);
    // Render
    const { message, messageType, classes: _classes, className, ...rest } = props;
    switch (messageType) {
        case MESSAGE_TYPE.ERROR: {
            return (React.createElement(material_ui_imports_1.Paper, { className: (0, classnames_1.default)(classes.root, classes.paper, className), ...rest, ref: ref },
                typeof message === 'string' ? (React.createElement(material_ui_imports_1.Typography, { className: classes.messageText, id: util_1.TEST_ID.messageText },
                    React.createElement(material_ui_icons_imports_1.ErrorSolid, { className: classes.errorIcon }),
                    React.createElement("span", { className: classes.text }, message))) : (React.createElement("div", { id: util_1.TEST_ID.messageText },
                    React.createElement(material_ui_icons_imports_1.ErrorSolid, { className: classes.errorIcon }),
                    message)),
                React.createElement(material_ui_imports_1.Button, { className: classes.refreshButton, variant: "contained", onClick: () => {
                        refreshTirexPage();
                    } }, "Refresh")));
        }
        case MESSAGE_TYPE.INFO: {
            return (React.createElement(material_ui_imports_1.Card, { className: (0, classnames_1.default)(className, !className && classes.root) },
                React.createElement(material_ui_imports_1.CardContent, null,
                    React.createElement("div", { className: classes.messageBody }, typeof message === 'string' ? (React.createElement(material_ui_imports_1.Typography, { className: classes.messageText, id: util_1.TEST_ID.messageText },
                        React.createElement(material_ui_icons_imports_1.Warning, { className: classes.warningIcon }),
                        React.createElement("span", { className: classes.text }, message))) : (React.createElement("div", { id: util_1.TEST_ID.messageText },
                        React.createElement(material_ui_icons_imports_1.Warning, { className: classes.warningIcon }),
                        message))))));
        }
        default: {
            (0, util_2.assertNever)(messageType);
            throw new Error(`Unknown message type ${messageType}`);
        }
    }
});
/*
   Refresh the page, removing all non-core / ciritical url query value.
 */
function refreshTirexPage() {
    const urlQuery = (0, routing_helpers_1.getUrlQuery)(location.search);
    const page = _.chain(location.pathname.replace(`${(0, routing_helpers_1.getLinkPrefix)()}/`, ''))
        .split('/')
        .first()
        .value() || util_1.Page.EXPLORE;
    const newUrlQuery = {
        // Keep any critical url query values
        theiaPort: urlQuery.theiaPort,
        theiaTheme: urlQuery.theiaTheme,
        modeTableView: urlQuery.modeTableView,
        placeholder: 'true'
    };
    const link = (0, routing_helpers_1.getDefaultNodeLink)({
        urlQuery: newUrlQuery,
        page: page || util_1.Page.EXPLORE
    });
    window.location.href = link;
}
exports.refreshTirexPage = refreshTirexPage;
