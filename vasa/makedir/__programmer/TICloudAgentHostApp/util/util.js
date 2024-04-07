"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mkdirRecursive = exports.deleteFolderRecursive = exports.ctxPromisify = exports.allSettled = exports.osBitSize = exports.installerOS = exports.isOSX = exports.isLinux = exports.isWin = void 0;
const fs = require("fs");
const path = require("path");
exports.isWin = /^win/.test(process.platform);
exports.isLinux = /^linux/.test(process.platform);
exports.isOSX = /^darwin/.test(process.platform);
const OS = exports.isWin ? "win" : (exports.isLinux ? "linux" : "osx");
exports.installerOS = OS;
exports.osBitSize = "64";
function allSettled(promises) {
    const wrappedPromises = promises.map((p) => Promise.resolve(p)
        .then((val) => ({ state: "fulfilled", value: val }), (err) => ({ state: "rejected", reason: err })));
    return Promise.all(wrappedPromises);
}
exports.allSettled = allSettled;
function ctxPromisify(c, fn) {
    return (...args) => new Promise((resolve, reject) => {
        fn.bind(c)(...args, (err, value) => {
            if (err) {
                reject((err && err.message) ? err : new Error(err));
            }
            else {
                resolve(value);
            }
        });
    });
}
exports.ctxPromisify = ctxPromisify;
// delete non empty folders. Otherwise; node throws NONEMPTY error as per posix standard
function deleteFolderRecursive(path) {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach((file) => {
            const curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            }
            else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
exports.deleteFolderRecursive = deleteFolderRecursive;
// Create a folder, recursively creating subfolders as needed
function mkdirRecursive(dirPath) {
    try {
        fs.statSync(dirPath);
    }
    catch (e) {
        const dirs = dirPath.split(path.sep);
        let dir = dirs.shift();
        if ("win" !== OS) {
            dir = path.sep + dir;
        }
        do {
            dir = path.join(dir, dirs.shift());
            try {
                fs.mkdirSync(dir);
            }
            catch (e) {
                // dir wasn't made, something went wrong
                if (!fs.statSync(dir).isDirectory()) {
                    throw new Error(e);
                }
            }
        } while (dirs.length);
    }
}
exports.mkdirRecursive = mkdirRecursive;
