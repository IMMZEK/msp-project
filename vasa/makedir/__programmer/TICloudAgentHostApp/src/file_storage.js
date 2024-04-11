"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.write = void 0;
// Object for storing downloaded files on the local drive
const fs = require("fs");
const os = require("os");
const path = require("path");
const tempFileDir = path.join(os.tmpdir(), "ti_cloud_storage");
if (!fs.existsSync(tempFileDir)) {
    fs.mkdirSync(tempFileDir);
}
function write(fileName, base64Data) {
    const destFilePath = path.normalize(path.join(tempFileDir, fileName));
    // make sure the path is still inside the temp dir
    const relativeToTemp = path.relative(tempFileDir, destFilePath);
    if (relativeToTemp.indexOf("..") > -1) {
        throw new Error("Invalid Path : " + destFilePath);
    }
    const buf = Buffer.from(base64Data, "base64"); //  decode base 64 data
    fs.writeFileSync(destFilePath, buf);
    return destFilePath;
}
exports.write = write;
