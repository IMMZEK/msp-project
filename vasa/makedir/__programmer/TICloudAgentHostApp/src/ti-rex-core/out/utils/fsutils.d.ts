export declare function makeDir(dir: string): void;
export declare function removeEmptyDirs(dir: string): Promise<void>;
export declare function removeFile(filepath: string, rmdir: boolean, vroot: string): void;
export declare function move(from: string, to: string, vroot: string, callback: (err?: Error) => void): void;
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
export declare function readDirRecursive(rootDir: string, fileFilter?: RegExp | null, depth?: number, advancedOptions?: {
    onFileFound?: (fileFound: string) => string;
    excludeDirs: string[];
}): string[];
/**
 * Find the first existing file path
 *
 * NOTE: this function is *synchronous*
 *
 * @param filePaths - array of file paths
 * @returns first file path that exists or undefined if none do
 */
export declare function findFirstExistingFileSync(filePaths: string[]): string | undefined;
