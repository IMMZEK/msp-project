"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const chai = require("chai");
const p_iteration_1 = require("p-iteration");
const lodash_1 = require("lodash");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
// our modules
const vars_1 = require("../vars");
const dbUpdateInfo_1 = require("./dbUpdateInfo");
// tslint:disable:no-unused-expression
// for .to.exist
// tslint:disable-next-line:no-var-requires
const dinfra = require(test_helpers_1.testingGlobals.dinfraPath);
const expect = chai.expect;
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('lastUpdateInfo', () => {
    beforeEach(async function () {
        this.timeout(10000);
        const versionsToDestroy = [];
        await dinfra
            .queryResources()
            .withNamePrefix((0, dbUpdateInfo_1._getLastUpdateResourceName)())
            .invoke()
            .progress(queryResult => {
            versionsToDestroy.push(queryResult.version);
        });
        await (0, p_iteration_1.forEach)(versionsToDestroy, version => dinfra.destroyResource((0, dbUpdateInfo_1._getLastUpdateResourceName)(), version));
    });
    it('should not already have a resource', async () => {
        const resource = await getResource();
        expect(resource).to.equal(null);
    });
    it('should return timestamp of 0 and tablePrefix of null if there is no resource', async () => {
        const lastUpdate = await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(dinfra);
        expect(lastUpdate.timestamp).to.equal(0);
        expect(lastUpdate.liveTablePrefix).to.equal(null);
    });
    it('should create a valid initial resource on a first fetch (REX-2117)', async () => {
        await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(dinfra);
        const meta = await getAndVerifyResource();
        expect(meta.timestamp).to.equal(0);
        expect(meta.liveTablePrefix).to.equal(null);
    });
    it('should create a resource with valid set values (REX-2117)', async () => {
        const start = new Date().getTime();
        const aTablePrefix = 'tirex0';
        await (0, dbUpdateInfo_1.setLastUpdateInfo)(dinfra, aTablePrefix);
        const finished = new Date().getTime();
        const meta = await getAndVerifyResource();
        expect(meta.timestamp).to.be.greaterThan(start);
        expect(meta.timestamp).to.be.lessThan(finished);
        expect(meta.liveTablePrefix).to.equal(aTablePrefix);
    });
    it('should fetch the last update info', async () => {
        const aTablePrefix = 'tirex0';
        await (0, dbUpdateInfo_1.setLastUpdateInfo)(dinfra, aTablePrefix);
        const info = await (0, dbUpdateInfo_1.fetchLastUpdateInfo)(dinfra);
        const meta = await getAndVerifyResource();
        expect(meta.timestamp).to.equal(info.timestamp);
        expect(meta.liveTablePrefix).to.equal(info.liveTablePrefix);
    });
});
async function getAndVerifyResource() {
    const resource = await getResource();
    expect(resource).to.not.equal(null);
    const meta = resource.getMeta(vars_1.Vars.DB_META_KEY);
    expect(meta.timestamp).to.exist;
    expect(meta.liveTablePrefix).not.to.be.undefined;
    const clone = (0, lodash_1.cloneDeep)(meta);
    await resource.close();
    return clone;
}
function getResource() {
    return dinfra.openResource((0, dbUpdateInfo_1._getLastUpdateResourceName)(), {
        create: false
    });
}
