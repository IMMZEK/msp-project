"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs = require("fs");
const rexdb_1 = require("../lib/rexdb");
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
const rex_1 = require("../../lib/rex");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
const { log } = (0, rex_1._getRex)();
const logger = log.debugLogger;
describe('RexDB', () => {
    afterEach(() => {
        try {
            fs.unlinkSync('test.db'); // delete db files
            fs.unlinkSync('test.db.index');
        }
        catch (e) { }
    });
    it('Inserting', done => {
        const doc1 = { _id: 'doc1', prop1: 'A', prop2: 'B' };
        const doc2 = { _id: 'doc2', prop1: 'C', prop2: 'A' };
        const doc3 = { _id: 'doc3', prop1: 'A', prop2: 'Z' };
        const collection = new rexdb_1.RexDB(logger);
        collection.insert([doc1], (err, results) => {
            const msg = 'Returned results: ' + JSON.stringify(results);
            (0, chai_1.assert)(err === null, err);
            chai_1.assert.deepEqual(results[0], doc1, msg);
            (0, chai_1.assert)(results.length === 1, msg);
            collection.insert([doc2, doc3], (err, results) => {
                const msg = 'Returned results: ' + JSON.stringify(results);
                (0, chai_1.assert)(err === null, err);
                chai_1.assert.deepEqual(results[0], doc1, msg);
                chai_1.assert.deepEqual(results[1], doc2, msg);
                chai_1.assert.deepEqual(results[2], doc3, msg);
                (0, chai_1.assert)(results.length === 3, msg);
                done();
            });
        });
    });
    it('Removing all documents', done => {
        const doc1 = { _id: 'doc1', prop1: 'A', prop2: 'B' };
        const doc2 = { _id: 'doc2', prop1: 'C', prop2: 'A' };
        const doc3 = { _id: 'doc3', prop1: 'A', prop2: 'Z' };
        const data = [doc1, doc2, doc3];
        const collection = new rexdb_1.RexDB(logger);
        collection.insertSync(data);
        collection.remove({}, () => {
            collection.find({}, (_err, result) => {
                (0, chai_1.assert)(result.length === 0);
                done();
            });
        });
    });
    it('Save and load database', done => {
        const doc1 = { _id: 'doc1', prop1: 'A', prop2: 'B' };
        const doc2 = { _id: 'doc2', prop1: 'C', prop2: 'A' };
        const doc3 = { _id: 'doc3', prop1: 'A', prop2: 'Z' };
        const data = [doc1, doc2, doc3];
        const collection = new rexdb_1.RexDB(logger, 'test.db');
        collection.insert(data, err => {
            (0, chai_1.assert)(err == null);
            collection.save(err => {
                (0, chai_1.assert)(err == null);
                const collectionLoaded = new rexdb_1.RexDB(logger, 'test.db');
                collectionLoaded.find({}, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err == null);
                    chai_1.assert.deepEqual(data, results, msg);
                    (0, chai_1.assert)(results.length === 3);
                    done();
                });
            });
        });
    });
    describe('Queries', () => {
        describe('Find single property', () => {
            it('find all documents that have a property with the specified text', done => {
                const doc1 = { _id: 'doc1', prop1: 'A', prop2: 'B' };
                const doc2 = { _id: 'doc2', prop1: 'C', prop2: 'A' };
                const doc3 = { _id: 'doc3', prop1: 'A', prop2: 'Z' };
                const data = [doc1, doc2, doc3];
                const collection = new rexdb_1.RexDB(logger);
                collection.insertSync(data);
                collection.find({ prop1: 'A' }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    (0, chai_1.assert)(results.length === 2, msg);
                    done();
                });
            });
            it('find first document that has a property with the specified text', done => {
                const doc1 = { _id: 'doc1', prop1: 'A', prop2: 'B' };
                const doc2 = { _id: 'doc2', prop1: 'A', prop2: 'Z' };
                const doc3 = { _id: 'doc3', prop1: 'D', prop2: 'E' };
                const doc4 = { _id: 'doc4', prop1: 'F', prop2: 'Z' };
                const data = [doc1, doc2, doc3, doc4];
                const collection = new rexdb_1.RexDB(logger);
                collection.insertSync(data);
                collection.findOne({ prop2: 'Z' }, (err, result) => {
                    const msg = 'Returned results: ' + JSON.stringify(result);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(result, doc2, msg);
                    done();
                });
            });
            it('find number', done => {
                const doc1 = { _id: 'doc1', prop1: 1, prop2: 'B' };
                const doc2 = { _id: 'doc2', prop1: 2, prop2: 'A' };
                const doc3 = { _id: 'doc3', prop1: 1, prop2: 'Z' };
                const data = [doc1, doc2, doc3];
                const collection = new rexdb_1.RexDB(logger);
                collection.insertSync(data);
                collection.find({ prop1: 1 }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    (0, chai_1.assert)(results.length === 2, msg);
                    done();
                });
            });
            it('find boolean', done => {
                const doc1 = { _id: 'doc1', prop1: false, prop2: 'B' };
                const doc2 = { _id: 'doc2', prop1: true, prop2: 'A' };
                const doc3 = { _id: 'doc3', prop1: false, prop2: 'Z' };
                const data = [doc1, doc2, doc3];
                const collection = new rexdb_1.RexDB(logger);
                collection.insertSync(data);
                collection.find({ prop1: false }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    (0, chai_1.assert)(results.length === 2, msg);
                    done();
                });
            });
            it("find documents that have a property that is either null or doesn't exist", done => {
                const doc1 = { _id: 'doc1', prop1: null, prop2: 'B' };
                const doc2 = { _id: 'doc2', prop1: 'C', prop2: 'A' };
                const doc3 = { _id: 'doc3', prop2: 'Z' };
                const data = [doc1, doc2, doc3];
                const collection = new rexdb_1.RexDB(logger);
                collection.insertSync(data);
                collection.find({ prop1: null }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    (0, chai_1.assert)(results.length === 2, msg);
                    done();
                });
            });
            it("$in: find documents that have a property that has a specifed value, is null or doesn't exist", done => {
                const doc1 = { _id: 'doc1', prop1: null, prop2: 'B' };
                const doc2 = { _id: 'doc2', prop1: 'C', prop2: 'A' };
                const doc3 = { _id: 'doc3', prop1: 'C' };
                const doc4 = { _id: 'doc4', prop2: 'Z' };
                const doc5 = { _id: 'doc5', prop2: 'A' };
                const data = [doc1, doc2, doc3, doc4, doc5];
                const collection = new rexdb_1.RexDB(logger);
                collection.insertSync(data);
                collection.find({ prop1: { $in: ['C', null] }, prop2: { $in: ['A', null] } }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc2, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    chai_1.assert.deepEqual(results[2], doc5, msg);
                    (0, chai_1.assert)(results.length === 3, msg);
                    done();
                });
            });
        });
        describe('Find multiple properties', () => {
            const doc1 = { _id: 'doc1', prop1: 'A', prop2: 'B', prop3: 'X' };
            const doc2 = { _id: 'doc2', prop1: 'A', prop2: 'B' };
            const doc3 = { _id: 'doc3', prop1: 'D', prop2: 'B', prop3: 'X' };
            const doc4 = { _id: 'doc4', prop1: 'F', prop2: 'Z' };
            const data = [doc1, doc2, doc3, doc4];
            const collection = new rexdb_1.RexDB(logger);
            collection.insertSync(data);
            it('simple syntax: find all documents that have all properties with the specified text', done => {
                collection.find({ prop2: 'B', prop3: 'X' }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    (0, chai_1.assert)(results.length === 2, msg);
                    done();
                });
            });
            it('simple syntax: undefined means DON`T CARE', done => {
                const val = undefined;
                collection.find({ prop2: 'B', prop3: val }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc2, msg);
                    chai_1.assert.deepEqual(results[2], doc3, msg);
                    (0, chai_1.assert)(results.length === 3, msg);
                    done();
                });
            });
            it('$and syntax: find all documents that have all properties with the specified text', done => {
                collection.find({ $and: [{ prop2: 'B' }, { prop3: 'X' }] }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    (0, chai_1.assert)(results.length === 2, msg);
                    done();
                });
            });
        });
        describe('Array properties', () => {
            const doc1 = { _id: 'doc1', prop1: 'A', prop2: [['B', 'X'], ['M', 'X', 'N']] };
            const doc2 = { _id: 'doc2', prop1: 'A', prop2: [['Y']] };
            const doc3 = { _id: 'doc3', prop1: 'D' };
            const doc4 = { _id: 'doc4', prop1: 'A', prop2: [['X']] };
            const doc5 = { _id: 'doc5', prop1: 'F', prop2: ['Z', 'G', 'E', 'F'] };
            const doc6 = { _id: 'doc6', prop1: 'F', prop2: [['Z', 'G'], ['X', 'F']] };
            const data = [doc1, doc2, doc3, doc4, doc5, doc6];
            const collection = new rexdb_1.RexDB(logger);
            collection.insertSync(data);
            it('find all documents that have an array element with the specified string', done => {
                collection.find({ prop2: 'X' }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc4, msg);
                    chai_1.assert.deepEqual(results[2], doc6, msg);
                    (0, chai_1.assert)(results.length === 3, msg);
                    done();
                });
            });
            it('find all documents that have an array containing ALL specified strings', done => {
                collection.find({ $and: [{ prop2: 'X' }, { prop2: 'Z' }] }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc6, msg);
                    (0, chai_1.assert)(results.length === 1, msg);
                    done();
                });
            });
        });
        describe('Find with RegExp', () => {
            const doc1 = { _id: 'doc1', prop1: 'A', prop2: [['B', 'X'], ['M', 'X', 'N']] };
            const doc2 = { _id: 'doc2', prop1: 'A', prop2: [['Y']] };
            const data = [doc1, doc2];
            const collection = new rexdb_1.RexDB(logger);
            collection.insertSync(data);
            it('find all documents that match a RegExp', done => {
                collection.find({ prop2: /X/ }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    (0, chai_1.assert)(results.length === 1, msg);
                    done();
                });
            });
        });
        describe('Text search', () => {
            const doc1 = { _id: 'doc1', prop1: 'A', prop2: 'Boosters are great', prop3: '42' };
            const doc2 = { _id: 'doc2', prop1: 'A', prop2: ['X', 'No packs here'] };
            const doc3 = { _id: 'doc3', prop1: 'D', prop2: 'B', prop3: 42 };
            const doc4 = { _id: 'doc4', prop2: 'Here is something else', prop1: 'A' };
            const data = [doc1, doc2, doc3, doc4];
            const collection = new rexdb_1.RexDB(logger);
            collection.insertSync(data);
            it('should find all docs with prop1 = A and the text booster, pack or here in any other field', done => {
                collection.find({ prop1: 'A', $text: { $search: 'booster pack, HERE' } }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc2, msg);
                    chai_1.assert.deepEqual(results[2], doc4, msg);
                    (0, chai_1.assert)(results.length === 3, msg);
                    done();
                });
            });
            it('should find all docs with text 42', done => {
                collection.find({ $text: { $search: '42' } }, (err, results) => {
                    const msg = 'Returned results: ' + JSON.stringify(results);
                    (0, chai_1.assert)(err === null, err);
                    chai_1.assert.deepEqual(results[0], doc1, msg);
                    chai_1.assert.deepEqual(results[1], doc3, msg);
                    (0, chai_1.assert)(results.length === 2, msg);
                    done();
                });
            });
        });
        it('find all documents', done => {
            const doc1 = { _id: 'doc1', prop1: false, prop2: 'B' };
            const doc2 = { _id: 'doc2', prop1: true, prop2: 'A' };
            const doc3 = { _id: 'doc3', prop1: false, prop2: 'Z' };
            const data = [doc1, doc2, doc3];
            const collection = new rexdb_1.RexDB(logger);
            collection.insertSync(data);
            collection.find({}, (err, results) => {
                const msg = 'Returned results: ' + JSON.stringify(results);
                (0, chai_1.assert)(err === null, err);
                chai_1.assert.deepEqual(results, data, msg);
                (0, chai_1.assert)(results.length === 3, msg);
                done();
            });
        });
    });
});
