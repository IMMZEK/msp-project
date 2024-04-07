"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentValidator = void 0;
const base_validator_1 = require("./base-validator");
const schema_types_1 = require("./schema-types");
const util_1 = require("./util");
/**
 * Validator class for '*.content.tirex.json'.
 */
class ContentValidator extends base_validator_1.Validator {
    constructor(logger, isSummary, logLimit) {
        super('Content', "content.tirex.json" /* MetadataFile.CONTENT */, logger, isSummary, logLimit);
    }
    validateFile(filePath, skipContents = false, pkgData) {
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
                        this.validateRecords(jsonObj, pkgData);
                    }
                }
            }
        }
        return this.result.delta(ret);
    }
    validateRecords(records, pkgData) {
        let ret = this.result.clone();
        records.forEach((record, idx) => {
            this.validateRecord(record, idx, pkgData);
        });
        ret = this.result.delta(ret);
        return ret;
    }
    validateRecord(record, idx, pkgData) {
        let ret = this.result.clone();
        super.preValidateRecord();
        //
        this.setCurrentSource(idx);
        Object.keys(schema_types_1.CONTENT_METADATA_SCHEMA).forEach((fieldName) => {
            const schema = (0, util_1.getSchema)(schema_types_1.CONTENT_METADATA_SCHEMA, fieldName);
            this.validateField(fieldName, record, schema, pkgData);
        });
        // check any field is not in the spec
        this.ruleInSpec(record, Object.keys(schema_types_1.CONTENT_METADATA_SCHEMA));
        this.resetCurrentSource();
        ret = this.result.delta(ret);
        return ret;
    }
    validateField(fieldName, record, schema, pkgData) {
        let ret = this.result.clone();
        if (!schema) {
            schema = (0, util_1.getSchema)(schema_types_1.CONTENT_METADATA_SCHEMA, fieldName);
            if (!schema) {
                this.reportNotInSpec([fieldName]);
                return this.result.delta(ret);
            }
        }
        const mainCat = 'mainCategories';
        // basic field validation
        if (fieldName !== 'devices' && fieldName !== 'devtools') {
            if (record.resourceType === schema_types_1.ResourceType.CATEGORY_INFO) {
                const modSchema = schema.clone();
                // categoryInfo is a special
                if (fieldName === 'location') {
                    modSchema.required = schema_types_1.Require.Optional;
                }
                else if (fieldName === 'mainCategories') {
                    modSchema.required = schema_types_1.Require.MandatoryAllowEmpty;
                }
                else if (fieldName === 'name' && record[fieldName]) {
                    const valMainCat = record[mainCat];
                    if (!valMainCat || (valMainCat && valMainCat.length === 0)) {
                        // root mainCategory
                        modSchema.semantic = schema_types_1.SemanticType.PredefinedString;
                        modSchema.extras = schema_types_1.MainCategory;
                    }
                    else if (valMainCat.length === 1 &&
                        valMainCat[0] === schema_types_1.MainCategory.DOCUMENTS) {
                        modSchema.semantic = schema_types_1.SemanticType.PredefinedString;
                        modSchema.extras = schema_types_1.MainCategorySubDocs;
                    }
                }
                this.validateFieldBasic(fieldName, record, modSchema);
            }
            else {
                this.validateFieldBasic(fieldName, record, schema);
            }
        }
        // field specific validation
        switch (fieldName) {
            case 'resourceType':
                break;
            case 'mainCategories':
                const fieldVal = record[fieldName];
                if (fieldVal && fieldVal.length > 0) {
                    if (fieldVal[0] === schema_types_1.MainCategory.DOCUMENTS && fieldVal.length > 1) {
                        const subDoc = fieldVal[1];
                        if (!Object.values(schema_types_1.MainCategorySubDocs).includes(subDoc)) {
                            this.log(schema_types_1.gRuleSettings.ItemListed, undefined, subDoc, fieldName, schema_types_1.MainCategorySubDocs.toString());
                        }
                    }
                }
                break;
            case 'devices':
                this.ruleValidDevice(fieldName, record, record[mainCat]);
                break;
            case 'devtools':
                this.ruleValidDevtools(fieldName, record, record[mainCat]);
                break;
            case 'coreTypes':
                if (record[fieldName]) {
                    this.ruleValidCoreType(fieldName, record);
                }
                break;
            case 'icon':
                if (typeof record[fieldName] === 'string') {
                    this.validateString(fieldName, record, schema);
                }
                break;
            case 'advanced':
                // TODO
                break;
            case 'resourceClass':
                if (record[fieldName]) {
                    this.ruleOnlyOneElement(fieldName, record);
                }
                // TODO
                break;
            case 'shortDescription':
                // TODO
                break;
            case 'localId':
            case 'localAliases': {
                if (pkgData && record[fieldName]) {
                    this.ruleUniqueElements(fieldName, record, pkgData);
                }
                break;
            }
            case 'sort': {
                const fieldVal = record[fieldName];
                if (fieldVal && fieldVal.length > 0) {
                    this.ruleSortValue(fieldName, fieldVal);
                }
            }
        }
        ret = this.result.delta(ret);
        return ret;
    }
}
exports.ContentValidator = ContentValidator;
