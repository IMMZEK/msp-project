"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlValidator = void 0;
const path = require("path");
const fs = require("fs-extra");
const base_validator_1 = require("./base-validator");
const util_1 = require("./util");
const schema_types_1 = require("./schema-types");
const request_helpers_1 = require("../shared/request-helpers");
const callbackifyAny_1 = require("../utils/callbackifyAny");
const vars_1 = require("../lib/vars");
const resources_1 = require("../lib/dbBuilder/resources");
const dbBuilder_1 = require("../lib/dbBuilder/dbBuilder");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const package_helpers_1 = require("../handoff/package-helpers");
class UrlValidator extends base_validator_1.BaseValidator {
    validateCb = (0, callbackifyAny_1.callbackifyAny)(this.validate);
    constructor(logger, isSummary, logLimit) {
        super('URL', 'URL', logger, isSummary, logLimit);
    }
    async validateURL(filePath) {
        if (super.preValidateFile(filePath).isPassed()) {
            const records = this.readJson(filePath);
            const fieldNames = this.fieldNamesToVerify(filePath);
            let idx = 0;
            for (const record of records) {
                super.preValidateRecord();
                this.setCurrentSource(idx);
                for (const fieldName of fieldNames) {
                    const fieldVal = record[fieldName];
                    if (fieldVal) {
                        if (typeof fieldVal === 'string' && (0, util_1.isHTTP)(fieldVal)) {
                            await this.checkRequest(fieldVal, fieldName);
                        }
                        else if (Array.isArray(fieldVal)) {
                            for (const link of fieldVal) {
                                if (typeof link === 'string' && (0, util_1.isHTTP)(link)) {
                                    await this.checkRequest(link, fieldName);
                                }
                            }
                        }
                    }
                }
                this.resetCurrentSource();
                idx++;
            }
        }
    }
    async checkRequest(link, fieldName) {
        try {
            await (0, request_helpers_1.doGetRequest)(link);
        }
        catch (err) {
            this.log(schema_types_1.gRuleSettings.ValidUrl, undefined, fieldName, link);
        }
    }
    fieldNamesToVerify(filePath) {
        if (filePath.endsWith('content.tirex.json')) {
            return ["location" /* Content.LOCATION */];
        }
        return ["buyLink" /* Devtools.BUY_LINK */, "toolsPage" /* Devtools.TOOLS_PAGE */];
    }
    async validate(rootDir) {
        const PackageList = [];
        const packageMetadataList = new Map();
        if (rootDir.length === 0) {
            console.error(`Root folder is not specified! Exiting...`);
            return;
        }
        const { packageFolders } = await (0, package_helpers_1.getPackageFolders)(rootDir);
        if (packageFolders.length === 0) {
            console.error('No package directories found in the specified root folder! Exiting...');
            return;
        }
        console.log('Start URL checking');
        const startTime = new Date();
        this.logger.info(`${startTime.toLocaleTimeString()} Start URL checking`);
        for (const packageFolder of packageFolders) {
            const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(rootDir, packageFolder);
            const [data] = await fs.readJson(path.join(rootDir, packageFolder, metadataDir, vars_1.Vars.PACKAGE_TIREX_JSON));
            (0, util_1.setPackageMetadataList)(packageMetadataList, packageFolder, data.id, data.version, data.type);
            PackageList.push({
                uid: (0, dbBuilderUtils_1.formUid)(data.id, data.version),
                content: packageFolder,
                operation: "doNothing" /* RefreshOperation.DO_NOTHING */,
                installPath: {},
                installCommand: {},
                installSize: {},
                modulePrefix: null
            });
        }
        const validityResult = await (0, dbBuilder_1.packagePresentAndValidityChecks)(PackageList, rootDir, this.logger, 'url');
        const { latestPkgMap } = validityResult;
        (0, util_1.insertBlankLine)(this.logger);
        await this.runFileValidation(rootDir, latestPkgMap, packageMetadataList);
        const endTime = new Date();
        const timeSpent = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
        this.logger.info(`${endTime.toLocaleTimeString()} End URL Validation`);
        this.logger.info(`Time spent: ${timeSpent} seconds`);
        console.log('End URL Validation');
    }
    async runFileValidation(rootDir, latestPkgMap, packageMetadataList) {
        for (const [latestPkgId, latestPkg] of latestPkgMap) {
            const pkg = packageMetadataList.get((0, dbBuilderUtils_1.formUid)(latestPkgId, latestPkg.version));
            if (pkg) {
                const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(rootDir, pkg.packageFolder);
                const files = (await (0, resources_1.getFiles)(metadataDir, rootDir, pkg.packageFolder, null)).filter((file) => !file.endsWith(vars_1.Vars.PACKAGE_TIREX_JSON));
                if (pkg.type && pkg.type === 'devtools') {
                    if (await fs.pathExists(path.join(rootDir, pkg.packageFolder, metadataDir, "devtools.tirex.json" /* MetadataFile.DEVTOOLS */))) {
                        files.push(path.join(metadataDir, "devtools.tirex.json" /* MetadataFile.DEVTOOLS */));
                    }
                    if (await fs.pathExists(path.join(rootDir, pkg.packageFolder, metadataDir, "devtools-aux.tirex.json" /* MetadataFile.DEVTOOLS_AUX */))) {
                        files.push(path.join(metadataDir, "devtools-aux.tirex.json" /* MetadataFile.DEVTOOLS_AUX */));
                    }
                }
                if (files.length > 0) {
                    this.logger.info(`Working Folder: ${path.join(rootDir, pkg.packageFolder, metadataDir)}`);
                    for (const file of files) {
                        try {
                            await this.validateURL(path.join(rootDir, pkg.packageFolder, file));
                        }
                        catch (err) {
                            this.logger.error(err);
                            continue;
                        }
                    }
                    (0, util_1.insertBlankLine)(this.logger);
                }
            }
        }
    }
}
exports.UrlValidator = UrlValidator;
