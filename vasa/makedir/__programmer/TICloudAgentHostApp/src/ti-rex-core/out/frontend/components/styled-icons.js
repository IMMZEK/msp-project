"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrowRightLarge = exports.ArrowDropDownLarge = exports.AppsLarge = exports.PinSmall = exports.PinOffSmall = exports.MenuRightSmall = exports.MapMarkerSmall = exports.MenuDownSmall = exports.FunnelSmall = exports.CubeSmall = exports.ChevronDoubleRightSmall = exports.ChevronDoubleLeftSmall = exports.MoreVertSmall = exports.ExpandMoreSmall = exports.CloseSmall = exports.ChevronRightSmall = exports.ChevronLeftSmall = exports.ArrowRightSmall = exports.ArrowDropDownSmall = exports.AddSmall = exports.CircularProgressSmall = void 0;
// 3rd party
const React = require("react");
// 3rd party components
const material_ui_icons_imports_1 = require("../imports/material-ui-icons-imports");
const material_ui_imports_1 = require("../imports/material-ui-imports");
const mdi_material_ui_imports_1 = require("../imports/mdi-material-ui-imports");
// our modules
const theme_1 = require("../component-helpers/theme");
///////////////////////////////////////////////////////////////////////////////
/// Small Icons
///////////////////////////////////////////////////////////////////////////////
// material-ui
const CircularProgressSmall = (props) => {
    // can't use classes here because MuiCircularProgress uses the style prop
    // instead of classes to drive the width / height (this overides style)
    return (React.createElement(material_ui_imports_1.CircularProgress, { ...props, style: { width: theme_1.SMALL_ICON_SIZE, height: theme_1.SMALL_ICON_SIZE } }));
};
exports.CircularProgressSmall = CircularProgressSmall;
// material-ui-icons
const AddSmall = (props) => React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.Add, props: props });
exports.AddSmall = AddSmall;
const ArrowDropDownSmall = (props) => (React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.ArrowDropDown, props: props }));
exports.ArrowDropDownSmall = ArrowDropDownSmall;
const ArrowRightSmall = (props) => (React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.ArrowRight, props: props }));
exports.ArrowRightSmall = ArrowRightSmall;
const ChevronLeftSmall = (props) => (React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.ChevronLeft, props: props }));
exports.ChevronLeftSmall = ChevronLeftSmall;
const ChevronRightSmall = (props) => (React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.ChevronRight, props: props }));
exports.ChevronRightSmall = ChevronRightSmall;
const CloseSmall = (props) => React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.Close, props: props });
exports.CloseSmall = CloseSmall;
const ExpandMoreSmall = (props) => (React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.ExpandMore, props: props }));
exports.ExpandMoreSmall = ExpandMoreSmall;
const MoreVertSmall = (props) => (React.createElement(SmallIcon, { Icon: material_ui_icons_imports_1.MoreVert, props: props }));
exports.MoreVertSmall = MoreVertSmall;
// mdi-material-ui-icons
const ChevronDoubleLeftSmall = (props) => (React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.ChevronDoubleLeft, props: props }));
exports.ChevronDoubleLeftSmall = ChevronDoubleLeftSmall;
const ChevronDoubleRightSmall = (props) => (React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.ChevronDoubleRight, props: props }));
exports.ChevronDoubleRightSmall = ChevronDoubleRightSmall;
const CubeSmall = (props) => React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.Cube, props: props });
exports.CubeSmall = CubeSmall;
const FunnelSmall = (props) => React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.Funnel, props: props });
exports.FunnelSmall = FunnelSmall;
const MenuDownSmall = (props) => (React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.MenuDown, props: props }));
exports.MenuDownSmall = MenuDownSmall;
const MapMarkerSmall = (props) => (React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.MapMarker, props: props }));
exports.MapMarkerSmall = MapMarkerSmall;
const MenuRightSmall = (props) => (React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.MenuRight, props: props }));
exports.MenuRightSmall = MenuRightSmall;
const PinOffSmall = (props) => React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.PinOff, props: props });
exports.PinOffSmall = PinOffSmall;
const PinSmall = (props) => React.createElement(SmallIcon, { Icon: mdi_material_ui_imports_1.Pin, props: props });
exports.PinSmall = PinSmall;
///////////////////////////////////////////////////////////////////////////////
/// Large Icons
///////////////////////////////////////////////////////////////////////////////
const AppsLarge = (props) => React.createElement(LargeIcon, { Icon: material_ui_icons_imports_1.Apps, props: props });
exports.AppsLarge = AppsLarge;
const ArrowDropDownLarge = (props) => (React.createElement(LargeIcon, { Icon: material_ui_icons_imports_1.ArrowDropDown, props: props }));
exports.ArrowDropDownLarge = ArrowDropDownLarge;
const ArrowRightLarge = (props) => (React.createElement(LargeIcon, { Icon: material_ui_icons_imports_1.ArrowRight, props: props }));
exports.ArrowRightLarge = ArrowRightLarge;
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
function SmallIcon(propsOuter) {
    const { props, Icon } = propsOuter;
    const { style, ...restProps } = props;
    return React.createElement(Icon, { ...restProps, style: { fontSize: theme_1.SMALL_ICON_SIZE, ...style } });
}
function LargeIcon(propsOuter) {
    const { props, Icon } = propsOuter;
    const { style, ...restProps } = props;
    return React.createElement(Icon, { ...restProps, style: { fontSize: theme_1.LARGE_ICON_SIZE, ...style } });
}
