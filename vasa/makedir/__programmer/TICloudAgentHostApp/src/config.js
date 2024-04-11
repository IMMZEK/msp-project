"use strict";
const fs = require("fs");
const path = require("path");
const configFilePath = path.join(__dirname, "..", "config.json"); // it should be one level above us
const configFile = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
if (path.resolve(configFile.userDataRoot) !== configFile.userDataRoot) {
    // if it is not an absolute path; we are doing an relocatable offline install so we turn it into a absolute path
    configFile.userDataRoot = path.resolve(path.join(__dirname, configFile.userDataRoot));
}
if (!configFile.loadersRoot) {
    // default location
    configFile.loadersRoot = path.join(configFile.userDataRoot, "loaders");
}
else {
    // if not absolute path
    if (path.resolve(configFile.loadersRoot) !== configFile.loadersRoot) {
        configFile.loadersRoot = path.resolve(path.join(__dirname, configFile.loadersRoot));
    }
}
module.exports = configFile;
