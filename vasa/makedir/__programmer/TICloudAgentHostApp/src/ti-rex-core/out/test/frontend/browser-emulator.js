'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWindowAndGlobal = exports.browserEmulator = void 0;
const jsdom_1 = require("jsdom");
const util_1 = require("../../scripts-lib/util");
function browserEmulator() {
    // @ts-ignore
    global.navigator = {
        userAgent: 'node.js'
    };
    // @ts-ignore
    global.localStorage = storageMock();
    // @ts-ignore
    global.document = {
        getElementById: () => {
            throw new Error('Not implmemented');
        }
    };
    setupWindowAndGlobal();
}
exports.browserEmulator = browserEmulator;
function storageMock() {
    const storage = {};
    return {
        setItem: (key, value) => {
            storage[key] = value || '';
        },
        getItem: (key) => {
            return key in storage ? storage[key] : null;
        },
        removeItem: (key) => {
            delete storage[key];
        },
        get length() {
            return Object.keys(storage).length;
        },
        key: (i) => {
            return Object.keys(storage)[i] || null;
        },
        clear: () => {
            Object.keys(storage).forEach(key => delete storage[key]);
        }
    };
}
function setupWindowAndGlobal() {
    const jsdom = new jsdom_1.JSDOM('<!doctype html><html><body></body></html>', {
        url: `http://localhost:${util_1.mochaServerPort}`,
        contentType: 'text/html'
    });
    const { window } = jsdom;
    // Set global object
    // @ts-ignore
    global.window = window;
    // @ts-ignore
    global.document = window.document;
    // @ts-ignore
    global.requestAnimationFrame = callback => {
        return setTimeout(callback, 0);
    };
    // @ts-ignore
    global.cancelAnimationFrame = id => {
        clearTimeout(id);
    };
    // Move items from window to global
    copyProps(window, global);
}
exports.setupWindowAndGlobal = setupWindowAndGlobal;
function copyProps(src, target) {
    Object.defineProperties(target, {
        ...Object.getOwnPropertyDescriptors(src),
        ...Object.getOwnPropertyDescriptors(target)
    });
}
