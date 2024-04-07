"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIsFactory = exports.APIsBase = void 0;
const _ = require("lodash");
const apis_1 = require("../../frontend/apis/apis");
// Base class for both the saver and validator.
class APIsBase {
    getNodesResult;
    getExtendedNodesResult;
    getFilteredChildrenNodesResult;
    getSearchSuggestionsResult;
    // The real implementation that is being wrapped
    apis = new apis_1.APIs();
    // Constructor takes arrays of values to compare against
    constructor(getNodesResult = [], getExtendedNodesResult = [], getFilteredChildrenNodesResult = [], getSearchSuggestionsResult = []) {
        this.getNodesResult = getNodesResult;
        this.getExtendedNodesResult = getExtendedNodesResult;
        this.getFilteredChildrenNodesResult = getFilteredChildrenNodesResult;
        this.getSearchSuggestionsResult = getSearchSuggestionsResult;
    }
    // This function returns void, so we may as well implement it here
    expandNode(id, urlQuery) {
        return this.apis.expandNode(id, urlQuery);
    }
}
exports.APIsBase = APIsBase;
class RequestSaver extends APIsBase {
    // For each function, call the real implementation and save the result
    async getNodes(ids) {
        const result = await this.apis.getNodes(ids);
        this.getNodesResult.push(result);
        return result;
    }
    async getExtendedNodes(id) {
        const result = await this.apis.getExtendedNodes(id);
        this.getExtendedNodesResult.push(result);
        return result;
    }
    async getFilteredChildrenNodes(parentIds, urlQuery) {
        const result = await this.apis.getFilteredChildrenNodes(parentIds, urlQuery);
        this.getFilteredChildrenNodesResult.push(result);
        return result;
    }
    async getSearchSuggestions(text, urlQuery) {
        const result = await this.apis.getSearchSuggestions(text, urlQuery);
        this.getSearchSuggestionsResult.push(result);
        return result;
    }
    // Functions to fetch what we saved.  The slice clones the array so we don't loose the data
    fetchNodesResult() {
        return this.getNodesResult.slice();
    }
    fetchExtendedNodesResult() {
        return this.getExtendedNodesResult.slice();
    }
    fetchFilteredChildrenNodesResult() {
        return this.getFilteredChildrenNodesResult.slice();
    }
    fetchSearchSuggestionsResult() {
        return this.getSearchSuggestionsResult.slice();
    }
}
class RequestValidator extends APIsBase {
    // Constructor takes data from a request saver and uses that for compares
    constructor(saver) {
        super(saver.fetchNodesResult(), saver.fetchExtendedNodesResult(), saver.fetchFilteredChildrenNodesResult(), saver.fetchSearchSuggestionsResult());
    }
    // Each function calls the real implementation, compares the result with what was fetched last time, then
    // returns that result
    async getNodes(ids) {
        const result = await this.apis.getNodes(ids);
        const expected = this.getNodesResult.shift();
        this.validate(expected, result, this.getNodes.name, ids);
        return result;
    }
    async getExtendedNodes(id) {
        const result = await this.apis.getExtendedNodes(id);
        const expected = this.getExtendedNodesResult.shift();
        this.validate(expected, result, this.getExtendedNodes.name, id);
        return result;
    }
    async getFilteredChildrenNodes(parentIds, urlQuery) {
        const result = await this.apis.getFilteredChildrenNodes(parentIds, urlQuery);
        const expected = this.getFilteredChildrenNodesResult.shift();
        this.validate(expected, result, this.getFilteredChildrenNodes.name, parentIds, urlQuery);
        return result;
    }
    async getSearchSuggestions(text, urlQuery) {
        const result = await this.apis.getSearchSuggestions(text, urlQuery);
        const expected = this.getSearchSuggestionsResult.shift();
        this.validate(expected, result, this.getSearchSuggestions.name, text, urlQuery);
        return result;
    }
    validate(expected, result, ...args) {
        // expected could be undefined if a subsequent test simulated slightly longer - just ignore
        if (expected && !_.isEqual(expected, result)) {
            // Once we see a difference, don't keep validating future data
            this.getNodesResult = [];
            this.getExtendedNodesResult = [];
            this.getFilteredChildrenNodesResult = [];
            this.getSearchSuggestionsResult = [];
            throw new Error(`Expected ${JSON.stringify(args)} to return ${JSON.stringify(expected, null, 3)} but got ${JSON.stringify(result, null, 3)}`);
        }
    }
}
class APIsFactory {
    saver = null;
    settingsToValidateAgainst;
    create(settings) {
        // If this is the first call to this function, use this seed as the seed to validate against
        // We'll create a saver for that seed only
        if (!this.saver) {
            this.settingsToValidateAgainst = settings;
            this.saver = new RequestSaver();
            return this.saver;
        }
        // For subsequent calls with this same seed, return a validator so that we validate against the same seed
        if (_.isEqual(this.settingsToValidateAgainst, settings)) {
            return new RequestValidator(this.saver);
        }
        return new apis_1.APIs();
    }
}
exports.APIsFactory = APIsFactory;
