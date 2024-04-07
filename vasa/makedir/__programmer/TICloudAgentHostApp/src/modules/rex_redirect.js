let rexModule;
try {
    // In CCS, tirex4 will be in this relative location
    rexModule = require("../../../../tirex4/ti-rex-core/cloud-agent-module");
}
catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
        // Fallback to rexModule included in cloudagent (we need this in the cloud)
        rexModule = require("../ti-rex-core/cloud-agent-module-cloud");
    }
    else {
        throw e;
    }
}
module.exports = rexModule;
