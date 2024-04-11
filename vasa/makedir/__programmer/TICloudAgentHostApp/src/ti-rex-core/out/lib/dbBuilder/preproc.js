"use strict";
/**
 * Created by osohm on 28/05/15.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.process = exports.processFile = void 0;
// tslint:disable:no-string-throw
// Disabling for whole file - we'll need to fix up the code that catches to change this
const fse = require("fs-extra");
const rexError_1 = require("../../utils/rexError");
const util_1 = require("../../shared/util");
function isTextMacro(m) {
    return 'textmacro' in m;
}
function isArrayMacro(m) {
    return 'arraymacro' in m;
}
function isSetMacro(m) {
    return 'setmacro' in m;
}
/**
 * Helper for preprocessing *.tirex.json files
 */
async function processFile(jsonFile, existingMacros, logger) {
    let jsonText;
    try {
        jsonText = await fse.readFile(jsonFile, 'utf8');
    }
    catch (err) {
        // logger.debug('File' + jsonFile + ' not found, skipping ...');
        return;
    }
    // logger.debug('Read ' + jsonFile + ' successfully');
    let preprocResult;
    try {
        preprocResult = process(jsonText, existingMacros, logger);
    }
    catch (e) {
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
            message: `Error preprocessing json file ${jsonFile}`,
            causeError: e
        });
    }
    // logger.debug('Preprocessed json data');
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < preprocResult.unresolvedMacros.length; i++) {
        logger.error('Unresolved macro ' + preprocResult.unresolvedMacros[i]);
    }
    if (preprocResult.unresolvedMacros.length > 0) {
        throw new rexError_1.RefreshError({
            refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
            message: 'Aborting due to unresolved macros'
        });
    }
    return preprocResult;
}
exports.processFile = processFile;
/**
 *
 * - array macros are converted to text macros
 *    + cannot use '.' in the name (reserved for setmacro references)
 * - text macros are replaced in the json text
 *    + cannot use '.' in the name (reserved for setmacro references)
 * - set macros are expanded in the objectified json
 *    + fields can only contain the reference to the macro, nothing else (unlike text macros)
 */
