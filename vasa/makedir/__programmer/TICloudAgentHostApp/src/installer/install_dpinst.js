"use strict";
// handle installing zip packages that are windows drivers and require use of dpinst
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverInstaller = void 0;
const path = require("path");
const child_process_1 = require("child_process");
const fs = require("fs");
const net = require("net");
const Q = require("q");
const logger = require("../logger");
const config = require("../config");
const dpInstExec = "dpinst_64_eng.exe";
const dpInstExecFullPath = path.resolve(path.join(__dirname, "..", "..", "drivers", dpInstExec));
const batchInstallerExecFullPath = path.resolve(config.loadersRoot + "/ccs_base/DebugServer/bin/BatchDriverInstaller.exe");
const elevateCmdPath = path.resolve(path.join(__dirname, "..", "..", "drivers", "elevate", "elevate.cmd"));
class DriverInstaller {
    constructor(options) {
        if (!options) {
            options = {};
        }
        this.isQuiet = options.quiet === false ? false : true; // default to true unless explicit false.
        this.isOffline = options.offline ? true : false;
        logger.info("DriverInstaller options: " + JSON.stringify(options));
    }
    install(driversToInstall) {
        if (this.isOffline) {
            return this.installOffline(driversToInstall);
        }
        else {
            if (driversToInstall.length) {
                if (this.isQuiet && fs.existsSync(batchInstallerExecFullPath)) {
                    return this.batchInstallDrivers(driversToInstall);
                }
                else {
                    return driversToInstall.reduce((promise, driver) => {
                        return promise.then(() => this.installNow(driver));
                    }, Q());
                }
            }
        }
        return Q();
    }
    // in offline mode we just copy over the driver files and generate a script to be run
    // later to install the drivers
    installOffline(driversToInstall) {
        let script = "@echo OFF\n";
        // create install scripts for 64 bit drivers.
        driversToInstall.forEach((driver) => {
            script += "dpinst_64_eng.exe /SW /SA /path %~dp0/" + driver + "\n";
            script += 'SET hex=%=exitcode%"\n';
            script += "SET result=%hex:~0,1%\n";
            script += "if %result% geq 8 exit 1\n";
        });
        fs.writeFileSync(path.join(config.loadersRoot, "install_drivers.bat"), script);
        return Q();
    }
    batchInstallDrivers(driversToInstall) {
        const deferred = Q.defer();
        let cmdStr = '"' + elevateCmdPath + '" ' + batchInstallerExecFullPath;
        driversToInstall.forEach((driver) => {
            const curArg = dpInstExecFullPath + " /sw /path " + path.join(config.loadersRoot, driver);
            cmdStr += " \"" + curArg + "\"";
        });
        logger.info("Running batchInstallDrivers cmdStr: " + cmdStr);
        (0, child_process_1.exec)(cmdStr);
        const PIPE_NAME = "TIBatchDriverInstallerPipe";
        const PIPE_PATH = "\\\\.\\pipe\\" + PIPE_NAME;
        const server = net.createServer((stream) => {
            logger.info("TIBatchDriverInstallerPipe: on connection");
            stream.on("data", (c) => {
                logger.info("TIBatchDriverInstallerPipe: on data:" + c.toString());
            });
            stream.on("end", () => {
                logger.info("TIBatchDriverInstallerPipe: on end");
                server.close();
            });
            stream.on("error", () => {
                logger.info("TIBatchDriverInstallerPipe: on error");
                server.close();
            });
        });
        server.on("close", () => {
            logger.info("TIBatchDriverInstallerPipe: on close");
            deferred.resolve();
        });
        server.on("error", () => {
            logger.info("TIBatchDriverInstallerPipe: error");
            server.close();
        });
        server.listen(PIPE_PATH, () => {
            logger.info("TIBatchDriverInstallerPipe: on listening");
            // Don't keep the server alive if we never get a connection to the pipe
            // This can happen if the UAC dialog is not accepted
            server.unref();
        });
        return deferred.promise;
    }
    installNow(driverToInstall) {
        const deferred = Q.defer();
        let cmd = dpInstExecFullPath + " /path \"" + path.join(config.loadersRoot, driverToInstall) + "\"";
        if (this.isQuiet) {
            cmd += " /c /SW /SA";
        }
        logger.info("Running command : " + cmd);
        (0, child_process_1.exec)(cmd, (err, stdout, stderr) => {
            // Running this exec command  returns an error code
            // unless we are running tests; in which case dp inst is repalced with an echo command
            // we have account for +that below by ignoring any exceptions from trying to parse the code
            const codeNum = err ? err.code ? parseInt(err.code, 10).toString(16) : "0" : "0";
            logger.info("RetCode = " + codeNum);
            if (stdout) {
                logger.info("stdout = " + stdout.toString());
            }
            if (stderr) {
                logger.info("stderr = " + stderr.toString());
            }
            // when running in quiet mode; we ignore all error codes because depending on if you are running as admin or not
            // a UAC dialog pops up and the code return corresponds to if the user accepted that or not.. otherwise the code
            // corresponds to the result of the DPInst command.
            // we run quiet mode.. as Admin in the main installer
            // we run non quiet mode.. when the IDE needs additional components installed.
            // don't check return codes for now. assume successful () : bug ( 11198 )
            logger.info("DPInst Run Successfully Ret Code: 0x" + codeNum);
            deferred.resolve();
        });
        return deferred.promise;
    }
}
exports.DriverInstaller = DriverInstaller;
