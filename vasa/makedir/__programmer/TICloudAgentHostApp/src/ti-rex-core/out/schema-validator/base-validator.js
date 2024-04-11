"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = exports.BaseValidator = void 0;
const path = require("path");
const fs = require("fs-extra");
const util = require("util");
const semver = require("semver");
const _ = require("lodash");
const helpers_1 = require("../shared/helpers");
const validate_result_1 = require("./validate-result");
const schema_types_1 = require("./schema-types");
const util_1 = require("./util");
const path_helpers_1 = require("../shared/path-helpers");
/**
 * Base class for validators.
 */
class BaseValidator {
    title;
    name;
    settings = {
        ignoreFields: [],
        logLimit: Number.MAX_SAFE_INTEGER
    };
    logger;
    filePath;
    packagePath;
    currentSource;
    currentSubSource;
    currentRecNo;
    startTime;
    endTime;
    processed = 0;
    logCount = 0;
    idxToLineMap;
    isSummary;
    logSummary;
    //
    result = new validate_result_1.ValidateResult();
    constructor(title, _name, logger, isSummary, logLimit) {
        this.title = title;
        this.name = `${_name}#schema`;
        if (logger === null) {
            this.logger = new util_1.ConsoleLogger();
        }
        else {
            this.logger = logger;
        }
        // gRuleSettings.FieldDefined.func = this.ruleFieldDefinedX.bind(this);
        if (logLimit) {
            this.settings.logLimit = logLimit;
        }
        this.isSummary = isSummary;
        if (this.isSummary) {
            this.logSummary = new Map();
        }
        this.updateSettings();
    }
    updateSettings() {
        // call after settings change
        this.updateLogLimits();
    }
    updateLogLimits() {
        if (this.settings.logLimits) {
            const limits = this.settings.logLimits;
            Object.keys(limits).forEach((key) => {
                this.setLogLimit(key, limits[key]);
            });
        }
    }
    setLogLimit(priority, limit) {
        if (limit < 0) {
            limit = Number.MAX_SAFE_INTEGER;
        }
        this.result.logLimits[priority] = limit;
    }
    resetLogCount() {
        this.logCount = 0;
        this.result.resetCounts();
        this.resetIgnoreCounts();
    }
    setSettings(settings) {
        _.merge(this.settings, settings);
        this.updateSettings();
    }
    setPackagePath(pkg) {
        this.packagePath = pkg;
    }
    getIdxToLineMap(filePath) {
        try {
            // get the optional idx-lineNo map
            this.idxToLineMap = (0, util_1.jsonLineNum)(filePath);
        }
        catch (err) {
            this.log(schema_types_1.gRuleSettings.GenericError, undefined, err.message);
        }
    }
    setCurrentSource(src) {
        if (typeof src === 'undefined') {
            this.resetCurrentSource();
        }
        else if (typeof src === 'number') {
            this.currentSource = `item[${src}]`;
            this.currentRecNo = src;
        }
        else {
            this.currentSource = `${src}`;
            delete this.currentRecNo;
        }
    }
    resetCurrentSource() {
        delete this.currentSource;
        delete this.currentRecNo;
    }
    setCurrentSubSource(src) {
        this.currentSubSource = `${src}`;
    }
    resetCurrentSubSource() {
        delete this.currentSubSource;
    }
    getLogger() {
        return this.logger;
    }
    log(rule, _tags = [], ...args) {
        if (!rule.enable) {
            return;
        }
        const fmt = `${rule.message}`;
        const msg = util.format(fmt, ...args);
        const logSummaryKey = `${this.filePath}: ${msg}`;
        let ruleSummary;
        if (this.logSummary) {
            ruleSummary = this.logSummary.get(logSummaryKey);
            if (!ruleSummary) {
                ruleSummary = { priority: rule.priority, message: msg, count: 1 };
            }
            else {
                ruleSummary.count++;
            }
            this.logSummary.set(`${this.filePath}: ${msg}`, ruleSummary);
        }
        let msgOut;
        if (this.filePath) {
            this.packagePath = path.dirname(this.filePath);
        }
        if (this.packagePath) {
            if (this.filePath) {
                const idx = Math.max(0, this.filePath.indexOf(this.packagePath) + this.packagePath.length + 1);
                msgOut = `${this.filePath.slice(idx)}`;
            }
            else {
                msgOut = `${this.packagePath}`;
            }
        }
        else if (this.filePath) {
            msgOut = `${this.filePath}`;
        }
        else {
            msgOut = `${this.name}`;
        }
        if (msg === 'Validating File') {
            msgOut = `${msg}: ${msgOut}`;
        }
        else {
            msgOut = '';
            if (this.currentRecNo !== undefined && this.idxToLineMap) {
                // if the validator cannot locate line number due to the utilization of set
                // macros, line number will not be shown.
                if (this.currentRecNo < this.idxToLineMap.length) {
                    const line = this.idxToLineMap[this.currentRecNo];
                    msgOut = `line:${line[0]}-${line[2]}`;
                }
            }
            if (this.currentSource) {
                msgOut = `${msgOut} ${this.currentSource}`;
                if (this.currentSubSource) {
                    msgOut = `${msgOut}.${this.currentSubSource}`;
                }
            }
            msgOut = `${msgOut} ${msg}`;
        }
        if (this.logCount === this.settings.logLimit) {
            const msgOut2 = `..... Reach overall log limit (${this.settings.logLimit}), stop logging ..... `;
            if (this.settings.logLimit > 0) {
                this.logger.info(msgOut2);
            }
            this.logCount++;
        }
        if (this.result.counts[rule.priority] === this.result.logLimits[rule.priority]) {
            const msgOut2 = `..... Reach event specific log limit (${this.result.logLimits[rule.priority]}), stop logging [${rule.priority}] ..... `;
            if (this.result.logLimits[rule.priority] > 0) {
                this.logger.info(msgOut2);
            }
            this.result.counts[rule.priority]++;
        }
        if (ruleSummary && ruleSummary.count < 3) {
            this.printEachLog(rule, msgOut, _tags, ...args);
        }
        if (!this.isSummary &&
            this.logCount < this.settings.logLimit &&
            this.result.counts[rule.priority] < this.result.logLimits[rule.priority]) {
            this.printEachLog(rule, msgOut, _tags, ...args);
        }
    }
    printEachLog(rule, msgOut, _tags = [], ...args) {
        let pri = rule.priority;
        const _logger = this.logger;
        if (pri === schema_types_1.Priority.recommended && !_logger.recommended) {
            pri = schema_types_1.Priority.warning;
        }
        _logger[pri](msgOut, _tags);
        this.result.counts[rule.priority]++;
        this.logCount++;
        // TODO: temporary for extracting "field name" from arguments, assuming always the first argument
        if (args && args.length > 0) {
            const _field = args[0];
            this.incIgnoreCount(_field);
        }
    }
    readJson(filePath) {
        try {
            const jsonText = fs.readFileSync(filePath, 'utf8');
            const jsonObj = JSON.parse(jsonText);
            if (!jsonObj) {
                this.log(schema_types_1.gRuleSettings.EmptyObj, undefined, path.basename(filePath));
                return false;
            }
            return jsonObj;
        }
        catch (e) {
            // json file error
            let msg = e.message;
            msg = (0, util_1.extendJsonErrorMsg)(filePath, msg);
            this.log(schema_types_1.gRuleSettings.GenericError, undefined, msg);
        }
    }
    preValidate() {
        this.startTime = new Date();
    }
    preValidateFile(_filePath) {
        const ret = this.result.clone();
        if (_filePath) {
            this.filePath = _filePath;
            this.log(schema_types_1.gRuleSettings.GenericInfo, [], `Validating File`);
            this.getIdxToLineMap(_filePath);
        }
        if (this.filePath) {
            this.ruleFileExists(_filePath);
        }
        return this.result.delta(ret);
    }
    preValidateRecord() {
        this.processed++;
        return new validate_result_1.ValidateResult();
    }
    postValidate() {
        this.endTime = new Date();
    }
    // basic field check
    isIgnore(field) {
        const ignore = this.settings.ignoreFields.find((item) => {
            if (typeof item === 'string') {
                return item === field;
            }
            return item.field === field;
        });
        if (!ignore) {
            return false;
        }
        if (!ignore.after || ignore.after === 0) {
            return true;
        }
        if (!ignore.count) {
            return false; // error
        }
        return ignore.count >= ignore.after;
    }
    isIgnorePackage(record) {
        const ignore = this.settings.ignorePackages.find((item) => {
            if (item.id === record.id) {
                return item.versions;
            }
            return;
        });
        if (ignore && ignore.versions.includes(record.version)) {
            return true;
        }
        return false;
    }
    incIgnoreCount(field) {
        const ignore = this.settings.ignoreFields.find((item) => {
            if (typeof item === 'string') {
                return item === field;
            }
            return item.field === field;
        });
        if (!ignore) {
            return;
        }
        if (!ignore.count) {
            ignore.count = 1;
            return;
        }
        ignore.count++;
    }
    resetIgnoreCounts() {
        this.settings.ignoreFields.forEach((ignore) => {
            if (typeof ignore === 'object') {
                ignore.count = 0;
            }
        });
    }
    validateArray(field, record) {
        const fieldVal = record[field];
        if (!Array.isArray(fieldVal)) {
            this.log(schema_types_1.gRuleSettings.WrongType, undefined, field, 'array');
            return false;
        }
        return true;
    }
    validate2DArray(field, record) {
        const fieldVal = record[field];
        let failed = 0;
        if (Array.isArray(fieldVal)) {
            fieldVal.forEach((val) => {
                if (!Array.isArray(val)) {
                    failed++;
                }
            });
        }
        else {
            failed++;
        }
        if (failed !== 0) {
            this.log(schema_types_1.gRuleSettings.WrongType, undefined, field, '2D array');
        }
        return failed === 0;
    }
    validateLocationPath(field, record) {
        if ((0, util_1.isHTTP)(record[field])) {
            return this.ruleValidUrl(field, record);
        }
        else {
            return this.ruleValidLocalPath(field, record);
        }
    }
    validateString(field, record, schema) {
        if (schema.required === schema_types_1.Require.Optional || schema.required === schema_types_1.Require.Recommended) {
            if (Array.isArray(record[field]) && record[field].length > 0) {
                for (const item of record[field]) {
                    if (typeof item !== 'string') {
                        this.log(schema_types_1.gRuleSettings.WrongType, undefined, field, 'an array of string(s)');
                        return false;
                    }
                }
            }
            if (!this.ruleEmptyOptional(field, record, true)) {
                // allow empty content if optional
                return true;
            }
        }
        else if (schema.required === schema_types_1.Require.MandatoryAllowEmpty) {
            // any rule to apply?
        }
        else {
            if (!this.ruleNonEmptyContent(field, record)) {
                return false;
            }
        }
        let passed = true;
        switch (schema.semantic) {
            case schema_types_1.SemanticType.NonEmpty:
                break;
            case schema_types_1.SemanticType.NoSpecialChar:
                this.ruleNoSpecialChar(field, record, false);
                break;
            case schema_types_1.SemanticType.NoSpecialCharStrict:
                this.ruleNoSpecialChar(field, record, true);
                break;
            case schema_types_1.SemanticType.RelativePath:
                passed = this.ruleValidLocalPath(field, record);
                break;
            case schema_types_1.SemanticType.RelativePathOrURL:
                passed = this.validateLocationPath(field, record);
                break;
            case schema_types_1.SemanticType.URL:
                passed = this.ruleValidUrl(field, record);
                break;
            case schema_types_1.SemanticType.HTMLString:
                passed = this.ruleValidHtml(field, record);
                break;
            case schema_types_1.SemanticType.PredefinedString:
                if (schema.extras) {
                    const list = Object.keys(schema.extras).map((key) => schema.extras[key]);
                    passed = this.ruleItemListed(field, record, list);
                }
                if (schema.extrasOptional) {
                    const list = Object.keys(schema.extrasOptional).map((key) => schema.extrasOptional[key]);
                    this.ruleItemListed(field, record, list, true);
                    passed = true;
                }
                break;
            case schema_types_1.SemanticType.Semver:
                passed = this.ruleSemver(field, record);
                break;
        }
        return passed;
    }
    validateFieldBasic(field, record, schema) {
        if (this.isIgnore(field)) {
            return true;
        }
        if (field === 'metadataVersion' && this.isIgnorePackage(record)) {
            return true;
        }
        const fieldVal = record[field];
        if (schema.required === schema_types_1.Require.Mandatory) {
            // Mandatory field
            if (!this.ruleFieldDefined(field, record)) {
                return false;
            }
            if (!this.ruleNonEmptyContent(field, record)) {
                return false;
            }
        }
        else if (schema.required === schema_types_1.Require.MandatoryAllowEmpty) {
            // Mandatory field allows empty
            if (!this.ruleFieldDefined(field, record)) {
                return false;
            }
        }
        else if (schema.required === schema_types_1.Require.Recommended) {
            if (!this.ruleFieldRecommended(field, record)) {
                return false;
            }
        }
        else if (schema.required === schema_types_1.Require.Optional) {
            // TODO: anything can be tested?
        }
        else if (schema.required === schema_types_1.Require.RecommendedX) {
            if (!this.ruleOneOrMore(field, record, schema.extras)) {
                return false;
            }
        }
        else if (schema.required === schema_types_1.Require.MandatoryForExample) {
            const resClass = 'resourceClass';
            if (record[resClass] && record[resClass].length === 1) {
                if (record[resClass][0] === schema_types_1.ResourceClass.EXAMPLE) {
                    if (!this.ruleFieldDefined(field, record)) {
                        return false;
                    }
                    if (!this.ruleOnlyOneElement(field, record)) {
                        return false;
                    }
                }
                else {
                    if (!this.ruleFieldDefinedNot(field, record)) {
                        return false;
                    }
                }
            }
        }
        // additional semantic check
        let failed = 0;
        if (fieldVal) {
            switch (schema.dataType) {
                case schema_types_1.DataType.ArrayString:
                    if (this.validateArray(field, record)) {
                        if (!this.validateString(field, record, schema)) {
                            failed++;
                        }
                    }
                    else {
                        failed++;
                    }
                    break;
                case schema_types_1.DataType.String:
                    if (typeof record[field] !== 'string') {
                        // this.getLogger().error('Is not a string', [], field);
                        this.log(schema_types_1.gRuleSettings.WrongType, undefined, field, 'string');
                        failed++;
                    }
                    else {
                        if (!this.validateString(field, record, schema)) {
                            failed++;
                        }
                    }
                    break;
                case schema_types_1.DataType.Object:
                    if (field === 'advanced') {
                        const overrideProjSpecDevId = 'overrideProjectSpecDeviceId';
                        if (Object.keys(fieldVal).length !== 1 ||
                            Object.keys(fieldVal)[0] !== overrideProjSpecDevId) {
                            this.log(schema_types_1.gRuleSettings.WrongObjectType, undefined, overrideProjSpecDevId, field);
                            failed++;
                        }
                        else if (Object.values(fieldVal).length !== 1 ||
                            typeof Object.values(fieldVal)[0] !== 'boolean') {
                            this.log(schema_types_1.gRuleSettings.WrongType, undefined, overrideProjSpecDevId, 'boolean');
                            failed++;
                        }
                    }
                    break;
                case schema_types_1.DataType.ArrayArrayString:
                    if (!this.validate2DArray(field, record)) {
                        failed++;
                    }
                    else {
                        const saa = fieldVal;
                        saa.forEach((sa) => {
                            record[field] = sa;
                            if (!this.validateString(field, record, schema)) {
                                failed++;
                            }
                        });
                    }
                    break;
                case schema_types_1.DataType.ArrayObject:
                    if (!this.validateArray(field, record)) {
                        failed++;
                    }
                    else {
                        if (schema.required === schema_types_1.Require.Optional ||
                            schema.required === schema_types_1.Require.Recommended) {
                            if (!this.ruleEmptyOptional(field, record, true)) {
                                // allow empty content if optional
                                return true;
                            }
                        }
                        else {
                            if (!this.ruleNonEmptyContent(field, record)) {
                                return false;
                            }
                        }
                        // TODO: do we know more the object
                    }
                    break;
            }
        }
        return failed === 0;
    }
    reportNotInSpec(fields, specs) {
        fields.forEach((field) => {
            // 2 cases: with and without suggestion
            const suggestion = (0, util_1.getSuggestion)(field, specs);
            if (suggestion && suggestion.length > 0) {
                this.log(schema_types_1.gRuleSettings.InSpecSuggest, undefined, field, suggestion);
            }
            else {
                this.log(schema_types_1.gRuleSettings.InSpec, undefined, field);
            }
        });
    }
    // Rule checks
    ruleFieldRecommended(field, record) {
        if (!schema_types_1.gRuleSettings.Recommended.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (!fieldVal) {
            this.log(schema_types_1.gRuleSettings.Recommended, undefined, field);
            return false;
        }
        return true;
    }
    ruleInSpec(record, specs) {
        if (!schema_types_1.gRuleSettings.InSpec.enable) {
            return true;
        }
        const props = Object.keys(record);
        this.reportNotInSpec(props.filter((p) => {
            return !(0, util_1.isInList)(p, specs) && !this.isIgnore(p);
        }), specs);
        return true;
    }
    ruleFieldDefined(field, record) {
        if (!schema_types_1.gRuleSettings.FieldDefined.enable) {
            return true;
        }
        const recFileds = Object.keys(record);
        if (recFileds.indexOf(field) < 0) {
            this.log(schema_types_1.gRuleSettings.FieldDefined, undefined, field);
            return false;
        }
        return true;
    }
    ruleFieldDefinedNot(field, record) {
        if (!schema_types_1.gRuleSettings.FieldDefinedNot.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (fieldVal) {
            this.log(schema_types_1.gRuleSettings.FieldDefinedNot, undefined, field);
            return false;
        }
        return true;
    }
    ruleFileExists(path, field) {
        const filePath = path_helpers_1.PathHelpers.cleanFilePathWithQueryValues(path);
        if (!schema_types_1.gRuleSettings.FileExists.enable) {
            return true;
        }
        if (!fs.existsSync(filePath)) {
            if (field) {
                this.log(schema_types_1.gRuleSettings.FieldFileExists, undefined, field, filePath);
            }
            else {
                this.log(schema_types_1.gRuleSettings.FileExists, undefined, filePath);
            }
            return false;
        }
        return true;
    }
    ruleFileExistsNot(path) {
        if (!schema_types_1.gRuleSettings.FileExistsNot.enable) {
            return true;
        }
        if (fs.existsSync(path)) {
            return false;
        }
        return true;
    }
    ruleNonEmptyContent(field, record) {
        if (!schema_types_1.gRuleSettings.NonEmptyContent.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (typeof fieldVal === 'string') {
            if (fieldVal.length === 0) {
                this.log(schema_types_1.gRuleSettings.NonEmptyContent, undefined, field);
                return false;
            }
        }
        else if (Array.isArray(fieldVal)) {
            // TODO: more checks?
            if (fieldVal.length === 0) {
                if (field === 'mainCategories') {
                    (0, util_1.updateRuleSetting)(schema_types_1.gRuleSettings.NonEmptyContent, schema_types_1.Priority.warning);
                }
                this.log(schema_types_1.gRuleSettings.NonEmptyContent, undefined, field);
                return false;
            }
            else {
                let failed = 0;
                fieldVal.forEach((item, idx) => {
                    if (typeof item === 'string') {
                        if (item.length === 0) {
                            this.log(schema_types_1.gRuleSettings.NonEmptyContent, undefined, `${field}[${idx}]`);
                            failed++;
                        }
                    }
                });
                return failed === 0;
            }
        }
        return true;
    }
    ruleValidLocalPath(field, record) {
        if (!schema_types_1.gRuleSettings.ValidLocalPath.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (fieldVal) {
            let failed = 0;
            const items = (0, helpers_1.getQueryParamAsArray)(fieldVal);
            items.forEach((item) => {
                if (this.filePath) {
                    const rpath = path.dirname(this.filePath);
                    if (rpath) {
                        if (!this.ruleFileExists(path.join(rpath, item), field)) {
                            failed++;
                        }
                    }
                }
            });
            return failed === 0;
        }
        this.log(schema_types_1.gRuleSettings.EmptyOptional, undefined, field);
        return false;
    }
    ruleValidUrl(field, record) {
        if (!schema_types_1.gRuleSettings.ValidUrl.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (fieldVal) {
            let failed = 0;
            const items = (0, helpers_1.getQueryParamAsArray)(fieldVal);
            items.forEach((item) => {
                let strVal = item;
                if (item.indexOf('&amp;') >= 0) {
                    strVal = item.replace('&amp;', '&');
                }
                if (!(0, util_1.isValidUrl)(strVal)) {
                    this.log(schema_types_1.gRuleSettings.ValidUrl, undefined, field, fieldVal);
                    failed++;
                }
                else {
                    // TODO: check actual connection with request?
                    // Better to check outside this validator because of long and async operation required.
                }
            });
            return failed === 0;
        }
        return false;
    }
    ruleValidHtml(field, record) {
        if (!schema_types_1.gRuleSettings.ValidHtml.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (fieldVal) {
            let failed = 0;
            const items = (0, helpers_1.getQueryParamAsArray)(fieldVal);
            items.forEach((item) => {
                if (!(0, util_1.isValidHtml)(item)) {
                    this.log(schema_types_1.gRuleSettings.ValidHtml, undefined, field);
                    failed++;
                }
            });
            return failed === 0;
        }
        return false;
    }
    ruleItemListed(field, record, listed, warning = false) {
        if (!schema_types_1.gRuleSettings.ItemListed.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (fieldVal) {
            let failed = 0;
            const items = (0, helpers_1.getQueryParamAsArray)(fieldVal);
            items.forEach((item) => {
                if (listed.indexOf(item) < 0) {
                    if (field === 'name' || warning) {
                        (0, util_1.updateRuleSetting)(schema_types_1.gRuleSettings.ItemListed, schema_types_1.Priority.warning);
                    }
                    this.log(schema_types_1.gRuleSettings.ItemListed, undefined, item, field, listed.toString());
                    failed++;
                }
            });
            return failed === 0;
        }
        return false;
    }
    ruleOneOrMore(field, record, otherFields) {
        if (!schema_types_1.gRuleSettings.OneOrMore.enable) {
            return true;
        }
        const recFileds = Object.keys(record);
        if (recFileds.indexOf(field) >= 0) {
            if (!this.ruleEmptyOptional(field, record, true)) {
                return false;
            }
            return true;
        }
        let found = 0;
        otherFields.forEach((item) => {
            const idx = recFileds.indexOf(item);
            if (idx >= 0 && record[item]) {
                found++;
            }
        });
        if (found === 0) {
            const longList = [];
            longList.push(field, ...otherFields);
            this.log(schema_types_1.gRuleSettings.OneOrMore, undefined, field, longList.toString());
            return false;
        }
        return true;
    }
    ruleEmptyOptional(field, record, optional) {
        if (!schema_types_1.gRuleSettings.EmptyOptional.enable || !optional) {
            return true;
        }
        if (record[field].length === 0) {
            this.log(schema_types_1.gRuleSettings.EmptyOptional, undefined, field);
            return false;
        }
        return true;
    }
    ruleSemver(field, record) {
        if (!schema_types_1.gRuleSettings.Semver.enable) {
            return true;
        }
        const fieldVal = record[field];
        if (!semver.validRange(fieldVal)) {
            this.log(schema_types_1.gRuleSettings.Semver, undefined, field, fieldVal);
            return false;
        }
        return true;
    }
    hasSpecialChar(str, strict = false) {
        const re = new RegExp('[&,/:;=@#<>%\\[\\]\\{\\}\\|\\\\^\\$\\+\\?]'); // loose
        const resp = new RegExp('[&,/:;=@# <>%\\[\\]\\{\\}\\|\\\\^\\$\\+\\?]'); // strict
        const m = strict ? str.match(resp) : str.match(re);
        if (m === null) {
            return null;
        }
        else {
            return m[0];
        }
    }
    ruleNoSpecialChar(field, record, strict) {
        const fieldVal = record[field];
        if (fieldVal) {
            let failed = 0;
            const items = (0, helpers_1.getQueryParamAsArray)(fieldVal);
            items.forEach((item) => {
                const found = this.hasSpecialChar(item, strict);
                if (found) {
                    this.log(schema_types_1.gRuleSettings.NoSpecialChar, undefined, field, found, fieldVal);
                    failed++;
                }
            });
            return failed === 0;
        }
        return false;
    }
    ruleValidCoreType(field, record) {
        if (!this.ruleFieldDefined(field, record)) {
            return false;
        }
        const coreTypes = record[field];
        let failed = 0;
        if (Array.isArray(coreTypes) && coreTypes.length > 0 && typeof coreTypes[0] !== 'string') {
            coreTypes.forEach((coreType, idx) => {
                this.setCurrentSubSource(`${field}[${idx}]`);
                if (!this.ruleFieldDefined('id', coreType)) {
                    failed++;
                }
                if (!this.ruleFieldDefined('name', coreType)) {
                    failed++;
                }
            });
            this.resetCurrentSubSource();
        }
        // TODO: check coreType format and validate with CCS
        return failed === 0;
    }
    ruleValidDevice(field, record, mainCat) {
        if (mainCat) {
            if (mainCat.indexOf(schema_types_1.MainCategory.DEVICES) >= 0) {
                // TODO: if package has devices defined then here is optional, will use the ones there
                this.ruleFieldDefined(field, record);
            }
        }
        // TODO: check device format and validate with product definitions
        return true;
    }
    ruleValidDevtools(field, record, mainCat) {
        if (mainCat) {
            if (mainCat.indexOf(schema_types_1.MainCategory.DEVTOOLS) >= 0) {
                this.ruleFieldDefined(field, record);
            }
        }
        // TODO: check devtools format and validate with product definitions
        return true;
    }
    ruleOnlyOneElement(field, record) {
        if (record[field] && record[field].length !== 1) {
            this.log(schema_types_1.gRuleSettings.OnlyOneElement, undefined, field);
            return false;
        }
        return true;
    }
    ruleUniqueElements(field, record, pkgData) {
        if (Array.isArray(record[field])) {
            const strArray = record[field];
            for (const str of strArray) {
                if (pkgData.packageUids.has(str)) {
                    this.log(schema_types_1.gRuleSettings.DuplicateElements, undefined, field);
                    return false;
                }
                else {
                    pkgData.packageUids.add(str);
                }
            }
        }
        else {
            if (pkgData.packageUids.has(record[field])) {
                this.log(schema_types_1.gRuleSettings.DuplicateElements, undefined, field);
                return false;
            }
            else {
                pkgData.packageUids.add(record[field]);
            }
        }
        return true;
    }
    ruleSortValue(field, sort) {
        if (sort !== 'filesAndFoldersAlphabetical' && sort !== 'manual' && sort !== 'default') {
            this.log(schema_types_1.gRuleSettings.AssertSortValue, undefined, field);
            return false;
        }
        return true;
    }
}
exports.BaseValidator = BaseValidator;
/**
 * Base class for schema validators.
 */
class Validator extends BaseValidator {
}
exports.Validator = Validator;
