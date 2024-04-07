"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnDS = void 0;
const child_process_1 = require("child_process");
const path = require("path");
const Q = require("q");
const config = require("./config");
const logger = require("./logger");
function spawnDS(onClose, args) {
    logger.info("Starting DS!!!!!");
    const deferred = Q.defer();
    const execFile = "./DSLite";
    const workingDirPath = path.resolve(config.loadersRoot + "/ccs_base/DebugServer/bin");
    logger.info("spawnDS : execFile = " + execFile + " cwd = " + workingDirPath);
    logger.info("args = " + args.toString());
    const lp = (0, child_process_1.spawn)(execFile, args, {
        cwd: workingDirPath,
        detached: true,
    });
    function stdoutHandler(data) {
        const dataStr = data.toString();
        logger.info("DS Lite : " + dataStr);
        if (dataStr.indexOf("Error") > -1) {
            logger.info(dataStr);
            deferred.reject({
                message: dataStr,
            });
            return;
        }
        try {
            const dataObj = JSON.parse(dataStr);
            if (dataObj.port) {
                logger.info("Started DS Lite : " + dataStr);
                deferred.resolve(dataObj);
            }
        }
        catch (e) {
            // ignore non json data
        }
    }
    lp.stdout.on("data", stdoutHandler);
    lp.stderr.on("data", (data) => {
        deferred.reject({
            message: data.toString(),
        });
    });
    lp.on("close", () => {
        logger.info("DSLite process : close event");
        onClose();
    });
    lp.on("exit", () => {
        logger.info("DSLite process : exit event");
    });
    lp.on("disconnect", () => {
        logger.info("DSLite process : disconnect event");
    });
    lp.on("error", (err) => {
        logger.info("DSLite process : error event" + err.toString());
        deferred.reject(err);
    });
    return deferred.promise
        .finally(() => {
        // Once the promise is complete, stop listending to stdout
        // This saves us from logging 1000's of ctools logging messages
        lp.stdout.removeListener("data", stdoutHandler);
    });
}
exports.spawnDS = spawnDS;
