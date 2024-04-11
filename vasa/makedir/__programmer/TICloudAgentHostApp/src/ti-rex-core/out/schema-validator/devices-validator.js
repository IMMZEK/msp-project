"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesValidator = void 0;
const base_validator_1 = require("./base-validator");
const util_1 = require("./util");
const schema_types_1 = require("./schema-types");
/**
 * Validator class for 'devices.tirex.json'.
 */
class DevicesValidator extends base_validator_1.Validator {
    constructor(logger, isSummary, logLimit) {
        super('Devices', "devices.tirex.json" /* MetadataFile.DEVICES */, logger, isSummary, logLimit);
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
        (0, util_1.runValidateField)(this, record, schema_types_1.DEVICES_METADATA_SCHEMA);
        // check any field is not in the spec
        this.ruleInSpec(record, Object.keys(schema_types_1.DEVICES_METADATA_SCHEMA));
        this.resetCurrentSource();
        ret = this.result.delta(ret);
        return ret;
    }
    validateField(fieldName, record, schema) {
        let ret = this.result.clone();
        if (!schema) {
            schema = (0, util_1.getSchema)(schema_types_1.DEVICES_METADATA_SCHEMA, fieldName);
            if (!schema) {
                this.reportNotInSpec([fieldName]);
                return this.result.delta(ret);
            }
        }
        // basic field validation
        this.validateFieldBasic(fieldName, record, schema);
        // field specific validation
        switch (fieldName) {
            case 'parent':
                switch (record.type) {
                    case schema_types_1.DeviceType.DEVICE:
                        if (this.ruleFieldDefined(fieldName, record)) {
                            if (this.ruleNonEmptyContent(fieldName, record)) {
                                // TODO: check if the specified subfamily or family exist
                            }
                        }
                        break;
                    case schema_types_1.DeviceType.SUBFAMILY:
                        if (this.ruleFieldDefined(fieldName, record)) {
                            if (this.ruleNonEmptyContent(fieldName, record)) {
                                // TODO: check if the specified family exist
                            }
                        }
                        break;
                    case schema_types_1.DeviceType.FAMILY:
                        // This field should not be defined
                        this.ruleFieldDefinedNot(fieldName, record);
                        break;
                }
                break;
            case 'coreTypes':
                if (record.type && record.type === schema_types_1.DeviceType.DEVICE) {
                    this.ruleValidCoreType(fieldName, record);
                }
                break;
            case 'id':
                // TODO: validate ID against the device list from CCS targetDB
                break;
            case 'name':
            case 'type':
            case 'description':
            case 'descriptionLocation':
            case 'image':
                // no field specific check
                break;
        }
        ret = this.result.delta(ret);
        return ret;
    }
}
exports.DevicesValidator = DevicesValidator;
