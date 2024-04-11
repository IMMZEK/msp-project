"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = void 0;
// our modules
const entry_module_inner_cloud_1 = require("./entry-module-inner-cloud");
const interface_1 = require("./interface");
// Export name and an instance function
// This is what cloud agent explicitly looks for to instantiate us
exports.name = interface_1.rexCloudAgentModuleName;
function instance(triggerEvent, _createSiblingModule, logger, eventBroker, _getHostAgentSetupArgs, getProxy) {
    return {
        commands: new entry_module_inner_cloud_1.EntryModuleCloud(triggerEvent, logger, eventBroker, getProxy)
    };
}
exports.instance = instance;
