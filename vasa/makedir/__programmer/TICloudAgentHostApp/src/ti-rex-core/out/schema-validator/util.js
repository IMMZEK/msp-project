"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRuleSetting = exports.insertBlankLine = exports.setPackageMetadataList = exports.findFiles = exports.findMacrosFiles = exports.findDevtoolFiles = exports.findDeviceFiles = exports.findContentFiles = exports.getSchema = exports.runValidateField = exports.getSuggestion = exports.isValidHtml = exports.isValidUrl = exports.isInList = exports.isHTTP = exports.jsonLineNum = exports.extendJsonErrorMsg = exports.levenshtein = exports.ConsoleLogger = void 0;
const fs = require("fs-extra");
const url_1 = require("url");
const path = require("path");
const logging_1 = require("../utils/logging");
const schema_types_1 = require("./schema-types");
const console_1 = require("console"); // for standalone only
const dbBuilderUtils_1 = require("../lib/dbBuilder/dbBuilderUtils");
///////////////////////////////////////////////////////////////////////////////
/// Class for ConsoleLogger
///////////////////////////////////////////////////////////////////////////////
class ConsoleLogger extends logging_1.BaseLogger {
    logger;
    output;
    constructor(file) {
        super();
        if (file) {
            this.output = fs.createWriteStream(file);
            this.logger = new console_1.Console(this.output);
        }
        else {
            this.logger = console;
        }
        // create log functions which map to BaseLogger functions
        const loggerPriorities = [
            'emergency',
            'alert',
            'critical',
            'error',
            'warning',
            'notice',
            'info',
            'debug',
            'fine',
            'finer',
            'finest'
        ];
        loggerPriorities.forEach((pri) => {
            this._createLogFunction(pri);
        });
    }
    recommended = (_message, _tags = []) => 
    // tslint:disable-next-line:semicolon
    this.logger.log(`[recommended] ${_message}`);
    gap = () => (this.output ? this.output.write('\n') : this.logger.log('\n'));
    _createLogFunction(name) {
        // needs to be done for each instance
        // (need to attach this._name to dinfraLog message)
        this[name] = (message, _tags = []) => {
            // TODO - more formatting
            this.logger.log(`[${name}] ${message}`);
        };
    }
}
exports.ConsoleLogger = ConsoleLogger;
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
// Utility functions
/**
 * Simple levenshtein implementation, from github: keesey/levenshtein.ts
 *
 * @param a String 1
 * @param b String 2
 * @return The distance between the 2 strings
 */
function levenshtein(a, b) {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) {
        return bn;
    }
    if (bn === 0) {
        return an;
    }
    const matrix = new Array(bn + 1);
    for (let i = 0; i <= bn; ++i) {
        const row = (matrix[i] = new Array(an + 1));
        row[0] = i;
    }
    const firstRow = matrix[0];
    for (let j = 1; j <= an; ++j) {
        firstRow[j] = j;
    }
    for (let i = 1; i <= bn; ++i) {
        for (let j = 1; j <= an; ++j) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] =
                    Math.min(matrix[i - 1][j - 1], // substitution
                    matrix[i][j - 1], // insertion
                    matrix[i - 1][j] // deletion
                    ) + 1;
            }
        }
    }
    return matrix[bn][an];
}
exports.levenshtein = levenshtein;
/**
 * Extend the error message from JSON file parser with rough location in the JSON file.
 *
 * @param filePath Full path of the JSON file
 * @param err Input error message from JSON parser
 * @return Extended error message
 */
function extendJsonErrorMsg(filePath, err) {
    let msg = err;
    const re = new RegExp('at position (\\d+)');
    const m = err.match(re);
    if (m === null) {
        return msg;
    }
    const pos = Number.parseInt(m[1]);
    if (Number.isNaN(pos)) {
        return msg;
    }
    const jsonText = fs.readFileSync(filePath, 'utf8');
    const tabSize = 4;
    let rowNo = 1;
    let colNo = 1;
    let posNo = -1;
    for (const ch of jsonText) {
        posNo++;
        if (posNo >= pos) {
            msg = err.replace(m[0], `${m[0]} (line:${rowNo}, pos:${colNo})`);
            break;
        }
        if (ch === '\n') {
            rowNo++;
            colNo = 1;
            continue;
        }
        else if (ch === '\r') {
            colNo = 1;
            continue;
        }
        else if (ch === '\t') {
            colNo += tabSize - 1;
        }
        colNo++;
    }
    return msg;
}
exports.extendJsonErrorMsg = extendJsonErrorMsg;
/**
 * Find roughly the location of json object in the JSON file.
 *
 * @param filePath Full path of the JSON file
 * @return A map of object index to [startLineNo, startColumn, endLineNo, endColumn]
 */
