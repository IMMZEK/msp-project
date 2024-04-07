"use strict";
// Factory for a write stream based on the file type
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWriteStream = void 0;
const fs = require("fs");
const stream = require("stream");
const util = require("../../util/util");
// Creates the base stream object
function createWriteStream(filePath, permissions) {
    if (!isLink(permissions)) {
        return createFileStream(filePath, permissions);
    }
    else {
        return new LinkStream(filePath);
    }
}
exports.createWriteStream = createWriteStream;
// True if the file is to be a symlink
function isLink(permissions) {
    // 120### is the magic unix-permissions number for a symlink
    return /120[0-7]{3}/.test(permissions);
}
// Create a regular file stream, but in the linux/mac case, chmod it
function createFileStream(filePath, permissions) {
    const fileStream = fs.createWriteStream(filePath)
        .on("finish", () => {
        if (!util.isWin && permissions) {
            try {
                fs.chmodSync(filePath, parseInt(permissions, 8));
            }
            catch (e) {
                fileStream.emit("error", e);
            }
        }
    });
    return fileStream;
}
class LinkStream extends stream.Writable {
    constructor(filePath) {
        super();
        this.fileLinkedTo = "";
        this.on("finish", () => {
            try {
                // Try to delete the file if in case it's alredy there
                try {
                    fs.unlinkSync(filePath);
                }
                catch (e) { }
                // Now create the symlink
                fs.symlinkSync(this.fileLinkedTo, filePath);
            }
            catch (e) {
                this.emit("error", e);
            }
        });
    }
    _write(chunk, _encoding, callback) {
        this.fileLinkedTo += chunk;
        callback();
    }
}
