"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalServerConfig = exports.createMockCommonParams = void 0;
// native modules
const path = require("path");
const PQueue = require("p-queue");
const fs = require("fs-extra");
const scriptsUtil = require("../scripts-lib/util");
const vars_1 = require("../lib/vars");
const database_utils_1 = require("../test/integration-tests/database-utils");
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const test_helpers_2 = require("../handoff/test-helpers");
const util_1 = require("../test/util");
const create_mock_logger_1 = require("../test/create-mock-logger");
async function createMockCommonParams({ metadata, triggerEventSpy }) {
    const config = getLocalServerConfig();
    const triggerEvent = triggerEventSpy || (() => { });
    const rex3DbPath = metadata ? await (0, database_utils_1.writeMetadata)(metadata) : (0, test_helpers_1.getUniqueFolderName)();
    const contentPath = (0, test_helpers_1.getUniqueFolderName)();
    if (metadata) {
        const packagesJson = metadata.packages.map((pkg) => {
            const { name, id, version } = pkg.packageOverview;
            if (!id || !version) {
                throw new Error('Missing id or version');
            }
            const info = { name, id, version, type: 'software' };
            return info;
        });
        const packages = packagesJson.map(() => path.join(contentPath, (0, test_helpers_1.getUniqueFileName)()));
        await (0, test_helpers_2.createPackages)({ packages, packagesJson });
        (0, util_1.afterTest)(async () => {
            await fs.remove(rex3DbPath);
            await fs.remove(contentPath);
        });
    }
    const commonParams = {
        logger: (0, create_mock_logger_1.createMockLogger)(),
        rex3Config: { ...config, dbPath: rex3DbPath },
        triggerEvent,
        vars: new vars_1.Vars(config),
        desktopQueue: new PQueue({ concurrency: 1 })
    };
    return commonParams;
}
exports.createMockCommonParams = createMockCommonParams;
function getLocalServerConfig() {
    scriptsUtil.initMochaConfig({});
    const config = scriptsUtil.getMochaConfig();
    const configFinal = {
        ...config,
        mode: 'localserver',
        validationType: 'schema',
        refreshDB: config.refreshDB,
        allowRefreshFromWeb: config.allowRefreshFromWeb,
        useConsole: config.useConsole,
        dcontrol: config.dcontrol,
        serverMode: config.serverMode
    };
    return configFinal;
}
exports.getLocalServerConfig = getLocalServerConfig;
