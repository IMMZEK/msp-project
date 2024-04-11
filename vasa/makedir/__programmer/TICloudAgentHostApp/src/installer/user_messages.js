"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installationFailed = exports.waitingForPackage = exports.unknownError = exports.remoteServerError = exports.installingWinDriver = exports.endInstallation = exports.downloadError = exports.beginInstallation = void 0;
const path = require("path");
const util_1 = require("util");
const util = require("../../util/util");
const beginInstallationMsg = "Additional files need to be installed to support selected configuration. Starting Install Process.\n";
const downloadErrorMsg = "Download and install of %s failed: %s\n";
const endInstallationMsg = "Installation completed.\n";
const installingWinDriverMsg = "Installing Windows driver (please accept the UAC dialog): %s.\n";
const proxyFilePath = path.resolve(path.join(__dirname, "..", "..", "util", "proxy.js"));
let errorRemoteServerMsg = "An error occurred while retrieving information from the remote server. " +
    "The most likely cause of this is incorrect proxy settings.\n";
if (util.isLinux) {
    errorRemoteServerMsg += "Please ensure that the http_proxy env variable is set correctly or\n";
}
errorRemoteServerMsg += "To manually override the proxy settings see : " + proxyFilePath + "\n";
errorRemoteServerMsg += "The Cloud IDE page needs to be refreshed for the changes to take effect\n";
const unknownErrorMsg = "An unknown error occurred : %s.\n";
const waitingForPackageMsg = "Installation still in progress for package: %s.\n";
const installationFailedMsg = "Installation failed : %s.\n";
function beginInstallation() {
    return (0, util_1.format)(beginInstallationMsg);
}
exports.beginInstallation = beginInstallation;
function downloadError(target, err) {
    return (0, util_1.format)(downloadErrorMsg, target, err);
}
exports.downloadError = downloadError;
function endInstallation() {
    return (0, util_1.format)(endInstallationMsg);
}
exports.endInstallation = endInstallation;
function installingWinDriver(component) {
    return (0, util_1.format)(installingWinDriverMsg, component);
}
exports.installingWinDriver = installingWinDriver;
function remoteServerError() {
    return (0, util_1.format)(errorRemoteServerMsg);
}
exports.remoteServerError = remoteServerError;
function unknownError(err) {
    return (0, util_1.format)(unknownErrorMsg, err);
}
exports.unknownError = unknownError;
function waitingForPackage(component) {
    return (0, util_1.format)(waitingForPackageMsg, component);
}
exports.waitingForPackage = waitingForPackage;
function installationFailed(err) {
    return (0, util_1.format)(installationFailedMsg, err);
}
exports.installationFailed = installationFailed;
