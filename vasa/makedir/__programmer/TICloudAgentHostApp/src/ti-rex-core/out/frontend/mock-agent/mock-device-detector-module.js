"use strict";
/// <reference types="agent" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockDeviceDetectorModule = exports.initialDevices = exports.attachedDevices = void 0;
const _ = require("lodash");
const delay_1 = require("../../test/delay");
///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////
exports.attachedDevices = [
    {
        name: 'CC1310 Launchpad',
        id: '1'
    },
    {
        name: 'MSP430F5969'
    },
    {},
    {
        name: 'MSP-EXP432P401R LaunchPad rev 2.0',
        id: '2'
    }
];
exports.initialDevices = exports.attachedDevices.length - 1;
/**
 * Mock TICloudAgent device detection module, but with only the functions we care about
 *
 */
class MockDeviceDetectorModule {
    options;
    detectedCount = exports.initialDevices;
    listeners = {
        attach: [],
        detach: [],
        progress: []
    };
    constructor(options) {
        this.options = options;
        Promise.resolve()
            .then(async () => {
            // If we were tasked to attach/detach, then delay the appropriate amount
            // and then fire the events
            if (this.options.attach) {
                setTimeout(() => {
                    this.detectedCount++;
                    this.fireEvent('attach');
                }, this.options.attach);
            }
            if (this.options.detach) {
                setTimeout(() => {
                    this.detectedCount--;
                    this.fireEvent('detach');
                }, this.options.detach);
            }
        })
            .catch((err) => console.error(err));
    }
    async filesNeeded() {
        if (this.options.errorFilesNeeded) {
            throw new Error('host communication error');
        }
        return !!this.options.filesNeeded;
    }
    addListener(eventName, listener) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].push(listener);
        }
    }
    removeListener(eventName, listener) {
        if (this.listeners[eventName]) {
            _.pull(this.listeners[eventName], listener);
        }
    }
    async detectDebugProbes() {
        if (this.options.errorDetectDebugProbes) {
            throw new Error('host communication error');
        }
        // If we indicated files were needed, then generate fake progress messages
        // before returning the real data
        // Note: this will cause a loop if you try to detect after loading is finished
        // Will trigger loading again
        if (this.options.filesNeeded) {
            for (let i = 0; i < 5; ++i) {
                this.fireEvent('progress', {
                    name: 'Additional files are needed',
                    subActivity: `path/file${i}`,
                    percent: (100 / 5) * i
                });
                await (0, delay_1.delay)(this.options.filesNeeded);
            }
            this.fireEvent('progress', {
                name: 'Additional files are needed',
                subActivity: 'done',
                isComplete: true,
                percent: 100
            });
        }
        // Return fake probes, but based on how many we were tasked to create
        // ie. return more/less after the attach/detach event fires
        return {
            probes: [
                {
                    connectionXml: 'probe0',
                    id: 0
                },
                {
                    connectionXml: 'probe1',
                    id: 1
                },
                {
                    connectionXml: 'probe2',
                    id: 2
                },
                {
                    connectionXml: 'probe3',
                    id: 3
                }
            ].slice(0, this.detectedCount)
        };
    }
    async detectDeviceWithProbe(probe) {
        if (this.options.errorDetectDeviceWithProbe) {
            throw new Error('host communication error');
        }
        return exports.attachedDevices[probe.id];
    }
    fireEvent(eventName, data) {
        if (this.listeners[eventName]) {
            for (const listener of this.listeners[eventName]) {
                listener(data);
            }
        }
    }
}
exports.MockDeviceDetectorModule = MockDeviceDetectorModule;
