"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const ajax_harness_1 = require("../../test/ajax-harness/ajax-harness");
const apis_1 = require("../apis/apis");
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const expect_1 = require("../../test/expect");
const FilterHelpers = require("./filter-helpers");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
///////////////////////////////////////////////////////////////////////////////
/// Data
///////////////////////////////////////////////////////////////////////////////
// Nodes
const rootNode = '1';
// Packages
const PACKAGE_GROUP_PUBLIC_UID_1 = '1';
const PACKAGE_GROUP_PUBLIC_UID_2 = '2';
const PACKAGE_GROUP_PUBLIC_UID_3 = '3';
const package2 = {
    name: 'pkg2',
    packageVersion: '5.0.0',
    packagePublicId: '2and3',
    packagePublicUid: '2',
    packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_1],
    packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
    dependencies: [],
    isInstallable: true,
    installCommand: { win: './package2.exe' },
    downloadUrl: { win: 'pkg/package2.zip' },
    aliases: [],
    modules: [],
    moduleGroups: []
};
const package3 = {
    name: 'pkg3',
    packageVersion: '1.1.1',
    packagePublicId: '2and3',
    packagePublicUid: '3',
    packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_2],
    packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
    dependencies: [],
    isInstallable: true,
    installCommand: { win: './package3.exe' },
    downloadUrl: { win: 'pkg/package3.zip' },
    aliases: [],
    modules: [],
    moduleGroups: []
};
const package7 = {
    name: 'pkg7',
    packageVersion: '7.1.1',
    packagePublicId: '4',
    packagePublicUid: '7',
    packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_2],
    packageType: "SubPackage" /* Nodes.PackageType.SUB_PACKAGE */,
    dependencies: [],
    isInstallable: true,
    installCommand: { win: './package7.exe' },
    downloadUrl: { win: 'pkg/package7.zip' },
    aliases: [],
    modules: [],
    moduleGroups: []
};
const package8 = {
    name: 'pkg8',
    packageVersion: '7.1.1',
    packagePublicId: '5',
    packagePublicUid: '8',
    packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_3],
    packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
    dependencies: [],
    isInstallable: true,
    installCommand: { win: './package8.exe' },
    downloadUrl: { win: 'pkg/package8.zip' },
    aliases: [],
    modules: [],
    moduleGroups: []
};
const packageGroup1 = {
    packageGroupVersion: '1.2.3',
    packageGroupPublicId: 'msp430',
    packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_1,
    packagesPublicUids: [package2.packagePublicUid],
    mainPackagePublicUid: package2.packagePublicUid,
    hideByDefault: false,
    packagesToListVersionsFrom: []
};
const packageGroup2 = {
    packageGroupVersion: '1.2.4',
    packageGroupPublicId: 'msp432',
    packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_2,
    packagesPublicUids: [package3.packagePublicUid, package7.packagePublicUid],
    mainPackagePublicUid: package3.packagePublicUid,
    hideByDefault: false,
    packagesToListVersionsFrom: []
};
const packageGroup3 = {
    packageGroupVersion: '1.2.1',
    packageGroupPublicId: 'msp432',
    packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_3,
    packagesPublicUids: [package8.packagePublicUid],
    mainPackagePublicUid: package8.packagePublicUid,
    hideByDefault: false,
    packagesToListVersionsFrom: []
};
// Devices
const device1 = {
    publicId: 'device_1',
    name: 'Device 1'
};
const device2 = {
    publicId: 'device_2',
    name: 'Device 2'
};
// Devtools
const devtool1 = {
    publicId: 'devtool_1',
    name: 'Devtool 1'
};
// Other
const emptyFilterData = {
    compilers: [],
    devices: [],
    devtools: [],
    ides: [],
    kernels: [],
    languages: [],
    resourceClasses: [],
    packages: []
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
describe('[frontend] FilterHelpers', function () {
    before(() => (0, browser_emulator_1.browserEmulator)());
    describe('sortQuery', function () {
        let ajaxHarness;
        beforeEach(function () {
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        const data = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            filterData: {
                ...emptyFilterData,
                packages: [package2, package3, package7],
                packageGroups: [packageGroup1, packageGroup2],
                devices: [device1]
            },
            rootNode,
            hierarchy: {
                [rootNode]: []
            },
            nodeData: {}
        };
        it('Should sort query values', async function () {
            const params = {
                filterPackageGroup: [
                    packageGroup3.packageGroupPublicUid,
                    packageGroup2.packageGroupPublicUid
                ]
            };
            const expectedQry = {
                filterPackageGroup: [
                    packageGroup2.packageGroupPublicUid,
                    packageGroup3.packageGroupPublicUid
                ]
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = FilterHelpers.sortQuery(params);
            (0, expect_1.expect)(args).to.deep.equal(expectedQry);
        });
        it('Should handle an empty query', async function () {
            const params = {
                filterPackageGroup: []
            };
            const expectedQry = {
                filterPackageGroup: []
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = FilterHelpers.sortQuery(params);
            (0, expect_1.expect)(args).to.deep.equal(expectedQry);
        });
        it('Should sort query keys', async function () {
            const params = {
                filterPackageGroup: [...package2.packageGroupPublicUids],
                filterDevice: [device1.publicId]
            };
            const expectedQry = {
                filterDevice: [device1.publicId],
                filterPackageGroup: [...package2.packageGroupPublicUids]
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = FilterHelpers.sortQuery(params);
            (0, expect_1.expect)(args).to.deep.equal(expectedQry);
        });
        it('Should sort multiple query keys and values', async function () {
            const params = {
                filterPackageGroup: [
                    ...package3.packageGroupPublicUids,
                    ...package2.packageGroupPublicUids
                ],
                filterDevice: [device1.publicId]
            };
            const expectedQry = {
                filterDevice: [device1.publicId],
                filterPackageGroup: [
                    ...package2.packageGroupPublicUids,
                    ...package3.packageGroupPublicUids
                ]
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = FilterHelpers.sortQuery(params);
            (0, expect_1.expect)(args).to.deep.equal(expectedQry);
        });
    });
    describe('hasBrowserUrlQueryFilterItemsChanged', function () {
        function extractPublicIds(items) {
            return items.map(item => item.publicId);
        }
        it('Should handle new items being added to an existing key', function () {
            const paramsOld = {
                devices: extractPublicIds([device1])
            };
            const paramsNew = {
                devices: extractPublicIds([device1, device2])
            };
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .true;
        });
        it('Should handle new keys being added', function () {
            const paramsOld = {
                devices: extractPublicIds([device1])
            };
            const paramsNew = {
                devices: extractPublicIds([device1]),
                devtools: extractPublicIds([devtool1])
            };
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .true;
        });
        it('Should handle a key being removed', function () {
            const paramsOld = {
                devices: extractPublicIds([device1]),
                devtools: extractPublicIds([devtool1])
            };
            const paramsNew = {
                devices: extractPublicIds([device1])
            };
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .true;
        });
        it('Should handle going from nothing in the filter to an item in the filter', function () {
            const paramsOld = {};
            const paramsNew = {
                devices: [device1].map(item => item.publicId)
            };
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .true;
        });
        it('Should handle going from items in the filter to nothing', function () {
            const paramsOld = {
                devices: [device1].map(item => item.publicId)
            };
            const paramsNew = {};
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .true;
        });
        it('Should handle order changes', function () {
            const paramsOld = {
                devices: [device2, device1].map(item => item.publicId)
            };
            const paramsNew = {
                devices: [device1, device2].map(item => item.publicId)
            };
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .true;
        });
        it('Should handle items changing in an existing key but length not changing', function () {
            const paramsOld = {
                devices: [device1].map(item => item.publicId)
            };
            const paramsNew = {
                devices: [device2].map(item => item.publicId)
            };
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .true;
        });
        it('Should handle matching url queries', function () {
            const paramsOld = {
                devices: [device1].map(item => item.publicId)
            };
            const paramsNew = {
                devices: [device1].map(item => item.publicId)
            };
            (0, expect_1.expect)(FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, paramsNew)).to.be
                .false;
        });
        it('Should not allow unknown keys', function () {
            const paramsOld = {
                devices: [device1].map(item => item.publicId)
            };
            const paramsNew = {
                devices: [device1].map(item => item.publicId)
            };
            (0, expect_1.expect)(() => {
                FilterHelpers.hasBrowserUrlQueryFilterItemsChanged(paramsOld, {
                    ...paramsNew,
                    // @ts-ignore - adding unknown key for test
                    foo: 'bar'
                });
            }).to.throw('Unknown query item');
        });
    });
    describe('getFilterFromBrowserUrlQuery', function () {
        describe('general', function () {
            it.skip('TODO Should handle a combination of url query keys', async function () {
                // use all keys
            });
        });
        describe.skip('TODO compilers', function () { });
        describe('devices', function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    devices: [device1]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get devices from url query', async function () {
                const params = {
                    devices: [device1.publicId]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const { devices } = await callMethod(params);
                (0, expect_1.expect)(devices).to.deep.equal([device1]);
            });
            it('Should get no devices from an empty url query', async function () {
                const params = {};
                await ajaxHarness.setupTestFakeServer(data);
                const { devices } = await callMethod(params);
                (0, expect_1.expect)(devices).to.be.empty;
            });
            it('Should handle an invalid device in the url', async function () {
                const params = { devices: ['foo'] };
                await ajaxHarness.setupTestFakeServer(data);
                const { devices } = await callMethod(params);
                (0, expect_1.expect)(devices).to.be.empty;
            });
            it('Should handle a mix of valid and invalid devices in the url', async function () {
                const params = {
                    devices: [device1.publicId, 'foo']
                };
                await ajaxHarness.setupTestFakeServer(data);
                const { devices } = await callMethod(params);
                (0, expect_1.expect)(devices).to.deep.equal([device1]);
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe.skip('TODO devtools', function () { });
        describe.skip('TODO ides', function () { });
        describe.skip('TODO kernels', function () { });
        describe.skip('TODO languages', function () { });
        describe.skip('TODO resourceClasses', function () { });
        describe('addedPackageGroups', function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    packages: [package2, package3, package7],
                    packageGroups: [packageGroup1, packageGroup2]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get packages from the url query', async function () {
                const params = {
                    a: [
                        `${packageGroup1.packageGroupPublicId}__${packageGroup1.packageGroupVersion}`
                    ]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const { addedPackageGroups } = await callMethod(params);
                (0, expect_1.expect)(addedPackageGroups).to.deep.equal([packageGroup1]);
            });
            it('Should get no added packages from an empty url query', async function () {
                const params = {};
                await ajaxHarness.setupTestFakeServer(data);
                const { addedPackageGroups } = await callMethod(params);
                (0, expect_1.expect)(addedPackageGroups).to.be.empty;
            });
            it('Should handle an invalid package in the url query (garbage key)', async function () {
                const params = { a: ['foo'] };
                await ajaxHarness.setupTestFakeServer(data);
                const { addedPackageGroups } = await callMethod(params);
                (0, expect_1.expect)(addedPackageGroups).to.be.empty;
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe('removedPackageGroups', function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    packages: [package2, package3, package7],
                    packageGroups: [packageGroup1, packageGroup2]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get packages from the url query', async function () {
                const params = {
                    r: [
                        `${packageGroup1.packageGroupPublicId}__${packageGroup1.packageGroupVersion}`
                    ]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const { removedPackageGroups } = await callMethod(params);
                (0, expect_1.expect)(removedPackageGroups).to.deep.equal([packageGroup1]);
            });
            it('Should get no added packages from an empty url query', async function () {
                const params = {};
                await ajaxHarness.setupTestFakeServer(data);
                const { removedPackageGroups } = await callMethod(params);
                (0, expect_1.expect)(removedPackageGroups).to.be.empty;
            });
            it('Should handle an invalid package in the url query (garbage key)', async function () {
                const params = { r: ['foo'] };
                await ajaxHarness.setupTestFakeServer(data);
                const { removedPackageGroups } = await callMethod(params);
                (0, expect_1.expect)(removedPackageGroups).to.be.empty;
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe('search', function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: emptyFilterData,
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get search from url query', async function () {
                const srch = 'Device 1';
                const params = {
                    search: srch
                };
                await ajaxHarness.setupTestFakeServer(data);
                const { search } = await callMethod(params);
                (0, expect_1.expect)(search).to.deep.equal(srch);
            });
            it('Should get no search from an empty url query', async function () {
                const params = {};
                await ajaxHarness.setupTestFakeServer(data);
                const { search } = await callMethod(params);
                (0, expect_1.expect)(search).to.be.null;
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        async function callMethodOuter(params, apis) {
            const allGroups = await apis.getPackageGroups();
            const filterOptions = await apis.getFilterOptions();
            return FilterHelpers.getFilterFromBrowserUrlQuery(params, allGroups, filterOptions);
        }
    });
    describe('getBrowserUrlQueryFromUpdatedFilterItems', function () {
        describe('general', async function () {
            let ajaxHarness;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    devices: [device1, device2],
                    devtools: [devtool1]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should handle an update with a non-empty browser url query', async function () {
                const params = {
                    devices: [device1.publicId],
                    devtools: [devtool1.publicId]
                };
                const expectedParams = {
                    devtools: [devtool1.publicId],
                    devices: [device2.publicId]
                };
                const filter = {
                    devices: [device2]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = FilterHelpers.getBrowserUrlQueryFromUpdatedFilterItems(filter, params);
                (0, expect_1.expect)(args).to.deep.equal(expectedParams);
            });
            it('Should handle deletion of a key when there are multiple keys', async function () {
                const params = {
                    devices: [device1.publicId],
                    devtools: [devtool1.publicId]
                };
                const expectedParams = {
                    devtools: [devtool1.publicId]
                };
                const filter = {
                    devices: null
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = FilterHelpers.getBrowserUrlQueryFromUpdatedFilterItems(filter, params);
                (0, expect_1.expect)(args).to.deep.equal(expectedParams);
            });
        });
        describe('devices', async function () {
            let ajaxHarness;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    devices: [device1, device2]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get a non-empty device query', async function () {
                const params = {};
                const expectedParams = {
                    devices: [device1.publicId]
                };
                const filter = {
                    devices: [device1]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = FilterHelpers.getBrowserUrlQueryFromUpdatedFilterItems(filter, params);
                (0, expect_1.expect)(args).to.deep.equal(expectedParams);
            });
            it('Should handle deletion of devices when devices is set to null', async function () {
                const params = { devices: [device1.publicId] };
                const expectedParams = {};
                const filter = {
                    devices: null
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = FilterHelpers.getBrowserUrlQueryFromUpdatedFilterItems(filter, params);
                (0, expect_1.expect)(args).to.deep.equal(expectedParams);
            });
            it('Should not update the devices when devices is set to undefined', async function () {
                const params = { devices: [device1.publicId] };
                const expectedParams = { devices: [device1.publicId] };
                const filter = {
                    devices: undefined
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = FilterHelpers.getBrowserUrlQueryFromUpdatedFilterItems(filter, params);
                (0, expect_1.expect)(args).to.deep.equal(expectedParams);
            });
            it('Should not update the devices when no devices are passed in', async function () {
                const params = { devices: [device1.publicId] };
                const expectedParams = { devices: [device1.publicId] };
                const filter = {};
                await ajaxHarness.setupTestFakeServer(data);
                const args = FilterHelpers.getBrowserUrlQueryFromUpdatedFilterItems(filter, params);
                (0, expect_1.expect)(args).to.deep.equal(expectedParams);
            });
            it('Should handle updating an existing devices key', async function () {
                const params = { devices: [device1.publicId] };
                const expectedParams = { devices: [device2.publicId] };
                const filter = {
                    devices: [device2]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = FilterHelpers.getBrowserUrlQueryFromUpdatedFilterItems(filter, params);
                (0, expect_1.expect)(args).to.deep.equal(expectedParams);
            });
        });
        describe.skip('TODO devtools', function () { });
        describe.skip('TODO ides', function () { });
        describe.skip('TODO kernels', function () { });
        describe.skip('TODO languages', function () { });
        describe.skip('TODO resourceTypes', function () { });
        describe.skip('TODO addedPackageGroups', function () { });
        describe.skip('TODO removedPackageGroups', function () { });
        describe.skip('TODO search', function () { });
    });
    describe('getServerFilterQueryFromBrowserUrlQuery', function () {
        describe('general', async function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: emptyFilterData,
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it.skip('TODO Should handle a combination of url query keys', async function () {
                // use all keys
                await ajaxHarness.setupTestFakeServer(data);
            });
            it('Should get nothing from an empty url query', async function () {
                const params = {};
                const expectedFilter = { filterPackageGroup: [] };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe('devices', async function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    devices: [device1]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get devices query from url query', async function () {
                const params = {
                    devices: [device1.publicId]
                };
                const expectedFilter = {
                    filterDevice: [device1.publicId],
                    filterPackageGroup: []
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            it('Should handle an invalid device in the url', async function () {
                const params = { devices: ['ello'] };
                const expectedFilter = { filterPackageGroup: [] };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            it('Should handle a mix of valid and invalid devices in the url', async function () {
                const params = {
                    devices: [device1.publicId, 'ello']
                };
                const expectedFilter = {
                    filterDevice: [device1.publicId],
                    filterPackageGroup: []
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe.skip('TODO devtools', function () { });
        describe.skip('TODO ides', function () { });
        describe.skip('TODO kernels', function () { });
        describe.skip('TODO languages', function () { });
        describe.skip('TODO resourceTypes', function () { });
        describe('packages (common to added / removed)', function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data1 = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    packages: [package2, package3, package7, package8],
                    packageGroups: [packageGroup1, packageGroup2, packageGroup3]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get the default selection from am empty url query', async function () {
                const params = {};
                const expectedFilter = {
                    filterPackageGroup: [
                        packageGroup1.packageGroupPublicUid,
                        packageGroup2.packageGroupPublicUid
                    ]
                };
                await ajaxHarness.setupTestFakeServer(data1);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe('addedPackageGroups', function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    packages: [package2, package3, package7, package8],
                    packageGroups: [packageGroup1, packageGroup2, packageGroup3]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get packages from the url query', async function () {
                const params = {
                    a: [
                        `${packageGroup3.packageGroupPublicId}__${packageGroup3.packageGroupVersion}`
                    ]
                };
                const expectedFilter = {
                    filterPackageGroup: [
                        packageGroup1.packageGroupPublicUid,
                        packageGroup2.packageGroupPublicUid,
                        packageGroup3.packageGroupPublicUid
                    ]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            it('Should handle an invalid package in the url query (garbage key)', async function () {
                const params = {
                    a: ['pkg']
                };
                const expectedFilter = {
                    filterPackageGroup: [
                        packageGroup1.packageGroupPublicUid,
                        packageGroup2.packageGroupPublicUid
                    ]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe('removedPackageGroups', function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    packages: [package2, package3, package7],
                    packageGroups: [packageGroup1, packageGroup2]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get packages from the url query', async function () {
                const params = {
                    r: [
                        `${packageGroup1.packageGroupPublicId}__${packageGroup1.packageGroupVersion}`
                    ]
                };
                const expectedFilter = {
                    filterPackageGroup: [packageGroup2.packageGroupPublicUid]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            it('Should handle an invalid package in the url query (garbage key)', async function () {
                const params = {
                    r: ['pkg']
                };
                const expectedFilter = {
                    filterPackageGroup: [
                        packageGroup1.packageGroupPublicUid,
                        packageGroup2.packageGroupPublicUid
                    ]
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        describe('search', async function () {
            let ajaxHarness;
            let apis;
            beforeEach(function () {
                ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
                apis = new apis_1.APIs();
            });
            afterEach(function () {
                ajaxHarness.cleanup();
            });
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                filterData: {
                    ...emptyFilterData,
                    devices: [device1]
                },
                rootNode,
                hierarchy: {
                    [rootNode]: []
                },
                nodeData: {}
            };
            it('Should get search from url query', async function () {
                const params = {
                    devices: [device1.publicId]
                };
                const expectedFilter = {
                    filterDevice: [device1.publicId],
                    filterPackageGroup: []
                };
                await ajaxHarness.setupTestFakeServer(data);
                const args = await callMethod(params);
                (0, expect_1.expect)(args).to.deep.equal(expectedFilter);
            });
            async function callMethod(params) {
                return callMethodOuter(params, apis);
            }
        });
        async function callMethodOuter(params, apis) {
            const allGroups = await apis.getPackageGroups();
            const filterOptions = await apis.getFilterOptions();
            return FilterHelpers.getServerFilterQueryFromBrowserUrlQuery(params, allGroups, filterOptions);
        }
    });
});
