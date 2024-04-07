"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolchainToCompiler = exports.toolVersionToToolchain = exports.ServerInterface = void 0;
// 3rd party
const QueryString = require("query-string");
// our modules
const ajax_1 = require("./ajax");
const filter_helpers_1 = require("../component-helpers/filter-helpers");
const promise_tracker_1 = require("./promise-tracker");
const errors_1 = require("../../shared/errors");
const response_data_1 = require("../../shared/routes/response-data");
const util_1 = require("../component-helpers/util");
const dbTypes_1 = require("../../lib/dbBuilder/dbTypes");
const lodash_1 = require("lodash");
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
class ServerInterface {
    lastSessionId = null;
    // Promise trackers
    // Nodes
    nodesDataPromises = new promise_tracker_1.PromiseTracker();
    extendedNodesDataPromises = new promise_tracker_1.PromiseTracker();
    filteredChildrenNodesPromises = new promise_tracker_1.PromiseTracker();
    filteredTableItemsDataPromises = new promise_tracker_1.PromiseTracker();
    nodeDataForTableItemVariantPromises = new promise_tracker_1.PromiseTracker();
    tableViewFiltersPromises = new promise_tracker_1.PromiseTracker();
    expandedFilteredDescendantNodesDataPromises = new promise_tracker_1.PromiseTracker();
    searchSuggestionsPromises = new promise_tracker_1.PromiseTracker();
    // Actions
    importInfoPromises = new promise_tracker_1.PromiseTracker();
    customPackageDownloadPromises = new promise_tracker_1.PromiseTracker();
    customPackageDownloadStatusPromises = new promise_tracker_1.PromiseTracker();
    // Basic data
    packagesPromises = new promise_tracker_1.PromiseTracker();
    packageGroupsPromises = new promise_tracker_1.PromiseTracker();
    filterOptionsPromises = new promise_tracker_1.PromiseTracker();
    // Other
    nodePublicIdToDbIdPromises = new promise_tracker_1.PromiseTracker();
    rex3LinkToDbIdPromises = new promise_tracker_1.PromiseTracker();
    searchResultsPagePromises = new promise_tracker_1.PromiseTracker();
    nodeInfoForResourceIdPromises = new promise_tracker_1.PromiseTracker();
    nodeInfoForGlobalIdPromises = new promise_tracker_1.PromiseTracker();
    // Offline only
    localApis;
    offlineBoardsAndDevices;
    ///////////////////////////////////////////////////////////////////////////////
    /// Public methods
    ///////////////////////////////////////////////////////////////////////////////
    initOffline(localApis, offlineDevices) {
        this.localApis = localApis;
        this.offlineBoardsAndDevices = offlineDevices;
    }
    getNodesData(ids) {
        const params = {
            dbId: ids
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/nodesData" /* API.GET_NODES_DATA */}?${queryString}`;
        return this.getFromUrl(url, this.nodesDataPromises);
    }
    getExtendedNodesData(id) {
        const params = { dbId: id };
        const queryString = QueryString.stringify(params);
        const url = `${"api/nodeExtendedData" /* API.GET_NODE_EXTENDED_DATA */}?${queryString}`;
        return this.getFromUrl(url, this.extendedNodesDataPromises);
    }
    getFilteredChildrenNodeIds(parentIds, query) {
        const params = {
            parentDbId: parentIds,
            ...(0, filter_helpers_1.sortQuery)(query)
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/filteredChildrenNodeIds" /* API.GET_FILTERED_CHILDREN_NODE_IDS */}?${queryString}`;
        return this.getFromUrl(url, this.filteredChildrenNodesPromises);
    }
    getExpandedFilteredDescendantNodesData(parentId, query) {
        const params = {
            parentDbId: parentId,
            ...(0, filter_helpers_1.sortQuery)(query)
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/expandedFilteredDescendantNodesData" /* API.GET_EXPANDED_FILTERED_DESCENDANT_NODES_DATA */}?${queryString}`;
        return this.getFromUrl(url, this.expandedFilteredDescendantNodesDataPromises);
    }
    async getFilteredTableItemsData(parentId, query, isProjectWizard) {
        if ((0, util_1.getServerConfig)().offline) {
            let tableItems = [];
            const devicePublicId = this.getDevicePublicIdFromQueryOffline(query);
            if (devicePublicId) {
                if (!this.offlineBoardsAndDevices) {
                    throw new Error('offlineDevices expected when offline');
                }
                const offlineDevice = this.offlineBoardsAndDevices.availableDevices[devicePublicId];
                if (offlineDevice) {
                    const cloudAgent = await (0, util_1.getTICloudAgentObject)();
                    // TODO! Use similar mechanism as useCloudAgent()?
                    const agent = await cloudAgent.Init();
                    if (!this.localApis) {
                        throw new Error('localApis expected');
                    }
                    const tableItemsBySortKey = {};
                    for (const ccsDevice of offlineDevice.ccsDevices) {
                        let device;
                        let deviceDetail;
                        if (ccsDevice.id) {
                            deviceDetail = await this.localApis.getCcsDeviceDetail(agent, ccsDevice.id);
                            device = {
                                publicId: deviceDetail.id,
                                name: deviceDetail.name
                            };
                            // TODO? Make use of optional deviceDetail.defaultToolVersion to select a default compiler
                            // in compiler configuration?
                        }
                        if (device && deviceDetail) {
                            // TODO! This needs some refactoring, comments, etc. to be easier to follow and more robust
                            // Get all output-type + template permutations and their toolchains
                            const localApis = this.localApis;
                            const infoByToolVersion = await Promise.all(lodash_1.default.map(deviceDetail.toolVersions, async (toolVersion) => {
                                const projectTemplatesInfo = await localApis.getProjectTemplates(agent, ccsDevice.id, toolVersion.value);
                                return {
                                    toolVersion: toolVersion.value,
                                    outputTypes: lodash_1.default.map(projectTemplatesInfo.outputTypes, outputType => ({
                                        outputType,
                                        templates: projectTemplatesInfo.templateIndex[outputType.id]
                                    }))
                                };
                            }));
                            const templatesByOutputType = lodash_1.default.reduce(infoByToolVersion, (acc, o) => {
                                const toolchain = toolVersionToToolchain(o.toolVersion);
                                for (const { outputType, templates } of o.outputTypes) {
                                    for (const template of templates) {
                                        let entry = acc[outputType.id];
                                        if (!entry) {
                                            entry = {
                                                outputType,
                                                templates: []
                                            };
                                            acc[outputType.id] = entry;
                                        }
                                        let templateEntry = lodash_1.default.find(entry.templates, t => t.id === template.id);
                                        if (!templateEntry) {
                                            templateEntry = {
                                                ...template,
                                                toolchains: []
                                            };
                                            entry.templates.push(templateEntry);
                                        }
                                        templateEntry.toolchains = lodash_1.default.uniq([
                                            ...templateEntry.toolchains,
                                            toolchain
                                        ]);
                                    }
                                }
                                return acc;
                            }, {});
                            const templateGroupsByOutputType = lodash_1.default.mapValues(templatesByOutputType, v => {
                                const templatesByGroupId = lodash_1.default.groupBy(v.templates, template => template.id.split('_', 1)[0]);
                                return {
                                    outputType: v.outputType,
                                    templateGroups: lodash_1.default.map(templatesByGroupId, (templates, templateGroupId) => ({
                                        group: {
                                            id: templateGroupId,
                                            // Just picking the first name since they should all be identical
                                            // TODO`: Are there any cases where this won't work?
                                            name: templates[0].name,
                                            // Use shortest description. A bit of a guess and simple but should work in most cases
                                            // TODO`: Are there any cases where this won't work?
                                            description: lodash_1.default.minBy(templates, e => e.description.length).description,
                                            toolchains: lodash_1.default.uniq(lodash_1.default.flatten(lodash_1.default.map(templates, template => template.toolchains)))
                                        },
                                        templates
                                    }))
                                };
                            });
                            // Create table items
                            for (const { outputType, templateGroups } of lodash_1.default.values(templateGroupsByOutputType)) {
                                // Skip some output types
                                // TODO` Better to have a separate filtering stage for this
                                // Currently skipping based on what isn't available in CCS Eclipse Project Wizard
                                // TODO` Confirm that more shouldn't be skipped
                                // There are multiple template variants for different toolchains. E.g.: For 66AK2G12
                                //   {id: "com.ti.ccs.project.templates.helloWorld_gnu_arm", name: "Hello World"; toolchains: ['GNU']}
                                //   {id: "com.ti.ccs.project.templates.helloWorld", name: "Hello World", toolchains: ['TI']}
                                // Folding these together into groups
                                if (outputType.id === 'rtscConfiguration' ||
                                    outputType.id === 'system') {
                                    continue;
                                }
                                for (const templateGroup of templateGroups) {
                                    // Skipping RTSC Configuration templates
                                    if (templateGroup.group.id.includes('RtscConfiguration')) {
                                        continue;
                                    }
                                    const toolchains = templateGroup.group.toolchains;
                                    if (!lodash_1.default.isEmpty(toolchains)) {
                                        const variants = lodash_1.default.map(toolchains, toolchain => ({
                                            compiler: exports.toolchainToCompiler[toolchain],
                                            kernel: 'nortos'
                                        }));
                                        const multipleCores = offlineDevice.ccsDevices.length > 1;
                                        const showOutputType = outputType.id === 'executable' ||
                                            outputType.id === 'staticLibrary';
                                        const shortOutputName = outputType.id === 'staticLibrary' ? 'static lib' : '';
                                        const nameSuffix = (shortOutputName ? ` (${shortOutputName})` : '') +
                                            (multipleCores ? ` [${ccsDevice.coreName}]` : '');
                                        // Table items are keyed on a sort key which is later used to sort the items
                                        // into an ordered array. With items ordered with Assembly and RTSC templates
                                        // coming last, and then by template name, output type and core.
                                        const sortKey = 
                                        // Sort RTSC and Assembly examples last
                                        (templateGroup.group.name.match(/(rtsc|assembly)/i)
                                            ? '1'
                                            : '0') +
                                            // Then sort by template name (so that templates of the same type are
                                            // grouped together)
                                            templateGroup.group.name.toLowerCase() +
                                            // Then by output type, with static libraries last
                                            (outputType.id === 'staticLibrary' ? '1' : '0') +
                                            // And finally by core
                                            (ccsDevice.coreName || '');
                                        // TODO! Ensure that we won't get any duplicates (possible on outputType?), and
                                        // if we do handle them in a way that they are presented differently if
                                        // (tableItemsBySortKey[sortKey]) { throw new Error('Duplicate example!!'); }
                                        tableItemsBySortKey[sortKey] = {
                                            // This must be unique across all filter permuations incl. devices and devtools as
                                            // well as device cores (where applicable), due to table item caching.
                                            tableItemDbId: `${ccsDevice.id}__${templateGroup.group.id}__${outputType.id}`,
                                            name: `${templateGroup.group.name}${nameSuffix}`,
                                            shortDescription: templateGroup.group.description +
                                                (multipleCores
                                                    ? ` Targets core ${ccsDevice.coreName}` +
                                                        `${showOutputType ? '' : '.'}`
                                                    : '') +
                                                (showOutputType
                                                    ? (multipleCores
                                                        ? ' and outputs'
                                                        : ' Outputs') +
                                                        ' ' +
                                                        (outputType.name.match(/^[aeiou]/i)
                                                            ? 'an'
                                                            : 'a') +
                                                        ' ' +
                                                        outputType.name +
                                                        '.'
                                                    : ''),
                                            descriptor: {
                                                // TODO? Change?
                                                icon: "Project_CCS" /* Nodes.Icon.PROJECT_CCS */,
                                                hasChildren: false
                                            },
                                            // TODO? Change?
                                            categoryContext: 'aCatContext',
                                            resourceSubClass: templateGroup.group.id.includes('.empty')
                                                ? 'example.empty'
                                                : templateGroup.group.id.includes('.helloWorld')
                                                    ? 'example.helloworld'
                                                    : 'example.general',
                                            // TODO? Change?
                                            packageName: 'aPackageName',
                                            variants,
                                            deviceIds: [device.publicId],
                                            // TODO` Add check to ensure that each compiler has 0-1 templates
                                            templateIds: lodash_1.default.chain(lodash_1.default.map(templateGroup.templates, template => lodash_1.default.map(template.toolchains, toolchain => ({
                                                compiler: exports.toolchainToCompiler[toolchain],
                                                templateId: template.id
                                            }))))
                                                .flatten()
                                                .keyBy('compiler')
                                                .mapValues(v => v.templateId)
                                                .value(),
                                            outputTypeId: outputType.id
                                        };
                                    }
                                }
                            }
                        }
                    }
                    // Convert tableItemsBySortKey from a map of table items keyed on sort-keys to a
                    // table item array ordered on the sort-key
                    tableItems = (0, lodash_1.default)(tableItemsBySortKey)
                        .entries()
                        .sortBy(([k]) => k)
                        .map(([, v]) => v)
                        .value();
                    // Filter table items
                    tableItems = lodash_1.default.filter(tableItems, item => (!query.filterCompiler ||
                        lodash_1.default.isEmpty(query.filterCompiler) ||
                        lodash_1.default.some(item.variants, variant => variant.compiler === query.filterCompiler[0])) &&
                        (!query.filterSearch ||
                            lodash_1.default.isEmpty(query.filterSearch) ||
                            lodash_1.default.every(query.filterSearch.toLowerCase().split(/(\s+)/), word => item.name.toLowerCase().includes(word) ||
                                (item.shortDescription &&
                                    item.shortDescription.toLowerCase().includes(word)))));
                }
            }
            return Promise.resolve({
                parentToChildDbId: {
                    [(0, util_1.getServerConfig)().rootNodeDbId]: tableItems
                }
            });
        }
        else {
            const params = {
                parentDbId: parentId,
                isProjectWizard,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const queryString = QueryString.stringify(params);
            const url = `${"api/filteredTableItemsData" /* API.GET_FILTERED_TABLE_ITEMS_DATA */}?${queryString}`;
            return this.getFromUrl(url, this.filteredTableItemsDataPromises);
        }
    }
    async getTableViewFilters(parentId, query, isProjectWizard) {
        if ((0, util_1.getServerConfig)().offline) {
            const devicePublicId = this.getDevicePublicIdFromQueryOffline(query);
            let compilers;
            let kernels;
            if (devicePublicId) {
                if (!this.offlineBoardsAndDevices) {
                    throw new Error('offlineDevices expected');
                }
                const offlineDevice = this.offlineBoardsAndDevices.availableDevices[devicePublicId];
                if (!offlineDevice) {
                    throw new Error(`offline device not found: ${devicePublicId}`);
                }
                const cloudAgent = await (0, util_1.getTICloudAgentObject)();
                if (!cloudAgent) {
                    throw new Error('failed to get cloud agent');
                }
                // TODO! Use similar mechanism as useCloudAgent()?
                const agent = await cloudAgent.Init();
                if (!agent) {
                    throw new Error('failed to initialize cloud agent');
                }
                // Get all toolchains supported by the device
                const toolchains = lodash_1.default.union(...(await Promise.all(lodash_1.default.map(offlineDevice.ccsDevices, async (ccsDevice) => {
                    if (ccsDevice.id) {
                        if (!this.localApis) {
                            throw new Error('localApis expected');
                        }
                        const deviceDetail = await this.localApis.getCcsDeviceDetail(agent, ccsDevice.id);
                        const device = {
                            publicId: deviceDetail.id,
                            name: deviceDetail.name
                        };
                        if (device && deviceDetail) {
                            return this.toolVersionsToToolchains(deviceDetail.toolVersions);
                        }
                    }
                    return [];
                }))));
                compilers = lodash_1.default.map(toolchains, toolchain => exports.toolchainToCompiler[toolchain]);
                kernels = ['nortos'];
            }
            else {
                compilers = [];
                kernels = [];
            }
            const tableViewFilters = {
                parentToTableFilters: {
                    [parentId]: {
                        kernels,
                        compilers
                    }
                }
            };
            return tableViewFilters;
        }
        else {
            const params = {
                parentDbId: parentId,
                isProjectWizard,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const queryString = QueryString.stringify(params);
            const url = `${"api/tableViewFilters" /* API.GET_TABLE_VIEW_FILTERS */}?${queryString}`;
            return this.getFromUrl(url, this.tableViewFiltersPromises);
        }
    }
    getNodeDataForTableItemVariant(tableItemDbId, query, variant) {
        if ((0, util_1.getServerConfig)().offline) {
            // TODO? Turn this into a proper fake node? Or maybe refactor so that this isn't even necessary?
            const node = {
                nodeType: response_data_1.Nodes.NodeType.LEAF_NODE,
                nodeDbId: '2',
                nodePublicId: 'dummyNodePublicId',
                name: 'ADummyNode',
                shortDescription: 'A Dummy Node',
                descriptor: {
                    icon: "Project_CCS" /* Nodes.Icon.PROJECT_CCS */,
                    hasChildren: false
                },
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: null,
                packageGroupPublicUid: null
            };
            const result = {
                dbIdToData: { '2': node }
            };
            return Promise.resolve(result);
        }
        else {
            const params = {
                tableItemDbId,
                ...(0, filter_helpers_1.sortQuery)(query),
                variantCompiler: variant.compiler,
                variantKernel: variant.kernel
            };
            const queryString = QueryString.stringify(params);
            const url = `${"api/nodeDataForTableItemVariant" /* API.GET_NODE_DATA_FOR_TABLE_ITEM_VARIANT */}?${queryString}`;
            return this.getFromUrl(url, this.nodeDataForTableItemVariantPromises);
        }
    }
    getSearchSuggestions(text, query) {
        query = (0, filter_helpers_1.sortQuery)(query);
        delete query.filterSearch;
        const queryNoSearch = query;
        const params = {
            text,
            ...queryNoSearch
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/searchSuggestions" /* API.GET_SEARCH_SUGGESTIONS */}?${queryString}`;
        return this.getFromUrl(url, this.searchSuggestionsPromises);
    }
    getImportInfo(id, query) {
        if ((0, util_1.getServerConfig)().offline) {
            const result = {
                projectType: "projectSpec" /* ProjectType.SPEC */,
                targets: [],
                location: 'placeholder'
            };
            return Promise.resolve(result);
        }
        else {
            const params = {
                dbId: id,
                ...(0, filter_helpers_1.sortQuery)(query)
            };
            const queryString = QueryString.stringify(params);
            const url = `${"api/importInfo" /* API.GET_IMPORT_INFO */}?${queryString}`;
            return this.getFromUrl(url, this.importInfoPromises);
        }
    }
    getCustomPackageDownload(packages, zipFilePrefix) {
        const params = {
            packages,
            zipFilePrefix
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/custom-package-download" /* API.GET_CUSTOM_PACKAGE_DOWNLOAD */}?${queryString}`;
        return this.getFromUrl(url, this.customPackageDownloadPromises);
    }
    getCustomPackageDownloadStatus(requestToken) {
        const params = {
            requestToken
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/custom-package-download-status" /* API.GET_CUSTOM_PACKAGE_DOWNLOAD_STATUS */}?${queryString}`;
        return this.getFromUrl(url, this.customPackageDownloadStatusPromises);
    }
    getPackages() {
        if ((0, util_1.getServerConfig)().offline) {
            return Promise.resolve([]);
        }
        else {
            const url = "api/packages" /* API.GET_PACKAGES */;
            return this.getFromUrl(url, this.packagesPromises);
        }
    }
    getPackageGroups() {
        if ((0, util_1.getServerConfig)().offline) {
            return Promise.resolve([]);
        }
        else {
            const url = "api/packageGroups" /* API.GET_PACKAGE_GROUPS */;
            return this.getFromUrl(url, this.packageGroupsPromises);
        }
    }
    getFilterOptions() {
        if ((0, util_1.getServerConfig)().offline) {
            if (!this.offlineBoardsAndDevices) {
                throw new Error('offlineDevices undefined');
            }
            const devices = lodash_1.default.map(this.offlineBoardsAndDevices.availableDevices, device => ({
                publicId: device.rexDevicePublicId,
                name: device.rexName
            }));
            const filterOptions = {
                compilers: lodash_1.default.map(lodash_1.default.omit(dbTypes_1.compilers, 'iar'), (v, k) => ({ publicId: k, name: v })),
                devices: lodash_1.default.sortBy(devices, 'publicId'),
                devtools: lodash_1.default.map(this.offlineBoardsAndDevices.availableBoards, board => ({
                    publicId: board.publicId,
                    name: board.name
                })),
                ides: [{ publicId: 'ccs', name: 'CCS' }],
                kernels: lodash_1.default.map(lodash_1.default.pick(dbTypes_1.kernels, 'nortos'), (v, k) => ({ publicId: k, name: v })),
                // Based on SqldbSession#getLanguages
                languages: [
                    { publicId: 'english', name: 'English' },
                    { publicId: 'chinese', name: 'Chinese' }
                ],
                packageGroups: [],
                resourceClasses: [{ publicId: '1', name: 'pdf' }]
            };
            return Promise.resolve(filterOptions);
        }
        else {
            const url = "api/filterOptions" /* API.GET_FILTER_OPTIONS */;
            return this.getFromUrl(url, this.filterOptionsPromises);
        }
    }
    getNodeInfoForResourceId({ resourceId, packageId, packageVersion, device, devtool }) {
        if (!resourceId) {
            throw new Error('Missing resourceId in url');
        }
        else if (!packageId) {
            throw new Error('Missing package id in url');
        }
        const params = {
            resourceId,
            packageId,
            packageVersion,
            device,
            devtool
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/getNodeInfoForResourceId" /* API.GET_NODE_INFO_FOR_RESOURCE_ID */}?${queryString}`;
        return this.getFromUrl(url, this.nodeInfoForResourceIdPromises);
    }
    getNodeInfoForGlobalId({ globalId, device, devtool }) {
        if (!globalId) {
            throw new Error('Missing globalId in url');
        }
        const params = {
            globalId,
            device,
            devtool
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/getNodeInfoForGlobalId" /* API.GET_NODE_INFO_FOR_GLOBAL_ID */}?${queryString}`;
        return this.getFromUrl(url, this.nodeInfoForGlobalIdPromises);
    }
    getNodePublicIdToDbId(nodePublicId, packageGroupPublicUid, packagePublicId, isLatest) {
        let params;
        if (!packageGroupPublicUid) {
            params = {
                nodePublicId,
                toDbIdType: "ToDbIdNoGroup" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_NO_GROUP */
            };
        }
        else if (isLatest) {
            params = {
                nodePublicId,
                packagePublicId,
                packageGroupPublicUid,
                toDbIdType: "ToDbIdLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_LATEST */
            };
        }
        else {
            params = {
                nodePublicId,
                packagePublicId,
                packageGroupPublicUid,
                toDbIdType: "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */
            };
        }
        const queryString = QueryString.stringify(params);
        const url = `${"api/nodePublicIdToDbId" /* API.GET_NODE_PUBLIC_ID_TO_DB_ID */}?${queryString}`;
        return this.getFromUrl(url, this.nodePublicIdToDbIdPromises);
    }
    getRex3LinkToDbId(linkField) {
        const params = {
            linkField
        };
        const queryString = QueryString.stringify(params);
        const url = `${"api/rex3LinkToDbId" /* API.GET_REX3_LINK_TO_DB_ID */}?${queryString}`;
        return this.getFromUrl(url, this.rex3LinkToDbIdPromises);
    }
    async getSearchResultsPage({ textSearch, pageNum, resultsPerPage, hiddenQuery }) {
        // Special case - doesn't actually go to the server, instead fetches from google
        const cseHttpGetRequestBase = `https://customsearch.googleapis.com/customsearch/v1`;
        const start = (pageNum - 1) * resultsPerPage + 1;
        const query = {
            num: resultsPerPage,
            cx: util_1.SEARCH_ENGINE_ID,
            key: util_1.GAPI_KEY,
            q: textSearch,
            start,
            hq: hiddenQuery
        };
        const url = `${cseHttpGetRequestBase}?${QueryString.stringify(query)}`;
        let result;
        try {
            result = await getFromUrlCustom(url, this.searchResultsPagePromises);
        }
        catch (e) {
            // @ts-ignore - intentionally giving an empty object as result
            result = {};
            console.error('Error from google');
            console.error(e);
        }
        return validateSearchResultPageAndHandleMissingItems(result);
        function validateSearchResultPageAndHandleMissingItems(page) {
            const errorResult = {
                items: [],
                searchInformation: { totalResults: 0 },
                error: pageNum < 2
                    ? 'No results found'
                    : 'Bad search page, go back to previous page or start another search'
            };
            if (!page.items || !page.searchInformation || !page.searchInformation.totalResults) {
                return errorResult;
            }
            else {
                const badPage = page.items.find(item => !item.link || !item.htmlTitle || !item.htmlSnippet);
                if (badPage) {
                    return errorResult;
                }
                else {
                    return page;
                }
            }
        }
        function getFromUrlCustom(url, promiseTracker) {
            let promise = promiseTracker.checkPromise(url);
            if (!promise) {
                promise = promiseTracker.registerPromise(url, ajax_1.ajax.get(url));
            }
            return promise;
        }
    }
    ///////////////////////////////////////////////////////////////////////////////
    /// Private methods
    ///////////////////////////////////////////////////////////////////////////////
    /**
     * Do an ajax.get on the url.
     * Ensures there isn't an identical request outgoing using the promise tracker.
     * Return the registered promise.
     *
     * @param urls
     * @param promiseTracker
     *
     * @returns {Promise} registeredPromise
     */
    getFromUrl(url, promiseTracker) {
        let promise = promiseTracker.checkPromise(url);
        if (!promise) {
            promise = promiseTracker.registerPromise(url, ajax_1.ajax.get(url).then(r => {
                const sessionId = r.sideBand.sessionId;
                if (this.lastSessionId && sessionId !== this.lastSessionId) {
                    throw new errors_1.SessionIdError(`New session id ${sessionId}, previous session id ${this.lastSessionId}`);
                }
                this.lastSessionId = sessionId;
                return r.payload;
            }));
        }
        return promise;
    }
    getDevicePublicIdFromQueryOffline(query) {
        if (query.filterDevice && !lodash_1.default.isEmpty(query.filterDevice)) {
            return query.filterDevice[0];
        }
        else if (query.filterDevtool && !lodash_1.default.isEmpty(query.filterDevtool)) {
            const devtool = lodash_1.default.find(this.offlineBoardsAndDevices.availableBoards, board => board.publicId === query.filterDevtool[0]);
            if (!devtool) {
                throw new Error('devtool expected');
            }
            // TODO! Add support for boards that support multiple devices
            const device = (devtool && devtool.supportedDevices && devtool.supportedDevices[0]) || null;
            if (!device) {
                // TODO` Check that this doesn't happen in practice -- devtools without supported devices should be
                // filtered out before so that this never occurs
                throw new Error('devtool has no supported devices');
            }
            return device;
        }
        else {
            return null;
        }
    }
    // TODO? Move?
    toolVersionsToToolchains(toolVersions) {
        return lodash_1.default.uniq(lodash_1.default.map(toolVersions, toolVersion => toolVersionToToolchain(toolVersion.value)));
    }
}
exports.ServerInterface = ServerInterface;
// TODO? Move the functions below to a better location?
function toolVersionToToolchain(toolVersion) {
    // TODO! Add better checking for TI toolchain instead of just defaulting to TI if not CLANG or GNU. Expecting
    // {value: '20.2.7.LTS', displayString: 'TI v20.2.7.LTS'}, so can also check displayString; but unsure if this
    // is consistent. Also, are the GNU_ and TICLANG_ reliable? And also need to handle invalid toolchains.
    // Some sample toolVersions:
    // {value: '20.2.7.LTS', displayString: 'TI v20.2.7.LTS'}
    // {value: 'TICLANG_2.1.3.LTS', displayString: 'TI Clang v2.1.3.LTS'}
    // {value: 'GNU_9.2.1:Linaro', displayString: 'GNU v9.2.1 (Linaro)'}
    return toolVersion.startsWith('GNU_')
        ? 'GNU'
        : toolVersion.startsWith('TICLANG_')
            ? 'TICLANG'
            : 'TI';
}
exports.toolVersionToToolchain = toolVersionToToolchain;
exports.toolchainToCompiler = {
    GNU: 'gcc',
    TI: 'ccs',
    TICLANG: 'ticlang'
};
