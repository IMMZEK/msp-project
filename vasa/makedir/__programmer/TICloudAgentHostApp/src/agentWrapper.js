"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupAgents = exports.constructHostAgent = void 0;
const path = require("path");
const WebSocket = require("ws");
const logger = require("./logger");
const moduleAgentFns = new Map();
// Returns an agent.js object for the host agent.
// If this is called from the main thread, connections will be cleaned up as a part of
// the cleanup function passed to the module's creation function.
// IMPORTANT: If this is called from a worker thread, then the worker thread must call
// do the cleanup itself.
async function constructHostAgent({ port, moduleID }) {
    const log = (msg) => { logger.info(`[module ${moduleID}]: ${msg}`); };
    if (!moduleAgentFns.has(moduleID)) {
        const agents = new Map();
        const closeAgents = async () => {
            log(`Closing all agent objects (${agents.size} agents total)`);
            await Promise.all([...agents.keys()].map((agent) => agent.close()));
            agents.clear();
        };
        // tslint:disable-next-line: no-shadowed-variable
        const wrapModule = (agent) => {
            const closeFn = async () => {
                log("An agent is being explicitly closed");
                agents.delete(agent);
                await agent.close();
            };
            const getSubModuleFn = async (subModuleName) => {
                const subModule = await agent.getSubModule(subModuleName);
                if (agents.has(subModule)) {
                    return agents.get(subModule);
                }
                log(`Wrapping new agent object for sub-module '${subModuleName}'`);
                return wrapModule(subModule);
            };
            const handler = {
                get: (target, prop, receiver) => {
                    if (prop === "close") {
                        return closeFn;
                    }
                    else if (prop === "getSubModule") {
                        return getSubModuleFn;
                    }
                    return Reflect.get(target, prop, receiver);
                },
            };
            const proxyAgent = new Proxy(agent, handler);
            agents.set(agent, proxyAgent);
            return proxyAgent;
        };
        moduleAgentFns.set(moduleID, { wrapModule, closeAgents });
    }
    const { wrapModule } = moduleAgentFns.get(moduleID);
    mockWindowForAgentJS();
    require(path.join(__dirname, "agent"));
    // use createClientModule instead of Init().
    // Init() will cache the created module, meaning that all users would share the same object.
    // Cleanup is simpler if we return a new object each time.
    const hostAgent = await global.window.TICloudAgent.createClientModule(port);
    log("Wrapping new agent object for host agent");
    return wrapModule(hostAgent);
}
exports.constructHostAgent = constructHostAgent;
// Clean up any agent objects that were created the module, or by other agent objects
// created by the module
async function cleanupAgents({ moduleID }) {
    const moduleFns = moduleAgentFns.get(moduleID);
    if (moduleFns !== undefined) {
        await moduleFns.closeAgents();
    }
}
exports.cleanupAgents = cleanupAgents;
function mockWindowForAgentJS() {
    function set(obj, propPath, value) {
        const tail = propPath.pop();
        if (tail === undefined) {
            throw new Error("Cannot set with empty path");
        }
        for (const prop of propPath) {
            // Assume that if obj[prop] is defined, it is an object or a function
            obj = obj[prop] || (obj[prop] = {});
        }
        obj[tail] = value;
    }
    // agent.js was written to run in a browser.  To make it work on node, we need to mock out a 
    // few functions.  Some of these are actually used, like "WebSocket", but most are to reject
    // unknown browsers or boot the extension (which it will never use in node)
    set(global, ["window", "addEventListener"], () => { });
    set(global, ["window", "removeEventListener"], () => { });
    set(global, ["window", "dispatchEvent"], () => true);
    set(global, ["window", "document", "createEvent"], () => ({ initCustomEvent: () => { } }));
    set(global, ["window", "location", "protocol"], "http");
    set(global, ["window", "location", "hostname"], "localhost");
    set(global, ["navigator", "userAgent"], "other");
    set(global, ["WebSocket"], WebSocket);
    set(global, ["window", "parent"], global.window);
}
