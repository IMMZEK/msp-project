'use strict';
const expect = require('chai').expect;
const path = require('path');
const fs = require('fs-extra');
const async = require('async');
const { PathHelpers: pathHelpers } = require('./path-helpers');
const scriptsUtil = require('../scripts-lib/util');
const { testingGlobals } = require('../scripts-lib/test/test-helpers');
if (testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    return;
}
describe('PathHelpers', function () {
    describe('Normalizing a path', function () {
        it('Should add trailing separator', () => {
            const p1 = pathHelpers.normalize('foo/bar');
            expect(p1).to.deep.equal(path.join('foo', 'bar') + path.sep);
        });
        it("Should already normalized (shouldn't change)", () => {
            const p2 = pathHelpers.normalize('foo/bar/');
            expect(p2).to.deep.equal(path.join('foo', 'bar') + path.sep);
        });
        it('Should mix of win / linux separators', () => {
            const p3 = pathHelpers.normalize('foo\\bar/');
            expect(p3).to.deep.equal(path.join('foo', 'bar') + path.sep);
        });
        it('Should repeated separators', () => {
            const p4 = pathHelpers.normalize('foo//bar/');
            expect(p4).to.deep.equal(path.join('foo', 'bar') + path.sep);
        });
        it('Should everything together', () => {
            const p5 = pathHelpers.normalize('foo//bar/baz\\foo');
            expect(p5).to.deep.equal(path.join('foo', 'bar', 'baz', 'foo') + path.sep);
        });
    });
    describe('Getting a relative path', function () {
        it('Should get a relative path', () => {
            const r1 = pathHelpers.getRelativePath('/foo/bar', '/foo');
            expect(r1).to.deep.equal('bar');
        });
        it('Should handle a mix of path styles', () => {
            const r2 = pathHelpers.getRelativePath('/foo\\bar/baz', '/foo/bar');
            expect(r2).to.deep.equal('baz');
        });
        it("Should handle a relative path which isn't just a folder (its a path)", () => {
            const r4 = pathHelpers.getRelativePath('foo/bar/baz', 'foo');
            expect(r4).to.deep.equal(path.join('bar', 'baz'));
        });
    });
    describe('Determining if one folder is a subfolder of another', function () {
        it('Should handle a correct subfolder', () => {
            const s3 = pathHelpers.isSubfolder('foo/ba/bar', 'foo/ba');
            expect(s3).to.equal(true);
        });
        it('Should handle a superfolder (not subfolder)', () => {
            const s1 = pathHelpers.isSubfolder('baz', 'baz/foo');
            expect(s1).to.equal(false);
        });
        it('Should handle a mix of path styles', () => {
            const s2 = pathHelpers.isSubfolder('foo/bar/ba', 'foo\\bar');
            expect(s2).to.equal(true);
        });
    });
    describe('Should find a unique folder path', function (done) {
        const generateDirs = [];
        const d1 = path.join(scriptsUtil.generatedDataFolder, 'bar');
        async.waterfall([
            function (callback) {
                // get a unique folder
                pathHelpers.getUniqueFolderPath(d1, callback);
            },
            function (uniquePath, _, callback) {
                // create the unique folder
                generateDirs.push(uniquePath);
                fs.ensureDir(uniquePath, callback);
            },
            function (_, callback) {
                // get another unique folder with the same prefix path
                pathHelpers.getUniqueFolderPath(d1, callback);
            },
            function (uniquePath, _, callback) {
                // make sure it's unique (not already created)
                fs.stat(uniquePath, (err) => {
                    const exists = !err;
                    expect(exists).to.equal(false);
                    callback();
                });
            },
            function (callback) {
                async.map(generateDirs, fs.remove, callback);
            }
        ], done);
    });
});
