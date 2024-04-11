"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// All paths are calculated relative to root directory of local.js
process.chdir(__dirname);
const logger = require("./logger");
const agent = require("./host_agent");
logger.info("main: Staring directory = " + process.cwd());
agent.start()
    .then((initParams) => {
    process.stdout.write(JSON.stringify(initParams) + "\n");
})
    .catch((err) => {
    // We should have used stderr, but the extensions/plugins 
    // are looking for stdout now...
    process.stdout.write("Failed to start agent : " + err + "\n");
});
