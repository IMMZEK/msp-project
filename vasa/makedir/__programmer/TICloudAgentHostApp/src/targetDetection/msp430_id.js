"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDevice = exports.mspAutoDetectionResultTypeRequireUpdate = exports.mspAutoDetectionResultTypeError = exports.mspAutoDetectionResultTypeResults = void 0;
const child_process_1 = require("child_process");
const path = require("path");
const Q = require("q");
const config = require("../config");
const logger = require("../logger");
exports.mspAutoDetectionResultTypeResults = "results";
exports.mspAutoDetectionResultTypeError = "error";
exports.mspAutoDetectionResultTypeRequireUpdate = "require-update";
function spawnMSPAutoDetector(probeIdx, forceUpdate, onClose) {
    logger.info("Starting MSPAutoDetector...");
    const deferred = Q.defer();
    const execFile = "./MSPAutoDetector";
    const workingDirPath = path.resolve(config.loadersRoot + "/ccs_base/common/bin");
    logger.info("spawnMSPAutoDetector : execFile = " + execFile + " cwd = " + workingDirPath);
    const args = (typeof (probeIdx) === "undefined") ? ["*"] : [probeIdx.toString()];
    if (forceUpdate) {
        args.push("1");
    }
    const lp = (0, child_process_1.spawn)(execFile, args, {
        cwd: workingDirPath,
        detached: true,
    });
    function stdoutHandler(data) {
        const dataStr = data.toString();
        logger.info("MSPAutoDetector : " + dataStr);
        try {
            const dataObj = JSON.parse(dataStr);
            if (dataObj && dataObj.data) {
                deferred.resolve(dataObj.data);
            }
        }
        catch (e) {
            // ignore non json data
            logger.info("Error MSPAutoDetector : " + JSON.stringify(e));
        }
    }
    lp.stdout.on("data", stdoutHandler);
    lp.stderr.on("data", (data) => {
        deferred.reject({
            message: data.toString(),
        });
    });
    lp.on("close", () => {
        logger.info("MSPAutoDetector process : close event");
        if (onClose) {
            onClose();
        }
    });
    lp.on("exit", () => {
        logger.info("MSPAutoDetector process : exit event");
    });
    lp.on("disconnect", () => {
        logger.info("MSPAutoDetector process : disconnect event");
    });
    lp.on("error", (err) => {
        logger.info("MSPAutoDetector process : error event" + err.toString());
        deferred.reject(err);
    });
    return deferred.promise;
}
function detectDevice(device, options) {
    logger.info("detectMSPDevices device= " + JSON.stringify(device));
    const probe = device.probeObj;
    const idx = probe.connectionXml.charAt(probe.connectionXml.length - 1);
    const probeIdx = (idx !== "B") ? parseInt(idx, 10) - 1 : 0; // "TIMSP430-USB" vs "TIMSP430-USB2" etc
    logger.info("detectMSPDevices probeIdx=" + probeIdx);
    const isForceUpdate = options ? options.forceUpdate : undefined;
    return spawnMSPAutoDetector(probeIdx, isForceUpdate)
        .then((results) => {
        const result = results[0];
        if (!result) {
            throw new Error("detectMSPDevices(): Failed to detect device.");
        }
        logger.info("detectMSPDevices result " + JSON.stringify(result));
        if (result.type !== exports.mspAutoDetectionResultTypeResults) {
            // TODO: handle other cases esp error case, since sometimes it fails.
            if (result.type === exports.mspAutoDetectionResultTypeError || result.type === exports.mspAutoDetectionResultTypeRequireUpdate) {
                throw new Error(JSON.stringify(result));
            }
        }
        const lpId = (result.lp === "") ? undefined : result.lp;
        return { name: result.device, id: lpId, family: "MSP430" };
    });
}
exports.detectDevice = detectDevice;
