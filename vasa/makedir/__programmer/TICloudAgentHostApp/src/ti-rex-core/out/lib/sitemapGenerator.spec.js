"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const chai_1 = require("chai");
const path = require("path");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const sitemapGenerator_1 = require("./sitemapGenerator");
const fs = require("fs-extra");
const vars_1 = require("../lib/vars");
// tslint:disable-next-line:only-arrow-functions
describe('getLatestVersionPackageGroups', async function () {
    it('should generate a list of package groups with the latest version', async () => {
        const fakePackageGroups = [];
        const expectedResult = [
            'devices__0.0.0',
            'grp_com.ti.SIMPLELINK_CC13X0_SDK__1.40.00.10',
            'grp_com.ti.SIMPLELINK_CC13X2_SDK__2.30.00.45',
            'grp_com.ti.SIMPLELINK_MSP432_SDK__1.40.01.00',
            'grp_com.ti.SIMPLELINK_SDK_BLE_PLUGIN__3.20.00.24'
        ];
        makeFakePackageGroups(fakePackageGroups);
        const latestPackageGroups = (0, sitemapGenerator_1.getLatestPackageGroups)(fakePackageGroups);
        const result = [];
        for (const pkgGroup of latestPackageGroups) {
            result.push(pkgGroup.uid);
        }
        (0, chai_1.expect)(result).to.deep.equal(expectedResult);
    });
});
describe('getDuplicateResourceLinks', async () => {
    it('Should take an array of resources and return an object containing resources with duplicate links', () => {
        const fakeResources = makeDuplicateResources();
        const duplicateResourceLinks = (0, sitemapGenerator_1.getDuplicateLinks)(fakeResources);
        const expectedResult = {
            FakeLink0: {
                name: 'Resource 0',
                duplicatePaths: {
                    'FakePubId0.1': 'FakePath0.1',
                    'FakePubId0.2': 'FakePath0.2'
                },
                frontTrim: 'FakeStart/',
                backTrim: '/FakeEnd'
            },
            FakeLink1: {
                name: 'Resource 1',
                duplicatePaths: {
                    'FakePubId1.1': 'FakePath1.1',
                    'FakePubId1.2': 'FakePath1.2'
                },
                frontTrim: 'FakeStart/',
                backTrim: '/FakeEnd'
            },
            FakeLink3: {
                name: 'Resource 3',
                duplicatePaths: {
                    'FakePubId3.1': 'FakePath3.1',
                    'FakePubId3.2': 'FakePath3.2',
                    'FakePubId4.1': path.join('FakeDir4.1', 'FakeDir4.2', 'FakeFile4.3')
                },
                frontTrim: '',
                backTrim: ''
            },
            'http://www.ti.com/tool/ccstudio_fake': {
                name: 'Resource 4',
                duplicatePaths: {
                    'FakePubId5.1': 'FakeDir5.1',
                    'FakePubId5.2': 'FakeDir5.2'
                },
                frontTrim: 'FakeStart/',
                backTrim: '/FakeEnd'
            },
            'http://software-dl.ti.com/ccs/esd/fake_documents.html': {
                name: 'Resource 5',
                duplicatePaths: {
                    'FakePubId6.1': 'FakePath6.1',
                    'FakePubId6.2': 'FakePath6.2'
                },
                frontTrim: 'FakeStart/',
                backTrim: '/FakeEnd'
            }
        };
        (0, chai_1.expect)(JSON.stringify(duplicateResourceLinks)).to.equal(JSON.stringify(expectedResult));
    });
});
describe('writeOverviewToSitemap', async () => {
    let fileData;
    const testFile = path.join(vars_1.Vars.SEO_PATH, 'writeOverviewTest.xml');
    const fakeID = 'fakeID';
    const fakeID2 = 'fakeID2';
    it('should return false if no data is being written', async () => {
        const fakeOverviews = [];
        fs.emptyDirSync(vars_1.Vars.SEO_PATH);
        const writeStream = fs.createWriteStream(testFile);
        const linkSummary = initLinkSummary();
        const wroteData = (0, sitemapGenerator_1.writeOverviewToSitemap)(fakeOverviews, 'fakeFilePath', fakeID, fakeID2, writeStream, linkSummary);
        (0, chai_1.expect)(wroteData).to.equal(false);
        await fs.unlink(testFile);
    });
    it('should write overviews to a WriteStream', (done) => {
        const fakeOverviews = makeUniqueOverviews();
        fs.emptyDirSync(vars_1.Vars.SEO_PATH);
        const writeStream = fs.createWriteStream(testFile);
        const linkSummary = initLinkSummary();
        const wroteData = (0, sitemapGenerator_1.writeOverviewToSitemap)(fakeOverviews, 'fakeFilePath', fakeID, fakeID2, writeStream, linkSummary);
        (0, chai_1.expect)(wroteData).to.equal(true);
        writeStream.end();
        writeStream.on('finish', async () => {
            const content = await fs.readFile(testFile);
            fileData = content.toString();
            setImmediate(done);
        });
    });
    it('should have written correct data', async () => {
        const expectedXmlContent = '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID2__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID3__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID4__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID5__fakeID__LATEST</loc></url>\n';
        (0, chai_1.expect)(fileData).to.equal(expectedXmlContent);
    });
    after(async () => {
        await fs.unlink(testFile);
    });
});
describe('writeResourcesToSitemap', async () => {
    let fileData;
    const testFile = path.join(vars_1.Vars.SEO_PATH, 'writeResourcesTest.xml');
    const fakeID = 'fakeID';
    const fakeID2 = 'fakeID2';
    it('should return false if no data is being written', async () => {
        const fakeResources = [];
        await fs.emptyDir(vars_1.Vars.SEO_PATH);
        const writeStream = fs.createWriteStream(testFile);
        const linkSummary = initLinkSummary();
        const wroteData = (0, sitemapGenerator_1.writeResourcesToSitemap)(fakeResources, 'fakeFilePath', fakeID, fakeID2, writeStream, linkSummary);
        (0, chai_1.expect)(wroteData).to.equal(false);
        await fs.unlink(testFile);
    });
    it('should write resources to a WriteStream', (done) => {
        const fakeResources = makeUniqueFakeResources();
        const fakeID = 'fakeID';
        fs.emptyDirSync(vars_1.Vars.SEO_PATH);
        const writeStream = fs.createWriteStream(testFile);
        const linkSummary = initLinkSummary();
        const wroteData = (0, sitemapGenerator_1.writeResourcesToSitemap)(fakeResources, 'fakeFilePath', fakeID, fakeID2, writeStream, linkSummary);
        (0, chai_1.expect)(wroteData).to.equal(true);
        writeStream.end();
        writeStream.on('finish', async () => {
            const content = await fs.readFile(testFile);
            fileData = content.toString();
            setImmediate(done);
        });
    });
    it('should have written the correct data', async () => {
        const expectedXmlContent = '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID1__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID3__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID4__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID5__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=PathID7__fakeID__LATEST</loc></url>\n';
        (0, chai_1.expect)(fileData).to.equal(expectedXmlContent);
    });
    it('Should be able to handle multiple resources having the same link', async () => {
        const fakeResources = makeDuplicateResources();
        const duplicateOverviewLinks = (0, sitemapGenerator_1.getDuplicateLinks)(fakeResources);
        const duplicateLinksFile = fs.createWriteStream('fakeJSON');
        duplicateLinksFile.write(JSON.stringify(duplicateOverviewLinks));
        duplicateLinksFile.end();
        await new Promise((resolve) => duplicateLinksFile.on('finish', resolve));
        const writeStream = fs.createWriteStream(testFile);
        const linkSummary = initLinkSummary();
        const wroteData = (0, sitemapGenerator_1.writeResourcesToSitemap)(makeDuplicateResources(), 'fakeJSON', 'fakeID', 'fakeID2', writeStream, linkSummary);
        writeStream.end();
        await new Promise((resolve) => writeStream.on('finish', resolve));
        (0, chai_1.expect)(wroteData).to.equal(true);
        const content = await fs.readFile(testFile);
        const expectedXmlContent = '<url><loc>https://dev.ti.com/tirex/explore/node?node=FakePubId2.1__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=FakePubId8.1__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=FakePubId0.1__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=FakePubId1.1__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=FakePubId3.1__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=FakePubId5.1__fakeID__LATEST</loc></url>\n' +
            '<url><loc>https://dev.ti.com/tirex/explore/node?node=FakePubId6.1__fakeID__LATEST</loc></url>\n';
        await fs.unlink('fakeJSON');
        (0, chai_1.expect)(content.toString()).to.equal(expectedXmlContent);
    });
    after(async () => {
        await fs.unlink(testFile);
    });
});
function makeFakePackageGroups(fakePackageGroups) {
    fakePackageGroups.push({
        uid: 'grp_com.ti.SIMPLELINK_CC13X2_SDK__2.20.00.71',
        packages: [
            'com.ti.SIMPLELINK_CC13X2_SDK__2.20.00.71',
            'com.ti.SIMPLELINK_ACADEMY_CC13X2SDK_CN__1.15.05.02'
        ],
        mainPackage: 'com.ti.SIMPLELINK_CC13X2_SDK__2.20.00.71'
    });
    fakePackageGroups.push({
        uid: 'grp_com.ti.SIMPLELINK_SDK_BLE_PLUGIN__3.20.00.24',
        packages: ['com.ti.SIMPLELINK_SDK_BLE_PLUGIN__3.20.00.24'],
        mainPackage: 'com.ti.SIMPLELINK_SDK_BLE_PLUGIN__3.20.00.24'
    });
    fakePackageGroups.push({
        uid: 'grp_com.ti.SIMPLELINK_MSP432_SDK__1.40.00.28',
        packages: ['com.ti.SIMPLELINK_MSP432_SDK_1.40.00.28'],
        mainPackage: 'com.ti.SIMPLELINK_SDP432_SDK_1.40.00.28'
    });
    fakePackageGroups.push({
        uid: 'devices__0.0.0',
        packages: [
            'c2000ware_devices_package__1.00.06.00',
            'sitara_devices__1.00.00.00',
            'cc32xx_devices__2.40.00.00',
            'com.ti.mmwave_devices__2.0.0',
            'msp430_devices__3.80.07.00',
            'tivac_devices__1.00.00.00',
            'cc26x0_devices__1.11.00.00',
            'msp432_devices__2.30.00.01',
            'cc13x0_devices__1.11.00.00'
        ]
    });
    fakePackageGroups.push({
        uid: 'grp_com.ti.SIMPLELINK_MSP432_SDK__1.40.01.00',
        packages: ['com.ti.SIMPLELINK_MSP432_SDK_1.40.01.00'],
        mainPackage: 'com.ti.SIMPLELINK_SDP432_SDK_1.40.01.00'
    });
    fakePackageGroups.push({
        uid: 'grp_com.ti.SIMPLELINK_CC13X0_SDK__1.40.00.10',
        packages: ['com.ti.SIMPLELINK_CC13X0_SDK__1.40.00.10'],
        mainPackage: 'com.ti.SIMPLELINK_CC13X0_SDK__1.40.00.10'
    });
    fakePackageGroups.push({
        uid: 'grp_com.ti.SIMPLELINK_CC13X2_SDK__2.30.00.45',
        packages: [
            'com.ti.SIMPLELINK_CC13X2_SDK__2.30.00.45',
            'com.ti.SIMPLELINK_ACADEMY_CC13X2SDK__2.30.02.00',
            'com.ti.SIMPLELINK_ACADEMY_CC13X2SDK_CN__1.15.05.02'
        ],
        mainPackage: 'com.ti.SIMPLELINK_CC13X2_SDK__2.30.00.45'
    });
    return fakePackageGroups;
}
function makeUniqueOverviews() {
    const fakeOverviews = [];
    for (let numFakeOverviews = 0; numFakeOverviews < 6; numFakeOverviews++) {
        fakeOverviews.push(generateOverviewTemplate());
    }
    fakeOverviews[0].fullPaths = [['path1']];
    fakeOverviews[0].fullPathsPublicIds = ['PathID1'];
    fakeOverviews[1].shortDescription = 'Fake short description';
    fakeOverviews[1].fullPaths = [['path2']];
    fakeOverviews[1].fullPathsPublicIds = ['PathID2'];
    fakeOverviews[2].link = 'home/auser/device_fake/README.html';
    fakeOverviews[2].linkType = 'local';
    fakeOverviews[2].fullPaths = [['path3']];
    fakeOverviews[2].fullPathsPublicIds = ['PathID3'];
    fakeOverviews[3].linkType = 'local';
    fakeOverviews[3].shortDescription = 'This is a short description for fakeOverview[2]';
    fakeOverviews[3].fullPaths = [['path4']];
    fakeOverviews[3].fullPathsPublicIds = ['PathID4'];
    fakeOverviews[4].link = 'home/auser/README.html';
    fakeOverviews[4].linkType = 'local';
    fakeOverviews[4].shortDescription = 'This is a short description for fakeOverview[3]';
    fakeOverviews[4].fullPaths = [['path5']];
    fakeOverviews[4].fullPathsPublicIds = ['PathID5'];
    fakeOverviews[5].link = 'fakeLink.html';
    fakeOverviews[5].fullPaths = [['path6']];
    fakeOverviews[5].fullPathsPublicIds = ['PathID6'];
    return fakeOverviews;
}
function generateOverviewTemplate() {
    const resourceType = 'folder';
    return {
        _id: 'ValidID',
        advanced: {},
        allowPartialDownload: false,
        categories: [[]],
        dependencies: [],
        modules: [],
        description: 'fake description',
        id: 'fakeID',
        image: 'fakeImg',
        includedFiles: ['.'],
        includedFilesForDownload: ['None'],
        includedResources: [{ package: 'package' }],
        license: 'license',
        hideNodeDirPanel: false,
        metadataVersion: '3.0.0',
        name: 'fake Overview',
        package: 'package',
        packageId: 'packageID',
        packageOrder: 42,
        packagePath: 'path',
        packageUId: 'UId',
        packageVersion: 'Version',
        resourceType,
        semver: '0.0.0',
        version: '0.00.00.00',
        devices: [],
        devicesVariants: [],
        fullPaths: [['fake full path']],
        fullPathsPublicIds: ['PathID0']
    };
}
function makeUniqueFakeResources() {
    const fakeResources = [];
    const externalLink = 'external';
    for (let numOfFakes = 0; numOfFakes < 8; numOfFakes++) {
        fakeResources.push(generateResourceTemplate());
    }
    fakeResources[0].fullPaths = [['path1']];
    fakeResources[0].fullPathsPublicIds = ['PathID1'];
    fakeResources[1].doNotCount = true;
    fakeResources[1].fullPaths = [['path2']];
    fakeResources[1].fullPathsPublicIds = ['PathID2'];
    fakeResources[2].linkType = externalLink;
    fakeResources[2].link = 'http://www.ti.com/lit/pdf/swcu112';
    fakeResources[2].resourceType = 'web.page';
    fakeResources[2].fullPaths = [['path3']];
    fakeResources[2].fullPathsPublicIds = ['PathID3'];
    fakeResources[3].linkType = externalLink;
    fakeResources[3].resourceType = 'web.page';
    fakeResources[3].link =
        'http://software-dl.ti.com/ccs/esd/documents/ccs_linux_host_support.html';
    fakeResources[3].fullPaths = [['path4']];
    fakeResources[3].fullPathsPublicIds = ['PathID4'];
    fakeResources[4].linkType = externalLink;
    fakeResources[4].resourceType = 'web.page';
    fakeResources[4].link = 'http://www.ti.com/product/CC1312r/technicaldocument#doctype2';
    fakeResources[4].fullPaths = [['path5']];
    fakeResources[4].fullPathsPublicIds = ['PathID5'];
    fakeResources[5].linkType = externalLink;
    fakeResources[5].resourceType = 'web.page';
    fakeResources[5].link = 'http://www-s.ti.com/sc/techlit/SWRS211.pdf';
    fakeResources[5].fullPaths = [['path6']];
    fakeResources[5].fullPathsPublicIds = ['PathID6'];
    fakeResources[6].shortDescription = '';
    fakeResources[6].link = 'fake_device/example/fake_document.pdf';
    fakeResources[6].fullPaths = [['path7']];
    fakeResources[6].fullPathsPublicIds = ['PathID7'];
    return fakeResources;
}
function makeDuplicateResources() {
    const fakeResources = [];
    const externalLink = 'external';
    for (let fakes = 0; fakes < 13; fakes++) {
        fakeResources.push(generateResourceTemplate());
    }
    fakeResources[0].doNotCount = true;
    fakeResources[0].fullPathsPublicIds = ['FakePubId', 'FakePubId'];
    fakeResources[0].fullPaths = [
        ['FakeStart', 'FakePath', 'FakeEnd'],
        ['FakeStart', 'FakePath', 'FakeEnd']
    ];
    fakeResources[0].name = 'Resource';
    fakeResources[1].shortDescription = undefined;
    fakeResources[1].link = 'FakeLink0';
    fakeResources[1].fullPathsPublicIds = ['FakePubId0.1', 'FakePubId0.2'];
    fakeResources[1].fullPaths = [
        ['FakeStart', 'FakePath0.1', 'FakeEnd'],
        ['FakeStart', 'FakePath0.2', 'FakeEnd']
    ];
    fakeResources[1].name = 'Resource 0';
    fakeResources[2].link = 'FakeLink1';
    fakeResources[2].fullPathsPublicIds = ['FakePubId1.1', 'FakePubId1.2'];
    fakeResources[2].fullPaths = [
        ['FakeStart', 'FakePath1.1', 'FakeEnd'],
        ['FakeStart', 'FakePath1.2', 'FakeEnd']
    ];
    fakeResources[2].name = 'Resource 1';
    fakeResources[3].link = 'FakeLink2';
    fakeResources[3].fullPathsPublicIds = ['FakePubId2.1'];
    fakeResources[3].fullPaths = [['FakeDir2.1', 'FakeDir2.2', 'FakeFile2.3']];
    fakeResources[3].name = 'Resource 2';
    fakeResources[4].link = 'FakeLink3';
    fakeResources[4].fullPathsPublicIds = ['FakePubId3.1', 'FakePubId3.2'];
    fakeResources[4].fullPaths = [['FakePath3.1'], ['FakePath3.2']];
    fakeResources[4].name = 'Resource 3';
    fakeResources[5].link = 'FakeLink3';
    fakeResources[5].fullPathsPublicIds = ['FakePubId4.1'];
    fakeResources[5].fullPaths = [['FakeDir4.1', 'FakeDir4.2', 'FakeFile4.3']];
    fakeResources[5].name = 'Resource 3';
    fakeResources[6].linkType = externalLink;
    fakeResources[6].link = 'http://www.ti.com/tool/ccstudio_fake';
    fakeResources[6].fullPathsPublicIds = ['FakePubId5.1', 'FakePubId5.2'];
    fakeResources[6].fullPaths = [
        ['FakeStart', 'FakeDir5.1', 'FakeEnd'],
        ['FakeStart', 'FakeDir5.2', 'FakeEnd']
    ];
    fakeResources[6].name = 'Resource 4';
    fakeResources[7].linkType = externalLink;
    fakeResources[7].link = 'http://software-dl.ti.com/ccs/esd/fake_documents.html';
    fakeResources[7].fullPathsPublicIds = ['FakePubId6.1', 'FakePubId6.2'];
    fakeResources[7].fullPaths = [
        ['FakeStart', 'FakePath6.1', 'FakeEnd'],
        ['FakeStart', 'FakePath6.2', 'FakeEnd']
    ];
    fakeResources[7].name = 'Resource 5';
    fakeResources[8].linkType = externalLink;
    fakeResources[8].link = 'http://processors.wiki.ti.com/index.php/Download_CCS';
    fakeResources[8].fullPathsPublicIds = ['FakePubId7.1', 'FakePubId7.2'];
    fakeResources[8].fullPaths = [
        ['FakeStart', 'FakePath7.1'],
        ['FakeStart', 'FakePath7.2']
    ];
    fakeResources[8].name = 'Resource 6';
    fakeResources[9].linkType = externalLink;
    fakeResources[9].link = 'http://www.ti.com/product/fake_product';
    fakeResources[9].fullPathsPublicIds = ['FakePubId8.1'];
    fakeResources[9].fullPaths = [['FakePath8.1']];
    fakeResources[9].name = 'Resource 7';
    fakeResources[10].doNotCount = true;
    fakeResources[10].fullPathsPublicIds = ['FakePubId9.1'];
    fakeResources[10].fullPaths = [['FakeStart', 'FakePath9.1', 'FakeEnd']];
    fakeResources[10].name = 'Resource 0';
    fakeResources[11].linkType = externalLink;
    fakeResources[11].link = 'http://processors.wiki.ti.com/index.php/Download_CCS';
    fakeResources[11].fullPathsPublicIds = ['FakePubId10.1'];
    fakeResources[11].fullPaths = [['FakeStart', 'FakePath10.1']];
    fakeResources[11].name = 'Resource 6';
    fakeResources[12].doNotCount = true;
    fakeResources[12].linkType = externalLink;
    fakeResources[12].link = 'http://www.ti.com/product/fake_product';
    fakeResources[12].fullPathsPublicIds = ['FakePubId11.1'];
    fakeResources[12].fullPaths = [['FakePath11.1']];
    fakeResources[12].name = 'Resource 7';
    return fakeResources;
}
function generateResourceTemplate() {
    const resourceType = 'folder';
    const localLink = 'local';
    return {
        _id: 'fake ID',
        name: 'Name',
        packageId: 'fakePackageID',
        packagePath: 'fakePackagePath',
        packageUId: 'fakePackageUId',
        packageVersion: 'fakePackageVersion',
        resourceType,
        semver: '0.0.0',
        version: 'UNVERSIONED',
        advanced: {},
        allowPartialDownload: false,
        categories: [['fakeCategory']],
        dependencies: [],
        modules: [],
        devicesVariants: ['fakeDeviceVariants'],
        link: 'fakeLink',
        linkType: localLink,
        order: 42,
        package: 'fakePackage',
        root0: 'fakeRoot0',
        doNotCount: false,
        shortDescription: 'fake short description',
        fullPaths: [[]],
        fullPathsDevId: [],
        fullPathsCoreTypeId: [],
        fullPathsPublicIds: []
    };
}
function initLinkSummary() {
    return {
        total: 0,
        software: 0,
        ti: 0,
        external: 0
    };
}