function jsonLineNum(filePath) {
    const tabSize = 4;
    const idxMap = [];
    let rowNo = 0;
    let colNo = 0;
    let objIdx = -1;
    let objStartLine = -1;
    let objStartPos = -1;
    let curlyBrackets = 0;
    let objCount = 1;
    const jsonText = fs.readFileSync(filePath, 'utf8');
    try {
        const jsonObj = JSON.parse(jsonText);
        if (!jsonObj) {
            return;
        }
        if (Array.isArray(jsonObj)) {
            objCount = jsonObj.length;
        }
    }
    catch (e) {
        return;
    }
    for (const ch of jsonText) {
        if (ch === '\n') {
            rowNo++;
            colNo = 0;
            continue;
        }
        else if (ch === '\r') {
            colNo = 0;
            continue;
        }
        else if (ch === '\t') {
            colNo += tabSize;
            colNo -= colNo % tabSize;
            continue;
        }
        else if (ch === '{') {
            curlyBrackets++;
            if (curlyBrackets === 1) {
                objIdx++;
                objStartLine = rowNo;
                objStartPos = colNo;
            }
        }
        else if (ch === '}') {
            curlyBrackets--;
            if (curlyBrackets === 0) {
                idxMap.push([objStartLine + 1, objStartPos + 1, rowNo + 1, colNo + 1]);
            }
            else if (curlyBrackets < 0) {
                return;
            }
        }
        colNo++;
    }
    if (objIdx + 1 !== objCount) {
        // console.log('error: array size not matched');
        return;
    }
    return idxMap;
}
exports.jsonLineNum = jsonLineNum;
function isHTTP(str) {
    return str.toLowerCase().startsWith('http');
}
exports.isHTTP = isHTTP;
function isInList(item, list) {
    return list.indexOf(item) >= 0;
}
exports.isInList = isInList;
function isValidUrl(str) {
    // // TODO: set up rules for different levels? strict, loose, TI, ...?
    // //
    // // Simple validation, not 100%.
    try {
        // tslint:disable-next-line:no-unused-expression
        new url_1.URL(str);
        return true;
    }
    catch (err) {
        return false;
    }
}
exports.isValidUrl = isValidUrl;
function isValidHtml(_str) {
    // TODO: this 3rd party lib helps but not great, consider using it if no better choice
    // try {
    //     htmlTagValidator(str);
    // } catch (e) {
    //     return false;
    // }
    return true;
}
exports.isValidHtml = isValidHtml;
function getSuggestion(word, dict) {
    let suggestion = '';
    if (!dict) {
        return suggestion;
    }
    let shortestDist = Number.MAX_VALUE;
    let bestMatch = '';
    for (const cword of dict) {
        const dist = levenshtein(word, cword);
        if (shortestDist < 0 || dist < shortestDist) {
            shortestDist = dist;
            bestMatch = cword;
        }
    }
    if (shortestDist / word.length <= 0.34) {
        suggestion = bestMatch;
    }
    return suggestion;
}
exports.getSuggestion = getSuggestion;
function runValidateField(v, record, metadataSchema) {
    let skipDescription = false;
    Object.keys(metadataSchema).forEach((fieldName) => {
        const schema = getSchema(metadataSchema, fieldName);
        if (fieldName === 'description' || fieldName === 'descriptionLocation') {
            if (!skipDescription) {
                v.validateField(fieldName, record, schema);
                skipDescription = true;
            }
        }
        else {
            v.validateField(fieldName, record, schema);
        }
    });
}
exports.runValidateField = runValidateField;
function getSchema(metadataSchema, fieldName) {
    const { required, dataType, semantic, description, example, extras, extrasOptional } = metadataSchema[fieldName];
    return new schema_types_1.MetaFieldSchema(fieldName, required, dataType, semantic, description, example, extras, extrasOptional);
}
exports.getSchema = getSchema;
function findContentFiles(dir) {
    return findFiles(dir, 0, "content.tirex.json" /* MetadataFile.CONTENT */);
}
exports.findContentFiles = findContentFiles;
function findDeviceFiles(dir) {
    return findFiles(dir, 0, "devices.tirex.json" /* MetadataFile.DEVICES */);
}
exports.findDeviceFiles = findDeviceFiles;
function findDevtoolFiles(dir) {
    return findFiles(dir, 0, "devtools.tirex.json" /* MetadataFile.DEVTOOLS */);
}
exports.findDevtoolFiles = findDevtoolFiles;
function findMacrosFiles(dir) {
    return findFiles(dir, 0, "macros.tirex.json" /* MetadataFile.MACROS */);
}
exports.findMacrosFiles = findMacrosFiles;
function findFiles(dir, level, endsWith) {
    const found = [];
    const clevel = level + 1;
    if (clevel > 3) {
        return found;
    }
    const subdirs = [];
    try {
        const cfiles = fs.readdirSync(dir);
        cfiles.forEach((cfile) => {
            const filepath = path.join(dir, cfile);
            const stat = fs.lstatSync(filepath);
            if (stat.isDirectory()) {
                subdirs.push(filepath);
            }
            else {
                if (cfile.endsWith(endsWith)) {
                    found.push(filepath);
                }
            }
        });
        subdirs.forEach((subdir) => {
            const subdirFound = findFiles(subdir, clevel, endsWith);
            Array.prototype.push.apply(found, subdirFound);
        });
    }
    catch (err) {
        return found;
    }
    return found;
}
exports.findFiles = findFiles;
function setPackageMetadataList(packageMetadataList, packageFolder, id, version, type) {
    packageMetadataList.set((0, dbBuilderUtils_1.formUid)(id, version), {
        id,
        version,
        packageFolder,
        type
    });
}
exports.setPackageMetadataList = setPackageMetadataList;
function insertBlankLine(logger) {
    if (logger instanceof ConsoleLogger) {
        logger.gap();
    }
}
exports.insertBlankLine = insertBlankLine;
function updateRuleSetting(ruleEntity, priority) {
    ruleEntity.priority = priority;
}
exports.updateRuleSetting = updateRuleSetting;
