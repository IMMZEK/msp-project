"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultTheme = exports.setTheme = exports.getTheme = exports.loadTheme = void 0;
const util_1 = require("./util");
function loadTheme() {
    window.location.reload();
}
exports.loadTheme = loadTheme;
function getTheme() {
    const darkTheme = localStorage.getItem("Theme" /* LocalStorageKey.THEME */) || getDefaultTheme();
    return darkTheme;
}
exports.getTheme = getTheme;
function setTheme(theme) {
    localStorage.setItem("Theme" /* LocalStorageKey.THEME */, theme);
}
exports.setTheme = setTheme;
function getDefaultTheme() {
    if ((0, util_1.getTheiaPort)() > 0) {
        return (0, util_1.getTheiaTheme)() === 'dark' ? 'dark' : 'light';
    }
    else {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
}
exports.getDefaultTheme = getDefaultTheme;
