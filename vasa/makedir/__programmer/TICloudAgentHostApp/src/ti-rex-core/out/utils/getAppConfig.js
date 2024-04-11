"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppConfig = void 0;
const fs = require("fs-extra");
const util_1 = require("../scripts-lib/util");
/**
 * Get the passed in appConfig, dconfig, and dinfra paths
 *
 */
async function getAppConfig() {
    const configArray = [
        (0, util_1.resolvePath)(process.argv[2]),
        (0, util_1.resolvePath)(process.argv[3]),
        (0, util_1.resolvePath)(process.argv[4]) // appConfig
    ];
    const pathExistsArray = await Promise.all(configArray.map((item) => fs.pathExists(item || '')));
    pathExistsArray.forEach((item, idx) => {
        // Dinfra passed to node.js require, so it may be missing the file extension, skip
        if (idx > 0 && !item) {
            console.log(`WARNING config file not found ${configArray[idx]}`);
            configArray[idx] = null;
        }
    });
    return { dinfra: configArray[0], dconfig: configArray[1], appConfig: configArray[2] };
}
exports.getAppConfig = getAppConfig;
