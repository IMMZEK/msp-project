"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
const path = require("path");
const fs = require("fs-extra");
const _ = require("lodash");
const vars_1 = require("../lib/vars");
const preproc = require("../lib/dbBuilder/preproc"); // for standalone only
const package_validator_1 = require("./package-validator");
const macros_validator_1 = require("./macros-validator");
const devices_validator_1 = require("./devices-validator");
const devtools_validator_1 = require("./devtools-validator");
const content_validator_1 = require("./content-validator");
const util_1 = require("./util");
const schema_types_1 = require("./schema-types");
const package_helpers_1 = require("../handoff/package-helpers");
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
const callbackifyAny_1 = require("../utils/callbackifyAny");
const util_2 = require("../scripts-lib/util");
// TODO:
//  - make this validator configurable with different versions: 3.0, 3.1, 4.0, ...
//  - some of the const/enum/interface may have been defined already somewhere
//
// Below is for standalone usage only. There are a lot of redundant codes from refresh.  Can be split into a separated file.
// TODO - to be implemented ...
class SchemaValidator {
    validateCb = (0, callbackifyAny_1.callbackifyAny)(this.validate);
    rootDir;
    pkgDirs = [];
    contentFiles = [];
    deviceFiles = [];
    devtoolFiles = [];
    macrosFiles = [];
    logger;
    settings = { rootFolders: '' };
    isSummary = true;
    //
    macros;
    vPkg;
    vMacro;
    vDev;
    vTool;
    vRes;
    //
    startTime;
    endTime;
    constructor() { }
    async config(logger, config) {
        this.logger = logger;
        const cfg = await fs.readJson((0, util_2.resolvePath)(config.cfg));
        _.merge(this.settings, cfg);
        this.rootDir = config.contentPath;
        if (config.full) {
            this.isSummary = false;
        }
        this.vPkg = new package_validator_1.PackageValidator(this.logger, this.isSummary);
        this.vDev = new devices_validator_1.DevicesValidator(this.logger, this.isSummary);
        this.vTool = new devtools_validator_1.DevtoolsValidator(this.logger, this.isSummary);
        this.vRes = new content_validator_1.ContentValidator(this.logger, this.isSummary);
        this.vMacro = new macros_validator_1.MacrosValidator(this.logger, this.isSummary);
        if (cfg.RuleSettings) {
            _.merge(schema_types_1.RuleSettings, cfg.Rules);
        }
        if (cfg.PackageValidator) {
            this.vPkg.setSettings(cfg.PackageValidator);
        }
        if (cfg.ContentValidator) {
            this.vRes.setSettings(cfg.ContentValidator);
        }
        if (cfg.DevicesValidator) {
            this.vDev.setSettings(cfg.DevicesValidator);
        }
        if (cfg.DevtoolsValidator) {
            this.vTool.setSettings(cfg.DevtoolsValidator);
        }
        if (cfg.MacrosValidator) {
            this.vMacro.setSettings(cfg.MacrosValidator);
        }
    }
    async validate() {
        if (!this.rootDir) {
            this.logger.error(`Root folder is not specified! Exiting...`);
            return;
        }
        const title = `TIREX metadata schema validator`;
        this.logIntro(title);
        this.pkgDirs = [];
        const { packageFolders } = await (0, package_helpers_1.getPackageFolders)(this.rootDir);
        for (const packageFolder of packageFolders) {
            this.pkgDirs.push(path.join(this.rootDir, packageFolder));
        }
        const pkgData = { packageUids: new Set() };
        for (const pkgDir of this.pkgDirs) {
            const allPackageTirexJson = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(pkgDir);
            await Promise.all(allPackageTirexJson.map(async (pathInner) => {
                if (path.basename(pathInner) === vars_1.Vars.PACKAGE_TIREX_JSON) {
                    await this.validatePackage(pkgDir, pkgData, null);
                }
                else {
                    const endOfPrefix = Math.max(pathInner.indexOf(vars_1.Vars.PACKAGE_TIREX_JSON), 0);
                    const prefix = pathInner.substring(0, endOfPrefix);
                    await this.validatePackage(pkgDir, pkgData, path.basename(prefix));
                }
            }));
        }
        this.logEnding(title);
    }
    logIntro(title) {
        this.startTime = new Date();
        this.logger.info(`${this.startTime.toLocaleTimeString()} Start ${title}`);
    }
    logEnding(title) {
        this.endTime = new Date();
        const timeSpent = Math.round((this.endTime.getTime() - this.startTime.getTime()) / 1000);
        (0, util_1.insertBlankLine)(this.logger);
        this.logger.info(`${this.endTime.toLocaleTimeString()} End ${title}`);
        this.logger.info(`Time spent:${timeSpent} seconds`);
    }
    async validatePackage(pkgDir, pkgData, modulePrefix) {
        (0, util_1.insertBlankLine)(this.logger);
        this.logger.info(`Working folder: ${pkgDir}`);
        // TODO: do we need to clear 'global' macros, i.e. keep macros local to package?
        this.vMacro.clearMacros();
        const allPackageTirexJsonPaths = await (0, package_helpers_1.getAllPackageTirexJsonPaths)(pkgDir);
        const pkgFile = modulePrefix
            ? allPackageTirexJsonPaths.find((item) => modulePrefix && item.includes(modulePrefix))
            : await (0, package_helpers_1.getPackageTirexJsonPath)(pkgDir);
        if (!pkgFile) {
            this.vPkg.getLogger().error(`Cannot find package file with prefix ${modulePrefix}`);
            return;
        }
        this.validatePackageJson(pkgFile);
        if (this.vPkg.skipped) {
            return;
        }
        const metadataDir = await (0, dbBuilderUtils_1.getMetadataDir)(this.rootDir, pkgDir);
        const pkgMetadataDir = path.join(pkgDir, metadataDir);
        // always process macros first
        const macrosFiles = (0, util_1.findMacrosFiles)(pkgMetadataDir);
        this.macrosFiles.push(macrosFiles);
        macrosFiles.forEach((_file) => {
            this.validateMacrosJson(_file);
        });
        const deviceFiles = (0, util_1.findDeviceFiles)(pkgMetadataDir);
        deviceFiles.forEach((_file) => {
            if (this.vPkg.pkgHeaderRecord.type === schema_types_1.PackageType.DEVICES) {
                this.validateDeviceJson(_file);
            }
            else {
                (0, util_1.insertBlankLine)(this.logger);
                this.vPkg.getLogger().warning(`File should not exist, skip file: ${_file}`);
            }
        });
        const devtoolFiles = (0, util_1.findDevtoolFiles)(pkgMetadataDir);
        this.devtoolFiles.push(devtoolFiles);
        devtoolFiles.forEach((_file) => {
            if (this.vPkg.pkgHeaderRecord.type === schema_types_1.PackageType.DEVTOOLS) {
                this.validateDevtoolJson(_file);
            }
            else {
                (0, util_1.insertBlankLine)(this.logger);
                this.vPkg.getLogger().warning(`File should not exist, skip file: ${_file}`);
            }
        });
        const contentFiles = (0, util_1.findContentFiles)(pkgMetadataDir);
        this.contentFiles.push(contentFiles);
        contentFiles.forEach((_file) => {
            this.validateContentJson(_file, pkgData);
        });
    }
    validatePackageJson(filePath) {
        return this.runFileValidation(filePath, this.vPkg);
    }
    // alway process macro first
    validateMacrosJson(filePath) {
        return this.runFileValidation(filePath, this.vMacro, true);
    }
    validateDeviceJson(filePath) {
        return this.runFileValidation(filePath, this.vDev);
    }
    validateDevtoolJson(filePath) {
        return this.runFileValidation(filePath, this.vTool);
    }
    validateContentJson(filePath, pkgData) {
        return this.runFileValidation(filePath, this.vRes, false, pkgData);
    }
    runFileValidation(filePath, v, isMacroFile = false, pkgData) {
        if (!v) {
            return null;
        }
        (0, util_1.insertBlankLine)(this.logger);
        v.resetLogCount();
        if (v.logSummary) {
            v.logSummary.clear();
        }
        if (v.validateFile(filePath, true, pkgData).hasError()) {
            return null;
        }
        try {
            const jsonText = fs.readFileSync(filePath, 'utf8');
            let jsonObj = JSON.parse(jsonText);
            const macros = this.macros ? this.macros : null;
            try {
                const preprocResult = preproc.process(jsonText, macros, this.logger, isMacroFile);
                if (preprocResult) {
                    if (this.macros !== preprocResult.macros) {
                        this.macros = preprocResult.macros;
                    }
                    if (preprocResult.records) {
                        jsonObj = preprocResult.records;
                    }
                }
            }
            catch (e) {
                if (typeof e === 'string') {
                    v.getLogger().error(e);
                }
                else if (e instanceof Error) {
                    v.getLogger().error(e.message);
                }
            }
            if (v instanceof content_validator_1.ContentValidator) {
                v.validateRecords(jsonObj, pkgData);
            }
            else {
                v.validateRecords(jsonObj);
            }
            if (v.logSummary) {
                v.logSummary.forEach((ruleInfo) => {
                    if (ruleInfo.count >= 3) {
                        const msgOut = `...... Found (${ruleInfo.count - 2}) more [${ruleInfo.priority}] message(s) the same as [${ruleInfo.message}].`;
                        this.logger.info(msgOut);
                    }
                });
            }
        }
        catch (e) {
            // json file error, should not get here because have done validateFile()
            let msg = e.message;
            msg = (0, util_1.extendJsonErrorMsg)(filePath, msg);
            v.getLogger().error(msg);
        }
        return null;
    }
}
exports.SchemaValidator = SchemaValidator;
