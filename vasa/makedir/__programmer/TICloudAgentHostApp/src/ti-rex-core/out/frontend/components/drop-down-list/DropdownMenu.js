"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropdownMenu = void 0;
// 3rd party
const classnames_1 = require("classnames");
const React = require("react");
// 3rd party components
const material_ui_imports_1 = require("../../imports/material-ui-imports");
const material_ui_styles_imports_1 = require("../../imports/material-ui-styles-imports");
// our modules
const context_1 = require("../../component-helpers/context");
const styles_1 = require("../../component-helpers/styles");
const use_state_1 = require("../../component-helpers/use-state");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
const useStyles = (0, material_ui_styles_imports_1.makeStyles)((theme) => {
    const { verticalFlexContainer } = (0, styles_1.stylesCommon)(theme);
    return {
        root: {},
        paper: {
            ...verticalFlexContainer,
            overflowX: 'visible',
            overflowY: 'visible',
            height: 'auto'
        }
    };
});
exports.DropdownMenu = React.forwardRef((props, ref) => {
    // State
    const errorCallback = React.useRef(null);
    const [getState, setState] = (0, use_state_1.useState)({
        anchorEl: null
    });
    // Hooks
    const classes = useStyles(props);
    // Render
    const { isOpen, onClose, toggle, listProps, className, children, direction, popoverProps, classes: _classes, ...rest } = props;
    const { anchorEl } = getState();
    const toggleInner = (React.createElement("span", { ref: (item) => {
            if (!getState().anchorEl) {
                setState({ anchorEl: item });
            }
        } }, toggle));
    return (React.createElement(context_1.ErrorContextWrapper, { errorCallbackValue: (value) => {
            errorCallback.current = value;
        } },
        React.createElement("div", { className: (0, classnames_1.default)(classes.root, className), ...rest, ref: ref },
            toggleInner,
            anchorEl && (React.createElement(material_ui_imports_1.Popover, { open: isOpen, onClose: (evt) => {
                    // @ts-ignore - bad typings for evt
                    evt.preventDefault();
                    onClose();
                }, anchorEl: anchorEl, style: {
                    minWidth: anchorEl.clientWidth
                }, classes: { paper: classes.paper }, ...(direction === "left" /* DropDownDirection.LEFT */
                    ? {
                        anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                        transformOrigin: { vertical: 'top', horizontal: 'right' }
                    }
                    : { anchorOrigin: { vertical: 'bottom', horizontal: 'left' } }), ...popoverProps },
                React.createElement(material_ui_imports_1.List, { ...listProps }, children))))));
});
