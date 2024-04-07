"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const expect_1 = require("../../test/expect");
const database_utils_1 = require("./database-utils");
const nodes_utils_1 = require("./nodes-utils");
// Globals used by support functions (must be declared before describe block)
let mainPackage;
// allow expect(blah).to.exist
// tslint:disable:no-unused-expression
describe('Import APIs', () => {
    before(async () => {
        const metadata = generateMetadata();
        await (0, nodes_utils_1.updateDatabase)(metadata);
        mainPackage = metadata.packages[0];
    });
    describe(`${"api/importInfo" /* API.GET_IMPORT_INFO */}`, () => {
        it('Should have project.ccs import info as expected', async () => {
            const resource = mainPackage.resources.find(r => r.name === 'test.projectspec');
            const resourcePath = [...resource.fullPaths[0], resource.name];
            const nodePath = (0, nodes_utils_1.toNodePath)(resourcePath);
            const id2 = await (0, nodes_utils_1.getDbId)(nodePath);
            const node = await getImportInfo({
                dbId: id2,
                filterPackageGroup: [mainPackage.packageOverview.packageId]
            });
            const deviceArray = node.body.payload.targets;
            (0, expect_1.expect)(deviceArray.length).to.equal(0); // Since there is no overrideProjectSpecDeviceId
            (0, expect_1.expect)(node.body.payload).to.deep.equal({
                location: resource.link,
                targets: [],
                resourceType: resource.resourceType
            });
        });
        it('Should have import project.energia info as expected', async () => {
            const resource = mainPackage.resources.find(r => r.name === 'test.ino');
            const resourcePath = [...resource.fullPaths[0], resource.name];
            const nodePath = (0, nodes_utils_1.toNodePath)(resourcePath);
            const id2 = await (0, nodes_utils_1.getDbId)(nodePath);
            const node = await getImportInfo({
                dbId: id2,
                filterPackageGroup: [mainPackage.packageOverview.packageId]
            });
            const energiaBoardArray = node.body.payload.targets;
            (0, expect_1.expect)(energiaBoardArray.length).to.equal(2);
            (0, expect_1.expect)(energiaBoardArray[0]).to.equal('board1' + '_energia_board_A');
            (0, expect_1.expect)(energiaBoardArray[1]).to.equal('board1' + '_energia_board_B');
        });
    });
    // TODO this test will not work till we have a CCS
    /*
    describe(`${API.GET_IMPORT_PROJECT}`, () => {
        it('Should have import API and parameters as expected', async () => {
            const resource = thePackage.resources.find(r => r.name === 'test.projectspec')!;
            const resourcePath = [...resource.fullPaths[0], resource.name];
            const nodePath = toNodePath(resourcePath);
            const id2 = await getId(nodePath);

            const node = await getImportProject({ id: id2 });
            expectValidDbId(node.body);
        });
    });
    */
});
async function getImportInfo(query) {
    return (0, nodes_utils_1.makeDownloadImportRequest)(`${"api/importInfo" /* API.GET_IMPORT_INFO */}`, query);
}
/*
async function getImportProject(query: NodesRequestQuery.NodeImport) {
    return makeDownloadImportRequest(`${API.GET_IMPORT_PROJECT}`, query);
}
*/
function generateMetadata() {
    // Generate a package to test downloads
    const devices = [(0, database_utils_1.generateDevice)('DEVICE1', 'device1')];
    const devtools = [(0, database_utils_1.generateDevtool)('BOARD1', 'board1')];
    const packageOverview = (0, database_utils_1.generatePackageOverview)('importTest', '1.23.45.00');
    const resources = [
        (0, database_utils_1.generateResource)('test.projectspec', packageOverview, devices[0], devtools[0], {
            resourceType: 'project.ccs',
            link: 'test.projectspec',
            categories: [
                [database_utils_1.firstFolderInAllPackages, packageOverview.name, 'Examples', 'myProjectSpec']
            ],
            fullPaths: [
                [
                    database_utils_1.firstFolderInAllPackages,
                    packageOverview.name,
                    devices[0].name,
                    'Examples',
                    'myProjectSpec'
                ]
            ],
            _importProjectCCS: 'some path'
        }),
        (0, database_utils_1.generateResource)('test.ino', packageOverview, devices[0], devtools[0], {
            resourceType: 'project.energia',
            link: 'test.ino',
            categories: [
                [database_utils_1.firstFolderInAllPackages, packageOverview.name, 'Examples', 'myEnergiaProject']
            ],
            fullPaths: [
                [
                    database_utils_1.firstFolderInAllPackages,
                    packageOverview.name,
                    devices[0].name,
                    'Examples',
                    'myEnergiaProject'
                ]
            ],
            _importProjectCCS: 'some path'
        }),
        (0, database_utils_1.generateResource)('importablefile.c', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: 'importablefile.c',
            categories: [
                [database_utils_1.firstFolderInAllPackages, packageOverview.name, 'Examples', 'myProjectSpec']
            ],
            fullPaths: [
                [
                    // test also without a device name in path (REX-2266 regression)
                    database_utils_1.firstFolderInAllPackages,
                    packageOverview.name,
                    'Examples',
                    'myProjectSpec'
                ]
            ],
            _createProjectCCS: 'some path'
        })
    ];
    const overviews = [];
    return {
        devices,
        devtools,
        packages: [
            {
                packageOverview,
                resources,
                overviews,
                simpleCategories: (0, database_utils_1.generateSimpleCategories)(resources, packageOverview)
            }
        ]
    };
}
