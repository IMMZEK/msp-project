"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.index = exports.regexNotIndex = void 0;
const path = require("path");
const fse = require("fs-extra");
const jsonStableStringify = require("json-stable-stringify");
// @ts-ignore name mismatch with @types/jsonstrema
const JSONStream = require("JSONStream");
const fsutils_1 = require("../../utils/fsutils");
const tokenizer = /[ ,;:\n\t\r<>%(){}#!"&$/*+|~?'\\\[\]]/;
const MINIMUM_STRING_LENGTH = 3;
const MAXIMUM_STRING_LENGTH = 30;
const FILTER_TYPE_DEVICE = 'devices';
const FILTER_TYPE_DEVTOOL = 'devtools';
const FILTER_TYPE_PACKAGEUID = 'packageUId';
const FILTER_TYPE_FULLPATHS = 'fullPaths';
const FILTER_TYPES = [
    FILTER_TYPE_DEVICE,
    FILTER_TYPE_DEVTOOL,
    FILTER_TYPE_PACKAGEUID,
    FILTER_TYPE_FULLPATHS
];
const SEARCH_TYPE = 'search';
exports.regexNotIndex = /^((?!index).)*$/;
/**
 * index
 */
async function index(dbPath) {
    const resourceDbFullDir = path.join(dbPath, 'resources_full.db');
    const overviewDbDir = path.join(dbPath, 'overviews_split.db');
    const resourceDbFiles = (0, fsutils_1.readDirRecursive)(resourceDbFullDir, exports.regexNotIndex, 1);
    const overviewDbFiles = (0, fsutils_1.readDirRecursive)(overviewDbDir, exports.regexNotIndex, 1);
    let dbFilePaths = resourceDbFiles.map(file => path.join(resourceDbFullDir, file));
    dbFilePaths = dbFilePaths.concat(overviewDbFiles.map(file => path.join(overviewDbDir, file)));
    dbFilePaths.push(path.join(dbPath, 'overviews.db'));
    for (const dbFilePath of dbFilePaths) {
        await readStream(dbFilePath);
    }
}
exports.index = index;
function readStream(dbFilePath) {
    return new Promise((resolve, reject) => {
        const filterIndex = {};
        const searchIndex = {};
        fse.createReadStream(dbFilePath)
            .pipe(JSONStream.parse('$*'))
            .on('data', onData)
            .on('close', onClose)
            .on('error', onError);
        function onData({ value: record, key: recordIndex }) {
            for (const filterIndexType of FILTER_TYPES) {
                addRecordToIndex(record, recordIndex, filterIndexType, filterIndex);
            }
            addRecordToIndex(record, recordIndex, SEARCH_TYPE, searchIndex);
        }
        function onClose() {
            writeIndex(dbFilePath + '.filter.index', filterIndex);
            writeIndex(dbFilePath + '.search.index', searchIndex);
            resolve();
        }
        function onError(err) {
            reject(err);
        }
    });
}
function writeIndex(filename, index) {
    fse.writeFileSync(filename, jsonStableStringify(index, {
        space: 0,
        cmp: (a, b) => {
            return a.key < b.key ? -1 : 1; // sort ascending
        }
    }));
}
/**
 *
 * @param record
 * @param recordIndex
 * @param type
 * @param indexTable
 */
function addRecordToIndex(record, recordIndex, type, indexTable) {
    let words = [];
    if (type === FILTER_TYPE_PACKAGEUID && record.packageUId) {
        words = words.concat(record.packageUId);
    }
    if (type === FILTER_TYPE_FULLPATHS && record.fullPaths) {
        for (const fullPath of record.fullPaths) {
            words = words.concat(fullPath);
        }
    }
    if (type === FILTER_TYPE_DEVTOOL && record.devtools) {
        words = words.concat(record.devtools);
    }
    if (type === FILTER_TYPE_DEVICE && record.devices) {
        words = words.concat(record.devices);
    }
    if (type === SEARCH_TYPE) {
        if (record.fullPaths) {
            for (const fullPath of record.fullPaths) {
                words = words.concat(tokenizeArray(fullPath));
            }
        }
        if (record.devtools) {
            words = words.concat(tokenizeArray(record.devtools));
        }
        if (record.devices) {
            words = words.concat(tokenizeArray(record.devices));
        }
        if (record.coreTypes) {
            words = words.concat(tokenizeArray(record.coreTypes));
        }
        if (record.tags) {
            words = words.concat(tokenizeArray(record.tags));
        }
        if (record.compiler) {
            words = words.concat(tokenizeArray(record.compiler));
        }
        if (record.kernel) {
            words = words.concat(tokenizeArray(record.kernel));
        }
        if (record.description) {
            words = words.concat(record.description.split(tokenizer));
        }
        if (record.name) {
            words = words.concat(record.name.split(tokenizer));
        }
    }
    const uniqueWords = {};
    for (const _word of words) {
        if (typeof _word !== 'string') {
            continue;
        }
        let word;
        if (type === SEARCH_TYPE) {
            word = _word.toLowerCase();
            if (word.charAt(0) === '.') {
                word = word.substr(1);
            }
            if (word.length < MINIMUM_STRING_LENGTH) {
                continue;
            }
            else if (word.length > MAXIMUM_STRING_LENGTH) {
                continue;
            }
            else if (word.search(/.*\w.*/) === -1) {
                continue;
            }
        }
        else {
            word = _word;
        }
        uniqueWords[word] = true;
    }
    for (const word of Object.keys(uniqueWords)) {
        if (!indexTable[type]) {
            indexTable[type] = {};
        }
        if (!indexTable[type][word]) {
            indexTable[type][word] = [];
        }
        indexTable[type][word].push(recordIndex);
    }
}
function tokenizeArray(array) {
    const tokenizedArray = array.map(v => (v.split ? v.split(tokenizer) : []));
    const tokens = [].concat(...tokenizedArray);
    return tokens;
}
