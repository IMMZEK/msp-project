"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatedUser = void 0;
const _ = require("lodash");
const random_1 = require("./random");
const util_1 = require("./util");
const settings_1 = require("./settings");
const response_data_1 = require("../../shared/routes/response-data");
const ajax_1 = require("../../frontend/apis/ajax");
const request_validator_1 = require("./request-validator");
const knownBrokenLinks_1 = require("./knownBrokenLinks");
const errors_1 = require("../../shared/errors");
const delay_1 = require("../delay");
// This class does it's best to accurately simulate a single user clicking though the tree.
// The basic algorithm is to setup filters/search, then click down the tree to a leaf node,
// (with an appropriate delay between click) then view the leaf node (download the content,
// and then delay for a bit to simulate the user "viewing" that content).  Once viewed, the
// algorithm goes back up to the first parent node and expands a new node.  If the new node
// was already expanded, then it goes back up to that parent and repeats.
//
// We can change this in the future if we get more accurate data indicating what users
// actually do.  We can also adjust the delays if we get more accurate data indicating how
// quickly users click and view content.  For now, these are my best guess (and defined in
// settings.ts)
class SimulatedUser {
    index;
    rootNode;
    filterOptions;
    loadStatistics;
    filterPercentage;
    searchPercentage;
    static apiFactory = new request_validator_1.APIsFactory();
    static exceptionsLogged = 0;
    rand;
    apis;
    urlQuery = {};
    running = false;
    restart = true;
    constructor(index, rootNode, filterOptions, loadStatistics, filterPercentage, searchPercentage) {
        // Use the index as a seed for the random number generator
        this.index = index;
        this.rootNode = rootNode;
        this.filterOptions = filterOptions;
        this.loadStatistics = loadStatistics;
        this.filterPercentage = filterPercentage;
        this.searchPercentage = searchPercentage;
        const seed = index;
        this.rand = new random_1.RandomGenerator(index);
        // Create an APIs to use
        // Base it on our settings so we can validate test runs using the same settings
        this.apis = SimulatedUser.apiFactory.create({ seed, filterPercentage, searchPercentage });
    }
    async go() {
        this.running = true;
        // Have an initial random delay so all users don't all start at the same point
        await (0, delay_1.delay)(this.rand.generate(settings_1.viewNodeDelay * 5));
        // Now traverse the tree until told to stop
        this.restart = true; // ensure we pick filters/search first time around
        const exceptions = [];
        while (this.running) {
            try {
                // Pick search/filters to use while traversing.
                if (this.restart) {
                    await this.setupFiltersAndSearch();
                    this.restart = false;
                }
                // Actually do the tree traverasl
                const hasChildren = await this.traverseTree(this.rootNode);
                if (!hasChildren) {
                    // Remove filters/search until we do have children.
                    // If we filtered so much that all we see is the root node, there's not much point
                    const toRemove = Object.keys(this.urlQuery)[0];
                    this.log(`Removing: ${toRemove}, urlQuery = ${JSON.stringify(this.urlQuery)}`);
                    delete this.urlQuery[toRemove];
                }
            }
            catch (e) {
                if (SimulatedUser.exceptionsLogged < 50) {
                    ++SimulatedUser.exceptionsLogged;
                    console.log(`${this.index}: Caught exception: `, e);
                }
                exceptions.push(e);
            }
        }
        return exceptions;
    }
    stop() {
        this.running = false;
    }
    async traverseTree(node, tabs = '') {
        // Expand the current node
        // Note that expandNode will cache data such that getNodes and
        // getFilteredChildrenNodes just return cached data with no server
        // access
        await this.apis.expandNode(node, this.urlQuery);
        const nodeData = node === this.rootNode ? null : await this.apis.getNodes([node]);
        const childrenNodes = await this.apis.getFilteredChildrenNodes([node], this.urlQuery);
        if (_.isEmpty(childrenNodes[0]) && this.continueTraversing(true)) {
            // No children - see if it has content
            if (nodeData) {
                const extendedData = await this.apis.getExtendedNodes(node);
                if (extendedData.nodeType === response_data_1.Nodes.NodeType.LEAF_NODE) {
                    // It does - view the link and then wait before continuing
                    await this.viewLink(extendedData, tabs, nodeData);
                    await (0, util_1.randomDelay)(settings_1.viewNodeDelay, this.rand);
                }
            }
            return false;
        }
        else {
            // Randomly traverse some of the children, but delay
            // before each click
            this.log(`${tabs}${nodeData ? nodeData[0].name : 'root'}`);
            const visited = {};
            let index = this.rand.generate(childrenNodes[0].length);
            while (!visited[index] && this.continueTraversing()) {
                visited[index] = true;
                await (0, util_1.randomDelay)(settings_1.expandNodeDelay, this.rand);
                await this.traverseTree(childrenNodes[0][index].nodeDbId, tabs + '   ');
                index = this.rand.generate(childrenNodes[0].length);
            }
            return true;
        }
    }
    async viewLink(extendedData, tabs, nodeData) {
        try {
            if (!extendedData.link.startsWith('http')) {
                // It's not on another server, so fetch the link to simulate load on rex
                this.log(`${tabs}${nodeData[0].name} (${extendedData.link})`);
                await ajax_1.ajax.get(extendedData.link);
            }
        }
        catch (e) {
            if (e instanceof errors_1.NetworkError && e.statusCode === '404') {
                if (knownBrokenLinks_1.knownBrokenLinks.some(regex => regex.test(extendedData.link))) {
                    // Ignore this error - it's a known broken link in the metadata
                }
                else {
                    const nodes = await this.apis.getNodes(extendedData.nodeDbIdPath);
                    const nodePath = _.map(nodes, n => n.name).join('/');
                    throw new errors_1.NetworkError(`Failed to load resource at ${nodePath}: ${extendedData.link}`, '404');
                }
            }
            else {
                throw e;
            }
        }
    }
    continueTraversing(currentlyAtleafNode = false) {
        if (currentlyAtleafNode) {
            this.restart = this.rand.shouldDo(settings_1.restartPercentage);
        }
        return this.running && !this.restart;
    }
    log(message) {
        if (settings_1.debugLog) {
            console.log(`${this.index}: ${message}`);
        }
    }
    async setupFiltersAndSearch() {
        // Randomly determine filters/search parameters
        this.urlQuery = {};
        this.setupFilters();
        await this.setupSearch();
        // Record/log the new settings
        this.loadStatistics.addUser(this.urlQuery);
        this.log(`urlQuery = ${JSON.stringify(this.urlQuery)}`);
    }
    setupFilters() {
        if (this.rand.shouldDo(this.filterPercentage)) {
            if (this.rand.shouldDo(this.filterPercentage)) {
                this.urlQuery.resourceClasses = [
                    this.rand.pick(this.filterOptions.resourceClasses).publicId
                ];
            }
            if (this.rand.shouldDo(this.filterPercentage)) {
                this.urlQuery.kernels = [this.rand.pick(this.filterOptions.kernels).publicId];
            }
            if (this.rand.shouldDo(this.filterPercentage)) {
                this.urlQuery.compilers = [this.rand.pick(this.filterOptions.compilers).publicId];
            }
            if (this.rand.shouldDo(this.filterPercentage)) {
                if (this.rand.shouldDo(50)) {
                    // 50-50 pick a devtool or device
                    this.urlQuery.devices = [this.rand.pick(this.filterOptions.devices).publicId];
                }
                else {
                    this.urlQuery.devtools = [this.rand.pick(this.filterOptions.devtools).publicId];
                }
            }
        }
    }
    async setupSearch() {
        if (this.rand.shouldDo(this.searchPercentage)) {
            if (this.rand.shouldDo(settings_1.topSearchTermPercentage)) {
                this.urlQuery.search = this.rand.pick(topSearchTerms);
            }
            else {
                const initialCharacter = String.fromCharCode('a'.charCodeAt(0) + this.rand.generate(26));
                this.urlQuery.search = this.rand.pick(await this.apis.getSearchSuggestions(initialCharacter, this.urlQuery));
            }
        }
    }
}
exports.SimulatedUser = SimulatedUser;
// Top 25 search terms from REX 3 analytics
const topSearchTerms = [
    'TI-RTOS',
    'example',
    'simplelink academy',
    'flash',
    'driverlib',
    'blink',
    'led',
    'project 0',
    'project0',
    'SPI',
    'ti-rtos',
    'adc',
    'examples',
    'rtos',
    'interrupt',
    'timer',
    'cc2650',
    'msp430',
    'pwm',
    'Vital Signs Lab CCS Project',
    'uart',
    'spi',
    'project zero',
    'i2c',
    'msp432'
];
