"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = exports.File = void 0;
const fileStorage = require("../file_storage");
/**
 *   Decode and write base64Data to file
 *   Data is a "TEMP" directory
 *   @fileName - Name of the file where the data should be stored
 *   @parentDir - Name of the directory under the "TEMP" where the file should be stored
 *   @base64Data - Data to be decoded and stored
 *
 */
class File {
    write(fileName, base64Data) {
        return (new Promise((resolve) => {
            const path = fileStorage.write(fileName, base64Data);
            resolve({ path });
        }));
    }
}
exports.File = File;
exports.name = "File";
function instance() {
    return {
        commands: new File(),
    };
}
exports.instance = instance;
