"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupDisabled = void 0;
// 3rd party
const React = require("react");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
function PopupDisabled(props) {
    const { onClose, ...rest } = props;
    return (React.createElement("div", { ...rest },
        React.createElement(material_ui_imports_1.DialogTitle, null, "Pop Up Disabled"),
        React.createElement(material_ui_imports_1.DialogContent, null,
            React.createElement(material_ui_imports_1.DialogContentText, null, "Please allow pop-ups and try again.")),
        React.createElement(material_ui_imports_1.DialogActions, null,
            React.createElement(material_ui_imports_1.Button, { onClick: onClose }, "OK"))));
}
exports.PopupDisabled = PopupDisabled;
