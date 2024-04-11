"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = exports.CloudInstaller = void 0;
const installer_1 = require("../installer/installer");
const config = require("../config");
const progress_1 = require("../progress");
// Real version that wraps the Installer
// Basically it re-exposes only some functions, and it adapts progress
class CloudInstaller {
    constructor(_triggerEvent) {
        this._triggerEvent = _triggerEvent;
        this.realInstaller = new installer_1.Installer(config.cloudAgentInstallerServerURL, {});
    }
    add(ccxmlFilePath) {
        const progress = new progress_1.ProgressGenerator("Installing target support (first time only)...", this._triggerEvent);
        return this.realInstaller.installFilesForCcxml(ccxmlFilePath)
            .progress((progressData) => {
            progress.generateEvent(progressData);
        });
    }
    addByCategory(categories) {
        const progress = new progress_1.ProgressGenerator("Installing host support files (first time only)...", this._triggerEvent);
        return this.realInstaller.installFilesForCategories(categories)
            .progress((progressData) => {
            progress.generateEvent(progressData);
        });
    }
    purge() {
        return this.realInstaller.purge();
    }
}
exports.CloudInstaller = CloudInstaller;
exports.name = "TargetSupport";
function instance(triggerEvent) {
    return {
        commands: new CloudInstaller(triggerEvent),
    };
}
exports.instance = instance;
