"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnknownError = void 0;
// 3rd party
const React = require("react");
// 3rd party components
const material_ui_imports_1 = require("../imports/material-ui-imports");
// our modules
const util_1 = require("../component-helpers/util");
function UnknownError(props) {
    const { error, onClose } = props;
    return (React.createElement(React.Fragment, null,
        React.createElement(material_ui_imports_1.DialogTitle, null, "Error"),
        React.createElement(material_ui_imports_1.DialogContent, { id: util_1.TEST_ID.autoDetectDialogContent },
            React.createElement(material_ui_imports_1.DialogContentText, null, error)),
        React.createElement(material_ui_imports_1.DialogActions, null,
            React.createElement(material_ui_imports_1.Button, { id: util_1.TEST_ID.autoDetectDialogClose, onClick: onClose, title: 'ok' }, "Ok"))));
}
exports.UnknownError = UnknownError;
