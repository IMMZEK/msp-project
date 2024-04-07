"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropDownListCustomHeader = exports.DropDownList = void 0;
// 3rd party
const classnames_1 = require("classnames");
const React = require("react");
// 3rd party modules
const material_ui_icons_imports_1 = require("../../imports/material-ui-icons-imports");
const material_ui_imports_1 = require("../../imports/material-ui-imports");
const use_state_1 = require("../../component-helpers/use-state");
// our components
const DropdownMenu_1 = require("./DropdownMenu");
const NestedDropdownMenu_1 = require("./NestedDropdownMenu");
const util_1 = require("../../../shared/util");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
exports.DropDownList = React.forwardRef((props, ref) => {
    // State
    const [getState, setState] = (0, use_state_1.useState)({ open: false });
    const firstLoad = React.useRef(true);
    // Hooks
    React.useEffect(() => {
        if (!firstLoad.current && !getState().open && props.onClose) {
            props.onClose();
        }
    }, [getState().open]);
    React.useEffect(() => {
        firstLoad.current = false;
    }, []);
    // Events
    const onOpen = React.useCallback(() => {
        setState({ open: true });
    }, []);
    const onClose = React.useCallback(() => {
        setState({ open: false });
    }, []);
    // Render
    const { headerButtonProps, variant, classes, items, listProps, name, className, direction, popoverProps } = props;
    const { open } = getState();
    const toggle = (React.createElement(material_ui_imports_1.Button, { ...headerButtonProps, className: classes && classes.button, classes: {
            contained: classes && classes.contained
        }, ...(open ? { variant: 'contained' } : { variant }), onClick: onOpen },
        name,
        " ",
        React.createElement(material_ui_icons_imports_1.ArrowDropDown, { style: { color: 'inherit' } })));
    const internalProps = {
        items,
        listProps,
        toggle,
        isOpen: open,
        direction: direction || "right" /* DropDownDirection.RIGHT */,
        onClose,
        popoverProps,
        dropDownType: "NonNested" /* DropDownType.NON_NESTED */,
        className: (0, classnames_1.default)(classes && classes.root, className),
        ref
    };
    return React.createElement(DropDownListInternal, { ...internalProps });
});
function DropDownListCustomHeader(props) {
    const propsInternal = {
        items: props.items,
        toggle: props.header,
        isOpen: props.isOpen,
        direction: props.direction || "right" /* DropDownDirection.RIGHT */,
        onClose: () => {
            if (props.onClose) {
                props.onClose();
            }
        },
        popoverProps: props.popoverProps,
        listProps: props.listProps,
        dropDownType: "NonNested" /* DropDownType.NON_NESTED */
    };
    return React.createElement(DropDownListInternal, { ...propsInternal });
}
exports.DropDownListCustomHeader = DropDownListCustomHeader;
function DropDownListInternal(props) {
    const children = props.items.map((item) => {
        const elementType = item.elementType;
        switch (elementType) {
            case "Nested" /* DropDownType.NESTED */: {
                const propsInner = {
                    items: item.items,
                    label: item.label,
                    dropDownType: "Nested" /* DropDownType.NESTED */,
                    requestClose: () => closeDropdown(props),
                    header: item.header,
                    direction: item.direction || "right" /* DropDownDirection.RIGHT */,
                    listItemProps: item.listItemProps,
                    listProps: props.listProps
                };
                return React.createElement(DropDownListInternal, { ...propsInner, key: item.id });
            }
            case "NonNested" /* DropDownType.NON_NESTED */: {
                const { label, onClick, id, closeOnClick = true } = item;
                return (React.createElement(material_ui_imports_1.ListItem, { ...null, button: true, ...item.listItemProps, key: id, onClick: (evt) => {
                        if (item.listItemProps && item.listItemProps.onClick) {
                            item.listItemProps.onClick(evt);
                        }
                        evt.preventDefault();
                        if (closeOnClick) {
                            closeDropdown(props);
                        }
                        if (onClick) {
                            onClick();
                        }
                    } },
                    item.leftIcon && React.createElement(material_ui_imports_1.ListItemIcon, null, item.leftIcon),
                    React.createElement(material_ui_imports_1.ListItemText, { primary: label, primaryTypographyProps: { noWrap: true } }),
                    item.rightIcon && React.createElement(material_ui_imports_1.ListItemIcon, null, item.rightIcon)));
            }
            case "Subheader" /* DropDownType.SUBHEADER */: {
                const { label, id } = item;
                return (React.createElement(material_ui_imports_1.ListSubheader, { key: id, style: { fontWeight: 'bold' } }, label));
            }
            case "CustomItem" /* DropDownType.CUSTOM_ITEM */: {
                const { id, item: CustomItem } = item;
                return React.createElement(CustomItem, { key: id, requestClose: () => closeDropdown(props) });
            }
            default:
                (0, util_1.assertNever)(item);
                throw new Error(`Unknown element type ${elementType}`);
        }
    });
    const dropDownType = props.dropDownType;
    switch (dropDownType) {
        case "Nested" /* DropDownType.NESTED */:
            const content = (React.createElement(material_ui_imports_1.ListItemText, { primary: props.label, primaryTypographyProps: { noWrap: true } }));
            return (React.createElement(NestedDropdownMenu_1.NestedDropdownMenu, { toggle: props.direction === "right" /* DropDownDirection.RIGHT */ ? (React.createElement(React.Fragment, null,
                    content,
                    React.createElement(material_ui_icons_imports_1.ChevronRight, null))) : (React.createElement(React.Fragment, null,
                    React.createElement(material_ui_icons_imports_1.ChevronLeft, null),
                    content)), direction: props.direction, header: props.header, listItemProps: props.listItemProps, listProps: props.listProps }, children));
        case "NonNested" /* DropDownType.NON_NESTED */:
            const { isOpen, onClose, toggle, listProps, direction, popoverProps } = props;
            return (React.createElement(DropdownMenu_1.DropdownMenu, { isOpen: isOpen, listProps: listProps, onClose: onClose, toggle: toggle, direction: direction, popoverProps: popoverProps }, children));
        default:
            (0, util_1.assertNever)(props);
            throw new Error(`Unknown dropdown type ${dropDownType}`);
    }
}
function closeDropdown(props) {
    if (props.dropDownType === "NonNested" /* DropDownType.NON_NESTED */) {
        props.onClose();
    }
    else {
        props.requestClose();
    }
}
