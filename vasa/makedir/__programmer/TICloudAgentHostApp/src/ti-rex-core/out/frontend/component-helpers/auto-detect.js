"use strict";
// agent.js namespace
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoDetect = void 0;
// 3rd party
const _ = require("lodash");
// our modules
const promise_utils_1 = require("../../utils/promise-utils");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class AutoDetect {
    initPromise = null;
    detectPromise = null;
    changeListeners = [];
    progressListeners = [];
    addChangeListener(listener) {
        this.changeListeners.push(listener);
    }
    removeChangeListener(listener) {
        _.pull(this.changeListeners, listener);
    }
    addProgressListener(listener) {
        this.progressListeners.push(listener);
    }
    removeProgressListener(listener) {
        _.pull(this.progressListeners, listener);
    }
    detect(agent) {
        if (!this.detectPromise) {
            const doDetect = async () => {
                try {
                    const deviceDetector = await this.getInitPromise(agent);
                    const result = await this.maybeDetectDevices(deviceDetector);
                    return result;
                }
                catch (e) {
                    return this.handleError(e);
                }
            };
            this.detectPromise = doDetect();
        }
        return this.detectPromise;
    }
    _reset() {
        // For test purposes only
        this.detectPromise = null;
        this.initPromise = null;
        this.changeListeners.splice(0, this.changeListeners.length);
        this.progressListeners.splice(0, this.progressListeners.length);
    }
    getInitPromise(agent) {
        if (!this.initPromise) {
            // Assume agent is a singleton, so we don't need to cache against the agent, just use it to fetch the submodule
            this.initPromise = agent
                .getSubModule('DeviceDetector')
                .then(deviceDetector => {
                deviceDetector.addListener('attach', this.handleChange);
                deviceDetector.addListener('detach', this.handleChange);
                deviceDetector.addListener('progress', this.handleProgress);
                return deviceDetector;
            });
        }
        return this.initPromise;
    }
    maybeDetectDevices(deviceDetector) {
        return deviceDetector.filesNeeded().then(filesNeeded => {
            if (filesNeeded) {
                const result = {
                    type: "HOST_FILES_MISSING" /* DetectionResultType.HOST_FILES_MISSING */,
                    handler: () => {
                        this.handleChange(this.detectDevices(deviceDetector).catch(e => this.handleError(e)));
                    }
                };
                return Promise.resolve(result);
            }
            else {
                return this.detectDevices(deviceDetector);
            }
        });
    }
    detectDevices(deviceDetector) {
        return deviceDetector
            .detectDebugProbes()
            .then(debugProbes => (0, promise_utils_1.mapSerially)(debugProbes.probes, probe => deviceDetector.detectDeviceWithProbe(probe)))
            .then(detectedDevices => {
            const result = {
                type: "SUCCESS" /* DetectionResultType.SUCCESS */,
                detectedDevices
            };
            return Promise.resolve(result);
        });
    }
    handleChange = (detectPromise = null) => {
        this.detectPromise = detectPromise;
        for (const listener of this.changeListeners) {
            listener();
        }
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
    handleProgress = (progress) => {
        for (const listener of this.progressListeners) {
            listener(progress);
        }
        // tslint:disable-next-line:semicolon - bug in our version of tslint
    };
    async handleError(e) {
        const result = {
            type: "UNKNOWN_ERROR" /* DetectionResultType.UNKNOWN_ERROR */,
            error: e.message || e
        };
        return Promise.resolve(result);
    }
}
exports.AutoDetect = AutoDetect;
