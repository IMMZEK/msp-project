"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModule = void 0;
const agentWrapper_1 = require("./agentWrapper");
const event_broker_1 = require("./event_broker");
const logger = require("./logger");
const sockets = require("./sockets");
const path = require("path");
const proxyFinder = require("../util/find_proxy");
function isModuleFactory(module) {
    return "instance" in module;
}
function getModuleCommands(cmds) {
    function deepCmds(_cmds) {
        return _cmds && _cmds !== Object.prototype &&
            Object.getOwnPropertyNames(_cmds).concat(deepCmds(Object.getPrototypeOf(_cmds)) || []);
    }
    return deepCmds(cmds) // fetch all properties
        .filter((name) => typeof cmds[name] === "function") // filter out only functions
        .filter((name) => name !== "constructor" && (name.indexOf("__") !== 0)); // filter out non-user functions
}
async function adaptModuleFactory(moduleFactory, cleanupSubModule, createSiblingModule, getHostAgentSetupArgs, getProxy) {
    const wsModule = await createModule(moduleFactory.name, cleanupSubModule);
    const module = moduleFactory.instance(wsModule.triggerEvent, createSiblingModule, logger, (0, event_broker_1.instance)(), getHostAgentSetupArgs, getProxy);
    getModuleCommands(module.commands).forEach((command) => {
        if ("_" !== command[0] && "onClose" !== command) {
            wsModule.commands[command] = (...data) => module.commands[command].apply(module.commands, data);
        }
    });
    wsModule.subModules = module.subModules;
    if (module.commands.onClose) {
        wsModule.onClose = () => module.commands.onClose();
    }
    return {
        port: wsModule.getPort(),
    };
}
let moduleUniqueID = 1;
async function createModule(name, onClose) {
    let port = null;
    const createdSubModules = {};
    function log(msg) {
        logger.info("Module( " + name + " )->" + msg.substring(0, 1024));
    }
    // There are two definitions of WebSocket, so marking "ws" as "WebSocket"
    // leads to weird errors.  Instead, just say we need something with a send
    // function
    function createResponseHandler(type, msgData, ws) {
        return (data) => {
            if (data instanceof Error) {
                data = { message: data.message, stack: data.stack };
            }
            const obj = { data };
            obj[type] = msgData.id;
            const toSend = JSON.stringify(obj);
            log("[ResponseHandler]" + toSend);
            try {
                ws.send(toSend);
            }
            catch (e) {
                log("Failed to send: " + e);
            }
        };
    }
    const moduleObj = {
        commands: {
            listSubModules: function listSubModules() {
                const subModules = moduleObj.subModules;
                const subModuleNames = [];
                for (const subModule in subModules) {
                    if (subModules.hasOwnProperty(subModule)) {
                        subModuleNames.push(subModule);
                    }
                }
                const retObj = {
                    subModules: subModuleNames,
                };
                return Promise.resolve(retObj);
            },
            createSubModule: function createSubModule(subModuleName) {
                // Check if we already have created this module
                if (createdSubModules[subModuleName]) {
                    log("Returning cached value");
                    return createdSubModules[subModuleName];
                }
                // This sub module has not been created yet
                const moduleID = moduleUniqueID++;
                log(`Creating new module (module id: ${moduleID}`);
                if (!(subModuleName in moduleObj.subModules)) {
                    throw new Error("Unknown module: " + subModuleName);
                }
                const moduleFactory = moduleObj.subModules[subModuleName];
                createdSubModules[subModuleName] = (isModuleFactory(moduleFactory)) ?
                    adaptModuleFactory(moduleFactory, cleanupSubModule, createSiblingModule, getHostAgentSetupArgs, getProxy) :
                    moduleFactory.create(cleanupSubModule, createSiblingModule, getHostAgentSetupArgs, getProxy);
                // Uncache if it fails so that subsequent attemps retry
                createdSubModules[subModuleName].catch(cleanupSubModule);
                return createdSubModules[subModuleName];
                function cleanupSubModule() {
                    (0, agentWrapper_1.cleanupAgents)({ moduleID });
                    delete createdSubModules[subModuleName];
                }
                function createSiblingModule(moduleName) {
                    return createSubModule.call(moduleObj, moduleName);
                }
                function getHostAgentSetupArgs() {
                    return { port, moduleID, cloudAgentDir: path.resolve(__dirname) };
                }
                function getProxy(url) {
                    return new Promise((resolve) => {
                        proxyFinder.get((proxy) => {
                            // append http if needed
                            if (proxy !== "" && proxy.indexOf("http") < 0) {
                                proxy = "http://" + proxy;
                            }
                            resolve(proxy);
                        }, url);
                    });
                }
            },
            listCommands: function listCommands() {
                const commands = moduleObj.commands;
                const commandNames = [];
                for (const command in commands) {
                    if (commands.hasOwnProperty(command)) {
                        commandNames.push(command);
                    }
                }
                const retObj = {
                    commands: commandNames,
                };
                return Promise.resolve(retObj);
            },
        },
        subModules: {},
        triggerEvent: function triggerEvent(eventName, eventData) {
            const obj = {
                event: eventName,
                data: eventData,
            };
            const toSend = JSON.stringify(obj);
            log("[triggerEvent]" + toSend);
            wss.clients.forEach((client) => {
                client.send(toSend);
            });
        },
        getPort: function getPort() {
            return port;
        },
    };
    // init sets up the web socket communication and sets up support for RPC calls
    // init must be resolved before any other function
    const { wss, server } = await sockets.createWSServer();
    let isConnected = false;
    // GC-1456: If user refresh too quickly server will be created but no ws is connected.
    // put a listener if no ws is connected after 3s shutdown the server.
    const socketTimeout = setTimeout(() => {
        if (!isConnected) {
            server.close();
        }
    }, 60000);
    server.on("close", () => {
        log("server: on close");
    });
    server.on("error", () => {
        log("server: error");
        server.close();
    });
    log("Web socket server started!");
    // handle opening a websocket connection
    wss.on("connection", (ws) => {
        log("[wss.onConnection]");
        isConnected = true;
        clearTimeout(socketTimeout);
        ws.on("message", async (message) => {
            log("[ws.onMessage]" + message);
            // const msgData = ( message instanceof String) ? JSON.parse(message) : message;
            const msgData = (typeof message === "string") ? JSON.parse(message) : message;
            const command = moduleObj.commands[msgData.command];
            const errorHandler = createResponseHandler("error", msgData, ws);
            if (command) {
                const responseHandler = createResponseHandler("response", msgData, ws);
                try {
                    const result = await command.apply(moduleObj, msgData.data);
                    responseHandler(result);
                }
                catch (err) {
                    errorHandler(err);
                }
            }
            else {
                const msg = "Command not defined : " + command;
                errorHandler({
                    message: msg,
                });
            }
        });
        ws.on("close", () => {
            log("Socket closed, wss.clients.size = " + wss.clients.size);
            if (wss.clients.size === 0) {
                try {
                    if (moduleObj.onClose) {
                        moduleObj.onClose();
                    }
                    // Look for (and call) legacy non-camelCase version
                    // Used by ROV only
                    if (moduleObj.onclose) {
                        moduleObj.onclose();
                    }
                    if (onClose) {
                        onClose();
                    }
                }
                catch (err) {
                    log("Error during socket close callback: " + (err.stack ? err.stack : err.toString()));
                }
                server.close();
            }
        });
    });
    wss.on("close", () => {
        log("Web socket server closed. Exiting Module");
        server.close();
    });
    // set the port
    port = server.address().port;
    return moduleObj;
}
exports.createModule = createModule;
