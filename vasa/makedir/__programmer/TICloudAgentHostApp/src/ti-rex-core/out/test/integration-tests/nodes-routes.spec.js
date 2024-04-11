"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const _ = require("lodash");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const database_utils_1 = require("./database-utils");
const expect_1 = require("../expect");
const response_data_1 = require("../../shared/routes/response-data");
const nodes_utils_1 = require("./nodes-utils");
const util_1 = require("../../shared/util");
const sqldbImporter_1 = require("../../lib/dbImporter/sqldbImporter");
const dbBuilderUtils_1 = require("../../lib/dbBuilder/dbBuilderUtils");
const vars_1 = require("../../lib/vars");
const HttpStatus = require("http-status-codes");
// allow expect(blah).to.exist
// tslint:disable:no-unused-expression
// Globals used by support functions (must be declared before describe block)
let packageGroupsDef;
let devices;
let devtools;
let packages;
let filterOptions;
// Test packages
let simplePackage1;
let devFilterPackage;
let searchablePackage;
let variedTypesPackage;
let variedFiltersPackage;
let multiVersionPackageV1;
let multiVersionPackageV2;
let restrictedPackage;
let subFoundationNodePackage;
let viewConstrainedPackage;
let sortTestPackage;
const searchableKeys = [
    'name',
    'description',
    'devicesVariants',
    'devtools',
    'fullPaths',
    'tags'
];
const searchText = 'uniqueStringForSearching';
const searchChunk = 'string-foR';
const searchableOneWordInDescription = 'searchableOneWordInDescription';
describe('DB Nodes APIs', () => {
    before(async function () {
        this.timeout(20000); // db import console logs is slowing it down...
        const dbFolder = await (0, nodes_utils_1.updateDatabase)(generateMetadata());
        ({ packageGroupsDef } = await (0, sqldbImporter_1.discoverPackageGroups)(dbFolder));
        filterOptions = await (0, nodes_utils_1.getFilterOptions)();
    });
    describe("api/rootNode" /* API.GET_ROOT_NODE */, () => {
        // There is not much we can test for getRootNode().  The bigger test is when it's used as input
        // to other functions - then we can see if what it returned made sense.
        it('should have a valid root node', async () => {
            const rootNode = await (0, nodes_utils_1.getRootNode)();
            (0, database_utils_1.expectValidDbId)(rootNode);
        });
    });
    describe("api/nodePublicIdToDbId" /* API.GET_NODE_PUBLIC_ID_TO_DB_ID */, () => {
        async function verify(pkg, resourceIndex) {
            const resource = pkg.resources[resourceIndex];
            const packageGroup = packageGroupsDef.find(group => group.packages.includes(pkg.packageOverview.packageUId));
            (0, expect_1.expect)(packageGroup).to.exist;
            (0, expect_1.expect)(packageGroup.uid).to.exist;
            const dbId = await (0, nodes_utils_1.getNodeDbId)({
                nodePublicId: resource.fullPathsPublicIds[0],
                packageGroupPublicUid: packageGroup.uid,
                packagePublicId: pkg.packageOverview.packageId,
                toDbIdType: "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */
            });
            const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: [dbId] });
            const expectedNodeData = nodesData.dbIdToData[dbId];
            (0, expect_1.expect)(resource.name).to.be.equal(expectedNodeData.name);
            (0, expect_1.expect)(resource.fullPathsPublicIds[0]).to.be.equal(expectedNodeData.nodePublicId);
        }
        it('should get correct node based on its publicId', async () => {
            await verify(multiVersionPackageV1, 0);
        });
        it('should get correct node based on its publicId: same publicId and package id, but different version', async () => {
            // ensure test assumptions are valid
            const resourcerIndex = 0;
            (0, expect_1.expect)(multiVersionPackageV1.packageOverview.packageId).to.be.equal(multiVersionPackageV2.packageOverview.packageId);
            (0, expect_1.expect)(multiVersionPackageV1.packageOverview.version).to.be.not.equal(multiVersionPackageV2.packageOverview.version);
            (0, expect_1.expect)(multiVersionPackageV1.resources[resourcerIndex].fullPathsPublicIds[0]).to.be.equal(multiVersionPackageV2.resources[resourcerIndex].fullPathsPublicIds[0]);
            await verify(multiVersionPackageV2, 0);
        });
        it('should get correct non-package node', async () => {
            const softwareCategory = multiVersionPackageV1.simpleCategories.find(p => p.name === 'Software');
            const dbId = await (0, nodes_utils_1.getNodeDbId)({
                nodePublicId: softwareCategory.fullPathsPublicIds[0],
                toDbIdType: "ToDbIdNoGroup" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_NO_GROUP */
            });
            const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: [dbId] });
            const expectedNodeData = nodesData.dbIdToData[dbId];
            (0, expect_1.expect)(softwareCategory.name).to.be.equal(expectedNodeData.name);
            (0, expect_1.expect)(softwareCategory.fullPathsPublicIds[0]).to.be.equal(expectedNodeData.nodePublicId);
        });
        it.skip('should get correct device package node (no package group version)', async () => { });
        it.skip('should get correct devtool package node (no package group version)', async () => { });
        it('should handle non-existing query arguments', async () => {
            await expectThrows(HttpStatus.BAD_REQUEST, 'Must specify nodePublicId', (0, nodes_utils_1.getNodeDbId)({
                nodePublicId: undefined,
                packageGroupPublicUid: 'something',
                packagePublicId: 'another',
                toDbIdType: "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */
            }));
            await expectThrows(HttpStatus.BAD_REQUEST, 'Must specify packageGroupPublicUid', (0, nodes_utils_1.getNodeDbId)({
                nodePublicId: 'something',
                packageGroupPublicUid: undefined,
                packagePublicId: 'another',
                toDbIdType: "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */
            }));
            await expectThrows(HttpStatus.BAD_REQUEST, 'Must specify nodePublicId', (0, nodes_utils_1.getNodeDbId)({
                nodePublicId: undefined,
                toDbIdType: "ToDbIdNoGroup" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_NO_GROUP */
            }));
        });
    });
    describe("api/rex3LinkToDbId" /* API.GET_REX3_LINK_TO_DB_ID */, async () => {
        it('should get correct node based on Rex 3 style "link"', async () => {
            const resource = multiVersionPackageV2.resources[0];
            const dbId = await (0, nodes_utils_1.getNodeDbIdRex3)({
                linkField: [...resource.fullPaths[0], resource.name].join('/')
            });
            const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: [dbId] });
            const nodeData = nodesData.dbIdToData[dbId];
            (0, expect_1.expect)(nodeData.name).to.be.equal(resource.name);
            (0, expect_1.expect)(nodeData.packagePublicUid).to.be.equal(resource.packageUId);
        });
        it('should get correct node based on Rex 3 style "link" under a foundation node', async () => {
            const resource = subFoundationNodePackage.resources[0];
            const dbId = await (0, nodes_utils_1.getNodeDbIdRex3)({
                linkField: [...resource.fullPaths[0], resource.name].join('/')
            });
            const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: [dbId] });
            const nodeData = nodesData.dbIdToData[dbId];
            (0, expect_1.expect)(nodeData.name).to.be.equal(resource.name);
            (0, expect_1.expect)(nodeData.packagePublicUid).to.be.equal(resource.packageUId);
        });
        it('should get correct node based on Rex 3 style "link" that is a foundation node', async () => {
            const resource = subFoundationNodePackage.resources[0];
            const dbId = await (0, nodes_utils_1.getNodeDbIdRex3)({
                linkField: [resource.fullPaths[0][0], resource.fullPaths[0][1]].join('/')
            });
            const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: [dbId] });
            const nodeData = nodesData.dbIdToData[dbId];
            (0, expect_1.expect)(nodeData.name).to.be.equal(resource.fullPaths[0][1]);
            (0, expect_1.expect)(nodeData.packagePublicUid).to.not.exist;
        });
        it('should get correct node based on Rex 3 style "link": always go to latest package', async () => {
            const resource = multiVersionPackageV1.resources[0]; // older package version
            const dbId = await (0, nodes_utils_1.getNodeDbIdRex3)({
                linkField: [...resource.fullPaths[0], resource.name].join('/')
            });
            const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: [dbId] });
            const nodeData = nodesData.dbIdToData[dbId];
            (0, expect_1.expect)(nodeData.name).to.be.equal(resource.name);
            (0, expect_1.expect)((0, dbBuilderUtils_1.splitUid)(nodeData.packagePublicUid).id).to.be.equal(resource.packageId);
            // latest package version expected
            (0, expect_1.expect)((0, dbBuilderUtils_1.splitUid)(nodeData.packagePublicUid).version).to.be.equal(multiVersionPackageV2.packageOverview.packageVersion);
        });
        it('should get 404 for Rex 3 style "link" that cannot be resolved', async () => {
            const resource = multiVersionPackageV2.resources[0];
            const linkField = [...resource.fullPaths[0], resource.name].join('/');
            await expectThrows(404, /.*Could not resolve Rex 3 link.*/, (0, nodes_utils_1.getNodeDbIdRex3)({
                linkField: linkField.replace(resource.name, 'non-existent resource name')
            }));
            await expectThrows(404, /.*Could not resolve Rex 3 link.*/, (0, nodes_utils_1.getNodeDbIdRex3)({
                linkField: linkField.replace(multiVersionPackageV2.packageOverview.name, 'non-existent package name')
            }));
        });
        it('should handle non-existing query arguments', async () => {
            await expectThrows(HttpStatus.BAD_REQUEST, 'Must specify linkField', (0, nodes_utils_1.getNodeDbIdRex3)({
                linkField: undefined
            }));
        });
    });
    describe("api/filterOptions" /* API.GET_FILTER_OPTIONS */, () => {
        it(`should have a device filter for each device`, async () => {
            (0, expect_1.expect)(filterOptions.devices.length).to.equal(devices.length);
            for (const deviceMetadata of devices) {
                const found = filterOptions.devices.find(
                // once REX-1884 (device ids and names swapped) is reverted change to deviceMetadata.id
                deviceFilterOption => deviceMetadata.name === deviceFilterOption.publicId);
                (0, expect_1.expect)(found, deviceMetadata.id).to.exist;
            }
        });
        it(`should have a devtool filter for each devtool`, async () => {
            (0, expect_1.expect)(filterOptions.devtools.length).to.equal(devtools.length);
            for (const devtoolMetadata of devtools) {
                const found = filterOptions.devtools.find(devtoolFilterOption => devtoolMetadata.id === devtoolFilterOption.publicId);
                (0, expect_1.expect)(found).to.exist;
            }
        });
        it('should have a package group filter for each main package representing the group', async () => {
            const mainPackageOverviewsMetadata = packages
                .filter(p => !p.packageOverview.supplements && !p.packageOverview.restrictions)
                .map(p => p.packageOverview);
            (0, expect_1.expect)(filterOptions.packageGroups.length).to.equal(mainPackageOverviewsMetadata.length);
            for (const mainPackageOverviewMetadata of mainPackageOverviewsMetadata) {
                const foundGroup = filterOptions.packageGroups.find(packageGroupFilterOption => packageGroupFilterOption.publicId ===
                    nodes_utils_1.GROUP_ID_PREFIX + mainPackageOverviewMetadata.packageUId);
                (0, expect_1.expect)(foundGroup).to.exist;
            }
        });
        it('should not have any package group filters with restricted packages', async () => {
            // restricted package was imported...
            const restrictedPackageUId = restrictedPackage.packageOverview.packageUId;
            const packageGroup = packageGroupsDef.find(group => group.packages.includes(restrictedPackageUId));
            (0, expect_1.expect)(packageGroup).to.exist;
            // ... but is not returned in filter options
            (0, expect_1.expect)(filterOptions.packageGroups.find(group => group.publicId === nodes_utils_1.GROUP_ID_PREFIX + restrictedPackageUId)).to.not.exist;
        });
        it('should have filter option for every occurring filter field value', () => {
            const filterFieldValues = {
                resourceClass: [],
                compiler: [],
                kernel: [],
                language: [],
                ide: []
            };
            for (const fieldName of Object.keys(filterFieldValues)) {
                // gather all occurring values from the filter field (they are then expected to also
                // exist in filter options)
                for (const pkg of packages) {
                    for (const resource of pkg.resources) {
                        if (resource[fieldName]) {
                            for (const option of resource[fieldName]) {
                                if (!filterFieldValues[fieldName].includes(option)) {
                                    filterFieldValues[fieldName].push(option);
                                }
                            }
                        }
                    }
                }
                // TODO: route APIs use plural names vs DB uses singular names: adjust DB names (REX-2155)
                const filterOptionName = fieldName === 'resourceClass' ? fieldName + 'es' : fieldName + 's';
                // cast and assert it's not undefined since we know this filter should exist
                const filter = filterOptions[filterOptionName].map(v => v.publicId);
                filterFieldValues[fieldName].forEach(field => (0, expect_1.expect)(filter).to.include(field));
            }
        });
    });
    describe("api/filteredChildrenNodeIds" /* API.GET_FILTERED_CHILDREN_NODE_IDS */, () => {
        const defaultFilterPackageGroups = [];
        before(async () => {
            defaultFilterPackageGroups.push(...filterOptions.packageGroups.map(p => p.publicId));
        });
        /**
         *  Verify using getFilteredChildrenNodeIds that the supplied path exists, and return
         *  the names of any children on the final entry
         */
        async function verifyPath(path, { filterPackageGroup, filterDevice, filterDevtool, filterSearch, filterResourceClass, filterKernel, filterCompiler, filterLanguage, filterIde } = {}) {
            // Use all packages if filterPackage is not defined
            filterPackageGroup = filterPackageGroup || defaultFilterPackageGroups;
            // Start with the root node
            let currentId = await (0, nodes_utils_1.getRootNode)();
            let currentNode = 'root';
            while (path.length) {
                // find the current node's children
                const childNodes = await (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: [currentId],
                    filterPackageGroup,
                    filterDevice,
                    filterDevtool,
                    filterSearch,
                    filterResourceClass,
                    filterKernel,
                    filterCompiler,
                    filterLanguage,
                    filterIde
                });
                // Verify that one of those children matches the name along the path we expected
                if (_.isEmpty(childNodes.parentToChildDbId[currentId])) {
                    throw new Error(`${currentNode} has no children`);
                }
                const nodesData = await (0, nodes_utils_1.getNodesData)({
                    dbId: childNodes.parentToChildDbId[currentId]
                });
                const nextId = _.findKey(nodesData.dbIdToData, data => data.name === path[0]);
                if (!nextId) {
                    throw new Error(`could not find ${path[0]} in the children`);
                }
                // Use that as the next index to search along
                currentId = nextId;
                currentNode = path[0];
                path = path.slice(1);
            }
            // Return the names of any children at this point
            const childNodes = await (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                parentDbId: [currentId],
                filterPackageGroup,
                filterDevice,
                filterDevtool,
                filterSearch,
                filterResourceClass,
                filterKernel,
                filterCompiler,
                filterLanguage,
                filterIde
            });
            if (!_.isEmpty(childNodes.parentToChildDbId[currentId])) {
                const nodesData = await (0, nodes_utils_1.getNodesData)({
                    dbId: childNodes.parentToChildDbId[currentId]
                });
                return _.map(nodesData.dbIdToData, data => data.name);
            }
            return [];
        }
        describe('Sanity', () => {
            it('should have children for root', async () => {
                await verifyPath([database_utils_1.firstFolderInAllPackages]);
            });
            it('should find children from the root to a package overview', async () => {
                await verifyPath([database_utils_1.firstFolderInAllPackages, simplePackage1.packageOverview.name]);
            });
            it('should find children from the root node to a resource', async () => {
                const resource = simplePackage1.resources[0];
                await verifyPath([...resource.fullPaths[0], resource.name]);
            });
            it('should not find children under a leaf node', async () => {
                const resource = simplePackage1.resources[0];
                const leafChildren = await verifyPath([...resource.fullPaths[0], resource.name]);
                (0, expect_1.expect)(leafChildren).to.be.empty;
            });
            it('should operate in bulk mode', async () => {
                const idsToTest = [
                    await (0, nodes_utils_1.getDbId)(simplePackage1.resources[0]),
                    await (0, nodes_utils_1.getDbId)(devFilterPackage.resources[1]),
                    await (0, nodes_utils_1.getDbId)(simplePackage1.packageOverview),
                    await (0, nodes_utils_1.getRootNode)()
                ];
                // Get the children in bulk mode
                const result = await (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: idsToTest,
                    filterPackageGroup: defaultFilterPackageGroups
                });
                // Verify it matches individually
                for (const id of idsToTest) {
                    const expected = await (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                        parentDbId: [id],
                        filterPackageGroup: defaultFilterPackageGroups
                    });
                    (0, expect_1.expect)(result.parentToChildDbId[id]).to.deep.equal(expected.parentToChildDbId[id]);
                }
            });
        });
        describe('Filters', () => {
            it('should have no children for root if all packages filtered', async () => {
                const rootChildren = await verifyPath([], { filterPackageGroup: [] });
                (0, expect_1.expect)(rootChildren).to.be.empty;
            });
            it('should find node for a resource filtered in by package', async () => {
                const resource = simplePackage1.resources[0];
                const filterPackageGroup = filterOptions
                    .packageGroups.filter(p => resource.package === p.name)
                    .map(p => p.publicId);
                await verifyPath([...resource.fullPaths[0], resource.name], { filterPackageGroup });
            });
            it('should not find the node of the package when it is filtered out by package', async () => {
                const resource = simplePackage1.resources[0];
                const filterPackageGroup = filterOptions
                    .packageGroups.filter(p => resource.package !== p.name)
                    .map(p => p.publicId);
                const folderChildren = await verifyPath([database_utils_1.firstFolderInAllPackages], {
                    filterPackageGroup
                });
                // So "Software" should exist because there are other packages, but the package we
                // are looking for should not be there
                (0, expect_1.expect)(folderChildren).to.not.be.empty;
                (0, expect_1.expect)(folderChildren).to.not.contain(resource.package);
            });
            it('should find node for a resource filtered in by device', async () => {
                const resource = devFilterPackage.resources[0];
                const filterDevice = await generateFilter(resource.devices[0]);
                await verifyPath([...resource.fullPaths[0], resource.name], { filterDevice });
            });
            it('should not find node for a resource filtered out by device', async () => {
                const resource = devFilterPackage.resources[0];
                const filterDevice = filterOptions.devices
                    .filter(d => !resource.devices.includes(d.name))
                    .map(d => d.publicId)
                    .slice(0, 1);
                const folderChildren = await verifyPath(resource.fullPaths[0], { filterDevice });
                // So the resource shouldn't be there, but there are other resources at this path
                (0, expect_1.expect)(folderChildren).to.not.be.empty;
                (0, expect_1.expect)(folderChildren).to.not.contain(resource.name);
            });
            it('should find node for a resource filtered in by devtool', async () => {
                const resource = devFilterPackage.resources[0];
                const filterDevtool = filterOptions.devtools
                    .filter(d => resource.devtools.includes(d.name))
                    .map(d => d.publicId);
                await verifyPath([...resource.fullPaths[0], resource.name], { filterDevtool });
            });
            it('should not find node for a resource filtered out by devtool', async () => {
                const resource = devFilterPackage.resources[0];
                const filterDevtool = filterOptions.devtools
                    .filter(d => !resource.devtools.includes(d.name))
                    .map(d => d.publicId)
                    .slice(0, 1);
                const folderChildren = await verifyPath(resource.fullPaths[0], { filterDevtool });
                // So the resource shouldn't be there, but there are other resources at this path
                (0, expect_1.expect)(folderChildren).to.not.be.empty;
                (0, expect_1.expect)(folderChildren).to.not.contain(resource.name);
            });
        });
        describe('Additional Filters', async () => {
            // exclusively uses variedFiltersPackage
            let filterPackage;
            let nodePath;
            before(async () => {
                filterPackage = filterOptions
                    .packageGroups.filter(p => variedFiltersPackage.packageOverview.name === p.name)
                    .map(p => p.publicId)[0];
                nodePath = variedFiltersPackage.resources[0].fullPaths[0];
            });
            it('should find all nodes in the package when no filter used', async () => {
                const folderChildren = await verifyPath(nodePath, {});
                (0, expect_1.expect)(folderChildren).to.include.members(variedFiltersPackage.resources.map(r => r.name));
            });
            const filtersToTest = [
                { resourceClass: ['example'] },
                { compiler: ['ccs'] },
                { kernel: ['nortos'] },
                { language: ['chinese'] },
                { ide: ['ccs'] }
            ];
            for (const filterToTest of filtersToTest) {
                const fieldName = Object.keys(filterToTest)[0];
                const filterId = filterToTest[fieldName][0];
                it(`should filter individually by ${fieldName}`, async () => {
                    // convert e.g. 'compiler' to 'filterCompiler' which is expected by the route API
                    const filterName = 'filter' + fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
                    const filter = { filterPackage: [filterPackage] };
                    filter[filterName] = [filterId];
                    const folderChildren = await verifyPath(nodePath, filter);
                    (0, expect_1.expect)(folderChildren).to.have.members(variedFiltersPackage.resources
                        .filter(r => r[fieldName] && r[fieldName].includes(filterId))
                        .map(r => r.name));
                });
            }
            it(`should filter by resourceClass, ide and kernel combined`, async () => {
                const folderChildren = await verifyPath(nodePath, {
                    filterPackageGroup: [filterPackage],
                    filterResourceClass: ['example'],
                    filterIde: ['ccs'],
                    filterKernel: ['tirtos']
                });
                (0, expect_1.expect)(folderChildren).to.have.members(variedFiltersPackage.resources
                    .filter(r => r.resourceClass.includes('example') &&
                    r.ide.includes('ccs') &&
                    r.kernel.includes('tirtos'))
                    .map(r => r.name));
            });
            it(`should filter by resourceClass with search`, async () => {
                const folderChildren = await verifyPath(nodePath, {
                    filterPackageGroup: [filterPackage],
                    filterResourceClass: ['example'],
                    filterSearch: 'asearchstring'
                });
                (0, expect_1.expect)(folderChildren).to.have.members(variedFiltersPackage.resources
                    .filter(r => r.resourceClass.includes('example') &&
                    r.description.indexOf('asearchstring') !== -1)
                    .map(r => r.name));
            });
        });
        describe('Search', () => {
            // Note: the next two tests we know are finding the resource using only the key indicated because when the
            // resources are created, the searchText is only added in that one key only
            searchableKeys.forEach((key, index) => {
                it('should find node for a resource filtered in by search matching ' + key, async () => {
                    const resource = searchablePackage.resources[index];
                    await verifyPath([...resource.fullPaths[0], resource.name], {
                        filterSearch: searchText
                    });
                });
            });
            it('should find node for a resource filtered in by search matching a word in the description', async () => {
                const resource = searchablePackage.resources.find(r => r.name === searchableOneWordInDescription);
                await verifyPath([...resource.fullPaths[0], resource.name], {
                    filterSearch: searchText
                });
            });
            it('should find node for a resource filtered in by search matching a partial word in the description', async () => {
                const resource = searchablePackage.resources.find(r => r.name === searchableOneWordInDescription);
                await verifyPath([...resource.fullPaths[0], resource.name], {
                    filterSearch: searchChunk
                });
            });
            it('should not find node for a resource filtered out by search', async () => {
                const resource = simplePackage1.resources[0];
                const folderChildren = await verifyPath([database_utils_1.firstFolderInAllPackages], {
                    filterSearch: searchText
                });
                // So the resource shouldn't be there, but there are other resources at this path
                (0, expect_1.expect)(folderChildren).to.not.be.empty;
                (0, expect_1.expect)(folderChildren).to.not.contain(resource.fullPaths[0][0]);
            });
        });
        describe('Search and filtering', () => {
            it('should find node for a resource included by filter and search', async () => {
                const resource = searchablePackage.resources[0];
                const device = devices[0];
                // Bug REX-1884: device ids and names swapped
                // const filterDevice = await generateFilter(device.name);
                const filterDevice = await generateFilter(device.id);
                // Ensure we can find it on it's own
                await verifyPath([...resource.fullPaths[0], resource.name], {
                    filterSearch: searchText
                });
                await verifyPath([...resource.fullPaths[0], resource.name], {
                    filterDevice
                });
                // Now verify when both filter and search are applied
                await verifyPath([...resource.fullPaths[0], resource.name], {
                    filterSearch: searchText,
                    filterDevice
                });
            });
            it('should not find node for a resource excluded by filter when searching', async () => {
                const resourceExcludedByFilter = searchablePackage.resources[1];
                const device = devices[0];
                // Bug REX-1884: device ids and names swapped
                // const filterDevice = await generateFilter(device.name);
                const filterDevice = await generateFilter(device.id);
                // Ensure we can find it on it's own
                await verifyPath([...resourceExcludedByFilter.fullPaths[0], resourceExcludedByFilter.name], {
                    filterSearch: searchText
                });
                // Now ensure it's excluded by filter or both
                let folder = await verifyPath(resourceExcludedByFilter.fullPaths[0], {
                    filterDevice
                });
                (0, expect_1.expect)(folder).to.not.be.empty;
                (0, expect_1.expect)(folder).to.not.include(resourceExcludedByFilter.name);
                folder = await verifyPath(resourceExcludedByFilter.fullPaths[0], {
                    filterSearch: searchText,
                    filterDevice
                });
                (0, expect_1.expect)(folder).to.not.be.empty;
                (0, expect_1.expect)(folder).to.not.include(resourceExcludedByFilter.name);
            });
            it('should not find node for a resource excluded by search when filtering', async () => {
                const resourceExcludedBySearch = simplePackage1.resources[0];
                const device = devices[0];
                // Bug REX-1884: device ids and names swapped
                // const filterDevice = await generateFilter(device.name);
                const filterDevice = await generateFilter(device.id);
                // Ensure we can find it on it's own
                await verifyPath([...resourceExcludedBySearch.fullPaths[0], resourceExcludedBySearch.name], {
                    filterDevice
                });
                // Now ensure it's excluded by filter or both
                let folder = await verifyPath([database_utils_1.firstFolderInAllPackages], {
                    filterSearch: searchText
                });
                (0, expect_1.expect)(folder).to.not.be.empty;
                (0, expect_1.expect)(folder).to.not.include(resourceExcludedBySearch.name);
                folder = await verifyPath([database_utils_1.firstFolderInAllPackages], {
                    filterSearch: searchText,
                    filterDevice
                });
                (0, expect_1.expect)(folder).to.not.be.empty;
                (0, expect_1.expect)(folder).to.not.include(resourceExcludedBySearch.name);
            });
        });
        describe('Sort', () => {
            const testData = [
                {
                    sort: undefined,
                    description: 'by file/folder, then metadata order (if file) or name (if folder)',
                    topFolderName: 'undefinedSortFolder',
                    expected: [
                        'b file 8 c2',
                        'b file 6 c3',
                        'd file 1',
                        'e file 3',
                        'b file 5',
                        'c file 12',
                        'a file 13',
                        'b folder overview 7 c1',
                        'a folder 11',
                        'b folder 9',
                        'c folder 10',
                        'd folder overview 2',
                        'e folder overview 4'
                    ]
                },
                {
                    sort: 'default',
                    description: 'by file/folder, then custom order and metadata order (if file) or name ' +
                        '(if folder)',
                    topFolderName: 'defaultSortFolder',
                    expected: [
                        'b file 8 c2',
                        'b file 6 c3',
                        'd file 1',
                        'e file 3',
                        'b file 5',
                        'c file 12',
                        'a file 13',
                        'b folder overview 7 c1',
                        'a folder 11',
                        'b folder 9',
                        'c folder 10',
                        'd folder overview 2',
                        'e folder overview 4'
                    ]
                },
                {
                    sort: 'filesAndFoldersAlphabetical',
                    description: 'in custom then alphabetical order with files/folders intermixed',
                    topFolderName: 'alphabeticalSortFolder',
                    expected: [
                        'b folder overview 7 c1',
                        'b file 8 c2',
                        'b file 6 c3',
                        'a file 13',
                        'a folder 11',
                        'b file 5',
                        'b folder 9',
                        'c file 12',
                        'c folder 10',
                        'd file 1',
                        'd folder overview 2',
                        'e file 3',
                        'e folder overview 4'
                    ]
                },
                {
                    sort: 'manual',
                    description: 'in custom then metadata order with files/folders intermixed',
                    topFolderName: 'manualSortFolder',
                    expected: [
                        // Custom first
                        'b folder overview 7 c1',
                        'b file 8 c2',
                        'b file 6 c3',
                        // In order that they appear in metadata
                        'd file 1',
                        'd folder overview 2',
                        'e file 3',
                        'e folder overview 4',
                        'b file 5',
                        'c file 12',
                        'a file 13',
                        // Folders without resources at bottom in alphabetical order
                        'a folder 11',
                        'b folder 9',
                        'c folder 10'
                    ]
                }
            ];
            for (const { sort: sort, description, topFolderName: folderName, expected } of testData) {
                it('should sort ' + description + ' when ' + sort + ' sort', async () => {
                    const resource = _.find(sortTestPackage.resources, { name: folderName });
                    (0, expect_1.expect)(resource).to.exist;
                    const parentDbId = await (0, nodes_utils_1.getDbId)(resource);
                    // Get the folder's children, expected to be in the order specified by the
                    // top folder's sort metadata property
                    const filterPackageGroup = filterOptions
                        .packageGroups.filter(p => resource.package === p.name)
                        .map(p => p.publicId);
                    await verifyPath([...resource.fullPaths[0], resource.name], {
                        filterPackageGroup
                    });
                    // Get node's children db ids
                    const childNodeDbIds = (await (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                        parentDbId: [parentDbId],
                        filterPackageGroup
                    })).parentToChildDbId[parentDbId];
                    const nodesData = await (0, nodes_utils_1.getNodesData)({
                        dbId: childNodeDbIds
                    });
                    // Create an array of child nodes, in the same order as the child ids returned
                    // by getFilteredChildrenNodeIds()
                    const childNodes = _.map(childNodeDbIds, dbId => nodesData.dbIdToData[dbId]);
                    const childNames = _.map(childNodes, 'name');
                    (0, expect_1.expect)(childNames).to.have.ordered.members(expected);
                });
            }
        });
        describe('Negative testing', () => {
            const filterNames = [
                'filterDevice',
                'filterDevtool',
                'filterCompiler',
                'filterResourceClass',
                'filterKernel',
                'filterLanguage'
            ];
            it('should reject invalid parent ids', async () => {
                await expectThrows(400, 'Id is NaN: foo', (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: ['foo'],
                    filterPackageGroup: defaultFilterPackageGroups
                }));
            });
            it('should handle unknown parent ids', async () => {
                const result = await (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: [Number.MAX_SAFE_INTEGER.toString()],
                    filterPackageGroup: defaultFilterPackageGroups
                });
                (0, expect_1.expect)(result.parentToChildDbId[Number.MAX_SAFE_INTEGER.toString()]).to.be.empty;
            });
            it('should reject non-existent filter ids', async () => {
                await expectThrows(400, 'No package group found with packageGroupPublicUid foo', (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: [await (0, nodes_utils_1.getRootNode)()],
                    filterPackageGroup: ['foo']
                }), 'filterPackage');
                for (const key of ['filterDevice', 'filterDevtool']) {
                    await expectThrows(400, /No (device|devtool) found with publicId foo/, (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                        parentDbId: [await (0, nodes_utils_1.getRootNode)()],
                        filterPackageGroup: defaultFilterPackageGroups,
                        [key]: ['foo']
                    }), key);
                }
            });
            it('should reject multiple values for a filter', async () => {
                for (const key of filterNames) {
                    const keyNofilter = key.slice('filter'.length);
                    const type = keyNofilter.charAt(0).toLowerCase() + keyNofilter.slice(1);
                    await expectThrows(400, `Can only specify one ${type} in filter params`, (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                        parentDbId: [await (0, nodes_utils_1.getRootNode)()],
                        filterPackageGroup: defaultFilterPackageGroups,
                        [key]: ['1', '2'] // no these aren't real ids, but we should fail before that's checked
                    }));
                }
            });
            it('should reject no ids given', async () => {
                await expectThrows(400, 'Required id parameter was not provided', (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: [],
                    filterPackageGroup: defaultFilterPackageGroups
                }));
                await expectThrows(400, 'Required id parameter was not provided', 
                // @ts-ignore - intentionally violating type system to ensure it's caught
                (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    filterPackageGroup: defaultFilterPackageGroups
                }));
            });
            it('should reject unknown filters', async () => {
                await expectThrows(400, 'Filter param filterFoo is not supported', (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: [await (0, nodes_utils_1.getRootNode)()],
                    filterPackageGroup: defaultFilterPackageGroups,
                    // @ts-ignore - intentionally violating type system to ensure it's caught
                    filterFoo: ['bar']
                }));
            });
        });
    });
    describe("api/nodesData" /* API.GET_NODES_DATA */, () => {
        it('should test viewConstraint', async () => {
            let resource = viewConstrainedPackage.resources[0];
            let id = await (0, nodes_utils_1.getDbId)(resource);
            let result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
            let data = result.dbIdToData[id];
            (0, expect_1.expect)(data).to.exist;
            (0, expect_1.expect)(data.descriptor.viewConstraint).to.equal("DownloadOnly" /* Nodes.ViewConstraint.DOWNLOAD_ONLY */);
            resource = viewConstrainedPackage.resources[1];
            id = await (0, nodes_utils_1.getDbId)(resource);
            result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
            data = result.dbIdToData[id];
            (0, expect_1.expect)(data).to.exist;
            (0, expect_1.expect)(data.descriptor.viewConstraint).to.not.exist;
            resource = viewConstrainedPackage.resources[2];
            id = await (0, nodes_utils_1.getDbId)(resource);
            result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
            data = result.dbIdToData[id];
            (0, expect_1.expect)(data).to.exist;
            (0, expect_1.expect)(data.descriptor.viewConstraint).to.equal("DownloadOnly" /* Nodes.ViewConstraint.DOWNLOAD_ONLY */);
            resource = viewConstrainedPackage.resources[3];
            id = await (0, nodes_utils_1.getDbId)(resource);
            result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
            data = result.dbIdToData[id];
            (0, expect_1.expect)(data).to.exist;
            (0, expect_1.expect)(data.descriptor.viewConstraint).to.equal("ExternalOnly" /* Nodes.ViewConstraint.EXTERNAL_ONLY */);
        });
        it('should return valid data for a folder node', async () => {
            const resource = simplePackage1.resources[0];
            const id = await (0, nodes_utils_1.getDbId)(resource.fullPaths[0]); // parent folder of the resource
            const parentFolderName = resource.fullPaths[0][resource.fullPaths[0].length - 1];
            const categoryForParent = simplePackage1.simpleCategories.find(c => c.name === parentFolderName);
            const expectedPublicId = categoryForParent.fullPathsPublicIds[0];
            const result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
            const data = result.dbIdToData[id];
            (0, expect_1.expect)(data).to.exist;
            const expectedData = {
                nodeDbId: id,
                nodePublicId: expectedPublicId,
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                name: parentFolderName,
                descriptor: {
                    icon: "Folder" /* Nodes.Icon.FOLDER */,
                    isImportable: false,
                    hasChildren: true,
                    isDownloadable: false
                },
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: simplePackage1.packageOverview.packageUId,
                packageGroupPublicUid: nodes_utils_1.GROUP_ID_PREFIX + simplePackage1.packageOverview.packageUId
            };
            (0, expect_1.expect)(data).to.be.deep.equal(expectedData);
        });
        it('should return valid data for a folder with hidden resource node', async () => {
            const resource = variedTypesPackage.resources.find(r => r.name === 'folderWithResource');
            const id = await (0, nodes_utils_1.getDbId)(resource);
            const result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
            const data = result.dbIdToData[id];
            (0, expect_1.expect)(data).to.exist;
            const expectedData = {
                nodeDbId: id,
                nodePublicId: resource.fullPathsPublicIds[0],
                nodeType: response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE,
                name: resource.name,
                descriptor: {
                    icon: "Folder" /* Nodes.Icon.FOLDER */,
                    isImportable: false,
                    hasChildren: true,
                    isDownloadable: false
                },
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: variedTypesPackage.packageOverview.packageUId,
                packageGroupPublicUid: nodes_utils_1.GROUP_ID_PREFIX + variedTypesPackage.packageOverview.packageUId
            };
            (0, expect_1.expect)(data).to.be.deep.equal(expectedData);
        });
        it('should return valid data for a package folder node', async () => {
            const { packageOverview } = variedTypesPackage;
            const id = await (0, nodes_utils_1.getDbId)(packageOverview);
            const result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
            const data = result.dbIdToData[id];
            (0, expect_1.expect)(data).to.exist;
            const expectedData = {
                nodeDbId: id,
                nodePublicId: packageOverview.fullPathsPublicIds[0],
                nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
                name: packageOverview.name,
                descriptor: {
                    icon: "Package" /* Nodes.Icon.PACKAGE */,
                    hasChildren: true,
                    isDownloadable: true,
                    isImportable: false
                },
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: packageOverview.packageUId,
                packageGroupPublicUid: nodes_utils_1.GROUP_ID_PREFIX + packageOverview.packageUId
            };
            (0, expect_1.expect)(data).to.be.deep.equal(expectedData);
        });
        const leafNodeExpectedData = [
            {
                name: 'cppFileByLink',
                icon: "SourceCode_CPP" /* Nodes.Icon.SOURCE_CODE_CPP */,
                contentType: "Code" /* Nodes.ContentType.SOURCE_CODE */,
                isDownloadable: true
            },
            {
                name: 'energiaProject (folderWithResource)',
                icon: "Project_Energia" /* Nodes.Icon.PROJECT_ENERGIA */,
                contentType: "Code" /* Nodes.ContentType.SOURCE_CODE */,
                nodeType: response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE,
                isImportable: true,
                isDownloadable: false // TODO: should be downloadable?
            },
            {
                name: 'cppFileByType',
                icon: "SourceCode_CPP" /* Nodes.Icon.SOURCE_CODE_CPP */,
                contentType: "Code" /* Nodes.ContentType.SOURCE_CODE */,
                isDownloadable: true
            },
            {
                name: 'asmFile.asm',
                icon: "SourceCode_ASM" /* Nodes.Icon.SOURCE_CODE_ASM */,
                contentType: "Code" /* Nodes.ContentType.SOURCE_CODE */,
                isDownloadable: true
            },
            {
                name: 'markdown.md',
                icon: "Markdown" /* Nodes.Icon.MARKDOWN */,
                contentType: "Markdown" /* Nodes.ContentType.MARKDOWN */,
                isDownloadable: true
            },
            {
                name: 'pdf.pdf',
                icon: "PDF" /* Nodes.Icon.PDF */,
                contentType: "PDF" /* Nodes.ContentType.PDF */,
                isDownloadable: true
            },
            {
                name: 'custom_icon_overrides_md_icon.md',
                icon: "Support" /* Nodes.Icon.SUPPORT */,
                contentType: "Markdown" /* Nodes.ContentType.MARKDOWN */,
                isDownloadable: true
            },
            {
                name: 'external_webpage_with_no_extension',
                icon: "WebPage" /* Nodes.Icon.WEBPAGE */,
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                isDownloadable: false
            }
        ];
        for (const expected of leafNodeExpectedData) {
            it(`should validly decode file extensions: ${expected.name}`, async () => {
                const resource = variedTypesPackage.resources.find(r => r.name === expected.name);
                const id = await (0, nodes_utils_1.getDbId)(resource);
                const result = await (0, nodes_utils_1.getNodesData)({ dbId: [id] });
                const data = result.dbIdToData[id];
                (0, expect_1.expect)(data).to.exist;
                const expectedData = {
                    nodeDbId: id,
                    nodePublicId: resource.fullPathsPublicIds[0],
                    nodeType: expected.nodeType || response_data_1.Nodes.NodeType.LEAF_NODE,
                    name: resource.name,
                    descriptor: {
                        icon: expected.icon,
                        isDownloadable: expected.isDownloadable || false,
                        isImportable: expected.isImportable || false,
                        hasChildren: false
                    },
                    contentType: expected.contentType,
                    packagePublicUid: variedTypesPackage.packageOverview.packageUId,
                    packageGroupPublicUid: nodes_utils_1.GROUP_ID_PREFIX + variedTypesPackage.packageOverview.packageUId
                };
                if (expected.contentType === "Code" /* Nodes.ContentType.SOURCE_CODE */) {
                    expectedData.descriptor.programmingLanguage = expected.name.match(/.*asm/)
                        ? "Asm" /* Nodes.ProgrammingLanguage.ASM */
                        : "C" /* Nodes.ProgrammingLanguage.C */;
                }
                (0, expect_1.expect)(data).to.be.deep.equal(expectedData);
                (0, expect_1.expect)(data.descriptor.viewConstraint).to.not.exist;
            });
        }
        it('should operate in bulk mode', async () => {
            const idsToTest = [];
            for (const expected of leafNodeExpectedData) {
                const resource = variedTypesPackage.resources.find(r => r.name === expected.name);
                idsToTest.push(await (0, nodes_utils_1.getDbId)(resource));
            }
            // Get the node data in bulk mode
            const result = await (0, nodes_utils_1.getNodesData)({
                dbId: idsToTest
            });
            // Verify it matches individually
            for (const id of idsToTest) {
                const expected = await (0, nodes_utils_1.getNodesData)({
                    dbId: [id]
                });
                (0, expect_1.expect)(result.dbIdToData[id]).to.deep.equal(expected.dbIdToData[id]);
            }
        });
        it('should handle missing ids', async () => {
            // @ts-ignore - explicitly breaking types to verify invalid request
            await expectThrows(400, 'Required id parameter was not provided', (0, nodes_utils_1.getNodesData)({}));
        });
        it('should handle invalid ids', async () => {
            await expectThrows(400, 'Id is NaN: foo', (0, nodes_utils_1.getNodesData)({
                dbId: ['foo']
            }));
        });
        it('should handle unknown ids', async () => {
            await expectThrows(404, `Unknown node id: ${Number.MAX_SAFE_INTEGER.toString()}`, (0, nodes_utils_1.getNodesData)({
                dbId: [Number.MAX_SAFE_INTEGER.toString()]
            }));
        });
        // TODO: Add tests for isDownloadable/isImportable once set by the server
    });
    describe("api/nodeExtendedData" /* API.GET_NODE_EXTENDED_DATA */, () => {
        async function verifyAndFetchExtData(parameter) {
            const nodePath = (0, nodes_utils_1.toNodePath)(parameter);
            const id = await (0, nodes_utils_1.getDbId)(nodePath);
            const result = await (0, nodes_utils_1.getNodeExtendedData)({ dbId: id });
            const data = result.dbIdToChildExtData[id];
            (0, expect_1.expect)(data).to.exist;
            (0, expect_1.expect)(data.nodeDbId).to.be.equal(id);
            const expectedNodeIdPath = await getExpectedNodeIdPath(nodePath);
            (0, expect_1.expect)(data.nodeDbIdPath).to.be.deep.equal(expectedNodeIdPath);
            return data;
            async function getExpectedNodeIdPath(currentNodePath) {
                if (currentNodePath.length) {
                    return [
                        ...(await getExpectedNodeIdPath(currentNodePath.slice(0, -1))),
                        await (0, nodes_utils_1.getDbId)(currentNodePath)
                    ];
                }
                return [];
            }
        }
        it('should return valid data for a folder node', async () => {
            const folderPath = simplePackage1.resources[0].fullPaths[0];
            const data = await verifyAndFetchExtData(folderPath);
            (0, expect_1.expect)(data.nodeType).to.be.equal(response_data_1.Nodes.NodeType.FOLDER_NODE);
        });
        it('should return valid data for a folder with hidden resource node', async () => {
            const resource = variedTypesPackage.resources.find(r => r.name === 'folderWithResource');
            const data = await verifyAndFetchExtData(resource);
            (0, expect_1.expect)(data.nodeType).to.be.equal(response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE);
            const typedData = data;
            if (typedData.overview) {
                if (resource.resourceType === 'project.energia') {
                    // SPECIAL CASE for Energia projects: display .ino file content
                    (0, expect_1.expect)(typedData.overview.overviewLink).to.be.equal(`content/${resource.link}`);
                }
                else {
                    // regression check: resource should not be displayed otherwise
                    (0, expect_1.expect)(typedData.overview.overviewLink).to.not.be.equal(`content/${resource.link}`);
                }
            }
        });
        it('should return valid data for a package folder node', async () => {
            const { packageOverview } = variedTypesPackage;
            const data = await verifyAndFetchExtData(packageOverview);
            (0, expect_1.expect)(data.nodeType).to.be.equal(response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE);
            (0, expect_1.expect)(data.overview).to.be.deep.equal({
                overviewText: packageOverview.description,
                overviewImage: `content/${packageOverview.image}`,
                overviewType: "Overview" /* Nodes.OverviewType.OVERVIEW */
            });
        });
        it(`should return valid data for a leaf node`, async () => {
            const resource = variedTypesPackage.resources.find(r => r.name === 'cppFileByLink');
            const data = await verifyAndFetchExtData(resource);
            (0, expect_1.expect)(data.nodeType).to.be.equal(response_data_1.Nodes.NodeType.LEAF_NODE);
            const typedData = data;
            (0, expect_1.expect)(typedData.description).to.be.equal(resource.description);
            (0, expect_1.expect)(typedData.link).to.be.equal(`content/${resource.link}`);
        });
        it('should not operate in bulk mode', async () => {
            await expectThrows(400, 'Can only request extended data for a single node id', (0, nodes_utils_1.getNodeExtendedData)({
                // @ts-ignore - explicitly breaking types to verify invalid request
                dbId: ['1', '2']
            }));
        });
        it('should handle missing ids', async () => {
            await expectThrows(400, 'Required id parameter was not provided', 
            // @ts-ignore - explicitly breaking types to verify invalid request
            (0, nodes_utils_1.getNodeExtendedData)({}));
        });
        it('should handle invalid ids', async () => {
            await expectThrows(400, 'Id is NaN: foo', (0, nodes_utils_1.getNodeExtendedData)({
                dbId: 'foo'
            }));
        });
        it('should handle unknown ids', async () => {
            await expectThrows(404, new RegExp(`.*Unknown node id: ${Number.MAX_SAFE_INTEGER.toString()}`), (0, nodes_utils_1.getNodeExtendedData)({
                dbId: Number.MAX_SAFE_INTEGER.toString()
            }));
        });
    });
    describe("api/expandedFilteredDescendantNodesData" /* API.GET_EXPANDED_FILTERED_DESCENDANT_NODES_DATA */, () => {
        const defaultFilterPackage = [];
        before(async () => {
            defaultFilterPackage.push(...filterOptions.packageGroups.map(p => p.publicId));
        });
        // This API is basically getFilteredChildren + getNodesData, while automatically getting
        // the children's children if any node only has one child.
        // As such, we could repeat the filtering/searching tests that were done for
        // getFilteredChildren.  However, since it's calling the same APIs underneath, these tests
        // are only going to verify filtering/searching params are passed alone, and not explicitly
        // test different filters/searches etc.  This can be done by comparing the
        // results of this function with the two it's based on, while also considering auto-
        // expansion.
        async function verifyExpandedChildren(parameter, { filterPackage, filterDevice, filterDevtool, filterSearch } = {}) {
            // Call the API under test
            const id = await (0, nodes_utils_1.getDbId)(parameter);
            const result = await (0, nodes_utils_1.getExpandedFilteredDescendantNodesData)({
                parentDbId: id,
                filterPackageGroup: filterPackage || defaultFilterPackage,
                filterDevice,
                filterDevtool,
                filterSearch
            });
            // Calculate what is actually expected, and compare
            const expectedResult = await getExpectedResult(id);
            (0, expect_1.expect)(sortResult(result.parentToChildData)).to.be.deep.equal(sortResult(expectedResult));
            async function getExpectedResult(parentId) {
                // Get the children ids
                const children = (await (0, nodes_utils_1.getFilteredChildrenNodeIds)({
                    parentDbId: [parentId],
                    filterPackageGroup: filterPackage || defaultFilterPackage,
                    filterDevice,
                    filterDevtool,
                    filterSearch
                })).parentToChildDbId[parentId];
                // If there are no children, we are done
                if (0 === children.length) {
                    return { [parentId]: [] };
                }
                // Get the nodes data of those children
                const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: children });
                // If there's only one child, recursively expand that child
                if (1 === children.length) {
                    return {
                        [parentId]: [nodesData.dbIdToData[children[0]]],
                        ...(await getExpectedResult(children[0]))
                    };
                }
                // Otherwise, return all the children nodes data
                return {
                    [parentId]: Object.values(nodesData.dbIdToData)
                };
            }
            function sortResult(result) {
                return _.mapValues(result, nodes => _.sortBy(nodes, node => node.nodeDbId));
            }
        }
        let TestType;
        (function (TestType) {
            TestType["NONE"] = "";
            TestType["FILTER"] = "with a filter";
            TestType["SEARCH"] = "while searching";
        })(TestType || (TestType = {}));
        async function getFilter(testType) {
            switch (testType) {
                case TestType.NONE:
                    return {};
                case TestType.FILTER:
                    const filterDevice = await generateFilter(searchText);
                    return { filterDevice };
                case TestType.SEARCH:
                    return {
                        filterSearch: searchText
                    };
                default:
                    (0, util_1.assertNever)(testType);
                    throw new Error(`Unknown test type: ${testType}`);
            }
        }
        Object.values(TestType).forEach((testType) => {
            it(`should correctly fetch/expand children from root ${testType}`, async () => {
                await verifyExpandedChildren([], await getFilter(testType));
            });
            it(`should correctly fetch/expand zero children from a leaf ${testType}`, async () => {
                await verifyExpandedChildren(searchablePackage.resources[0], await getFilter(testType));
            });
            it(`should correctly fetch/expand children from a package overview ${testType}`, async () => {
                await verifyExpandedChildren(searchablePackage.packageOverview, await getFilter(testType));
            });
            it(`should correctly fetch/expand children from a folder ${testType}`, async () => {
                await verifyExpandedChildren(searchablePackage.resources[0].fullPaths[0], await getFilter(testType));
            });
        });
        it('should not operate in bulk mode', async () => {
            await expectThrows(400, 'Can only request expanded filtered descendant data for a single parent node id', (0, nodes_utils_1.getExpandedFilteredDescendantNodesData)({
                // @ts-ignore - explicitly breaking types to verify invalid request
                parentDbId: ['1', '2'],
                filterPackageGroup: defaultFilterPackage
            }));
        });
        it('should handle missing ids', async () => {
            await expectThrows(400, 'Required id parameter was not provided', 
            // @ts-ignore - explicitly breaking types to verify invalid request
            (0, nodes_utils_1.getExpandedFilteredDescendantNodesData)({ filterPackageGroup: defaultFilterPackage }));
        });
        it('should handle invalid ids', async () => {
            await expectThrows(400, 'Id is NaN: foo', (0, nodes_utils_1.getExpandedFilteredDescendantNodesData)({
                parentDbId: 'foo',
                filterPackageGroup: defaultFilterPackage
            }));
        });
        it('should handle unknown ids', async () => {
            const result = await (0, nodes_utils_1.getExpandedFilteredDescendantNodesData)({
                parentDbId: Number.MAX_SAFE_INTEGER.toString(),
                filterPackageGroup: defaultFilterPackage
            });
            (0, expect_1.expect)(result.parentToChildData[Number.MAX_SAFE_INTEGER.toString()]).to.be.empty;
        });
        it('should handle unknown filter ids', async () => {
            await expectThrows(400, 'No package group found with packageGroupPublicUid foo', (0, nodes_utils_1.getExpandedFilteredDescendantNodesData)({
                parentDbId: await (0, nodes_utils_1.getRootNode)(),
                filterPackageGroup: ['foo']
            }));
        });
    });
    describe("api/searchSuggestions" /* API.GET_SEARCH_SUGGESTIONS */, () => {
        const filterPackageGroup = [];
        before(async () => {
            filterPackageGroup.push(...filterOptions.packageGroups.map(p => p.publicId));
        });
        it('should suggest whole words in descriptions', async () => {
            const wordInDescription = 'Experience';
            const suggestions = await (0, nodes_utils_1.getSearchSuggestions)({
                text: wordInDescription.toLowerCase(),
                filterPackageGroup
            });
            (0, expect_1.expect)(suggestions).to.include(wordInDescription);
        });
        const searches = [
            {
                searchString: '123',
                description: 'simple chunk',
                expected: ['123', '123z', 'Chunk-123', 'Chunk-123z']
            },
            {
                searchString: '12',
                description: 'partial chunk',
                expected: ['12', '123', '123z', 'Chunk-123', 'Chunk-123z']
            },
            {
                searchString: 'chuNK123',
                description: 'front composite chunk',
                expected: ['Chunk-123', 'Chunk-123z']
            },
            {
                searchString: '123_-_z',
                description: 'rear composite chunk',
                expected: ['123z', 'Chunk-123z']
            },
            {
                searchString: 'Chunk-123z',
                description: 'full chunk',
                expected: ['Chunk-123z']
            },
            {
                searchString: 'Chunk-123z_',
                description: 'word',
                expected: ['Chunk-123z']
            },
            {
                searchString: 'unk1',
                description: 'non-chunk substring',
                expected: ['Chunk-123', 'Chunk-123z']
            },
            {
                searchString: 'a 123',
                description: 'simple chunk preceded by 1 word',
                expected: ['a 123', 'a 123z', 'a Chunk-123', 'a Chunk-123z']
            },
            {
                searchString: 'a bc 123',
                description: 'simple chunk preceded by 2 words',
                expected: ['a bc 123', 'a bc 123z', 'a bc Chunk-123', 'a bc Chunk-123z']
            },
            {
                searchString: '',
                description: 'empty string',
                expected: []
            },
            {
                searchString: '   ',
                description: 'blank string',
                expected: []
            },
            {
                searchString: '!@#$%^&*+-_',
                description: 'string with non-searchable characters',
                expected: []
            },
            {
                searchString: 'a !@#$%^&*+-_',
                description: 'string with non-searchable characters preceded by 1 word',
                expected: ['a']
            }
        ];
        for (const search of searches) {
            it(`should suggest keywords (partial included) from a ${search.description} in a ` +
                `description`, async () => {
                const suggestions = await (0, nodes_utils_1.getSearchSuggestions)({
                    text: search.searchString,
                    filterPackageGroup
                });
                (0, expect_1.expect)(suggestions).to.have.same.members(search.expected);
            });
        }
        it('should suggest devices', async () => {
            const deviceName = 'device1';
            const suggestions = await (0, nodes_utils_1.getSearchSuggestions)({
                text: deviceName,
                filterPackageGroup
            });
            (0, expect_1.expect)(suggestions).to.include(deviceName);
        });
        it('should suggest boards', async () => {
            const boardName = 'board1';
            const suggestions = await (0, nodes_utils_1.getSearchSuggestions)({ text: boardName, filterPackageGroup });
            (0, expect_1.expect)(suggestions).to.include(boardName);
        });
        it('should handle undefined search text', async () => {
            await expectThrows(HttpStatus.BAD_REQUEST, 'Search text is undefined', (0, nodes_utils_1.getSearchSuggestions)({ text: undefined, filterPackageGroup }));
        });
        // TODO: test limiting or rejecting of empty/short strings?
        // TODO: test that query excludes some suggestions, once that support exists in the server
    });
});
describe('Database Update', () => {
    // We need one test that updates the database with a minimal set of metadata.  This is to ensure
    // that the previous tests:
    // 1) were run with data from their update, and not data from a test run a year ago
    // 2) that the database can be updated while the server is running
    async function doUpdate(updateFunc) {
        // add a timestamp to resource names to ensure we don't get stale data from the DB
        const timestamp = Date.now();
        const metadata = generateMinimalMetadata(timestamp);
        const dbFolder = await updateFunc(metadata);
        const { packageGroupsDef: packageGroupsDef } = await (0, sqldbImporter_1.discoverPackageGroups)(dbFolder);
        // Verify this by ensuring the filter options list only one board/device/package
        const filterInfo = await (0, nodes_utils_1.getFilterOptions)();
        (0, expect_1.expect)(filterInfo.devices.length).to.be.equal(1);
        (0, expect_1.expect)(filterInfo.devices[0].name).to.be.equal('loneDevice' + timestamp);
        (0, expect_1.expect)(filterInfo.devtools.length).to.be.equal(1);
        (0, expect_1.expect)(filterInfo.devtools[0].name).to.be.equal('loadBoard' + timestamp);
        (0, expect_1.expect)(filterInfo.packageGroups.length).to.be.equal(1);
        // verify the lone resource is there
        const nodePublicId = metadata.packages[0].resources[0].fullPathsPublicIds[0];
        const nodeDbId = await (0, nodes_utils_1.getNodeDbId)({
            nodePublicId,
            packageGroupPublicUid: packageGroupsDef[0].uid,
            packagePublicId: metadata.packages[0].packageOverview.packageId,
            toDbIdType: "ToDbIdNotLatest" /* RequestQuery.NodePublicIdToDbIdType.TO_DB_ID_GROUP_NOT_LATEST */
        });
        const nodesData = await (0, nodes_utils_1.getNodesData)({ dbId: [nodeDbId] });
        const nodeData = nodesData.dbIdToData[nodeDbId];
        (0, expect_1.expect)(nodeData.name).to.be.equal('loneResource' + timestamp);
    }
    it('should update with minimal data', async () => {
        await doUpdate(nodes_utils_1.updateDatabase);
    });
    it('should update using out of process script', async function () {
        this.timeout(20000); // db import console logs is slowing it down...
        await doUpdate(nodes_utils_1.updateDatabaseWithScript);
    });
});
///////////////////////////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////////////////////////
async function generateFilter(deviceName) {
    const filterDevice = filterOptions.devices
        .filter(d => d.name === deviceName)
        .map(d => d.publicId);
    return filterDevice;
}
async function expectThrows(status, message, promise, context) {
    try {
        await promise;
    }
    catch (e) {
        (0, expect_1.expect)(e.status).to.equal(status, context);
        if (typeof message === 'string') {
            (0, expect_1.expect)(e.text).to.equal(message, context);
        }
        else {
            (0, expect_1.expect)(e.text).to.match(message, context);
        }
        return;
    }
    throw new Error(`should not get here (${context})`);
}
///////////////////////////////////////////////////////////////////////////////
/// Functions to generate sample meta data
///////////////////////////////////////////////////////////////////////////////
function generateMinimalMetadata(timestamp) {
    // One package/device/board/resource.  Just to verify the database update works
    const devices = [(0, database_utils_1.generateDevice)('LONE_DEVICE', 'loneDevice' + timestamp)];
    const devtools = [(0, database_utils_1.generateDevtool)('LOAD_BOARD', 'loadBoard' + timestamp)];
    const packageOverview = (0, database_utils_1.generatePackageOverview)('loneOverview' + timestamp, '1.23.45.00');
    const resources = [
        (0, database_utils_1.generateResource)('loneResource' + timestamp, packageOverview, devices[0], devtools[0])
    ];
    const overviews = [];
    const simpleCategories = (0, database_utils_1.generateSimpleCategories)(resources, packageOverview);
    const packages = [
        {
            packageOverview,
            resources,
            overviews,
            simpleCategories
        }
    ];
    return {
        devices,
        devtools,
        packages
    };
}
function generateMetadata() {
    // Generate various different packages for different tests
    devices = generateDevices();
    devtools = generateDevtools();
    simplePackage1 = generatePackage(generateSimplePackage1, devices, devtools);
    devFilterPackage = generatePackage(generateDevFilterPackage, devices, devtools);
    searchablePackage = generatePackage(generateSearchablePackage, devices, devtools);
    variedTypesPackage = generatePackage(generateVariedResourceTypesPackage, devices, devtools);
    variedFiltersPackage = generatePackage(generateVariedFiltersPackage, devices, devtools);
    multiVersionPackageV1 = generatePackage(generateMultiVersionPackage1, devices, devtools);
    multiVersionPackageV2 = generatePackage(generateMultiVersionPackage2, devices, devtools);
    restrictedPackage = generatePackage(generateRestrictedPackage, devices, devtools);
    subFoundationNodePackage = generatePackage(generateSubFoundationNodePackage, devices, devtools);
    viewConstrainedPackage = generatePackage(generateViewConstrainedPackage, devices, devtools);
    sortTestPackage = generatePackage(generateSortNodePackage, devices, devtools);
    packages = [
        simplePackage1,
        devFilterPackage,
        searchablePackage,
        variedTypesPackage,
        variedFiltersPackage,
        multiVersionPackageV1,
        multiVersionPackageV2,
        restrictedPackage,
        subFoundationNodePackage,
        viewConstrainedPackage,
        sortTestPackage
    ];
    return {
        devices,
        devtools,
        packages
    };
}
/**
 * Create some generic devices and devtools
 * Include some with specifically searchable text
 *
 */
