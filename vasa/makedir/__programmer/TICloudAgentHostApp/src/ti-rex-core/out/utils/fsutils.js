"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFirstExistingFileSync = exports.readDirRecursive = exports.move = exports.removeFile = exports.removeEmptyDirs = exports.makeDir = void 0;
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
/*
 * Private file system utilities
 */
function _isDir(dir) {
    try {
        return fs.statSync(dir).isDirectory();
    }
    catch (err) {
        // any error
    }
    return false;
}
/*
 * Make directory if not already exist.
 */
function makeDir(dir) {
    // note that fs.existsSync() is deprecated
    try {
        fs.statSync(dir).isDirectory();
    }
    catch (err) {
        // not exists
        fs.ensureDirSync(dir);
    }
}
exports.makeDir = makeDir;
/*
 * Remove recursively child directories which are empty
 */
async function removeEmptyDirs(dir) {
    const children = await fs.readdir(dir);
    if (children.length === 0) {
        await fs.rmdir(dir);
    }
    else {
        for (const child of children) {
            const childPath = path.join(dir, child);
            const stat = await fs.stat(childPath);
            if (stat.isDirectory()) {
                await removeEmptyDirs(childPath);
            }
        }
    }
}
exports.removeEmptyDirs = removeEmptyDirs;
/*
 * Remove recursively parent directories which is empty up to the specified vroot.
 */
function _removeEmptyDirReverse(filepath, vroot) {
    let _filepath = filepath;
    while (_filepath) {
        if (_filepath === vroot) {
            // stop at vroot
            break;
        }
        try {
            if (fs.statSync(_filepath).isDirectory()) {
                fs.rmdirSync(_filepath);
            }
        }
        catch (err) {
            //
            if (err.code !== 'ENOENT') {
                break;
            }
        }
        _filepath = path.dirname(_filepath);
    }
}
/*
 * Remove a file or directory.
 * Arguments:
 *   rmdir: remove parent directory if it is empty up to vroot (exclusive)
 */
function removeFile(filepath, rmdir, vroot) {
    try {
        if (_isDir(filepath)) {
            fs.removeSync(filepath);
        }
        else {
            fs.unlinkSync(filepath);
        }
        if (rmdir && vroot) {
            _removeEmptyDirReverse(path.dirname(filepath), vroot);
        }
    }
    catch (err) { }
}
exports.removeFile = removeFile;
/*
 * Move a folder. If the destination folder exist then merge/overwrite the content in it.
 * Arguments:
 *   vroot: cleanup empty folders up to this directory (exclusive)
 */
function _moveFolder(from, to, vroot, callback) {
    if (from == null || to == null || from === to) {
        callback();
        return;
    }
    // try rename first (faster), good for empty destination
    fs.rename(from, to, (err) => {
        if (err) {
            // failed, try move (slower), requires fs-extra, will merge contents into destination
            fs.move(from, to, (err2) => {
                // cleanup
                _removeEmptyDirReverse(from, vroot); // should be empty already
                callback(err2);
            });
        }
        else {
            callback();
        }
    });
}
/*
 * Move a file. If the destination folder exist then merge/overwrite the content in it.
 * Arguments:
 *   vroot: cleanup empty folders up to this directory (exclusive)
 */
function _moveFile(from, to, vroot, callback) {
    if (from == null || to == null || from === to) {
        callback();
        return;
    }
    // clobber=true -> always replace existing
    fs.move(from, to, { overwrite: true }, (err) => {
        // cleanup
        _removeEmptyDirReverse(path.dirname(from), vroot);
        // cast because default types are wrong
        if (err && err.code === 'ENOENT') {
            err = undefined;
        }
        callback(err);
    });
}
/*
 * Move a file or folder. If the destination folder exist then merge/overwrite the content in it.
 * Arguments:
 *   vroot: cleanup empty folders up to this directory (exclusive)
 */
function move(from, to, vroot, callback) {
    if (from == null || to == null || from === to) {
        setImmediate(callback);
        return;
    }
    const isdir = _isDir(from);
    if (isdir) {
        _moveFolder(from, to, vroot, callback);
    }
    else {
        _moveFile(from, to, vroot, callback);
    }
}
exports.move = move;
/**
 * Recursively read dir files. Only files are returned, NO dirs.
 * @param rootDir: the returned paths will be relative to this dir
 * @param fileFilter: regex file filter
 * @param depth: number of dir levels to recurse into (null or -1: no limit; 0: always returns an
 * empty array)
 * @param advancedOptions:
 *  findOne: function returns after the first file is found (makes most sense with a fileFilter)
 *  excludeDirs: directories to exclude, path is relative to rootDir
 *  TODO: add concept of preferred folder names: if exist look there first to speed up finding certain files
 */
function readDirRecursive(rootDir, fileFilter, depth = -1, advancedOptions = { onFileFound: undefined, excludeDirs: [] }) {
    const { excludeDirs, onFileFound } = advancedOptions;
    const result = [];
    if (fs.statSync(rootDir).isDirectory()) {
        _readDirRecursive('', 1);
    }
    return result;
    /**
     * Recursively read dir contents
     * @param relDir: normally set to '' (used by the recursive calls to pass along dir names)
     * @param currentLevel
     */
    function _readDirRecursive(relDir, currentLevel) {
        if (depth === -1 || currentLevel <= depth) {
            const files = fs.readdirSync(path.join(rootDir, relDir));
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < files.length; i++) {
                if (excludeDirs.some((excludeDir) => (relDir + path.sep).startsWith(excludeDir + path.sep))) {
                    break;
                }
                const file = path.join(relDir, files[i]);
                const stat = fs.statSync(path.join(rootDir, file));
                if (stat.isFile()) {
                    if (fileFilter == null || fileFilter.test(file)) {
                        result.push(file);
                        if (onFileFound) {
                            const newExcludeDir = onFileFound(file);
                            if (newExcludeDir) {
                                excludeDirs.push(newExcludeDir);
                            }
                        }
                    }
                }
                else if (stat.isDirectory()) {
                    _readDirRecursive(file, currentLevel + 1);
                }
            }
        }
    }
}
exports.readDirRecursive = readDirRecursive;
/**
 * Find the first existing file path
 *
 * NOTE: this function is *synchronous*
 *
 * @param filePaths - array of file paths
 * @returns first file path that exists or undefined if none do
 */
function findFirstExistingFileSync(filePaths) {
    return _.find(filePaths, (path) => fs.existsSync(path));
}
exports.findFirstExistingFileSync = findFirstExistingFileSync;
