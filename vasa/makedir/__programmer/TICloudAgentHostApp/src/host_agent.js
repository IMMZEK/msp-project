"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const VERSION = "4.14";
const BUILD_VERSION = "4688";
const fs = require("fs");
const path = require("path");
const Q = require("q");
const config = require("./config");
const logger = require("./logger");
const module_1 = require("./module");
function isDependencyInjection(exported) {
    return !("create" in exported) && !("instance" in exported);
}
function start() {
    logger.info("Starting Agent!");
    return (0, module_1.createModule)("Agent")
        .then((agent) => {
        // load submodules from default location
        const moduleJSFiles = fs.readdirSync(path.join(__dirname, "modules"));
        for (const moduleJSFile of moduleJSFiles) {
            // define submodules
            try {
                if (".js" === moduleJSFile.slice(-3)) {
                    const subModuleDef = require("./modules/" + moduleJSFile);
                    logger.info("Discovered Module : " + subModuleDef.name);
                    agent.subModules[subModuleDef.name] = subModuleDef;
                }
            }
            catch (err) {
                logger.info("Failed to load module : " + moduleJSFile + " : " + err.stack);
            }
        }
        agent.commands.addConfigProperty = (name, value) => {
            config[name] = value;
            logger.info("Setting property " + name + " : " + value);
            return Q();
        };
        agent.commands.registerModuleWebSocket = (moduleName, modulePort) => {
            agent.subModules[moduleName] = {
                name: moduleName,
                create: () => {
                    return Q({
                        port: modulePort,
                    });
                },
            };
            return Q();
        };
        agent.commands.registerModuleByPath = (moduleRelativePath, args) => {
            // Restrict the module to something that is downloaded
            const modulePath = path.normalize(path.join(config.loadersRoot, moduleRelativePath));
            if (!modulePath.startsWith(config.loadersRoot)) {
                throw new Error("Cannot load modules outside download root");
            }
            // Require the module specified
            const exported = require(modulePath);
            // Optionaly inject dependencies, then re-export the real module factory
            let subModuleDef;
            if (isDependencyInjection(exported)) {
                logger.info("injecting dependencies");
                subModuleDef = exported(Q, logger, args);
            }
            else {
                subModuleDef = exported;
            }
            // Register the module
            logger.info("Discovered Module : " + subModuleDef.name);
            agent.subModules[subModuleDef.name] = subModuleDef;
            return Q();
        };
        return agent.getPort();
    })
        .then((port) => {
        logger.info("Agent main module running on port " + port);
        return {
            port,
            version: VERSION,
            buildVersion: BUILD_VERSION,
        };
    });
}
exports.start = start;
