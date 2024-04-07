"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = void 0;
class EventBroker {
    constructor() {
        this.registeredData = {};
        this.listeners = [];
    }
    addListener(listener) {
        this.listeners.push(listener);
    }
    removeListener(listener) {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }
    fireEvent(eventName, data) {
        for (const listener of this.listeners) {
            listener(eventName, data);
        }
    }
    registerData(dataName, data) {
        this.registeredData[dataName] = data;
    }
    fetchData(dataName) {
        if (dataName in this.registeredData) {
            return this.registeredData[dataName];
        }
        throw new Error("No data is registered under " + dataName);
    }
    hasData(dataName) {
        return dataName in this.registeredData;
    }
}
const theInstance = new EventBroker();
function instance() {
    return theInstance;
}
exports.instance = instance;
