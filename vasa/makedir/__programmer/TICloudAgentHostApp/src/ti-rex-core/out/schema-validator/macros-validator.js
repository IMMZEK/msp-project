"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacrosValidator = void 0;
const base_validator_1 = require("./base-validator");
const util_1 = require("./util");
const schema_types_1 = require("./schema-types");
/**
 * Validator class for 'macros.tirex.json'.
 */
class MacrosValidator extends base_validator_1.Validator {
    static Text = 'textmacro';
    static Array = 'arraymacro';
    static Set = 'setmacro';
    textMacros;
    arrayMacros;
    setMacros;
    MACROS_METADATA_SCHEMA;
    constructor(logger, isSummary, logLimit) {
        super('Macros', "macros.tirex.json" /* MetadataFile.MACROS */, logger, isSummary, logLimit);
        this.textMacros = new Map();
        this.arrayMacros = new Map();
        this.setMacros = new Map();
    }
    getMacroValue(key) {
        let found = this.textMacros.get(key);
        if (!found) {
            found = this.arrayMacros.get(key);
            if (!found) {
                found = this.setMacros.get(key);
            }
        }
        return found;
    }
    getMacroType(record) {
        const recFileds = Object.keys(record);
        if (recFileds.indexOf(MacrosValidator.Text) >= 0) {
            return MacrosValidator.Text;
        }
        else if (recFileds.indexOf(MacrosValidator.Array) >= 0) {
            return MacrosValidator.Array;
        }
        else if (recFileds.indexOf(MacrosValidator.Set) >= 0) {
            return MacrosValidator.Set;
        }
        return null;
    }
    clearMacros() {
        this.textMacros.clear();
        this.arrayMacros.clear();
        this.setMacros.clear();
    }
    checkAlreadyDefined(key) {
        const found = this.getMacroValue(key);
        if (found) {
            this.log(schema_types_1.gRuleSettings.DuplicateMacro, undefined, key);
            return false;
        }
        return true;
    }
    validateFile(filePath, skipContents = false) {
        const ret = this.result.clone();
        if (super.preValidateFile(filePath).isPassed()) {
            // this.log(gRuleSettings.GenericInfo, [], undefined, `Validating: ${filePath}`);
            const jsonObj = this.readJson(filePath);
            if (jsonObj) {
                if (!Array.isArray(jsonObj)) {
                    this.log(schema_types_1.gRuleSettings.WrongType, undefined, 'File', 'JSON list');
                }
                else {
                    if (!skipContents) {
                        this.validateRecords(jsonObj);
                    }
                }
            }
        }
        return this.result.delta(ret);
    }
    validateRecords(records) {
        let ret = this.result.clone();
        records.forEach((record, idx) => {
            this.validateRecord(record, idx);
        });
        ret = this.result.delta(ret);
        return ret;
    }
    validateRecord(record, idx) {
        super.preValidateRecord();
        //
        let ret = this.result.clone();
        this.setCurrentSource(idx);
        const macroType = this.getMacroType(record);
        if (macroType === MacrosValidator.Text) {
            this.MACROS_METADATA_SCHEMA = schema_types_1.TEXT_MACROS_METADATA_SCHEMA;
        }
        else if (macroType === MacrosValidator.Array) {
            this.MACROS_METADATA_SCHEMA = schema_types_1.ARRAY_MACROS_METADATA_SCHEMA;
        }
        else if (macroType === MacrosValidator.Set) {
            this.MACROS_METADATA_SCHEMA = schema_types_1.SET_MACROS_METADATA_SCHEMA;
        }
        else {
            // not a macro record, allowed and skip
            this.log(schema_types_1.gRuleSettings.GenericWarning, [], 'Not a valid macro record');
            return this.result.delta(ret);
        }
        Object.keys(this.MACROS_METADATA_SCHEMA).forEach((fieldName) => {
            const schema = (0, util_1.getSchema)(this.MACROS_METADATA_SCHEMA, fieldName);
            this.validateField(fieldName, record, schema);
        });
        // check any field is not in the spec
        this.ruleInSpec(record, Object.keys(this.MACROS_METADATA_SCHEMA));
        this.resetCurrentSource();
        ret = this.result.delta(ret);
        return ret;
    }
    validateField(fieldName, record, schema) {
        let ret = this.result.clone();
        if (!schema) {
            schema = (0, util_1.getSchema)(this.MACROS_METADATA_SCHEMA, fieldName);
            if (!schema) {
                this.reportNotInSpec([fieldName]);
                return this.result.delta(ret);
            }
        }
        // basic field validation
        this.validateFieldBasic(fieldName, record, schema);
        // field specific validation
        let macroName;
        switch (fieldName) {
            case MacrosValidator.Text:
                macroName = record[fieldName];
                if (this.checkAlreadyDefined(macroName)) {
                    this.textMacros.set(macroName, -1);
                }
                break;
            case MacrosValidator.Array:
                macroName = record[fieldName];
                if (this.checkAlreadyDefined(macroName)) {
                    this.arrayMacros.set(macroName, -1);
                }
                break;
            case MacrosValidator.Set:
                macroName = record[fieldName];
                if (this.checkAlreadyDefined(macroName)) {
                    this.setMacros.set(macroName, -1);
                }
                break;
            case 'value':
                break;
            case 'values':
                break;
            case 'comment':
                break;
        }
        ret = this.result.delta(ret);
        return ret;
    }
}
exports.MacrosValidator = MacrosValidator;
