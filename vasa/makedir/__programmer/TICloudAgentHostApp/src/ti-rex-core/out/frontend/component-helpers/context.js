"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorContextWrapper = exports._ErrorContext = void 0;
const React = require("react");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
// Should almost never use _ErrorContext directly, add underscore to discourage use
exports._ErrorContext = React.createContext(() => {
    throw new Error('No provider for ErrorContext');
});
function ErrorContextWrapper(props) {
    return (React.createElement(exports._ErrorContext.Consumer, null, (value) => {
        props.errorCallbackValue(value);
        return props.children;
    }));
}
exports.ErrorContextWrapper = ErrorContextWrapper;
