"use strict";
/**
 * Refresh macros from macros.tirex.json files
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.refresh = void 0;
const path = require("path");
const preproc = require("./preproc");
const dbBuilderUtils_1 = require("./dbBuilderUtils");
/**
 * Refresh macros
 *
 */
async function refresh(packagePath, macros, contentBasePath, logger) {
    const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(contentBasePath, packagePath);
    const macrosFile = path.join(contentBasePath, packagePath, metadataDir, 'macros.tirex.json');
    const preprocResult = await preproc.processFile(macrosFile, null, logger);
    if (preprocResult) {
        macros[packagePath] = preprocResult.macros;
    }
}
exports.refresh = refresh;