function generateDevices() {
    return [
        (0, database_utils_1.generateDevice)('DEVICE1', 'device1'),
        (0, database_utils_1.generateDevice)('DEVICE2', 'device2'),
        (0, database_utils_1.generateDevice)(searchText, searchText)
    ];
}
function generateDevtools() {
    return [
        (0, database_utils_1.generateDevtool)('BOARD1', 'board1'),
        (0, database_utils_1.generateDevtool)('BOARD2', 'board2'),
        (0, database_utils_1.generateDevtool)(searchText, searchText)
    ];
}
function generatePackage(generateFunc, devices, devtools) {
    const { packageOverview, resources, overviews } = generateFunc(devices, devtools);
    const simpleCategories = (0, database_utils_1.generateSimpleCategories)(resources, packageOverview, overviews);
    return {
        packageOverview,
        resources,
        overviews,
        simpleCategories
    };
}
/**
 * Create a package with resources having different view constraints and mime type combinations
 *
 */
function generateViewConstrainedPackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('viewConstrained', '1.23.45.00');
    const resources = [
        (0, database_utils_1.generateResource)('resource0', packageOverview, devices[1], devtools[1], {
            link: 'abc.xyz'
        }),
        (0, database_utils_1.generateResource)('resource1', packageOverview, devices[1], devtools[1], {
            link: 'abc.txt'
        }),
        (0, database_utils_1.generateResource)('resource2', packageOverview, devices[0], devtools[0], {
            viewLimitations: ['e2e', 'aws']
        }),
        (0, database_utils_1.generateResource)('resource3', packageOverview, devices[0], devtools[0], {
            link: 'abc.txt',
            viewLimitations: ['e2e', 'aws']
        })
    ];
    const overviews = [];
    return {
        packageOverview,
        overviews,
        resources
    };
}
/**
 * Create a simple package with nothing special
 *
 */
