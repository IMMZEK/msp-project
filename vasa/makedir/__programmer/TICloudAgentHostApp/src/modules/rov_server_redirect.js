"use strict";
const fs = require("fs");
const path = require("path");
const Q = require("q");
const logger = require("../logger");
const env = process.env;
// Finds the rov plugin in the eclipse/plugins or eclipse/dropins folder, on 
// the assumption that this file is in ccs_base/cloudagent/src/modules
function findROV() {
    // get absolute path to the CCS "root" folder (ccsv7) 
    const root = path.join(__dirname, "..", "..", "..", "..");
    // find all installed versions of the com.ti.rov plugin 
    const pdirs = [
        path.join(root, "eclipse", "dropins"),
        path.join(root, "eclipse", "plugins"),
        path.join(root, "eclipse", "Eclipse.app", "Contents", "Eclipse", "dropins"),
        path.join(root, "eclipse", "Eclipse.app", "Contents", "Eclipse", "plugins"),
    ];
    const plugins = [];
    for (const dir of pdirs) {
        logger.info("rov_server_redirect: looking in: " + dir);
        let list = [];
        try {
            list = fs.readdirSync(dir);
        }
        catch (x) { } // ignore non-existent directories
        for (const pname of list) {
            if (pname.indexOf("com.ti.rov_") === 0) {
                logger.info("rov_server_redirect: found: " + dir + "/" + pname);
                plugins.push({
                    dir,
                    pname,
                });
            }
        }
    }
    // select latest version 
    plugins.sort((a, b) => {
        return (a.pname > b.pname) ? -1 : ((a.pname < b.pname) ? 1 : 0);
    });
    const plugin = plugins[0];
    if (!plugin) {
        return null;
    }
    // return a node module path relative path to plugin
    return path.join(plugin.dir, plugin.pname);
}
// Finds the JRE relative to ourself
function findJRE() {
    const root = path.join(__dirname, "..", "..", "..", "..");
    let jre = path.join(root, "eclipse", "jre");
    if (fs.existsSync(jre)) {
        return jre;
    }
    // Try the OSX location
    jre = path.join(root, "eclipse", "Ccstudio.app", "jre", "Contents", "Home");
    if (fs.existsSync(jre)) {
        return jre;
    }
    throw new Error("Cannot find jre");
}
// Find the rov path first, as it might throw and then we're done
const rovPath = findROV();
if (!rovPath) {
    throw new Error("rov_server.js was not found (this is expected in cloud)");
}
const toRequire = path.join(rovPath, "rov_server.js");
// Find the jre path and export it using an env variable
const jrePath = findJRE();
if (jrePath) {
    logger.info("rov_server_redirect: setting XDCTOOLS_JAVA_HOME to " + jrePath);
    env.XDCTOOLS_JAVA_HOME = jrePath;
}
function isDependencyInjection(exported) {
    return !("create" in exported);
}
// Do the actual require
logger.info("rov_server_redirect: requiring " + toRequire);
const exported = require(toRequire);
// Optionaly inject dependencies, then re-export the real module factory
let toReExport;
if (isDependencyInjection(exported)) {
    logger.info("rov_server_redirect: injecting dependencies");
    toReExport = exported(Q, logger);
}
else {
    toReExport = exported;
}
module.exports = toReExport;
