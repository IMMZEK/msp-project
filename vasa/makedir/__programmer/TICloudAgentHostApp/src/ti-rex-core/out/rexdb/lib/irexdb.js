"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRexDB = void 0;
// tslint:disable:member-ordering
/**
 * rexdb - small in-memory database with file system persistence and optional query cache
 * Always returns a deep copy of documents
 *
 * APIs are similar to MongoDB
 *
 * osohm, 7/21/2014
 */
const promisifyAny_1 = require("../../utils/promisifyAny");
/**
 * Constructor
 * @param {String} file name - if null then this is new a in-memory database
 * @constructor
 */
class IRexDB {
    saveAsync = (0, promisifyAny_1.promisifyAny)(this.save);
    insertAsync = (0, promisifyAny_1.promisifyAny)(this.insert);
    updateAsync = (0, promisifyAny_1.promisifyAny)(this.update);
    upsertAsync = (0, promisifyAny_1.promisifyAny)(this.upsert);
    removeAsync = (0, promisifyAny_1.promisifyAny)(this.remove);
    _findAsync = (0, promisifyAny_1.promisifyAny)(this.find);
    // wrapper to always return an array - TODO: fix in find() itself once converted to async
    async findAsync(query) {
        const result = await this._findAsync(query);
        return result ? result : [];
    }
    findNoDeepCopyAsync = (0, promisifyAny_1.promisifyAny)(this.findNoDeepCopy);
    findOneAsync = (0, promisifyAny_1.promisifyAny)(this.findOne);
}
exports.IRexDB = IRexDB;