function generateSimplePackage1(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('overview1', '1.23.45.00');
    const resources = [
        (0, database_utils_1.generateResource)('resource1', packageOverview, devices[0], devtools[0]),
        (0, database_utils_1.generateResource)('resource2', packageOverview, devices[1], devtools[1])
    ];
    const overviews = [];
    return {
        packageOverview,
        overviews,
        resources
    };
}
/**
 * Create a simple package with nothing special
 *
 */
function generateSubFoundationNodePackage(devices, devtools) {
    const subFoundationNodeFullPath = [database_utils_1.firstFolderInAllPackages, 'mmWave Sensors'];
    const packageOverview = (0, database_utils_1.generatePackageOverview)('mmWave', '1.23.45.00', {
        fullPaths: [subFoundationNodeFullPath]
    });
    const resources = [
        (0, database_utils_1.generateResource)('resource1', packageOverview, devices[0], devtools[0], {
            fullPaths: [[...subFoundationNodeFullPath, packageOverview.name]]
        }),
        (0, database_utils_1.generateResource)('resource2', packageOverview, devices[1], devtools[1], {
            fullPaths: [[...subFoundationNodeFullPath, packageOverview.name]]
        })
    ];
    const overviews = [];
    return {
        packageOverview,
        overviews,
        resources
    };
}
/**
 * Create a simple package with nothing special
 *
 */
function generateRestrictedPackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('package group with restricted package', '1.23.45.00');
    packageOverview.restrictions = vars_1.Vars.METADATA_PKG_IMPORT_ONLY; // TODO: this should be an array REX-2219
    const resources = [(0, database_utils_1.generateResource)('resource', packageOverview, devices[1], devtools[1])];
    const overviews = [];
    return {
        packageOverview,
        overviews,
        resources
    };
}
/**
 * Create package used for device and devtool filtering tests
 *
 */
function generateDevFilterPackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('overview2', '1.23.45.00');
    // use a devices[0]/devtools[1] and a devices[1]/devtools[0] combination to catch
    // device id used mistakenly as devtool filter and vice versa (REX-2335)
    const resources = [
        (0, database_utils_1.generateResource)('resource3', packageOverview, devices[0], devtools[1]),
        (0, database_utils_1.generateResource)('resource4', packageOverview, devices[1], devtools[0])
    ];
    const overviews = [];
    return {
        packageOverview,
        overviews,
        resources
    };
}
/**
 * Create 2 identical packages where version is the only difference
 *
 */
function generateMultiVersionPackage1(devices, devtools) {
    const pkgs = _generateMultiVersionPackages(devices, devtools);
    return pkgs[0];
}
function generateMultiVersionPackage2(devices, devtools) {
    const pkgs = _generateMultiVersionPackages(devices, devtools);
    return pkgs[1];
}
function _generateMultiVersionPackages(devices, devtools) {
    const multiVersionPackageName = 'multiVersionPackage';
    const resourceName1 = 'mvp_resource1';
    const resourceName2 = 'mvp_resource2';
    // package version 1
    const overviewPackageVersion1 = (0, database_utils_1.generatePackageOverview)(multiVersionPackageName, '1.00.00.00');
    const resourcesPackageVersion1 = [
        (0, database_utils_1.generateResource)(resourceName1, overviewPackageVersion1, devices[0], devtools[0]),
        (0, database_utils_1.generateResource)(resourceName2, overviewPackageVersion1, devices[1], devtools[1])
    ];
    // package version 2
    const overviewPackageVersion2 = (0, database_utils_1.generatePackageOverview)(multiVersionPackageName, '2.00.00.00');
    const resourcesPackageVersion2 = [
        (0, database_utils_1.generateResource)(resourceName1, overviewPackageVersion2, devices[0], devtools[0]),
        (0, database_utils_1.generateResource)(resourceName2, overviewPackageVersion2, devices[1], devtools[1])
    ];
    const overviews = [];
    return [
        {
            packageOverview: overviewPackageVersion1,
            resources: resourcesPackageVersion1,
            overviews
        },
        {
            packageOverview: overviewPackageVersion2,
            resources: resourcesPackageVersion2,
            overviews
        }
    ];
}
/**
 * Create a package for searching.  In this case, we'll create resources for each key that is indexed
 *  for searching so we can later ensure those resources are found when searching
 *
 */
function generateSearchablePackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('searchablePackage', '1.23.45.00');
    const resources = searchableKeys.map(key => {
        // Alternate the device to use so we can test filtering and searching at the same time
        const device = devices[searchableKeys.indexOf(key) % 2];
        const resource = (0, database_utils_1.generateResource)('searchable' + key, packageOverview, device, devtools[0]);
        if (key === 'fullPaths' || key === 'categories') {
            resource[key][0].push(searchText);
        }
        else if (Array.isArray(resource[key])) {
            // @ts-ignore
            resource[key].push(searchText);
        }
        else {
            // @ts-ignore
            resource[key] = searchText;
        }
        return resource;
    });
    // Create one more resource that is searchable on description, but on a word in the description
    (0, database_utils_1.generateResource)(searchableOneWordInDescription, packageOverview, devices[0], devtools[0]);
    resources.push((0, database_utils_1.generateResource)(searchableOneWordInDescription, packageOverview, devices[0], devtools[0], {
        description: `some text followed by ${searchText} and then more text`
    }));
    const overviews = [];
    return {
        packageOverview,
        resources,
        overviews
    };
}
/**
 * Create a package with different resource types.  This will allow us to validate getNodesData
 *
 */
function generateVariedResourceTypesPackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('variedResourceTypes', '1.23.45.00');
    const subResource = (0, database_utils_1.generateResource)('subResource', packageOverview, devices[0], devtools[0]);
    subResource.fullPaths[0].push('folderWithResource');
    const resources = [
        (0, database_utils_1.generateResource)('cppFileByLink', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: 'cppFile.cpp'
        }),
        (0, database_utils_1.generateResource)('cppFileByType', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: 'cppFile',
            fileType: '.cpp'
        }),
        (0, database_utils_1.generateResource)('asmFile.asm', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: 'asmFile.asm'
        }),
        (0, database_utils_1.generateResource)('markdown.md', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: 'markdown.md',
            fileType: '.md'
        }),
        (0, database_utils_1.generateResource)('pdf.pdf', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: 'pdf.pdf'
        }),
        (0, database_utils_1.generateResource)('pdf on ti.com', packageOverview, devices[0], devtools[0], {
            resourceType: 'web.page',
            link: 'http://www.ti.com/general/docs/lit/getliterature.tsp?baseLiteratureNumber=slau356&amp;fileType=pdf',
            // noted: ';fileType=pdf' has nothing to do with tirex and won't be recognized by tirex
            fileType: '.pdf' // BU must specify this otherwise we discover '.tsp'
        }),
        (0, database_utils_1.generateResource)('folderWithResource', packageOverview, devices[0], devtools[0], {
            link: `path/to/folder/resource`
        }),
        (0, database_utils_1.generateResource)('energiaProject (folderWithResource)', packageOverview, devices[0], devtools[0], {
            resourceType: 'project.energia',
            link: 'energiaFile.ino'
        }),
        (0, database_utils_1.generateResource)('custom_icon_overrides_md_icon.md', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: 'anotherMarkdown.md',
            fileType: '.md',
            icon: 'path/to/icon/icon_s_forum_a.png'
        }),
        (0, database_utils_1.generateResource)('external_webpage_with_no_extension', packageOverview, devices[0], devtools[0], {
            resourceType: 'web.page',
            link: 'www.something.com/thepage',
            linkType: 'external'
        }),
        subResource
    ];
    // creates an Overview on a Folder With Resource; this is not explicitly supported by the DB, but
    // must not cause any problems
    const overviews = [
        (0, database_utils_1.generateOverview)('folderWithResource', packageOverview, {
            link: `path/to/overviewLink`
        })
    ];
    return {
        packageOverview,
        resources,
        overviews
    };
}
// Create a package with different filter fields (e.g. resourceClass, compiler, kernel, ide, language)
function generateVariedFiltersPackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('variedFilterFields', '1.23.45.00');
    const categories = [[database_utils_1.firstFolderInAllPackages, packageOverview.name, 'Examples']];
    const resources = [];
    resources[0] = (0, database_utils_1.generateResource)('CCS example', packageOverview, devices[0], devtools[0], {
        resourceType: 'project.ccs',
        resourceClass: ['example'],
        compiler: ['ccs'],
        ide: ['ccs'],
        kernel: ['nortos'],
        language: ['english'],
        categories,
        fullPaths: categories
    });
    resources[1] = (0, database_utils_1.generateResource)('Energia example', packageOverview, devices[0], devtools[0], {
        description: 'asearchstring',
        resourceType: 'project.energia',
        resourceClass: ['example'],
        compiler: ['gcc'],
        ide: ['ccs'],
        kernel: ['nortos'],
        language: ['english'],
        categories,
        fullPaths: categories
    });
    resources[2] = (0, database_utils_1.generateResource)('IAR example', packageOverview, devices[0], devtools[0], {
        resourceType: 'project.iar',
        resourceClass: ['example'],
        compiler: ['iar'],
        ide: ['iar'],
        kernel: ['freertos'],
        language: ['english'],
        categories,
        fullPaths: categories
    });
    resources[3] = (0, database_utils_1.generateResource)('CCS example (projectSpec)', packageOverview, devices[0], devtools[0], {
        resourceType: 'projectSpec',
        resourceClass: ['example'],
        compiler: ['ccs'],
        ide: ['ccs'],
        kernel: ['tirtos', 'freertos'],
        language: ['english'],
        categories,
        fullPaths: categories
    });
    resources[4] = (0, database_utils_1.generateResource)('Source file', packageOverview, devices[0], devtools[0], {
        resourceType: 'file.importable',
        resourceClass: ['example'],
        compiler: ['ccs'],
        ide: ['ccs'],
        kernel: ['nortos'],
        language: ['english'],
        categories,
        fullPaths: categories
    });
    resources[5] = (0, database_utils_1.generateResource)('Folder with source files', packageOverview, devices[0], devtools[0], {
        resourceType: 'folder.importable',
        resourceClass: ['example'],
        compiler: ['ccs', 'gcc'],
        ide: ['ccs'],
        kernel: ['nortos'],
        language: ['english'],
        categories,
        fullPaths: categories
    });
    resources[6] = (0, database_utils_1.generateResource)('A document', packageOverview, devices[0], devtools[0], {
        description: 'asearchstring',
        resourceType: 'file',
        resourceClass: [],
        compiler: undefined,
        ide: undefined,
        kernel: ['tirtos'],
        language: ['english'],
        categories,
        fullPaths: categories
    });
    resources[7] = (0, database_utils_1.generateResource)('A Chinese document', packageOverview, devices[0], devtools[0], {
        resourceType: 'file',
        resourceClass: [],
        compiler: undefined,
        ide: undefined,
        kernel: ['tirtos'],
        language: ['chinese'],
        categories,
        fullPaths: categories
    });
    const overviews = [];
    return {
        packageOverview,
        resources,
        overviews
    };
}
/**
 * Create a simple package for testing sort
 *
 */
function generateSortNodePackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('sortTest', '1.23.45.00');
    const commonPath = [database_utils_1.firstFolderInAllPackages, packageOverview.name, 'Examples'];
    const defaultFolderData = {
        name: 'sortFolder',
        children: [
            ['d file 1', 'file', undefined],
            ['d folder overview 2', 'overview-folder', undefined],
            ['e file 3', 'file', undefined],
            ['e folder overview 4', 'overview-folder', undefined],
            ['b file 5', 'file', undefined],
            ['b file 6 c3', 'file', 'custom-3'],
            ['b folder overview 7 c1', 'overview-folder', 'custom-1'],
            ['b file 8 c2', 'file', 'custom-2'],
            ['b folder 9', 'folder', undefined],
            ['c folder 10', 'folder', undefined],
            ['a folder 11', 'folder', undefined],
            ['c file 12', 'file', undefined],
            ['a file 13', 'file', undefined]
        ]
    };
    const testFoldersData = [
        { ...defaultFolderData, name: 'undefinedSortFolder', sort: undefined },
        { ...defaultFolderData, name: 'defaultSortFolder', sort: 'default' },
        { ...defaultFolderData, name: 'manualSortFolder', sort: 'manual' },
        {
            ...defaultFolderData,
            name: 'alphabeticalSortFolder',
            sort: 'filesAndFoldersAlphabetical'
        }
    ];
    const resources = [];
    const overviews = [];
    let order = 0;
    for (const folderData of testFoldersData) {
        // Create top test folder
        resources.push((0, database_utils_1.generateResource)(folderData.name, packageOverview, devices[0], devtools[0], {
            fullPaths: [commonPath],
            categories: [commonPath],
            sort: folderData.sort
        }));
        // Create its children and grandchildren
        for (const child of folderData.children) {
            const childName = child[0];
            const nodeType = child[1];
            const customOrder = child[2];
            const fullPath = [...commonPath, folderData.name];
            if (nodeType === 'file') {
                resources.push((0, database_utils_1.generateResource)(childName, packageOverview, devices[0], devtools[0], {
                    fullPaths: [fullPath],
                    categories: [fullPath],
                    order: ++order,
                    customOrder
                }));
            }
            else if (nodeType === 'overview-folder') {
                overviews.push((0, database_utils_1.generateOverview)(childName, packageOverview, {
                    fullPaths: [fullPath],
                    categories: [fullPath],
                    order: ++order,
                    customOrder
                }));
            }
            if (nodeType === 'overview-folder' || nodeType === 'folder') {
                // Make the child is a folder by adding a grandchild to it, and also to ensure
                // that a node is actually created in the first place if resource-less
                resources.push((0, database_utils_1.generateResource)('a grandchild', packageOverview, devices[0], devtools[0], {
                    fullPaths: [[...fullPath, childName]],
                    categories: [[...fullPath, childName]],
                    sort: 'default',
                    order: ++order
                }));
            }
        }
    }
    return {
        packageOverview,
        overviews,
        resources
    };
}
