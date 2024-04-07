"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const fs = require("fs-extra");
const path = require("path");
// determine if we want to run this test (must be done before including certain files)
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const expect_1 = require("../expect");
const database_utils_1 = require("./database-utils");
const nodes_utils_1 = require("./nodes-utils");
const assert = require("assert");
// allow expect(blah).to.exist
// tslint:disable:no-unused-expression
// allows us to make each suite function() instead of () =>
// tslint:disable:only-arrow-functions
// Globals used by support functions (must be declared before describe block)
let mainPackage;
// file names must have .txt extension to get the 'text' mime type so that we can do string comparisons
const downloadRoutesFolder = 'download-routes';
const fileName = path.join(downloadRoutesFolder, 'file.txt');
const fileNameWithInvalidChar = path.join(downloadRoutesFolder, 'file-ж.txt');
const fileContent = 'Hello World';
const linkForDownloadFileName = path.join(downloadRoutesFolder, 'linkForDownload.txt');
const linkForDownloadFileContent = '1010111110000';
const testContent = {
    [fileName]: fileContent,
    [fileNameWithInvalidChar]: fileContent,
    [linkForDownloadFileName]: linkForDownloadFileContent
};
const contentPath = path.join(scriptsUtil.getMochaConfig().contentPath, downloadRoutesFolder);
describe('Download APIs', () => {
    before(async function () {
        this.timeout(60000);
        const metadata = generateMetadata();
        await (0, nodes_utils_1.updateDatabase)(metadata);
        mainPackage = metadata.packages[0];
        await fs.emptyDir(contentPath);
        (0, nodes_utils_1.createContent)(scriptsUtil.getMochaConfig().contentPath, testContent);
        return (0, nodes_utils_1.updateDBContent)(contentPath);
    });
    after(async function () {
        await fs.remove(contentPath);
    });
    describe(`${"api/nodeDownload" /* API.GET_NODE_DOWNLOAD */}`, () => {
        async function doDownload(resource) {
            const nodePath = (0, nodes_utils_1.toNodePath)([...resource.fullPaths[0], resource.name]);
            const dbId = await (0, nodes_utils_1.getDbId)(nodePath);
            const res = await getDownloadedNode({ dbId });
            return res;
        }
        it(`should download a node's local file`, async () => {
            const res = await doDownload(getResourceByName('local test file', mainPackage.resources));
            (0, expect_1.expect)(res.text).to.deep.equal(fileContent);
        });
        it(`should download a node's local file with an invalid char`, async () => {
            const res = await doDownload(getResourceByName('local test file with invalid char', mainPackage.resources));
            (0, expect_1.expect)(res.text).to.deep.equal(fileContent);
        });
        it(`should download a node's local linkForDownload file`, async () => {
            const res = await doDownload(getResourceByName('local linkForDownload test file', mainPackage.resources));
            (0, expect_1.expect)(res.text).to.deep.equal(linkForDownloadFileContent);
        });
        it(`should download a node's external file`, async () => {
            const resource = getResourceByName('external link', mainPackage.resources);
            const res = await doDownload(resource);
            (0, expect_1.expect)(res).to.redirectTo(resource.link);
        });
        it(`should download a node's external linkForDownload file`, async () => {
            const resource = getResourceByName('external linkForDownload', mainPackage.resources);
            const res = await doDownload(resource);
            (0, expect_1.expect)(res).to.redirectTo(resource.linkForDownload.any);
        });
    });
});
async function getDownloadedNode(query) {
    return (0, nodes_utils_1.makeDownloadImportRequest)(`${"api/nodeDownload" /* API.GET_NODE_DOWNLOAD */}`, query);
}
function getResourceByName(name, records) {
    const record = records.find(r => r.name === name);
    assert(record, 'Internal test error: Metadata record not found');
    return record;
}
function generateMetadata() {
    // Generate a package to test downloads
    const devices = [(0, database_utils_1.generateDevice)('DEVICE1', 'device1')];
    const devtools = [(0, database_utils_1.generateDevtool)('BOARD1', 'board1')];
    const packageOverview = (0, database_utils_1.generatePackageOverview)('downloadTest', '1.23.45.00');
    const resources = [
        (0, database_utils_1.generateResource)('local test file', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: fileName
        }),
        (0, database_utils_1.generateResource)('local test file with invalid char', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: fileNameWithInvalidChar
        }),
        (0, database_utils_1.generateResource)('local linkForDownload test file', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            link: fileName,
            linkForDownload: {
                any: linkForDownloadFileName
                // linkType: 'local' TODO add this field, REX-2406
            }
        }),
        (0, database_utils_1.generateResource)('external link', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            // make the local file look like an external one ...
            link: `${scriptsUtil.mochaServer}content/${fileName}`,
            linkType: 'external'
        }),
        (0, database_utils_1.generateResource)('external linkForDownload', packageOverview, devices[0], devtools[0], {
            resourceType: 'file',
            linkForDownload: {
                // make the local file look like an external one ...
                any: `${scriptsUtil.mochaServer}content/${fileName}`
            },
            linkType: 'external'
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
