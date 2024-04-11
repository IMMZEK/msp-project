"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageValidator = void 0;
const path = require("path");
const semver = require("semver");
const base_validator_1 = require("./base-validator");
const schema_types_1 = require("./schema-types");
const util_1 = require("./util");
const versioning_1 = require("../lib/versioning");
/**
 * Validator class for 'package.tirex.json'.
 */
class PackageValidator extends base_validator_1.Validator {
    pkgHeaderRecord = {};
    metaVer = { major: 0, minor: 0, patch: 0 };
    skipped = false;
    settings = {
        ignoreFields: [],
        ignorePackages: [],
        logLimit: Number.MAX_SAFE_INTEGER,
        compatibleVersionOnly: true
    };
    constructor(logger, isSummary, logLimit) {
        super('Package', "package.tirex.json" /* MetadataFile.PACKAGE */, logger, isSummary, logLimit);
    }
    validateFile(filePath, skipContents = false) {
        this.skipped = false;
        const ret = this.result.clone();
        if (super.preValidateFile(filePath).isPassed()) {
            const jsonObj = this.readJson(filePath);
            if (jsonObj && !skipContents) {
                if (this.validateNumberOfHeaders(jsonObj)) {
                    if (this.validateRecord(jsonObj[0], 0).isPassed()) {
                        Object.assign(this.pkgHeaderRecord, jsonObj[0]); // save for future reference
                    }
                }
            }
        }
        return this.result.delta(ret);
    }
    validateRecords(records) {
        this.skipped = false;
        let ret = this.result.clone();
        if (this.validateNumberOfHeaders(records)) {
            records.forEach((record, idx) => {
                const re = new RegExp('^(\\d+).(\\d+).(\\d+)$');
                const field = 'metadataVersion';
                const ver = record[field]; // xx.xx.xx
                if (!ver) {
                    // Exclude old packages that do not have a metadata version
                    // This semver is used to perform schema validaiton for these
                    // old packages when version is set to less than 3.1.
                    if (this.isIgnorePackage(record) &&
                        !semver.gte('3.0.0', `${schema_types_1.cfgMetaVer.major}.${schema_types_1.cfgMetaVer.minor}.${schema_types_1.cfgMetaVer.patch}`)) {
                        this.log(schema_types_1.gRuleSettings.GenericInfo, undefined, 'An old package which does not have a schema version...skipping this package');
                        this.skipped = true;
                    }
                    else {
                        this.validateRecord(record, idx);
                    }
                }
                else {
                    const match = ver.match(re);
                    if (match === null) {
                        this.log(schema_types_1.gRuleSettings.StringFormat, undefined, field, 'xx.xx.xx');
                    }
                    this.metaVer = {
                        major: Number.parseInt(match[1]),
                        minor: Number.parseInt(match[2]),
                        patch: Number.parseInt(match[3])
                    };
                    const metaVer = `${this.metaVer.major}.${this.metaVer.minor}.${this.metaVer.patch}`;
                    if (!semver.gte(metaVer, `${schema_types_1.cfgMetaVer.major}.${schema_types_1.cfgMetaVer.minor}.${schema_types_1.cfgMetaVer.patch}`) &&
                        this.settings.compatibleVersionOnly) {
                        this.log(schema_types_1.gRuleSettings.VersionSupport, undefined, field, ver, `${schema_types_1.cfgMetaVer.major}.${schema_types_1.cfgMetaVer.minor}.${schema_types_1.cfgMetaVer.patch}`);
                        this.skipped = true;
                    }
                    else {
                        this.validateRecord(record, idx);
                    }
                }
            });
        }
        ret = this.result.delta(ret);
        return ret;
    }
    validateRecord(record, idx) {
        super.preValidateRecord();
        let ret = this.result.clone();
        this.setCurrentSource(idx);
        for (const fieldName of Object.keys(schema_types_1.PACKAGE_METADATA_SCHEMA)) {
            const schema = (0, util_1.getSchema)(schema_types_1.PACKAGE_METADATA_SCHEMA, fieldName);
            this.validateField(fieldName, record, schema);
            if (this.skipped) {
                break;
            }
        }
        // check any field is not in the spec
        if (!this.skipped) {
            this.ruleInSpec(record, Object.keys(schema_types_1.PACKAGE_METADATA_SCHEMA));
        }
        this.resetCurrentSource();
        ret = this.result.delta(ret);
        if (idx === 0) {
            Object.assign(this.pkgHeaderRecord, record); // save for future reference
        }
        return ret;
    }
    validateField(fieldName, record, schema) {
        let ret = this.result.clone();
        if (!schema) {
            schema = (0, util_1.getSchema)(schema_types_1.PACKAGE_METADATA_SCHEMA, fieldName);
            if (!schema) {
                this.reportNotInSpec([fieldName]);
                return this.result.delta(ret);
            }
        }
        // basic field validation
        this.validateFieldBasic(fieldName, record, schema);
        // field specific validation
        switch (fieldName) {
            case 'type':
                if (this.filePath) {
                    const rpath = path.dirname(this.filePath);
                    if (record.type === schema_types_1.PackageType.DEVICES) {
                        // Devices package, should have devices.tirex.json
                        this.ruleFileExists(path.join(rpath, "devices.tirex.json" /* MetadataFile.DEVICES */), fieldName);
                        this.ruleFileExistsNot(path.join(rpath, "devtools.tirex.json" /* MetadataFile.DEVTOOLS */));
                    }
                    else if (record.type === schema_types_1.PackageType.DEVTOOLS) {
                        // Devtools package, should have devtools.tirex.json
                        this.ruleFileExists(path.join(rpath, "devtools.tirex.json" /* MetadataFile.DEVTOOLS */), fieldName);
                        this.ruleFileExistsNot(path.join(rpath, "devices.tirex.json" /* MetadataFile.DEVICES */));
                    }
                    else if (record.type === schema_types_1.PackageType.SOFTWARE) {
                        // Software package, should not have devices & devtools tirex.json
                        this.ruleFileExistsNot(path.join(rpath, "devices.tirex.json" /* MetadataFile.DEVICES */));
                        this.ruleFileExistsNot(path.join(rpath, "devtools.tirex.json" /* MetadataFile.DEVTOOLS */));
                    }
                }
                break;
            case 'version':
                this.validateVersionFormat(fieldName, record);
                break;
            case 'supplements':
                this.validateSupplements(fieldName, record);
                break;
            case 'dependencies':
                this.validateDependencies(fieldName, record);
                break;
            case 'devices':
                this.ruleValidDevice(fieldName, record);
                break;
            case 'devtools':
                this.ruleValidDevtools(fieldName, record);
                break;
            case 'rootCategory':
                // TODO: valid path
                break;
            case 'description':
            case 'license':
            case 'hideNodeDirPanel':
            case 'image':
            case 'restrictions':
            case 'subType':
            case 'featureType':
            case 'ccsVersion':
            case 'ccsInstallLocation':
                // no field specific check is needed ... yet
                break;
        }
        ret = this.result.delta(ret);
        return ret;
    }
    validateNumberOfHeaders(records) {
        if (records.length === 1) {
            return true;
        }
        if (records.length === 0) {
            this.log(schema_types_1.gRuleSettings.GenericError, undefined, 'No package header found');
        }
        else {
            this.log(schema_types_1.gRuleSettings.GenericError, undefined, 'Multiple package headers not allowed');
        }
        return false;
    }
    validateVersionFormat(field, record) {
        const ver = record[field];
        if (!ver) {
            return false;
        }
        const match = (0, versioning_1.valid)(ver);
        if (match === null) {
            this.log(schema_types_1.gRuleSettings.StringFormat, undefined, 'version', 'xx.xx.xx.xx or xx.xx.xx (extra string can be added at the end)');
            return false;
        }
        return true;
    }
    validateMetaVer(field, record) {
        const re = new RegExp('^(\\d+).(\\d+).(\\d+)$');
        const ver = record[field]; // xx.xx.xx
        if (!ver) {
            return false;
        }
        const match = ver.match(re);
        if (match === null) {
            this.log(schema_types_1.gRuleSettings.StringFormat, undefined, field, 'xx.xx.xx');
            return false;
        }
        this.metaVer = {
            major: Number.parseInt(match[1]),
            minor: Number.parseInt(match[2]),
            patch: Number.parseInt(match[3])
        };
        if (this.metaVer.major !== schema_types_1.cfgMetaVer.major) {
            // version not matched
            this.log(schema_types_1.gRuleSettings.VersionSupport, undefined, field, ver, `${schema_types_1.cfgMetaVer.major}.${schema_types_1.cfgMetaVer.minor}.${schema_types_1.cfgMetaVer.patch}`);
            return false;
        }
        return true;
    }
    validateSupplements(field, record) {
        const sup = record[field]; // {"packageId": "xxx", "semver": "xxxx"}
        if (!sup) {
            // optional
            return true;
        }
        let ret = this.result.clone();
        this.setCurrentSubSource(field);
        Object.keys(schema_types_1.SUPPLEMENTS_METADATA_SCHEMA).forEach((fieldName) => {
            const schema = (0, util_1.getSchema)(schema_types_1.SUPPLEMENTS_METADATA_SCHEMA, fieldName);
            // basic field validation
            this.validateFieldBasic(fieldName, sup, schema);
        });
        this.resetCurrentSubSource();
        ret = this.result.delta(ret);
        return ret.isPassed();
    }
    validateDependencies(field, record) {
        const dependencies = record[field]; // [{"packageId": "xxx", "version": "xxxx", "require": ""}]
        if (!dependencies) {
            // optional
            return true;
        }
        let ret = this.result.clone();
        this.setCurrentSubSource(field);
        dependencies.forEach((dependency, idx) => {
            this.setCurrentSubSource(`${field}[${idx}]`);
            Object.keys(schema_types_1.DEPENDENCIES_METADATA_SCHEMA).forEach((fieldName) => {
                const schema = (0, util_1.getSchema)(schema_types_1.DEPENDENCIES_METADATA_SCHEMA, fieldName);
                //  basic checking
                this.validateFieldBasic(fieldName, dependency, schema);
                if (fieldName === schema_types_1.Dependency.VERSION) {
                    this.validateVersionFormat(fieldName, record);
                }
            });
            // TODO: check if the package physically exists, give warning or error?
            //       This is not schema check but environment/setup check!
        });
        this.resetCurrentSubSource();
        ret = this.result.delta(ret);
        return ret.isPassed();
    }
}
exports.PackageValidator = PackageValidator;
