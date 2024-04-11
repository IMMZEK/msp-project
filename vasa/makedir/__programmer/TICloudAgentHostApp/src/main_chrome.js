"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// All paths are calculated relative to root directory of local.js
process.chdir(__dirname);
const logger = require("./logger");
const agent = require("./host_agent");
logger.info("main_chrome: Staring directory = " + process.cwd());
agent.start()
    .then((initParams) => {
    const message = initParams;
    const len = Buffer.alloc(4);
    const buf = Buffer.from(JSON.stringify(message));
    len.writeUInt32LE(buf.length, 0);
    logger.info("len=");
    logger.info(len);
    logger.info("buf=");
    logger.info(buf);
    process.stdout.write(len.toString());
    process.stdout.write(buf.toString());
});
