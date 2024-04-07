"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd Party
const chai_1 = require("chai");
const chai = require("chai");
const sinon = require("sinon");
// determine if we want to run this test
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const nodes_utils_1 = require("../test/integration-tests/nodes-utils");
const database_utils_1 = require("../test/integration-tests/database-utils");
const sqldbImporter_1 = require("../lib/dbImporter/sqldbImporter");
const dbSession_1 = require("../lib/dbSession");
const logger_1 = require("../utils/logger");
const seo_1 = require("./seo");
const logging_1 = require("../utils/logging");
const dbBuilderUtils = require("../lib/dbBuilder/dbBuilderUtils");
const vars_1 = require("../lib/vars");
const fs = require("fs-extra");
const path = require("path");
const rex_1 = require("../lib/rex");
const handle_search_bot_request_1 = require("../seo/handle-search-bot-request");
const util_1 = require("../seo/util");
// allows expect().to.exist to work
// tslint:disable:no-unused-expression
let devices;
let devtools;
let packages;
// Test packages
let variedTypesPackage;
const dinfraPath = test_helpers_1.testingGlobals.dinfraPath;
// tslint:disable-next-line:no-var-requires
const dinfra = require(dinfraPath);
const searchText = 'uniqueStringForSearching';
scriptsUtil.initMochaConfig({});
describe('replaceCharactersWithHtmlEncoding', () => {
    it('Should replace special characters with HTML Encoding', () => {
        const testString = 'Wow! Nice symbols !@#$%^&*()';
        const result = (0, util_1.replaceCharactersWithHtmlEncoding)(testString);
        (0, chai_1.expect)(result).to.equal('Wow&#33; Nice symbols &#33;&#64;&#35;&#36;&#37;&#94;&#38;&#42;&#40;&#41;');
    });
});
// These tests need to be reworked. They attempt to fake out the express layer manually (i.e req / res objects)
// Some other maintainable solutions
// - Have the tests go through the express layers (i.e http requests)
// - Extract the express dependencies in seo.ts, creating a function with the core functionality. We could then test the code without trying to fake things out (would become a server independent test)
describe.skip('Search Engine Optimization Tests', function () {
    this.timeout(0);
    let dbSession;
    let packageGroups;
    let seoFunction;
    let contentRedirectFunction;
    let resourcePackages;
    let encodedPublicId;
    const dbTablePrefix = vars_1.Vars.DB_TABLE_PREFIX;
    let tmpFile;
    before(async () => {
        const dbFolder = await (0, nodes_utils_1.updateDatabase)(generateMetadata());
        packageGroups = (await (0, sqldbImporter_1.discoverPackageGroups)(dbFolder)).packageGroupsDef;
        (0, chai_1.expect)(packageGroups.length).to.be.gt(0);
        const sqldbFactory = new dbSession_1.DbSessionFactory(dinfraPath, dbTablePrefix);
        dbSession = await sqldbFactory.getCurrentSessionPromise();
        (0, chai_1.expect)(dbSession).to.exist;
        resourcePackages = generatePackage(generateVariedResourceTypesPackage, devices, devtools);
        const loggerMan = (0, logger_1.createDefaultLogger)(dinfra);
        const logger = new logging_1.LoggerManager(loggerMan).createLogger('SeoTesting');
        // @ts-ignore - these tests need a rework
        const vars = new vars_1.Vars(getAppConfig());
        const dinfraLogger = dinfra.logger('test');
        const rex = (0, rex_1.Rex)({ dinfraLogger, vars });
        seoFunction = (0, handle_search_bot_request_1.handleSearchBotRequest)(logger, rex.vars);
        contentRedirectFunction = (0, seo_1.redirectContentRoutes)(logger);
        const [publicIdToEncode] = packageGroups[0].uid.split('__');
        encodedPublicId = dbBuilderUtils.encodePackageGroupPublicId(publicIdToEncode);
        const emptyContentPath = (0, test_helpers_1.getUniqueFolderName)();
        fs.emptyDirSync(emptyContentPath);
        await (0, nodes_utils_1.updateDBContent)(emptyContentPath);
        const tmpFolder = (0, test_helpers_1.getUniqueFolderName)('seo');
        fs.emptyDirSync(tmpFolder);
        tmpFile = path.join(tmpFolder, 'test.txt');
    });
    it('Should be hooked up as middleware, and should redirect to latest version', async () => {
        const data = 'FakeData';
        await writeToFile('SeoTest.html', data);
        const result = await chai
            .request(scriptsUtil.mochaServer)
            .get('/explore/node?node=APm1fpvzJ4Qhq8euuP8R5Q__41Qk4L1__1.80.00')
            .set('user-agent', 'Googlebot');
        (0, chai_1.expect)(result).to.have.status(200);
        (0, chai_1.expect)(result).to.redirect;
        (0, chai_1.expect)(result).to.redirectTo(`${scriptsUtil.mochaServer}explore/node?node=APm1fpvzJ4Qhq8euuP8R5Q__41Qk4L1__LATEST`);
        await fs.unlink(path.join(vars_1.Vars.CONTENT_BASE_PATH, 'SeoTest.html'));
    });
    it("Should send noindex if it's not a node request", async () => {
        const result = await chai
            .request(scriptsUtil.mochaServer)
            .get('/explore')
            .set('user-agent', 'Googlebot');
        (0, chai_1.expect)(result).to.have.status(200);
        (0, chai_1.expect)(result).to.have.header('X-Robots-Tag', 'noindex');
    });
    it("Should send noindex if it's a foundation node (no package group)", async () => {
        const result = await chai
            .request(scriptsUtil.mochaServer)
            .get('/explore/node?node=APm1fpvzJ4Qhq8euuP8R5Q')
            .set('user-agent', 'Googlebot');
        (0, chai_1.expect)(result).to.have.status(200);
        (0, chai_1.expect)(result).to.have.header('X-Robots-Tag', 'noindex');
    });
    it("Should send 404 if node id doesn't exist", async () => {
        const result = await chai
            .request(scriptsUtil.mochaServer)
            .get('/explore/node?node=nonexistent__41Qk4L1__LATEST')
            .set('user-agent', 'Googlebot');
        (0, chai_1.expect)(result).to.have.status(404);
    });
    it('Should redirect content routes to an appropirate explore route', async () => {
        const req = generateFakeContentRequest();
        const res = generateFakeResponse();
        const next = sinon.stub().returns(true);
        await contentRedirectFunction(req, res, next);
        (0, chai_1.expect)(next.called, 'false');
        (0, chai_1.expect)(res.redirect.called, 'true');
        (0, chai_1.expect)(res.redirect.firstCall.args[0], '301');
        (0, chai_1.expect)(res.redirect.firstCall.args[1], '/explore/node?node=AFK-JYAlL94KJhzI8xCMIQ__krol.2c__LATEST');
    });
    it('Should not insert a description meta tag if it receives an html file with a description meta tag', async () => {
        const fullPathsPublicId = resourcePackages.resources[0].fullPathsPublicIds[0];
        const data = '<html><head><meta name="description" content="fake description"><title>Fake</title></head><body>Fake body data </body></html>';
        await writeToFile('SeoTest.html', data);
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeReponseWithWritestream(tmpFile);
        await seoFunction(request, response);
        const result = fs.readFileSync(tmpFile);
        (0, chai_1.expect)(result.toString()).to.equal(data);
        await fs.unlink(path.join(vars_1.Vars.CONTENT_BASE_PATH, 'SeoTest.html'));
        await fs.unlink(tmpFile);
    });
    it("Should insert a description meta tag if the file doesn't have a description meta tag", async () => {
        const data = '<html><head><title>Testing</title></head><body>Fake body data </body></html>';
        await writeToFile('SeoTest.html', data);
        const fullPathsPublicId = resourcePackages.resources[0].fullPathsPublicIds[0];
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeResponse();
        await seoFunction(request, response);
        (0, chai_1.expect)(response.send.calledOnce).to.equal(true);
        (0, chai_1.expect)(response.send.firstCall.args[0]).to.equal('<html><head><meta name="description" content="device1,board1,ccs"><title>Testing</title></head><body>Fake body data </body></html>');
        await fs.unlink(path.join(vars_1.Vars.CONTENT_BASE_PATH, 'SeoTest.html'));
    });
    it('Should stream a pdf to the response', async () => {
        const pdfData = 'this is a pdf';
        await writeToFile('SeoTest.pdf', pdfData);
        const fullPathsPublicId = resourcePackages.resources[7].fullPathsPublicIds[0];
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeReponseWithWritestream(tmpFile);
        await seoFunction(request, response);
        const result = fs.readFileSync(tmpFile);
        (0, chai_1.expect)(result.toString()).to.equal(pdfData);
        await fs.unlink(path.join(vars_1.Vars.CONTENT_BASE_PATH, 'SeoTest.pdf'));
        await fs.unlink(tmpFile);
    });
    it('Should send a text file with a description meta tag inserted into the header', async () => {
        const fullPathsPublicId = resourcePackages.resources[6].fullPathsPublicIds[0];
        const data = "int main(int argc, char** argv){std::printf('Hello, World!');return 0;}";
        await writeToFile('SeoTest.c', data);
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeReponseWithWritestream(tmpFile);
        await seoFunction(request, response);
        const expectedResult = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>fileTest</title>
                          <meta name="description" content="Fake Description Keywords: device1,board1,ccs">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head> 
                        <body>
                        <pre style="word-wrap: break-word; white-space: pre-wrap;">int main&#40;int argc&#44; char&#42;&#42; argv&#41;&#123;std&#58;&#58;printf&#40;&#39;Hello&#44; World&#33;&#39;&#41;&#59;return 0&#59;&#125;</pre></body></html>`;
        (0, chai_1.expect)(response.send.calledOnce).to.equal(true);
        (0, chai_1.expect)(response.send.firstCall.args[0].replace(/\s/g, '')).to.equal(expectedResult.replace(/\s/g, ''));
        await fs.unlink(path.join(vars_1.Vars.CONTENT_BASE_PATH, 'SeoTest.c'));
        await fs.unlink(tmpFile);
    });
    it('Should call getProjectDescriptionandKeywords for a projectSpec', async () => {
        const fullPathsPublicId = resourcePackages.resources[1].fullPathsPublicIds[0];
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeResponse();
        await seoFunction(request, response);
        const expectedResult = `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>projectSpecTest</title><meta name="description" content="description Test Keywords: device1,board1,ccs">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body><p>description Test device1,board1,ccs</p></body></html>`.replace(/\s/g, '');
        (0, chai_1.expect)(response.send.calledOnce).to.equal(true);
        (0, chai_1.expect)(response.send.firstCall.args[0].replace(/\s/g, '')).to.equal(expectedResult);
    });
    it('Should call getProjectDescriptionandKeywords for a project.ccs', async () => {
        const fullPathsPublicId = resourcePackages.resources[2].fullPathsPublicIds[0];
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeResponse();
        await seoFunction(request, response);
        const expectedResult = `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>projectCcsTest</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body><p>projectCcsTest</p></body></html>`.replace(/\s/g, '');
        (0, chai_1.expect)(response.send.calledOnce).to.equal(true);
        (0, chai_1.expect)(response.send.firstCall.args[0].replace(/\s/g, '')).to.equal(expectedResult);
    });
    it('Should call getProjectDescriptionanKeywords for a project.energia', async () => {
        const fullPathsPublicId = resourcePackages.resources[3].fullPathsPublicIds[0];
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeResponse();
        await seoFunction(request, response);
        const expectedResult = `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>projectEnergiaTest</title><meta name="description" content="Description Test">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body><p>Description Test</p></body></html>`.replace(/\s/g, '');
        (0, chai_1.expect)(response.send.calledOnce).to.equal(true);
        (0, chai_1.expect)(response.send.firstCall.args[0].replace(/\s/g, '')).to.equal(expectedResult);
    });
    it('Should return a 404 for external links', async () => {
        const fullPathsPublicId = resourcePackages.resources[4].fullPathsPublicIds[0];
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeResponse();
        await seoFunction(request, response);
        (0, chai_1.expect)(response.sendStatus.calledOnce).to.equal(true);
        (0, chai_1.expect)(response.sendStatus.firstCall.args[0]).to.equal(404);
    });
    it('Should display resource description if no link but shortDescription', async () => {
        const fullPathsPublicId = resourcePackages.resources[5].fullPathsPublicIds[0];
        const request = generateFakeRequest(encodedPublicId, fullPathsPublicId, dbSession);
        const response = generateFakeResponse();
        await seoFunction(request, response);
        const expectedResult = `<!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <title>overviewDescriptionTest</title>
                      <meta name = "description" content="Fake Short Description">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body><p>Fake Description</p></body></html>`.replace(/\s/g, '');
        (0, chai_1.expect)(response.send.calledOnce).to.equal(true);
        (0, chai_1.expect)(response.send.firstCall.args[0].replace(/\s/g, '')).to.equal(expectedResult);
    });
    it('Should add a response header to the canonical link if the resource is a duplicate', async () => {
        await generateFakeDuplicateLinksFile(resourcePackages);
        const data = 'Duplicate Resource File Data';
        await writeToFile('SeoTest.html', data);
        const result = await chai
            .request(scriptsUtil.mochaServer)
            .get('/explore/node?node=APm1fpvzJ4Qhq8euuP8R5Q__41Qk4L1__LATEST')
            .set('user-agent', 'Googlebot');
        (0, chai_1.expect)(result).to.have.status(200);
        (0, chai_1.expect)(result).to.have.header('link', `<${scriptsUtil.mochaServer}/explore/node?node=fakeFullPathId__41Qk4L1__LATEST>; rel="canonical"`);
        await fs.unlink(path.join(vars_1.Vars.CONTENT_BASE_PATH, 'SeoTest.html'));
    });
});
class FakeResponse extends fs.WriteStream {
    status = sinon.stub().returns(true);
    sendStatus = sinon.stub().returns(true);
    send = sinon.stub().returns(true);
    redirect = sinon.stub().returns(true);
    setHeader = sinon.stub().returns(true);
}
async function generateFakeDuplicateLinksFile(resourcePackages) {
    const fileName = `${resourcePackages.packageOverview.packageUId + vars_1.Vars.DUPLICATE_RESOURCE_LINKS_FILE_SUFFIX}`;
    const fakeData = {};
    for (const resource of resourcePackages.resources) {
        fakeData[resource.link] = {
            name: resource.name,
            frontTrim: '',
            backTrim: '',
            duplicatePaths: {}
        };
        fakeData[resource.link].duplicatePaths.fakeFullPathId = 'FakeFullPath';
        for (let i = 0; i < resource.fullPathsPublicIds.length; i++) {
            const fullPathsPublicId = resource.fullPathsPublicIds[i];
            fakeData[resource.link].duplicatePaths[fullPathsPublicId] =
                resource.fullPaths[i].join('/');
        }
    }
    fs.emptyDirSync(path.join(vars_1.Vars.SEO_PATH));
    await fs.writeFile(path.join(vars_1.Vars.SEO_PATH, fileName), JSON.stringify(fakeData, null, 2));
}
async function writeToFile(fileName, data) {
    fs.emptyDirSync(path.join(vars_1.Vars.CONTENT_BASE_PATH));
    await fs.writeFile(path.join(vars_1.Vars.CONTENT_BASE_PATH, fileName), data);
}
function generateFakeReponseWithWritestream(tempFile) {
    const response = fs.createWriteStream(tempFile);
    response.send = sinon.stub().returns(true);
    response.status = sinon.stub().returns(true);
    response.sendStatus = sinon.stub().returns(true);
    response.setHeader = sinon.stub().returns(true);
    return response;
}
function generateFakeResponse() {
    return {
        status: sinon.stub().returns(true),
        sendStatus: sinon.stub().returns(true),
        send: sinon.stub().returns(true),
        redirect: sinon.stub().returns(true),
        write: sinon.stub().returns(true)
    };
}
function generateFakeContentRequest() {
    return {
        headers: {
            // All that matters is if the user-agent contains Googlebot, but this is the actual user-agent that is used
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            referer: 'https://www.google.ca'
        },
        originalUrl: '/content/simplelink_academy_cc2640r2sdk_1_12_01_16/modules/ble_scan_adv_basic/ble_scan_adv_basic.html',
        method: 'GET'
    };
}
function generateFakeRequest(encodedPackageGroupPublicId, fullPathsPublicId, sqldb, version) {
    const queryNodeVersion = version ? version : 'LATEST';
    return {
        headers: {
            // All that matters is if the user-agent contains Googlebot, but this is the actual user-agent that is used
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
        },
        method: 'GET',
        sqldb,
        query: {
            node: `${fullPathsPublicId}__${encodedPackageGroupPublicId}__${queryNodeVersion}`
        },
        originalUrl: `/explore/node?node=${fullPathsPublicId}__${encodedPackageGroupPublicId}__${queryNodeVersion}`
    };
}
function generateMetadata() {
    // Generate various different packages for different tests
    devices = generateDevices();
    devtools = generateDevtools();
    variedTypesPackage = generatePackage(generateVariedResourceTypesPackage, devices, devtools);
    packages = [variedTypesPackage];
    return {
        devices,
        devtools,
        packages
    };
}
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
    const simpleCategories = (0, database_utils_1.generateSimpleCategories)(resources, packageOverview);
    return {
        packageOverview,
        resources,
        overviews,
        simpleCategories
    };
}
function generateVariedResourceTypesPackage(devices, devtools) {
    const packageOverview = (0, database_utils_1.generatePackageOverview)('variedResourceTypes', '1.23.45.00');
    const resources = [
        (0, database_utils_1.generateResource)('TestHtmlWithMetaTag', packageOverview, devices[0], devtools[0], {
            linkType: 'local',
            link: 'SeoTest.html',
            resourceType: 'file'
        }),
        (0, database_utils_1.generateResource)('projectSpecTest', packageOverview, devices[0], devtools[0], {
            linkType: 'local',
            link: 'fakeLink',
            resourceType: 'projectSpec',
            description: 'description Test'
        }),
        generateEmptyResource('projectCcsTest', packageOverview, {
            linkType: 'local',
            link: 'fakeLink',
            resourceType: 'project.ccs',
            description: undefined,
            kernel: undefined,
            compiler: undefined,
            devtools: undefined,
            devices: []
        }),
        generateEmptyResource('projectEnergiaTest', packageOverview, {
            linkType: 'local',
            link: 'fakeLink',
            resourceType: 'project.energia',
            description: 'Description Test',
            kernel: undefined,
            compiler: undefined,
            devtools: undefined,
            devices: undefined
        }),
        (0, database_utils_1.generateResource)('externalLinkTest', packageOverview, devices[0], devtools[0], {
            link: 'fake link',
            linkType: 'external'
        }),
        (0, database_utils_1.generateResource)('overviewDescriptionTest', packageOverview, devices[0], devtools[0], {
            shortDescription: 'Fake Short Description',
            description: 'Fake Description'
        }),
        (0, database_utils_1.generateResource)('fileTest', packageOverview, devices[0], devtools[0], {
            linkType: 'local',
            link: 'SeoTest.c',
            resourceType: 'file',
            description: 'Fake Description'
        }),
        (0, database_utils_1.generateResource)('pdfTest', packageOverview, devices[0], devtools[0], {
            linkType: 'local',
            link: 'SeoTest.pdf',
            resourceType: 'file'
        })
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
function generateEmptyResource(name, pkgOverview, overrides = {}) {
    const minResource = {
        name,
        devtools: [],
        categories: [
            [
                'Software',
                pkgOverview.name,
                'Examples',
                'Development Tools',
                'Demos',
                'outOfBox_msp432p401r'
            ]
        ],
        package: pkgOverview.name,
        packageId: pkgOverview.packageId,
        packageVersion: pkgOverview.version,
        packageUId: pkgOverview.packageUId,
        packagePath: pkgOverview.packagePath,
        fullPaths: [
            [
                'Software',
                pkgOverview.name,
                'Examples',
                'Development Tools',
                'MSP432P401R LaunchPad - Red 2.x (Red)',
                'Demos',
                'outOfBox_msp432p401r'
            ]
        ],
        fullPathsPublicIds: [],
        resourceType: 'web.app',
        linkType: 'external',
        _id: (0, database_utils_1.generateId)()
    };
    const finalResource = {
        ...minResource,
        ...overrides
    };
    finalResource.fullPathsPublicIds = finalResource.fullPaths.map((fullPath) => dbBuilderUtils.createPublicIdFromTreeNodePath([...fullPath, name].join('/')));
    return finalResource;
}
function getAppConfig() {
    const remoteserver = 'remoteserver';
    const isFalse = 'false';
    const isTrue = 'true';
    return {
        allowExit: true,
        preset: '',
        mode: remoteserver,
        contentPath: '~/content',
        dbPath: '~/.db',
        seoPath: '~/seo',
        dbTablePrefix: '',
        dbResourcePrefix: '',
        logsDir: '~/.logs',
        contentPackagesConfig: '~/default.json',
        remoteBundleZips: 'http://software-dl.ti.com/ccs/esd/tirex/zips/',
        localBundleZips: '~/zips/',
        myRole: '',
        no_proxy: 'localhost,127.0.0.0,.ti.com,.toro.design.ti.com',
        http_proxy: 'http://webproxy.ext.ti.com:80',
        refreshDB: isFalse,
        allowRefreshFromWeb: isTrue,
        mailingList: '',
        handoffServer: false,
        downloadServer: false,
        useConsole: isTrue,
        useFakeRoutes: false,
        enableMetricsMiddleware: true,
        testingServer: true,
        webComponentsServer: '',
        ccsCloudUrl: '',
        seaportHostIP: '',
        seaportPort: '',
        dcontrol: {
            legacy: {
                seaport: {
                    address: '',
                    port: ''
                }
            }
        },
        serverMode: 'both'
    };
}
