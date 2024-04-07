"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instance = exports.name = exports.EventBrokerModule = void 0;
const event_broker_1 = require("../event_broker");
class EventBrokerModule {
    constructor(triggerEvent) {
        this._impl = (0, event_broker_1.instance)();
        this._handleEvent = (eventName, data) => {
            triggerEvent(eventName, { data });
        };
        this._impl.addListener(this._handleEvent);
    }
    async fireEvent(eventName, data) {
        this._impl.fireEvent(eventName, data);
    }
    async registerData(dataName, data) {
        this._impl.registerData(dataName, data);
    }
    async fetchData(dataName) {
        if (this._impl.hasData(dataName)) {
            return { data: this._impl.fetchData(dataName) };
        }
        // Return this as an explicit rejection with no stack to maintain original interface
        return Promise.reject("No data is registered under " + dataName);
    }
    onClose() {
        this._impl.removeListener(this._handleEvent);
    }
}
exports.EventBrokerModule = EventBrokerModule;
exports.name = "EventBroker";
function instance(triggerEvent) {
    return {
        commands: new EventBrokerModule(triggerEvent),
    };
}
exports.instance = instance;
