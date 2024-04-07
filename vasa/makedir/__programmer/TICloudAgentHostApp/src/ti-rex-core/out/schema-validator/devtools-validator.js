"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevtoolsValidator = void 0;
const base_validator_1 = require("./base-validator");
const util_1 = require("./util");
const schema_types_1 = require("./schema-types");
/**
 * Validator class for 'devtools.tirex.json'.
 */
class DevtoolsValidator extends base_validator_1.Validator {
    constructor(logger, isSummary, logLimit) {
        super('Devtools', "devtools.tirex.json" /* MetadataFile.DEVTOOLS */, logger, isSummary, logLimit);
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
        let ret = this.result.clone();
        super.preValidateRecord();
        //
        this.setCurrentSource(idx);
        (0, util_1.runValidateField)(this, record, schema_types_1.DEVTOOLS_METADATA_SCHEMA);
        // check any field is not in the spec
        this.ruleInSpec(record, Object.keys(schema_types_1.DEVTOOLS_METADATA_SCHEMA));
        this.resetCurrentSource();
        ret = this.result.delta(ret);
        return ret;
    }
    validateField(fieldName, record, schema) {
        let ret = this.result.clone();
        if (!schema) {
            schema = (0, util_1.getSchema)(schema_types_1.DEVTOOLS_METADATA_SCHEMA, fieldName);
            if (!schema) {
                this.reportNotInSpec([fieldName]);
                return this.result.delta(ret);
            }
        }
        // basic field validation
        let ignore = false;
        if (fieldName === 'connections') {
            if (record.type && record.type === 'ide') {
                ignore = true;
            }
        }
        if (!ignore) {
            this.validateFieldBasic(fieldName, record, schema);
        }
        // field specific validation
        switch (fieldName) {
            case 'id':
                // TODO: validate ID against the board list from CCS targetDB
                break;
            case 'connections':
                // TODO: validate ID against the connection list from CCS targetDB
                break;
            case 'name':
            case 'devices':
            case 'type':
            case 'description':
            case 'buyLink':
            case 'toolsPage':
            case 'descriptionLocation':
            case 'image':
                // no field specific check
                break;
        }
        ret = this.result.delta(ret);
        return ret;
    }
}
exports.DevtoolsValidator = DevtoolsValidator;
