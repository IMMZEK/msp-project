"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loading = void 0;
const React = require("react");
function Loading(props) {
    const { style, ...rest } = props;
    return (
    // @ts-ignore - typings for align
    React.createElement("div", { align: "center", style: { marginTop: '1em', ...style }, ...rest },
        React.createElement("h2", null, " Loading... "),
        React.createElement("div", null,
            React.createElement("img", { src: require('../images/tirex-loading-spinner.gif'), style: { height: '140px', width: '140px' } }))));
}
exports.Loading = Loading;
