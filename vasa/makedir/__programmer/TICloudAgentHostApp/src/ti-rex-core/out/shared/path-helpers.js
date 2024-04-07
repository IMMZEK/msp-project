'use strict';
const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid').v4;
/**
 * Helper functions for dealing with paths / folders
 */
exports.PathHelpers = class PathHelpers {
    /**
     * Makes the path separators all path.sep,
     * removes any excess path separators,
     * and ensures it ends with a trailing path.sep
     *
     * i.e normalize('foo//bar/baz\\foo') => 'foo/bar/baz/foo/'
     *
     * @param {String} aPath
     * @returns {String} normalizedPath
     */
    static normalize(aPath) {
        return path.normalize(aPath.replace(/(\/|\\)/g, path.sep) + path.sep);
    }
    /**
     * Makes the path separators all path.sep,
     * removes any excess path separators
     *
     * i.e normalize('foo//bar/baz\\foo.txt') => 'foo/bar/baz/foo.txt'
     *
     * @param {String} aPath
     * @returns {String} normalizedPath
     */
    static normalizeFile(aPath) {
        return path.normalize(aPath.replace(/(\/|\\)/g, path.sep));
    }
    /**
     * @param {String} absolutePath - The absolute path to convert.
     * @param {String} relativeTo - The absolute point of reference.
     *
     * @returns {String} relativePath (or null on err)
     *
     */
    static getRelativePath(absolutePath, relativeTo) {
        return path.relative(this.normalize(relativeTo), this.normalize(absolutePath));
    }
    /**
     * @param {String} potentialSubfolder
     * @param {String} folder
     *
     * @returns {Boolean} isSubfolder
     *
     */
    static isSubfolder(potentialSubfolder, folder) {
        potentialSubfolder = this.normalize(potentialSubfolder);
        folder = this.normalize(folder);
        return potentialSubfolder.startsWith(folder);
    }
    /**
     * Remove a piece of a path (relative or abs)
     *
     * @param {String} path
     * @param {String} peice
     *
     * @return {String} newPath
     */
    static removePathPiece(_path, piece) {
        const newPath = _path.replace(piece, '');
        if (!path.isAbsolute(_path)) {
            return newPath.substr(1);
        }
        return path.normalize(newPath);
    }
    /**
     * Returns a unique path which starts with prefixPath
     *
     * @param {String} prefixPath
     * @param callback(err, uniqueFolderPath)
     */
    static getUniqueFolderPath(prefixPath, callback) {
        const potentialUniquePath = prefixPath + '-' + uuid();
        fs.stat(potentialUniquePath, (err) => {
            if (err) {
                // Unique (does not exist)
                callback(null, potentialUniquePath, path.basename(potentialUniquePath));
            }
            else {
                this.getUniqueFolderPath(prefixPath, callback);
            }
        });
    }
    /**
     * Clean a file path that may be prefixed with url arguements (i.e )
     *
     */
    static cleanFilePathWithQueryValues(filePath) {
        const fileDir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const fileNameURLObject = new URL(`http://dummy:0/${fileName}`);
        const resultFilePath = path.join(fileDir, decodeURI(fileNameURLObject.pathname));
        return this.normalizeFile(resultFilePath);
    }
};
