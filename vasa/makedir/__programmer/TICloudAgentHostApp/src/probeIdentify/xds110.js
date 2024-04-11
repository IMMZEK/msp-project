"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identify = void 0;
const Q = require("q");
const fs = require("fs");
const path = require("path");
const logger = require("../logger");
const spawnDS_1 = require("../spawnDS");
const configFile = require("../config");
const installer_1 = require("../installer/installer");
const progress_1 = require("../progress");
function identify(probe, triggerEvent, dsliteLogPath) {
    const deferred = Q.defer();
    const ccxmlPlaceholderPath = path.join(__dirname, "blinkLEDplaceholder.ccxml");
    const ccxmlPath = path.join(__dirname, "blinkLED.ccxml");
    const serialNumber = probe.serialNumber;
    if (!serialNumber) {
        deferred.reject(new Error("Invalid serial number"));
    }
    else {
        let ccxml = fs.readFileSync(ccxmlPlaceholderPath, "utf-8");
        ccxml = ccxml.replace("REPLACE_SERIAL_NUMBER", serialNumber);
        fs.writeFileSync(ccxmlPath, ccxml, "utf-8");
        const args = [
            "identifyProbe",
            `--config=${ccxmlPath}`,
            "--conId=0",
        ];
        // Extra logging to file for testing purposes
        if (dsliteLogPath) {
            args.push(`--log=${dsliteLogPath}`);
        }
        if (!configFile.desktopMode) {
            const realInstaller = new installer_1.Installer(configFile.cloudAgentInstallerServerURL, {});
            const progress = new progress_1.ProgressGenerator("Installing xds110 probe identify files...", triggerEvent);
            realInstaller
                .installFilesForCcxml(ccxmlPath)
                .progress((progressData) => progress.generateEvent(progressData))
                .then(() => (0, spawnDS_1.spawnDS)(() => deferred.resolve(), args))
                .catch((e) => deferred.reject(e));
        }
        else {
            (0, spawnDS_1.spawnDS)(() => deferred.resolve(), args)
                .catch((e) => deferred.reject(e));
        }
    }
    return deferred.promise
        .finally(() => {
        if (fs.existsSync(ccxmlPath)) {
            logger.info("Temp ccxml deleted");
            fs.unlinkSync(ccxmlPath);
        }
    });
}
exports.identify = identify;
