"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbSessionFactory = void 0;
// our modules
const sqldbSession_1 = require("./sqldbSession");
/**
 * Class to create SqldbSession's.  It caches and saves a valid instance of that class that can be reused until
 * the next database update.
 */
class DbSessionFactory {
    impl;
    /**
     * Constructor.  Promisifies the internal APIs and begins updating the schema
     *
     * @param dbConfig
     * @param callback
     */
    constructor(dinfraPath, tablePrefix) {
        this.impl = new sqldbSession_1.SqldbSessionFactory(dinfraPath, tablePrefix);
    }
    /**
     * Asynchronous function to fetch a valid SqldbSession interface.  If one hasn't been created,
     * it waits on the original updateSchema call to finish, and then asynchronously creates a
     * new instance.  All of that is associated with a promise, and that same promise is returned
     * each time so the operations only happen once.
     *
     * @returns Promise<SqldbSession | undefined>: Promise<undefined> if the DB is empty
     */
    async getCurrentSessionPromise() {
        return this.impl.getCurrentSessionPromise();
    }
    /**
     * Invalidates the current session.  Any copies of the current session will continue to work
     * with the old cached state, but any new requests will end up fetching a brand new session
     */
    invalidate() {
        this.impl.invalidate();
    }
}
exports.DbSessionFactory = DbSessionFactory;
