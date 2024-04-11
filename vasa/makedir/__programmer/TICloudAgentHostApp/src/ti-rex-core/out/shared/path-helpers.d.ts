export class PathHelpers {
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
    static normalize(aPath: string): string;
    /**
     * Makes the path separators all path.sep,
     * removes any excess path separators
     *
     * i.e normalize('foo//bar/baz\\foo.txt') => 'foo/bar/baz/foo.txt'
     *
     * @param {String} aPath
     * @returns {String} normalizedPath
     */
    static normalizeFile(aPath: string): string;
    /**
     * @param {String} absolutePath - The absolute path to convert.
     * @param {String} relativeTo - The absolute point of reference.
     *
     * @returns {String} relativePath (or null on err)
     *
     */
    static getRelativePath(absolutePath: string, relativeTo: string): string;
    /**
     * @param {String} potentialSubfolder
     * @param {String} folder
     *
     * @returns {Boolean} isSubfolder
     *
     */
    static isSubfolder(potentialSubfolder: string, folder: string): boolean;
    /**
     * Remove a piece of a path (relative or abs)
     *
     * @param {String} path
     * @param {String} peice
     *
     * @return {String} newPath
     */
    static removePathPiece(_path: any, piece: any): string;
    /**
     * Returns a unique path which starts with prefixPath
     *
     * @param {String} prefixPath
     * @param callback(err, uniqueFolderPath)
     */
    static getUniqueFolderPath(prefixPath: string, callback: any): void;
    /**
     * Clean a file path that may be prefixed with url arguements (i.e )
     *
     */
    static cleanFilePathWithQueryValues(filePath: any): string;
}
