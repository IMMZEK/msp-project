"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Q = require("q");
const util = require("../../util/util");
const device_detector_1 = require("../modules/device_detector");
const installer_1 = require("./installer");
const config = require("../config");
// a host id is passed as a part of the installer name when doing a command line install
// that Id could than be used to look up an actual host
const knownHosts = {
    host1: "ccs.ti.com",
    host2: "dev.ti.com",
    host3: "tgdccscloud.toro.design.ti.com",
};
function createOptions(cmdArgs) {
    // what is the expected type of paramaters; other wise assume string
    const processedOptions = {};
    let lastOption = null;
    for (const value of cmdArgs) {
        if (value.indexOf("--") === 0) {
            lastOption = value.replace("--", "");
        }
        else {
            if (lastOption !== null) {
                if ("offline" === lastOption ||
                    "quiet" === lastOption ||
                    "clean" === lastOption) {
                    processedOptions[lastOption] = Boolean(value);
                }
                else if ("categories" === lastOption) {
                    processedOptions.categories = processedOptions.categories || [];
                    processedOptions.categories.push(value);
                    break; // don't set lastOption back to null - keep processing
                }
                else if ("winDrivers" === lastOption) {
                    throw new Error(("WinDrivers isn't supposed to be specified on the command line"));
                }
                else {
                    processedOptions[lastOption] = value;
                }
            }
            lastOption = null; // go on to the next option
        }
    }
    // If run fron the installer under windows, we need to try to install all kernel drivers
    // now to avoid UAC pop ups later
    if (processedOptions.installer && util.isWin) {
        // The name encodes the host and (sometimes) the connection id.  We
        // can't do anything without at least the host
        const parts = processedOptions.installer.replace(".exe", "").split("__");
        delete processedOptions.installer;
        if (parts.length >= 2) {
            // only the first character is the host key (ie; host1, host2, host3)
            const knownHostKey = "host" + parts[1].charAt(0);
            processedOptions.host = knownHosts[knownHostKey] ? knownHosts[knownHostKey] : parts[1];
            processedOptions.host = "http://" + processedOptions.host;
            // Now that we have a host to download from, determine what debug
            // probes are attached
            const deviceDetector = new device_detector_1.DeviceDetector(() => { });
            processedOptions.winDrivers = deviceDetector._getCategoriesOfAttachedDevices();
            deviceDetector.onClose();
            // And, also download the connection id that the user intends to use
            if (parts.length === 3) {
                processedOptions.winDrivers = processedOptions.winDrivers.concat(parts[2]);
            }
        }
    }
    return processedOptions;
}
const options = createOptions(process.argv);
if (options.generateDesktopInstall) {
    config.loadersRoot = options.generateDesktopInstall;
}
let installer;
try {
    installer = new installer_1.Installer(options.host + "/ticloudagent", options);
}
catch (err) {
    process.stdout.write(err.toString() + "\n");
    process.exit(1);
}
// have to do some manually clean up
// the logger keeps the event loop up,
// so the errors don't propagate to the env
// we have to manually  process.exit
function exitProcess(errCode) {
    // HACK: can't flush std, the correct approach is to not have
    // to process exit, but let node automatically exit when the event
    // loop becomes empty, but because of the logger issue we can't do that
    return Q.delay(5000)
        .then(() => {
        process.exit(errCode);
    });
}
function fail(e) {
    process.stderr.write("Operation failed: ");
    if (e.stack) {
        process.stderr.write(e.stack + "\n");
    }
    else if (e.message) {
        process.stderr.write(e.message + "\n");
    }
    else {
        process.stderr.write(e.toString() + "\n");
    }
    exitProcess(1);
}
function finished() {
    process.stdout.write("Finished\n");
    exitProcess(0);
}
function progress(msgObj) {
    process.stdout.write(msgObj.message + "\n");
}
if (options.clean) {
    process.stdout.write("Purging Target Support DB\n");
    installer.purge()
        .progress(progress)
        .then(finished)
        .fail(fail)
        .done();
}
else if (options.winDrivers && options.winDrivers.length) {
    process.stdout.write("Installing windows drivers for [" + options.winDrivers.join(", ") + "]\n");
    installer.installFilesForCategories(options.winDrivers)
        .progress(progress)
        .then(finished)
        .fail(fail)
        .done();
}
else if (options.categories) {
    process.stdout.write("Installing files for " + options.categories.join(", ") + "\n");
    installer.installFilesForCategories(options.categories, options.os)
        .progress(progress)
        .then(finished)
        .fail(fail)
        .done();
}
else if (options.target) {
    process.stdout.write("Installing support for " + options.target + "\n");
    installer.installFilesForCcxml(options.target, options.os)
        .progress(progress)
        .then(finished)
        .fail(fail)
        .done();
}
else if (options.generateDesktopInstall) {
    const categoriesDesc = options.categories ? "the categories " + options.categories.join(",") : "all categories";
    const requestedVersion = undefined === options.version ? "LATEST" : new Date(options.version).toISOString();
    process.stdout.write("Purging existing files\n");
    installer.purge()
        .then(() => {
        process.stdout.write("Finding version closest to " + requestedVersion + "\n");
        return installer.fetchClosestVersion(requestedVersion);
    })
        .then((closestVersion) => {
        process.stdout.write("Generating desktop install with " + categoriesDesc + " for version " + closestVersion + "\n");
        if (options.os) {
            process.stdout.write("Overriding OS to be " + options.os + "\n");
        }
        return installer.generateDesktopInstall(options.categories, options.version, options.os)
            .progress(progress);
    })
        .then(finished)
        .fail(fail)
        .done();
}
else {
    process.stdout.write("No valid command line parameter passed\n");
}
