"use strict";
var getFile = require("./get_file");
function getConfigInfo(params, res, sendUncompressed) {
    getFile(params, "target_setup.json", "LATEST", res, sendUncompressed);
}
module.exports = getConfigInfo;
