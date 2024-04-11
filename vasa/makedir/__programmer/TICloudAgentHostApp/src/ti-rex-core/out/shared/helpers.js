/**
 * Shared code which can be used across the code bases.
 * Due to the different environments each part of the code is run in this file has the following restrictions:
 *     - No typescript; put the typescript definitions in helpers.d.ts
 */
'use strict';
/**
 * Abstracts handling an array query param when it is a list. Note array query params with size 1 don't parse as a list.
 *
 */
exports.getQueryParamAsArray = function (param) {
    return Array.isArray(param) ? param : [param];
};