function process(jsonText, existingMacros, logger, keepMacroRecords = false) {
    let macroName;
    let macro;
    const macros = { text: {}, set: {} };
    if (existingMacros != null) {
        let prop;
        for (prop in macros) {
            if (macros.hasOwnProperty(prop)) {
                if (existingMacros[prop]) {
                    (0, util_1.setValueForPair)(macros, existingMacros, prop, value => deepCopy(value));
                }
            }
        }
    }
    // find all text and array macro definitions
    // NOTE: ARRAY MACROS ARE CONVERTED TO TEXT MACROS
    let records = JSON.parse(jsonText);
    findTextAndArraymacroDefs(records);
    // first replace all text macros inside other text macros; do as many passes as necessary until
    // there no more nested text macros
    replaceNestedTextmacros();
    // now replace all text macros in the json text in a single pass
    const jsonTextResult = replaceMacros(jsonText, macros.text);
    records = JSON.parse(jsonTextResult.text);
    // now process the setmacros
    if (findSetmacroDefs(records) === true || macros.set != null) {
        expandSetmacros(records);
    }
    if (!keepMacroRecords) {
        // remove all macro definition records
        // or keep them for validation stage
        for (let ifr = records.length - 1; ifr >= 0; ifr--) {
            const finalRecord = records[ifr];
            if (isTextMacro(finalRecord) || isArrayMacro(finalRecord) || isSetMacro(finalRecord)) {
                records.splice(ifr, 1);
            }
        }
    }
    // Update type now that macros are removed
    const processedRecords = records;
    // check for any unresolved macros
    const unresolvedMacros = findUnresolvedMacros(processedRecords);
    return { records: processedRecords, unresolvedMacros, macros };
    /**
     *
     * @param records2
     * @returns {Array}
     */
    function findUnresolvedMacros(records2) {
        const text = JSON.stringify(records2); // TODO: performance?
        const $macroRe = /\$\(.*?\)/g;
        let execResult;
        const unresolvedMacros2 = [];
        // tslint:disable-next-line:no-conditional-assignment
        while ((execResult = $macroRe.exec(text)) !== null) {
            unresolvedMacros2.push(execResult[0]);
        }
        return unresolvedMacros2;
    }
    /**
     * find all textmacro and arraymacro definitions
     * NOTE: ARRAY MACROS ARE CONVERTED TO TEXT MACROS
     */
    function findTextAndArraymacroDefs(records2) {
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < records2.length; i++) {
            const record = records2[i];
            if (isTextMacro(record)) {
                if (record.value == null) {
                    const msg = 'textmacro must have a "value"';
                    logger.critical(msg);
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: msg
                    });
                }
                else {
                    macros.text[record.textmacro] = { value: record.value };
                }
            }
            else if (isArrayMacro(record)) {
                if (record.value == null) {
                    const msg = 'arraymacro must have a "value"';
                    logger.critical(msg);
                    throw new rexError_1.RefreshError({
                        refreshMessageLevel: 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */,
                        message: msg
                    });
                }
                else {
                    macros.text[record.arraymacro] = { value: record.value.join('","') };
                }
            }
        }
    }
    /**
     * replace all text macros inside other text macros; do as many passes as necessary until
     * there no more nested text macros
     */
    function replaceNestedTextmacros() {
        let count = Number.MAX_VALUE;
        let previousCount;
        do {
            previousCount = count;
            count = 0;
            for (macroName in macros.text) {
                if (macros.text.hasOwnProperty(macroName)) {
                    const result = replaceMacros(macros.text[macroName].value, macros.text);
                    count += result.count;
                    macros.text[macroName].value = result.text;
                }
            }
        } while (count > 0 && count < previousCount);
        if (count >= previousCount) {
            throw 'Circular Macro';
        }
    }
    /**
     *
     * @param text
     * @param macroTable
     * @param macroType
     * @returns {number}
     */
    function replaceMacros(text, macroTable) {
        const $macroRe = /\$\((.*?)\)/g; // looks for '$(macroname)' and remembers macroname
        let replacedCount = 0;
        const newtext = text.replace($macroRe, (match, macroname) => {
            macro = macroTable[macroname];
            if (macro != null) {
                replacedCount++;
                return macro.value;
            }
            else {
                return match; // don't replace
            }
        });
        const result = { count: replacedCount, text: newtext };
        return result;
    }
    /**
     * find all setmacro definitions
     */
    function findSetmacroDefs(records2) {
        let found = false;
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < records2.length; i++) {
            const record = records2[i];
            if (isSetMacro(record)) {
                if (record.values == null) {
                    throw 'setmacro must have "values"';
                }
                if (record.fields == null) {
                    throw 'setmacro must have "fields"';
                }
                const fieldIndices = {};
                for (let f = 0; f < record.fields.length; f++) {
                    const field = record.fields[f];
                    fieldIndices[field] = f;
                }
                macros.set[record.setmacro] = { values: record.values, fieldIndices };
                found = true;
            }
        }
        return found;
    }
    /**
     * find and expand set macros
     *
     * @param records2
     */
    function expandSetmacros(records2) {
        // find and expand set macros
        let fieldsToReplace = {};
        let numSets = 0;
        for (let iRecord = records2.length - 1; iRecord >= 0; iRecord--) {
            const record = records2[iRecord];
            fieldsToReplace = {};
            numSets = 0;
            if (find(record) === true) {
                const expandedRecords = expand(record);
                // replace original record with expanded records
                const spliceArgs = [iRecord, 1].concat(expandedRecords);
                Array.prototype.splice.apply(records2, spliceArgs);
            }
        }
        // check if a record using a setmacro
        function find(theRecord) {
            const record = theRecord;
            const $macrosetRe = /\$\((.*?)\.(.*?)\)/; // $(setmacroname.fieldname)
            let found = false;
            let recordField;
            for (recordField in record) {
                if (record.hasOwnProperty(recordField) && typeof recordField === 'string') {
                    // test is faster than exec
                    if ($macrosetRe.test(record[recordField]) === true) {
                        const matchResult = $macrosetRe.exec(record[recordField]);
                        const setmacro = matchResult[1];
                        const setmacroField = matchResult[2];
                        if (macros.set[setmacro] != null) {
                            // we found a setmacro usage
                            found = true;
                            if (record[recordField] !== matchResult[0]) {
                                throw 'Field value must only consist of setmacro reference';
                            }
                            fieldsToReplace[recordField] = { setmacro, setmacroField };
                            if (macros.set[setmacro].values.length > numSets) {
                                numSets = macros.set[setmacro].values.length;
                            }
                        }
                    }
                }
            }
            return found;
        }
        // expand the record
        function expand(record) {
            const expandedRecords = [];
            for (let i = 0; i < numSets; i++) {
                // Cast as any so we can update arbitrary fields
                const newRecord = deepCopy(record);
                for (const recordField in fieldsToReplace) {
                    if (fieldsToReplace.hasOwnProperty(recordField)) {
                        const setmacro = fieldsToReplace[recordField].setmacro;
                        const setmacroField = fieldsToReplace[recordField].setmacroField;
                        const fieldIndex = macros.set[setmacro].fieldIndices[setmacroField];
                        newRecord[recordField] = macros.set[setmacro].values[i][fieldIndex];
                    }
                }
                expandedRecords.push(newRecord);
            }
            return expandedRecords;
        }
    }
    /**
     * Based on http://stackoverflow.com/questions/122102/
     * what-is-the-most-efficient-way-to-clone-an-object/5344074#5344074
     * Note: it doesn't copy functions, Date and Regex's
     * @param obj
     * @returns {*}
     */
    function deepCopy(obj) {
        // TODO: move into a util class
        return JSON.parse(JSON.stringify(obj));
    }
}
exports.process = process;
