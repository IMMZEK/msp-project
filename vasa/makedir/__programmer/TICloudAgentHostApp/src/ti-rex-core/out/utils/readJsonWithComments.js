"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readJsonWithComments = exports.readJsonWithCommentsCb = void 0;
const fs = require("fs-extra");
const util_1 = require("util");
const stripJsonComments = require("strip-json-comments");
exports.readJsonWithCommentsCb = (0, util_1.callbackify)(readJsonWithComments);
async function readJsonWithComments(file) {
    const text = await fs.readFile(file, 'utf8');
    const textNoComments = stripJsonComments(text);
    return JSON.parse(textNoComments);
}
exports.readJsonWithComments = readJsonWithComments;
