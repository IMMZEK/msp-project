// Copyright (C) 2015-2017 Texas Instruments Incorporated - http://www.ti.com/
const util = require('util');
const crypto = require('crypto');
const events = require('events');
const node_path = require('path');
const node_stream = require('stream');
const child_process = require('child_process');
const fs = require('fs');
const Q = require('q');

var includeDateInTrace = true; // include dates in trace

var TRACE = null; // set dconfig.denum.trace = true or fn to configure

function Enumeration() {
    exports.constantHidden(this, "list", []);
    exports.constantHidden(this, "details", []);
}

Enumeration.prototype.withDeclare = function (index, name, comment, aliases) {
    if (typeof(index) != "number") {
        aliases = comment;
        comment = name;
        name = index;
        index = this.list.length;
    }

    index = 1 * index;
    name = "" + name;

    if (aliases == null) {
        aliases = [];
    }

    this.list[index] = name;
    this.details[index] = {
            index: index,
            name: name,
            aliases: aliases,
            comment: comment,
        };
    this[name] = index;

    return (this);
}

Enumeration.prototype.ensureValid = function (anIndex) {
    var index = 1 * anIndex;
    var result;

    if ((index < 0) || (index >= this.list.length) ||
            ((result = this.list[index]) == null)) { // either undefined or null
        throw new Error("invalid index: " + anIndex);
    }

    return (index);
}

Enumeration.prototype.nameOf = function (index) {
    var name;

    if (index == null) { // either null or undefined
        name = index; // set it the same, null or undefined
    }
    else {
        // do any type casting and check validity,
        // return as number and index into list for name.
        name = this.list[this.ensureValid(index)];
    }

    return (name);
}

Enumeration.prototype.toString = function () {
    var s = "";
    var sep = "";

    this.list.forEach(function (a) {
            if (a != null) {
                s += sep + a;
                sep = ", ";
            }
        });

    return (s);
}

exports.Enumeration = Enumeration;

/**
 * Because Error is inherited weirdly and this needs
 * to be done consistently.
 */
util.inherits(ExtendError, Error);

function ExtendError(message) {
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.message = message;
}

exports.ExtendError = ExtendError;

/**
 * When the state of some process doesn't permit a particular
 * at this time.
 */
util.inherits(StateError, ExtendError);

function StateError(message) {
    ExtendError.call(this, message);
}

exports.StateError = StateError;

/**
 * When a pathway, option or configuration is not supported.
 */
util.inherits(UnsupportedError, ExtendError);

function UnsupportedError(message) {
    if (message == null) {
        message = "unsupported operation";
    }

    ExtendError.call(this, message);
}

exports.assertInstanceOf = function (obj, expectedInstance, message) {
    if (!(obj instanceof expectedInstance)) {
        throw new TypeError(
            (message ? message + ": " : "") +
            "expected " + expectedInstance.name + " not " +
            (obj.constructor ? obj.constructor.name : typeof(obj)));
    }
}

exports.assertType = function (value, expectedType, message) {
    if (typeof(value) !== expectedType) {
        throw new TypeError(
            (message ? message + ": " : "") +
            "expected " + expectedType + " not " +
            (value.constructor ? value.constructor.name : typeof(value)));
    }
}

exports.assertEquals = function (actual, expected, message) {
    if (actual !== expected) {
        throw new Error(
            (message ? message + ": " : "") +
            "expected '" + expected + "' not '" + actual + "'");
    }
}

exports.UnsupportedError = UnsupportedError;
exports.configOverlay = function (defaults, opts) {
        var results = {};

        for (var v in defaults) {
            results[v] = defaults[v];
        }

        for (var v in opts) {
            results[v] = opts[v];
        }

        return (results);
    };


exports.cardinals = function () {
        var en = new Enumeration();

        for (var i = 0; i < arguments.length; i++) {
            en.withDeclare(i, arguments[i]);
        }

        return (en);
    };

/**
 * Escapes the string for "RegExp" processing,
 */
exports.escapeRegExp = function (s) {
        s = s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

        return (s);
    };

/**
 * Declare a property as constant (uneditable).
 */
exports.constantProperty = function (owner, fieldName, fieldValue) {
        if (arguments.length == 2) {
            fieldValue = owner[fieldName];
        }

        Object.defineProperty(owner, fieldName, {
                configurable: false,
                enumerable: true,
                writable: false,
                value: fieldValue
            });
    };

/**
 * Declare a property as constant and hidden.
 */
exports.constantHidden = function (owner, fieldName, fieldValue) {
        if (arguments.length == 2) {
            fieldValue = owner[fieldName];
        }

        Object.defineProperty(owner, fieldName, {
                configurable: false,
                enumerable: false,
                writable: false,
                value: fieldValue
            });
    };

/**
 * Declare a property with a getter.
 */
exports.getterProperty = function (owner, fieldName, fieldFunction) {
        if (!(fieldFunction instanceof Function)) {
            throw new RangeError("need fieldFunction");
        }

        Object.defineProperty(owner, fieldName, {
                configurable: false,
                enumerable: true,
                get: fieldFunction,
            });
    };

/**
 * Declare a property with a getter/setter pair.
 */
exports.setterProperty = function (owner, fieldName, getFunction,
            setFunction) {
        if (!(getFunction instanceof Function)) {
            throw new RangeError("need getFunction");
        }

        if (!(setFunction instanceof Function)) {
            throw new RangeError("need setFunction");
        }

        Object.defineProperty(owner, fieldName, {
                configurable: false,
                enumerable: true,
                get: getFunction,
                set: setFunction,
            });
    };

/**
 * Return the components of a version string as a series
 * of comparable values.
 */
exports.parseVersion = function (version) {
        var array;

        if (version == null) {
            array = null;
        }
        else if (version == "") {
            array = [];
        }
        else if (typeof(version) != "string") {
            array = parseVersion("" + version);
        }
        else {
            var index;

            array = [];

            while (((index = version.indexOf('.')) >= 0) || (version != "")) {
                var part;

                if (index >= 0) {
                    part = version.substring(0, index);
                    version = version.substring(index + 1);
                }
                else {
                    part = version;
                    version = "";
                }

                if (part == "") {
                    // ignore
                }
                else {
                    if (/^[0-9]+$/.test(part)) {
                        part = 1 * part;
                    }

                    array.push(part);
                }
            }
        }

        return (array);
    };

/**
 * Take an array of strings and/or numbers and
 * combine them to form a version string.
 */
exports.buildVersion = function (array) {
        var result;

        if (array == null) {
            result = null;
        }
        else if (array.length == 0) {
            result = "";
        }
        else {
            var index = 0;

            result = array[index++].toString();

            while (index < array.length) {
                result += "." + array[index++]; 
            }
        }

        return (result);
    };

exports.incrementVersion = function (version) {
        if (version == null) {
            throw new RangeError("invalid version");
        }

        var array = exports.parseVersion(version);
        var index = array.length - 1;

        if (index < 0) {
            throw new RangeError("invalid version");
        }

        if (typeof(array[index]) === "number") {
            array[index]++;
        }
        else {
            array.push(0);
        }

        return (exports.buildVersion(array));
    };

/**
 * Compares two version strings and returns 0 for equal,
 * -1 for left < right, and 1 for left > right.
 */
exports.compareVersions = function (left, right) {
        var leftArray = exports.parseVersion(left);
        var rightArray = exports.parseVersion(right);
        var result;

        if (leftArray == null) {
            leftArray = [];
        }

        if (rightArray == null) {
            rightArray = [];
        }

        var index = 0;
        var result = 0;

        while ((result == 0) && (index < leftArray.length) &&
                (index < rightArray.length)) {
            if (leftArray[index] < rightArray[index]) {
                result = -1;
            }
            else if (leftArray[index] > rightArray[index]) {
                result = 1;
            }
            else {
                index++;
            }
        }

        if (result == 0) {
            if (leftArray.length < rightArray.length) {
                result = -1;
            }
            else if (leftArray.length > rightArray.length) {
                result = 1;
            }
            else {
                // all the same
            }
        }

        return (result);
    };

function pad(c, n, t) {
    t = "" + t; // coerce to string

    while (t.length < n) {
        t = "" + c + t;
    }

    return (t);
}

exports.pad = pad;

/**
 * Convert a JS Date, or milliseconds since 1970 into an RFC822
 * compliant date for use in SMTP and HTTP etc.
 */
exports.rfc822Date = function (date) {
        if (typeof(date) == "number") {
            date = new Date(date);
        }

        // HTTP-Date AKA RFC822 date-time string ...
        // See http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
        // Don't use toISOString() here.
        // Undoubtedly available in a zillion date time libraries.
        var dateText = [ // from RFC822
                'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
            ][date.getUTCDay()] + // zero-based
            ", " +
            date.getUTCDate() + // don't pad this
            " " + [ // from RFC822
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ][date.getUTCMonth()] +  // zero-based
            " " + date.getUTCFullYear() + // four digits
            " " + exports.pad('0', 2, date.getUTCHours()) + // zero based, 24hr 
            ":" + exports.pad('0', 2, date.getUTCMinutes()) +
            ":" + exports.pad('0', 2, date.getUTCSeconds()) +
            " GMT"; // do not use UTC here

        return (dateText);
    };

/**
 * Search using a custom comparator.  Simple newtonian binary search. 
 * Its not sophisticated.  Returns the index of the name in the list,
 * or the negative index where it could be inserted, minus one.
 * If the upper parameter is provided, it sets an upper limit on
 * the sorted space, which is useful when sorting existing lists.
 */
exports.binarySearch = function (list, record, comparator, upper) {
    var lower = 0;
    var found = false;

    if (upper == null) {
        upper = list.length;
    }

    while (lower != upper) {
        var half = ((lower + upper) >> 1);
        var trecord = list[half];
        var status = comparator(record, trecord);

        if (status < 0) {
            upper = half; // narrow search range
        }
        else {
            if (status == 0) {
                found = true;
            }

            lower = half + 1; // narrow search range
        }
    }

    if (found) {
        --lower; // the LAST match in the case of partial ordering
    }
    else {
        lower = -lower - 1;
    }

    return (lower);
}

/**
 * Sort using a customer comparator.  We just do a kind of bubble sort
 * augmented with newtonian binary search.  Its not sophisticated.
 * If add is not null it will be inserted into the list, which is
 * assumed to have already been sorted.  Otherwise, it will sort the
 * list itself.  Returns the position of the last item inserted, or -1
 * if nothing was inserted.  Maintains partial ordering.
 * Unlike stringSort, this actually uses the binarySearch function as
 * part of its implementation.
 */
exports.binarySort = function (list, add, comparator) {
    var index; // the sorted index;
    var position = -1;

    if (add != null) {
        index = list.length;
        list.push(add);
    }
    else if (list.length == 0) { // just for form, not really necessary
        index = 0;
    }
    else {
        index = 1; // the first value is always already sorted against itself
    }

    while (index < list.length) {
        var record = list[index];
        var position = exports.binarySearch(list, record, comparator, index);

        if (position < 0) {
            position = -position - 1;
        }
        else {
            position++;
        }

        if (position == index) {
            // can happen when sorts to end - means we don't move this record
        }
        else {
            // remove and insert ...
            list.splice(position, 0, list.splice(index, 1)[0]);
        }

        index++;
    }

    return (position);
}

/*
    See comments in dinfra.js
*/
exports.stringCompare = function (left, right) {
    var result;

    if (left === right) {
        result = 0;
    }
    else if (left == null) {
        result = 1; // sort nulls after content
    }
    else if (right == null) {
        result = -1; // sort nulls after content
    }
    else if (left > right) {
        result = 1;
    }
    else if (left < right) {
        result = -1;
    }
    else {
        throw new Error("incomparable: " + left + " <> " + right);
    }

    return (result);
}

/**
 * Search using unicode code-point collating order - list of strings.
 * Simple newtonian binary search.  Its not sophisticated.
 * Returns the index of the name in the list, or the negative index
 * where it could be inserted, minus one.  If the optional upper argument
 * is provided, it sets the upper limit of the existing sorted list,
 * which is useful when sorting a list in place.
 */
exports.stringSearch = function (list, name, upper) {
    var lower = 0;
    var found = false;

    if (upper == null) {
        upper = list.length;
    }

    while (lower != upper) {
        var half = ((lower + upper) >> 1);
        var tname = list[half];

        if (name < tname) {
            upper = half; // narrow search range
        }
        else {
            if (name === tname) {
                found = true;
            }

            lower = half + 1;
        }
    }

    if (found) {
        --lower; // the LAST match in the case of partial ordering
    }
    else {
        lower = -lower - 1;
    }


    return (lower);
}

/**
 * Sort using unicode code-point collating order - list of strings.
 * We just do a kind of bubble sort augmented with newtonian
 * binary search.  Its not sophisticated.
 * If add is not null it will be inserted into the list, which is
 * assumed to have already been sorted.  Otherwise, it will sort
 * the list itself.  Returns the position of the last item inserted,
 * or -1 if nothing was inserted.  Maintains partial ordering.
 */
exports.stringSort = function (list, add) {
    var index; // the sorted index;
    var position = -1;

    if (add != null) {
        index = list.length;
        list.push(add);
    }
    else if (list.length == 0) { // just for form, not really necessary
        index = 0;
    }
    else {
        index = 1; // the first value is always already sorted against itself
    }

    while (index < list.length) {
        var name = list[index];
        var lower = 0;
        var upper = index;

        // note, it is MUCH faster to inline this (at node-0.10.26)
        while (lower != upper) {
            var half = ((lower + upper) >> 1);
            var tname = list[half];

            if (name < tname) {
                upper = half; // narrow search range
            }
            else {
                lower = half + 1; // narrow search range
            }
        }

        position = lower;

        if (position == index) {
            // can happen when sorts to end - means we don't move
        }
        else {
            list.splice(position, 0, list.splice(index, 1)[0]);
        }

        index++;
    }

    return (position);
}

function NamedLock(name, callback) {
    this.next = null;
    this.name = name;
    this.prev = this.openLocks[name];

    if (this.prev != null) {
        this.prev.next = this; 
    }

    this.openLocks[name] = this;
    this.callback = callback;
    this.used = false;
    this.id = NamedLock.prototype.idSeq++;

    if (TRACE) {
        TRACE("lock", this.id, "attempt", this.name);
    }
}

/**
 * This contains a map of open lock names to
 * the *last* requested opener.  That means that
 * the current owner of the lock is not necessarily
 * the one in openLocks.
 */
NamedLock.prototype.openLocks = {};

/**
 * An id counter so locks have unique numbers.
 */
NamedLock.prototype.idSeq = 1;

/**
 * This can be called repeatedly - its an internal only function.
 */
NamedLock.prototype.open = function () {
    if (this.prev == null) {
        if (TRACE) {
            TRACE("lock", this.id, "acquired", this.name);
        }

        this.used = true;
        this.callback(this);
    }
}

/**
 * Call this to close an acquired lock.  There is no callback,
 * since there is no waiting.
 */
NamedLock.prototype.close = function () {
    if (TRACE) {
        TRACE("lock", this.id, "released", this.name);
    }

    if (this.next != null) {
        this.next.prev = null;
        this.next.open();
        this.next = null;
    }
    else {
        // this is done to ensure that we don't keep names
        // around in memory.
        delete this.openLocks[this.name];
    }
}

function openNamedLock(name, callback) {
    new NamedLock(name, callback).open();
}

exports.openNamedLock = openNamedLock;

/**
 * A simple doubly-linked list, used primarily for
 * those situations where the list length is in the thousands and
 * the insert/remove operations are frequent, especially
 * when subject to re-ordering.  List items are complex
 * objects (Item - see below).
 */
function List() {
    this.head = new Item();
    this.tail = new Item();

    this.head.succ = this.tail;
    this.tail.pred = this.head;
}

/**
 * Return the first item or null.
 */
List.prototype.first = function () {
    return (this.head.succ !== this.tail ? this.head.succ : null);
}

/**
 * Return the last item or null.
 */
List.prototype.last = function () {
    return (this.head.succ !== this.tail ? this.tail.pred : null);
}

/**
 * Return true if the list is empty (faster than count).
 */
List.prototype.empty = function () {
    return (this.head.succ === this.tail);
}

/**
 * Put a value at the head of this list.
 */
List.prototype.prepend = function (item) {
    item.insert(this.head);
}

/**
 * Put a value at the tail of this list.
 */
List.prototype.append = function (item) {
    item.insert(this.tail.pred);
}

List.prototype.count = function () {
    var step = this.head;
    var count = 0;

    while (step.succ != this.tail) {
        count++;
        step = step.succ;
    }

    return (count);
}

exports.List = List;

/**
 * Item for list implementation above.
 */
function Item() {
    this.succ = null;
    this.pred = null;
}

/**
 * Returns true for an item that is in a list.
 * Note that head/tail always return false for valid,
 * which is a way of detecting them.
 */
Item.prototype.valid = function () {
    return (this.succ && this.pred);
}

/**
 * Remove an item from a list.
 */
Item.prototype.remove = function () {
    if (!this.valid()) {
        throw new StateError("item is not in list");
    }

    this.pred.succ = this.succ;
    this.succ.pred = this.pred;
    this.pred = null;
    this.succ = null;
}

/**
 * Insert an item into a list after a given item.
 */
Item.prototype.insert = function (pred) {
    if (this.valid()) {
        throw new StateError("item is already in list");
    }

    this.succ = pred.succ;
    this.pred = pred;
    pred.succ = this;
    this.succ.pred = this;
}

exports.Item = Item;

/**
 * A generic cache class that implements a simple
 * cache management scheme based on provided options:
 * {
 *     ttlEntries: 60000, // maximum age of any entry record in milliseconds
 *     ttlNegatives: 6000, // maximum age of a negative record in ms
 *     maxNegatives: 16384, // maximum number of negative records
 *     maxEntries: 65536, // maximum number of valid entries
 * }
 * Note that this is used for mitigating denial-of-service
 * attacks and so forth.  Implementation changes can have
 * security consequences.
 *
 * Cache is a non-callback implementation - all operations are
 * functional rather than asynchronous.  Use BackedCache for asynchronous
 * caching (it extends Cache for many underlying caching features).
 *
 * @class Cache
 * @fires maint - with details of what a maintenance cycle did
 */
util.inherits(Cache, events.EventEmitter);

function Cache(opts) {
    events.EventEmitter.call(this);

    this.ttlEntries = (opts && opts.ttlEntries) || 60000;
    this.maxEntries = (opts && opts.maxEntries) || (1 << 16);
    this.ttlNegatives = (opts && opts.ttlNegatives) || 6000;
    this.maxNegatives = (opts && opts.maxNegatives) || (1 << 14);
    this.recordMap = {};
    this.recordList = new List();
    this.stats = { // structured so that console.log(stats) prints nicely
            negativeRecordCount: 0,
            entryRecordCount: 0,
            referencedRecordCount: 0,
        };
    this.timeout = null;
}

/**
 * Store an entry against a given name.  Note that the name
 * must not be null, but if an entry is null, it creates a negative
 * cache record.  The error will be recorded if provided and
 * can be passed back by extended interfaces in subclasses.
 */
Cache.prototype.store = function (name, entry, error) {
    if (typeof(name) != "string") {
        throw new RangeError("name must be a non-null string");
    }

    if (entry === undefined) {
        throw new RangeError("entry must be either null or an object");
    }

    var record = this.recordMap[name];
    var stats = this.stats;

    if (record == null) { // match null or undefined
        record = new Item();

        record.name = name;
        record.entry = null; // will be set below if required
        record.references = null; // will be set if needed
        record.phantom = true; // initially

        this.recordMap[name] = record; // add to map, not list yet
    }

    if (!record.phantom) {
        if (record.entry === null) {
            --stats.negativeRecordCount;
        }
        else {
            --stats.entryRecordCount;
        }
    }

    if (record.entry !== entry) {
        if (record.entry !== null) {
            this.evict(name, record.entry);
        }

        record.entry = entry;

        if (record.entry !== null) {
            this.inject(name, record.entry);
        }
    }

    record.error = error || null;
    record.phantom = false;

    if (record.entry === null) {
        stats.negativeRecordCount++;
    }
    else {
        stats.entryRecordCount++;
    }

    if (record.valid()) {
        record.remove(); // remove from list, not from map
    }

    var now = Date.now();

    if (record.references == null) {
        this.enqueue(name, record, now);
    }

    return (record);
}

/** 
 * This is called whenever an entry is injected into the cache.
 * Override to do something with the entry.
 * @protected
 */
Cache.prototype.inject = function (name, entry) {
}

/** 
 * This is called whenever an entry is evicted from the cache.
 * Override to do something with the entry.
 */
Cache.prototype.evict = function (name, entry) {
}

/**
 * Internal function to enqueue a record to the evictable list.
 * @private
 */
Cache.prototype.enqueue = function (name, record, now) {
    if (typeof(now) != "number") {
        throw new RangeError();
    }

    if (record.entry === null) {
        record.expires = now + this.ttlNegatives;
    }
    else {
        record.expires = now + this.ttlEntries;
    }

    var step = this.recordList.tail.pred;

    while (step.valid() && (step.expires > record.expires)) {
        step = step.pred;
    }

    record.insert(step);

    this.maint(now);
}

/**
 * Invokes callback(deref) once all other references are gone
 * and the cached data has been purged.  deref may be retained
 * in order to lock the cache record for subsequent refresh
 * operations.
 */
Cache.prototype.purge = function (name, callback) {
    var record = this.recordMap[name];

    if ((record == null) || (record.references == null) ||
            (record.references.length == 0)) {
        if (record != null) {
            record.entry = null;
            record.error = null;
            record.phantom = true;

            if (record.valid()) {
                record.remove();
            }
        }

        return (callback(this.reference(name)));
    }

    if (record.waiters == null) {
        record.waiters = [];
    }

    record.waiters.push(callback);
}

/**
 * Create a reference to the given name which resists the record
 * from being evicted from the cache, until the reference is called
 * with no args to free it.  This is used to prevent maint from evicting
 * an entry.  So long as record.references is non-null, eviction won't occur.
 * spontaneously, although it can occur for other reasons if the implementation
 * allows it.
 */
Cache.prototype.reference = function (name) {
    var record = this.recordMap[name];

    if (record == null) { // match null or undefined
        record = new Item();

        record.name = name;
        record.entry = null; // will be set below if required
        record.references = null;
        record.phantom = true; // this record was not created with store()

        this.recordMap[name] = record; // add to map, not list yet
    }

    if (record.valid()) {
        record.remove(); // dequeue
    }

    if (record.references == null) {
        record.references = []; // create dequeued
        this.stats.referencedRecordCount++;
    }

    var fn = function releaseReference() {
            if (record == null) {
                throw new StateError("released twice");
            }

            if (record.references == null) {
                throw new StateError("has no references");
            }

            var index = record.references.indexOf(fn);

            if (index < 0) {
                throw new StateError("bad reference management");
            }

            record.references.splice(index, 1);

            if (record.references.length == 0) {
                record.references = null;
                --this.stats.referencedRecordCount;

                if ((record.waiters != null) && record.waiters.length) {
                    record.entry = null;
                    record.error = null;
                    record.phantom = true;

                    record.waiters.shift().fn(this.reference(name));
                }
                else {
                    record.waiters = null;

                    this.enqueue(name, record, Date.now());
                }
            }

            // get rid of the evidence for garbage collection
            name = null;
            record = null;
            fn.record = null;
            fn = null;
        }.bind(this);

    fn.record = record;

    record.references.push(fn);

    return (fn);
}

/**
 * Maintain the maps and lists to apply the cache invalidation
 * criteria according to the given date (in ms).
 */
Cache.prototype.maint = function (now) {
    var step = this.recordList.head.succ;
    var changes = null;

    while (step.valid() &&
            ((this.stats.negativeRecordCount > this.maxNegatives) ||
            (this.stats.entryRecordCount > this.maxEntries) ||
            (step.expires <= now))) {
        if (step.references != null) {
            throw new StateError("references must not be in list");
        }

        var record = step;
        var clear = false;

        step = step.succ;

        if (record.expires <= now) {
            clear = true;
        }
        else if (record.entry === null) {
            if (this.stats.negativeRecordCount > this.maxNegatives) {
                clear = true;
            }
        }
        else {
            if (this.stats.entryRecordCount > this.maxEntries) {
                clear = true;
            }
        }

        if (clear) {
            this.clear(record.name);

            if (changes == null) {
                changes = [];
            }

            changes.push(record);
        }
    }

    var timeoutTime;

    if (this.recordList.empty()) {
        timeoutTime = null;
    }
    else {
        timeoutTime = this.recordList.first().expires;

        if (timeoutTime < now) {
            // shouldn't actually happen
            timeoutTime = null;
        }
    }

    if ((this.timeout != null) && (this.timeoutTime == timeoutTime)) {
        // don't change timeout
    }
    else {
        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        if (timeoutTime != null) {
            this.timeoutTime = timeoutTime;
            this.timeout = setTimeout(
                function () {
                    this.timeout = null;
                    this.maint(Date.now());
                }.bind(this),
                timeoutTime - now);
        }
    }

    if (changes != null) {
        this.emit('maint', { cleared: changes });
    }
}

/**
 * Clears all items from the cache that are evictable.
 * Returns a list of cleared item names.
 */
Cache.prototype.clearAll = function () {
    var record;
    var names = [];

    while ((record = this.recordList.head.succ).valid()) {
        names.push(record.name);

        this.clear(record.name);
    }

    return (names);
}

/**
 * Clear any records associated with the given name (includes both
 * negative caching and valid entries, will not fail if the record
 * does not exist.  Will return any entry that was associated with
 * the cleared record.  Clear will fail hard on a referenced record.
 */
Cache.prototype.clear = function (name) {
    var record = this.recordMap[name];
    var entry;

    if (record != null) {
        if (record.references != null) {
            throw new StateError("not while record is referenced");
        }

        delete this.recordMap[name];

        record.remove();

        entry = record.entry;

        if (entry != null) {
            --this.stats.entryRecordCount;

            this.evict(name, entry);
        }
        else {
            --this.stats.negativeRecordCount;
        }
    }
    else {
        entry = null;
    }

    return (entry);
}

/**
 * Returns an entry if it is has been cached under the given name.
 */
Cache.prototype.resolve = function (name) {
    var record = this.recordMap[name];
    var entry;

    if (record == null) { // match null or undefined
        entry = null;
    }
    else {
        entry = record.entry; // can be null
    }

    return (entry);
}

/**
 * Returns true if there is a negative cache record for the name
 * argument.
 */
Cache.prototype.negative = function (name) {
    var record = this.recordMap[name];

    return ((record != null) && (record.entry === null));
}

/**
 * Returns true if a record is referenced.  Referenced records
 * cannot be cleared and their entries are resistant to spontaneous eviction.
 */
Cache.prototype.referenced = function (name) {
    var record = this.recordMap[name];

    return ((record != null) && (record.references != null));
}

exports.Cache = Cache;

util.inherits(BackedCache, Cache);

function BackedCache(opts) {
    Cache.apply(this, arguments);

    /**
     * This is the maximum number of concurrent calls that the
     * cache will allow to the backed storage.  This should
     * be tuned to keep memory pressure reasonable, since
     * pending records can cause pressure on memory during
     * the period that their state is being loaded, not just
     * after they have been comitted to the cache.
     */
    this.maxCalls = (opts && opts.maxCalls) || (1 << 3);
    this.callQueue = []; // for calls that are waiting to be invoked
    this.stats.pendingCalls = 0; // incrementing for each concurrent call
    this.stats.pendingPeak = 0; // greatest single record pending length
    this.stats.fetchCount = 0; // number of times fetch called
    this.stats.buildCount = 0; // number of times build called
    this.stats.insertCount = 0; // number of times insert called
    this.stats.modifyCount = 0; // number of times modify called
    this.stats.deleteCount = 0; // number of times delete called
    this.stats.storeBackedCount = 0; // number of times storeBacked() called
}

/**
 * Returns true if there is a pending operation on the given name
 * In a situation like this, store should not be used except by the
 * code closing the pending operation.  Otherwise it can lead to
 * inconsistent state.
 */
BackedCache.prototype.pending = function (name) {
    var record = this.recordMap[name];

    return ((record != null) && (record.pending != null));
}

/**
 * Make the name used for storing a cache entry.
 * This should be overridden by each implementation,
 * if any of the template APIs are used (those with callbacks).
 * @protected
 */
BackedCache.prototype.nameTemplate = function (template) {
    throw new UnsupportedError("Cache.nameTemplate() not implemented");
}

/**
 * The storeBacked method is called by the cache internals to fetch or
 * maintain an item in the upstream source.   The "op" field is the
 * name of the calling function, either: fetch, refetch, insert, build, 
 * modify or delete.
 * @protected
 */
BackedCache.prototype.storeBacked = function (name, template, op, 
        formerEntry, formerError, callback) {
    throw new UnsupportedError("Cache.storeBacked() not implemented");
}

/**
 * Submit any function(callback) to the call list for
 * sequential invocation.  Invoke the callback when the operation
 * is done.  Until the callback is invoked, the call is considered
 * to be running.  Up to this.maxCalls can be running concurrently.
 * The callback expects no erorr or other arguments.
 */
BackedCache.prototype.submit = function (fn) {
    if (fn != null) {
        this.callQueue.push(fn);
    }

    while (this.callQueue.length &&
            (this.stats.pendingCalls < this.maxCalls)) {
        this.stats.pendingCalls++;

        this.callQueue.shift()(function () {
                --this.stats.pendingCalls;
                this.submit();
            }.bind(this));
    }
}

/**
 * Wraps up most of the common handling between the different methods.
 * @private
 */
BackedCache.prototype.plex = function (name, template, op, callback) {
    if (!(callback instanceof Function)) {
        throw new RangeError("callback must be supplied");
    }

    if (name == null) {
        return (callback(null, null));
    }

    var record = this.recordMap[name];
    var formerEntry;
    var formerError;

    if ((record != null) && (!record.phantom || (record.pending != null))) {
        if (record.pending != null) {
            // wait until current operation is over, before rebuilding
            return (record.pending.push(this.plex.bind(this,
                name, template, op, callback)));
        }

        if (record.error) {
            return (callback(record.error, record.entry));
        }

        if (op === "fetch") {
            return (callback(record.error, record.entry));
        }
        else if (op === "refetch") {
            // go through with call all the time
            op = "fetch";
        }
        else if (op === "insert") {
            if (record.entry != null) {
                return (callback(new Error("entry already exists")));
            }

            // go through with call if negatively cached
        }
        else if (op === "build") {
            // go through with call all the time
        }
        else if (op === "modify") {
            // go through with call all the time
        }
        else if (op === "delete") {
            if (record.entry == null) {
                return (callback(null, null));
            }

            // go through with call if entry cached
        }
        else {
            return (callback(null, new RangeError("unknown op: " + op)));
        }
    }

    // make this change in other case as well
    if (op === "refetch") {
        op = "fetch";
    }

    var dereference = this.reference(name);

    record = dereference.record;

    var pending = [function () {
            return (callback(record.error, record.entry));
        }];

    record.pending = pending;

    return (this.submit(function (callback) {
            this.stats.storeBackedCount++;
            this.storeBacked(name, template, op, record.entry, record.error,
                function (error, item) {
                    if (record.pending !== pending) {
                        throw new StateError("record pending is inconsistent");
                    }

                    if (item === undefined) {
                        item = null;
                    }

                    // store the results of the call and clear pending
                    this.store(name, item, error).pending = null;

                    dereference();

                    if (pending.length > this.stats.pendingPeak) {
                        this.stats.pendingPeak = pending.length;
                    }

                    pending.forEach(function (fn) {
                            // return results back to original callers
                            fn();
                        });

                    // return back to the submitter queue
                    return (callback());
                }.bind(this));
        }.bind(this)));
}

/**
 * Fetch an item from the cache or its backing store by template and
 * return it with callback(error, item).
 */
BackedCache.prototype.fetch = function (template, callback) {
    this.stats.fetchCount++;

    return (this.plex(this.nameTemplate(template), template,
        "fetch", callback));
}

/**
 * Refetch an item from the backing store.
 */
BackedCache.prototype.refetch = function (template, callback) {
    this.stats.fetchCount++;

    return (this.plex(this.nameTemplate(template), template,
        "refetch", callback));
}

/**
 * Build will return the results of an existing error or valid entry record
 * if one exists.  If the record is empty (no error, no entry), it will
 * call storeBacked() to create the record.  All callback access to the record
 * will be blocked pending the result.
 */
BackedCache.prototype.build = function (template, callback) {
    this.stats.buildCount++;

    return (this.plex(this.nameTemplate(template), template,
        "build", callback));
}

/**
 * Insert will insert an item into the backing store if it does not already
 * exist.  If it does exist it will callback with an error. 
 */
BackedCache.prototype.insert = function (template, callback) {
    this.stats.insertCount++;

    return (this.plex(this.nameTemplate(template), template,
        "insert", callback));
}

/** 
 * Similar to build(), except that this will call storeBacked(),
 * even if there is an existing entry.  The intention is that this
 * will modify the entry so that it matches the changes in the
 * template.
 */
BackedCache.prototype.modify = function (template, callback) {
    this.stats.modifyCount++;

    return (this.plex(this.nameTemplate(template), template,
        "modify", callback));
}

/** 
 * Will call storeBacked() to delete an entry, so long as the
 * the entry is not already negatively cached.
 */
BackedCache.prototype.delete = function (template, callback) {
    this.stats.deleteCount++;

    return (this.plex(this.nameTemplate(template), template,
        "delete", callback));
}

exports.BackedCache = BackedCache;

/**
 * As of node 0.10.26, buffer comparisons don't really
 * work, especially when trying to compare a SlowBuffer with a
 * regular Buffer.  So we roll our own ...
 */
function equalBuffers(left, right) {
    var length = left.length;
    var result;

    if (length != right.length) {
        result = false;
    }
    else {
        var index = 0;

        while ((index < length) &&
                (left[index] === right[index])) {
            index++;
        }

        result = (index === length);
    }

    return (result);
}

exports.equalBuffers = equalBuffers;

/**
 * Returns a string value that can be compared with another
 * string value for sorted order and equivalency.  The
 * method handles strings, numbers, booleans and Dates
 * in formal ways, and for anything else just concatenates
 * it to an empty string (invoking toString() and coercing
 * the result to a "string").
 *
 * Numbers are represented in an encoding of the binary form.
 *
 * Dates are just converted to their ISO-8601 form with milliseconds
 * in the UTC timezone (ie. toISOString()).
 *
 * Booleans are represented as the word true or false respectively.
 */
function compareTextForValue(value) {
    var vtype = typeof(value);
    var result;

    if (vtype === "string") {
        // no change
        result = value;
    }
    else if (vtype === "number") {
        result = renderNumberEncoding(value);
    }
    else if (vtype === "boolean") {
        result = "" + value;
    }
    else if (value instanceof Date) {
        result = value.toISOString();
    }
    else {
        result = "" + value;
    }

    return (result);
}

exports.compareTextForValue = compareTextForValue;

/**
 * Renders the JS number value as a hex-encoded IEEE-754 binary64,
 * with some adjustments to make the hex-encoding compare as
 * a plain string.  The IEEE form has:
 *
 * 1 bit sign indicator for the mantissa (1 for negative)
 * 11 bits of exponent including sign, zero adjusted for unsigned compare
 * 52 bits of mantissa
 *
 * Our form adjusts the sign indicator and exponent so that it will
 * compare as an unsigned number overall (IEEE compares as a signed
 * integer).
 */
function renderNumberEncoding(value) {
    var buf = new Buffer(8);

    if (Number.isNaN(value)) {
        value = NaN; // positive NaN specifically
    }

    buf.writeDoubleBE(value, 0);

    if (value == 0) {
        if (buf[0] == 0x80) { // negative signed zero can happen
            buf[0] = 0; // correct it now, since we only want one zero
        }
    }

    if (buf[0] & 0x80) {
        buf[0] = (buf[0] ^ 0xff); // invert
        buf[1] = (buf[1] ^ 0xe0); // invert
    }
    else {
        buf[0] = (buf[0] | 0x80); // toggle in the top bit
    }

    return ("F0x" + buf.toString("hex"));
}

exports.renderNumberEncoding  = renderNumberEncoding;

function parseNumberEncoding(s) {
    if (s.indexOf("F0x") != 0) {
        // short cut old-school number.
        return (new Number(s).valueOf());
    }

    var buf = new Buffer(s.substr(3), "hex");

    if (buf[0] & 0x80) {
        buf[0] = (buf[0] & 0x7f); // toggle in the top bit
    }
    else {
        buf[0] = (buf[0] ^ 0xff); // invert
        buf[1] = (buf[1] ^ 0xe0); // invert
    }

    // we don't encode negative zero, so we shouldn't get it out either

    return (buf.readDoubleBE(0));
}

exports.parseNumberEncoding = parseNumberEncoding;

/**
 * Create a date that is far in the future, yet will fit within the
 * node, mysql and related conventions for a Unix ms since 1970 date.
 * This is used primarily to make arithmetic work simply internally.
 * This works out to about the Gregorian year 4200.  Note, you
 * cannot setTimeout() very far in advance, so don't rely on
 * arithmetic against this value to yield a valid JS timeout.
 */
exports.FAR_FUTURE_MS = Math.pow(2,46);
/**
 * Maximum useful millisecond timeout in Node.js: this is a 32 bit
 * integer internally, and in terms of duration represents something
 * less than a month.
 */
exports.MAX_TIMEOUT_MS = 0x7fffffff;

/**
 * Used to configure generic trace functions.  Typical usage is
 * TRACE = denum.configureTrace(TRACE, "<module>", config.trace);
 * If TRACE is already non-null, this is a no-op.  Otherwise,
 * if config.trace is a function, then TRACE will be set to that
 * function.  Otherwise, if config.trace evaluates to true,
 * then TRACE will be set to log.bind(null, module).  If log is null, then
 * TRACE will be set to console.log.bind(console, module).
 * Note, trace is not intended for the logger - this is primarily
 * for console-based debugging from development environments.
 */
exports.configureTrace = function (trace, name, param, log) {
        if (trace != null) {
            trace("trace reconfiguration ignored");
        }
        else if (param == null) {
            // ignore
        }
        else if (param instanceof Function) {
            trace = param;
        }
        else if (!param) {
            // ignore
        }
        else if (log instanceof Function) {
            trace = log.bind(null, name);
        }
        else if (!name) {
            trace = console.log;
        }
        else {
            trace = console.log.bind(console, name);
        }

        return (trace);
    };

/**
 * Higher-level trace function, that prints in a more structured format with
 * date logging support. The format:
 * 
 *     "[<date>] <service> [[<target>]] <trace-args>..."
 * 
 * @param {Function} trace - trace function to which to trace, typically
 *     returned by configureTrace()
 * @param {string} service - the service
 * @param {*} target - the target
 * @param {Array} traceArgs - additional args to trace
 */
exports.trace = function (trace, service, target, traceArgs) {
    var segments = [];

    if (includeDateInTrace) {
        segments.push(new Date().toISOString());
    }

    segments.push(service);

    if (target !== undefined) {
        segments.push("[" + target + "]");
    }

    Array.prototype.push.apply(segments, traceArgs);

    trace(segments.join(" "));
}

exports.configure = function (dconfig) {
        var config = dconfig.denum;

        if (config == null) {
            return;
        }

        includeDateInTrace = (config.includeDateInTrace != null) ? config.includeDateInTrace
            : includeDateInTrace;

        TRACE = exports.configureTrace(TRACE, "denum", config.trace);
    };

/**
 * NodeJS does not make a proper distinction between a PRNG
 * and a strong RNG.  The documentation as of node 7 implies
 * that the source is strong RNG, perhaps with a pseudo component,
 * sufficiently mixed with true RNG entropy.  Ie. /dev/random. 
 * So if you really want blocking true entropy, this is the
 * function to use.  It just wraps to crypto.randomBytes for now.
 */
exports.strongRandomBytes = function (size, callback) {
    return (crypto.randomBytes(size, callback));
}

/**
 * This actually just calls strongRandomBytes() for now, since
 * NodeJS at at 0.10 doesn't seem to provide a suite of specific PRNGs for
 * use (except perhaps as ciphers?).  Anyway, use this in your code
 * when an OS-mediated, non-blocking RNG source is acceptable. 
 * Ie. /dev/urandom.  If you wonder which one you should use,
 * use this function: it should be strong enough for most purposes.
 * In the future, this will be reimplemented so that it cannot exhaust
 * system entropy and will not block.
 */
exports.secureRandomBytes = function (size, callback) {
    return (exports.strongRandomBytes(size, callback));
}

/**
 * Return a random cardinal number between 0 and size - 1.
 * Note it is invalid for size to be non-ordinal.
 */
exports.secureRandomCardinal = function (size) {
    if (size < 1) {
        throw new RangeError("Size must be one or more: " + size);
    }

    if (size % 1 != 0) {
        throw new RangeError("Size must be a whole number: " + size);
    }

    if (size > 0x80000000) {
        throw new RangeError("Size is to large:" + size);
    }

    var result = exports.secureRandomBytes(4);

    result = (result.readInt32BE(0) & 0x7fffffff) % size;

    return (result);
}

/**
 * Return a random item from an array, or null if the array has no items.
 * If optFilter is provided, it is a function used to filter the array
 * by returning either null or the object to be returned by this function.
 */
exports.secureRandomItem = function (array, optFilter) {
    var item = null;

    if (optFilter != null) {
        array = array.slice(); // shallow copy
    }

    while ((array.length > 0) && (item == null)) {
        var index = exports.secureRandomCardinal(array.length);

        item = array[index];

        if (optFilter != null) {
            item = optFilter(item);

            if (item == null) {
                array.splice(index, 1);
            }
        }
    }

    return (item);
}

/**
 * RegularExecutor allows a function to be invoked on
 * a regular schedule, but only one function will be executing
 * at any point in time.  So the function cannot be reinvoked
 * when it is running (though it can be scheduled to run again).
 */
function RegularExecutor(fn) {
    if (!(fn instanceof Function)) {
        throw new RangeError("fn must be a function");
    }

    this.fn = fn;
    this.interval = 0; // start in a paused state
    this.running = false;
    this.expiry = exports.FAR_FUTURE_MS;
    this.timeout = null;
}

RegularExecutor.prototype.withInterval = function (interval) {
    if (typeof(interval) != "number") {
        throw new RangeError("interval must be a number");
    }

    if (interval < 0) {
        throw new RangeError("invalid negative interval");
    }

    if (interval > exports.MAX_TIMEOUT_MS) {
        throw new RangeError("invalid interval too large: " + interval);
    }

    if (interval == 0) {
        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.expiry = exports.FAR_FUTURE_MS;
    }
    else if (this.interval == 0) {
        this.expiry = Date.now() + interval;
    }

    this.interval = interval;

    if (interval > 0) {
        this.invokeAt(Date.now() + interval);
    }

    return (this);
}

/**
 * invokeNow() will invoke the function if it is not pending.
 * Note: this will not change the expiry, so if the function is
 * pending, this will not schedule it to run again immediately
 * afterwards (use invokeAt() with no arguments to achieve that).
 */
RegularExecutor.prototype.invokeNow = function () {
    if (this.running) {
        // do nothing
    }
    else {
        this.running = true;

        if (this.interval == 0) {
            this.expiry = exports.FAR_FUTURE_MS;
        }
        else {
            this.expiry = Date.now() + this.interval;
        }

        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.fn(function () {
                this.running = false;

                if (this.expiry == exports.FAR_FUTURE_MS) {
                    // do nothing
                }
                else {
                    this.invokeAt(this.expiry);
                }
            }.bind(this));
    }
}

/**
 * Invoke the function at or soon after the timestamp provided.
 * This cannot be used to pause regular invocation - if the timestamp
 * is greater than the current time plus the interval, it will be
 * scheduled within the interval.
 */
RegularExecutor.prototype.invokeAt = function (timestamp) {
    var now = Date.now();

    /*
        First, normalize the timestamp value.
    */

    if (timestamp == null) {
        timestamp = now;
    }
    else if (timestamp < now) {
        timestamp = now;
    }
    else if (timestamp > now + this.interval) {
        timestamp = now + this.interval;
    }
    else {
        // within range
    }

    if (timestamp <= now) {
        if (this.running) {
            this.expiry = now; // will get triggered again after run
        }
        else {
            this.invokeNow();
        }
    }
    else if ((this.timeout != null) && (timestamp >= this.expiry)) {
        // ignore, do not reschedule ...
    }
    else {
        if (this.timeout != null) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.expiry = timestamp;

        if (this.running) {
            // do nothing
        }
        else {
            this.timeout = setTimeout(function () {
                    this.timeout = null;

                    this.invokeNow();
                }.bind(this), timestamp - now);
        }
    }
}

exports.RegularExecutor = RegularExecutor;

/**
 * A very simple queue that allows a number of jobs to be submitted.
 * Each job fn(callback) is called in turn and is expected to call
 * callback with any error as the first argument when done.  Processing
 * begins with the first submit and continues until the queue is
 * exhausted or an error occurs.  If a function calls back twice,
 * a hard error is thrown.  The RunQueue is single use - once the
 * callback is called, no new jobs can be submitted.  For more
 * sophisticated job control, see dinfra.Jobs.  This is intended
 * to be a very lightweight implementation (compared with promises
 * or dinfra.Jobs).
 */
function RunQueue(callback) {
    this.fns = [];
    this.fn = null;
    this.callback = callback;
    this.error = null;
    this.args = null;
    this.waiting = false;

    if (!(callback instanceof Function)) {
        this.args = [];
        this.waiting = true;
    }
}

/**
 * Submit a function to this run queue.  The function may be
 * null to cause the run queue to be processed (for example,
 * if there were no functions to run).  The function will
 * not start from the current stack frame, even if the queue
 * is currently empty.  Use submit() with no arguments to
 * prompt the queue (for example, even if it is empty).
 * It is always an error to call submit() if the constructor
 * callback has been called.
 */
RunQueue.prototype.submit = function (fn) {
    if (!this.waiting && (this.callback == null)) {
        throw new StateError("submit called after completion");
    }

    if (fn instanceof Function) {
        this.fns.push(fn);
    }
    else if (fn != null) {
        throw new RangeError("expected a function parameter");
    }

    if (this.waiting) {
        return;
    }

    if (this.fn == null) { // no function in progress
        var args = this.args;

        if ((this.error != null) || // an error occurred
                (this.fns.length == 0)) { // all functions complete
            if ((this.error == null) && (args != null)) {
                var callback = this.callback;

                setImmediate(function () {
                        callback.apply(null, args);
                    });
            }
            else {
                setImmediate(this.callback.bind(null, this.error));
            }

            this.callback = null;
            this.error = null;
        }
        else {
            var run = this.fn = this.fns.splice(0, 1)[0];
            var capture = function (error) {
                    if (run != this.fn) {
                        throw new StateError("multiple callbacks made on " +
                            run);
                    }

                    this.fn = null;

                    if (error != null) {
                        this.error = error;
                    }
                    else if (this.args == null) {
                        // not retainining args
                    }
                    else {
                        while (this.args.length < arguments.length) {
                            this.args.push(arguments[this.args.length]);
                        }
                    }

                    this.submit();
                }.bind(this);

            if (args != null) {
                if (args.length == 0) {
                    args.push(capture); // because it returned empty
                }
                else {
                    args[0] = capture; // overwrite old null/undefined error
                }

                this.args = [];
            }
            else {
                args = [capture];
            }

            setImmediate(function () {
                    run.apply(null, args);
                }.bind(this));
        }
    }
}

/**
 * Ignore failures reported by the callback to this function, but otherwise
 * just queue it normally.
 */
RunQueue.prototype.ignore = function (fn) {
    if (fn == null) {
        submit();
    }
    else if (!(fn instanceof Function)) {
        throw new RangeError("expected a function parameter");
    }
    else {
        this.submit(function (callback) {
                fn(function (error) {
                        callback(); // just callback, ignore the error
                    });
            });
    }
}

/**
 * Use wait instead of supplying a constructor callback function,
 * especially if you want to delay function infocation until
 * a list of functions is completed.  When queues are waited on
 * in this fashion, any parameters provided in the final job
 * callback will also be provided to the callback function.
 */
RunQueue.prototype.wait = function (fn) {
    if (!this.waiting) {
        throw new StateError("cannot combine callback and wait modes");
    }

    if (fn instanceof Function) {
        // good
    }
    else {
        throw new RangeError("expected a function parameter");
    }

    this.waiting = false;
    this.callback = fn;

    return (this.submit());
}

exports.RunQueue = RunQueue;

/**
 * A very simple processing queue that will process
 * submitted jobs sequentially, based on a function/callback contract.
 */
function LockQueue() {
    this.fns = [];
    this.fn = null;
    this.paused = false;
}

/**
 * Submit a function to this lock queue.  The function will
 * not start from the current stack frame, even if the queue
 * is currently empty.  The function will be passed a single
 * parameter, which is the unlock callback function.  Note that
 * this unlock function must be called exactly once and with no
 * arguments.
 */
LockQueue.prototype.lock = function (fn) {
    if (arguments.length != 1) {
        throw new RangeError("expected a single parameter");
    }

    if (!(fn instanceof Function)) {
        throw new RangeError("expected a function parameter");
    }

    /*
        Note this part of the algorithm explicitly ignores the next
        function in the queue, and prioritizes the passed function.
        This is intentional and is a feature actively used by both
        the resume() method and unlock() callback.  The alternative
        approach is to always push the function to the queue and then
        pop the top of the queue here, rather than in those functions.
        The current approach allows more efficient locking when the queue
        is empty.  Note that it looks like it could create an execution
        order different from the submission order, but in fact, this is
        not the case, due to the controlled manner of queue management
        in those functions.
    */

    if (this.paused || (this.fn !== null)) {
        // there is a function in progress, queue this one
        this.fns.push(fn);
    }
    else {
        // register that the function is in progress
        this.fn = fn;

        // run it bound to its unique unlock function frame
        setImmediate(fn.bind(null, function unlock(error) {
                if (this.fn !== fn) {
                    // Be really unforgiving about double unlocks:
                    // tell the caller that they are wrong, and
                    // don't change the queue processing any way.
                    throw new StateError("incorrect state");
                }

                this.fn = null;

                if (!this.paused && (this.fns.length > 0)) {
                    this.lock(this.fns.splice(0, 1)[0]);
                }

                if (arguments.length != 0) {
                    // Be somewhat unforgiving about errors being passed:
                    // still allow the queue to process forward if the
                    // exception is caught somewhere.
                    throw new StateError("too many arguments");
                }
            }.bind(this)));
    }
}

LockQueue.prototype.resume = function () {
    if (this.paused) {
        this.paused = false;

        if ((this.fn == null) && (this.fns.length > 0)) {
            this.lock(this.fns.splice(0, 1)[0]); // launch next
        }
    }
}

LockQueue.prototype.pause = function () {
    if (!this.paused) {
        this.paused = true;
    }
}

/**
 * Schedules a callback that will be called after any current
 * activity.  This essentially just does a lock and unlock and
 * then calls the provided callback.
 */
LockQueue.prototype.after = function (callback) {
    this.lock(function (unlock) {
            unlock();

            callback();
        });
}


exports.LockQueue = LockQueue;

/**
 * A TidyStack is used to allow different invokers to safely
 * tidy things up exactly once, even if they run concurrently.
 * Typically, this is used to ensure a master shutdown procedure
 * is formal and robust, even with shutdown elements being added,
 * executed and removed by other procedures at the same time.
 */
function TidyStack() {
    this.list = [];

    /**
     * Replace this to provide something better than just
     * console error logging.
     */
    this.error = console.log.bind(console, "error");
}

/**
 * Cancel a tidy stack entry by function instead of
 * by tidy wrapper.
 */
TidyStack.prototype.cancel = function (fn) {
    var i = this.list.length - 1;

    while ((i >= 0) && (this.list[i].fn !== fn)) {
        --i;
    }

    if (i < 0) {
        return (null);
    }

    return (this.list[i].cancel());
}

TidyStack.prototype.submit = function (fn) {
    var invoking = null;
    var result = null;

    /**
     * Can be invoked multiple times - must be savvy.
     */
    var lfn = function (callback) {
            if (invoking) {
                if (invoking.length == 0) {
                    return (callback(result));
                }

                return (invoking.push(callback));
            }

            invoking = [callback];

            var h = function (error) {
                    result = error;

                    var i = this.list.indexOf(lfn);

                    if (i >= 0) {
                        this.list.splice(i, 1);
                    }

                    if (result != null) {
                        this.error(result);
                    }

                    while (invoking.length) {
                        try {
                            invoking.shift()(result);
                        }
                        catch (e) {
                            this.error(e);
                        }
                    }
                }.bind(this);

            try {
                fn(h);
            }
            catch (e) {
                h(e);
            }
        }.bind(this);

    // note this is the function we find with cancel():
    // the caller is permitted to change it (for example,
    // it if provides its own wrapper and wants to record
    // the wrapped function fo accounting instead).
    lfn.fn = fn;
    lfn.cancel = function () {
            var i = this.list.indexOf(lfn);

            if (i >= 0) {
                this.list.splice(i, 1);
            }

            return (i >= 0 ? lfn : null);
        }.bind(this);

    this.list.push(lfn);

    return (lfn);
}

TidyStack.prototype.complete = function (callback) {
    var n = this.list.length;

    if (!n) {
        return (callback());
    }

    this.list[--n](function () {
            return (this.complete(callback));
        }.bind(this));
}

this.TidyStack = TidyStack;

/**
 * A RunGroup is used in situations where we want to process
 * a group of things concurrently and return the results to
 * to something else only after all things have completed,
 * even if they have raised errors along the way.  It also
 * allows multiple things to wait simultaneously on the same
 * result set.  A RunGroup does not submit or manage the jobs
 * in any way, it simply provides callbacks for registration of
 * the expected termination of some job.  The callback may be
 * executed on-stack once registered.
 */
function RunGroup() {
    /**
     * The outstanding set of callbacks.
     */
    this.callbacks = [];
    /**
     * The errors of any returned callbacks.
     */
    this.errors = [];
    /**
     * The list of waiters on callbacks to drain. 
     */
    this.waiters = [];
    /**
     * A count of returned callbacks, or -1 if shortcut
     */
    this.returned = 0;
    /**
     * Optional results posted by the retain callback below.
     */
    this.results = null;
    /**
     * This is set to the callback that should retain arguments.
     * It can be set any time prior to the callback being invoked.
     * These arguments will be passed to the waiters verbatim, except
     * for the first argument which may include chained errors from
     * other callbacks.
     */
    this.retain = null;
}

/**
 * This is used internally to check for any waiters to call.
 * Called externally, this will return the number of unfulfilled
 * callbacks remaining.
 */
RunGroup.prototype.check = function () {
    var count;

    if (this.returned < 0) {
        this.callbacks.splice(0); // clear all callbacks
    }

    while (!(count = this.callbacks.length) && this.waiters.length) {
        var error = this.errors;

        if (error.length == 0) {
            error = null;
        }
        else if (error.length == 1) {
            error = error[0];
        }
        else {
            error = new Error("multiple errors");
            error.group = this.errors;
        }

        var args;

        if (this.results != null) {
            args = this.results;

            if (error != null) {
                if (args.length == 0) {
                    args.push(null);
                }

                args[0] = error;
            }
        }
        else {
            args = [error, this.returned];
        }

        this.waiters.shift().apply(null, args);
    }

    return (count);
}

/**
 * Wait registers a callback which will be invoked callback(error, returned)
 * once all previously registered callbacks have returned.  The error will
 * be set if any of the calls returned an error.  The number of callbacks
 * that returned will be passed in returned.  It may be zero.
 */
RunGroup.prototype.wait = function (callback) {
    this.waiters.push(callback);
    this.check();
}

/**
 * Report an error - error may be null, in which case nothing is
 * reported.  This can be used to for adding errors to the final
 * error reported to the waiters.
 */
RunGroup.prototype.report = function (error) {
    if (error != null) {
        this.errors.push(error);
    }
}

/**
 * Register a callback that is not expected to be called, but may be with
 * an optional error, and which will shortcut the group and return immediately.
 * Shortcut callbacks can also be safely called multiple times, so they
 * are useful for on('error') and on('warning') for example.
 */
RunGroup.prototype.shortcut = function () {
    var result = function (error) {
            if (this.returned < 0) {
                return;
            }

            if (error != null) {
                this.report(error);
            }

            this.returned = -1;
            this.check();
        }.bind(this);

    // this.callbacks.push(result); // do not push shortcuts to callbacks

    return (result);
}

/**
 * Register a callback that expects to be called exactly once with an
 * optional error.  Any additional arguments supplied to the callback
 * will be ignored, unless the this.retain is set to the callback,
 * in which case args will be passed to all waiters.  See documentation
 * for this.retain.
 */
RunGroup.prototype.callback = function () {
    var result = function (error) {
            if (this.returned < 0) {
                return; // shortcut
            }

            if (error != null) {
                this.report(error);
            }

            var i = this.callbacks.indexOf(result);

            if (i < 0) {
                throw new StateError("double callback");
            }

            this.callbacks.splice(i, 1);
            this.returned++;

            if (this.retain === result) {
                this.results = [];

                while (this.results.length < arguments.length) {
                    this.results.push(arguments[this.results.length]);
                }
            }

            this.check();
        }.bind(this);

    this.callbacks.push(result);

    return (result);
}

/**
 * This is a courtesy function to make callback scoping easier.
 * It is required to return (fn(this.callback()) and have no
 * other side effects.
 */
RunGroup.prototype.submit = function (fn) {
    return (fn(this.callback()));
}

exports.RunGroup = RunGroup;

/**
 * Creates a directory under an existing root and will
 * make intervening directories as necessary back to that
 * root, but not above.
 *
 * Note: this algorithm has been specifically designed to
 * account for competing, parallel, directory creates in the
 * same or other processes.  Highly fault tolerant.
 *
 * The callback(error, made) returns, where if an error is not
 * passed, made will be an array (possibly empty) of the full paths
 * that were created.
 */
exports.makeDirIn = function (root, path, callback) {
    root = node_path.normalize(root);
    path = node_path.resolve(root, path);
    path = node_path.normalize(path);

    return (fs.mkdir(path, function (error) {
            if (error == null) {
                return (callback(null, [path]));
            }

            if (error.code == "EEXIST") { // already exists
                return (callback(null, []));
            }

            if (error.code != "ENOENT") {
                return (callback(error)); // any other error
            }

            if (root == path) { // path is root
                return (callback(error)); // don't create root or above
            }

            // no parent, so try to make it
            return (exports.makeDirIn(root, node_path.dirname(path),
                function (error, made) {
                    if (error != null) { // some other problem
                        return (callback(error, made));
                    }

                    // parent created, retry self
                    return (exports.makeDirIn(root, path,
                        function (error, aMade) {
                            if (error != null) {
                                return (callback(error, made));
                            }

                            if (made == null) {
                                if (aMade == null) {
                                    made = [];
                                }
                                else {
                                    made = aMade;
                                }
                            }
                            else if (aMade == null) {
                                // all is well
                            }
                            else {
                                made.splice(made.length, 0, aMade);
                            }

                            return (callback(null, made));
                        }));
                }));
        }));
}

exports.removeAllFiles = function (path, opts, callback) {
    if (opts instanceof Function) {
        callback = opts;
        opts = {};
    }

    if (path == null) {
        return (callback(new Error("invalid path ")));
    }
    else {
        child_process.exec("rm -rf " + path, function(error, stdout, stderr) {
            return (callback(error));
        });
    }
}

/**
 * Recursively removes all files from path and below.  The implementation
 * performs this task with no parallelism, to reduce filesystem contention.
 *
 * Note: this algorithm has been specifically designed to
 * account for competing, parallel, removes in the
 * same or other processes.  Highly fault tolerant.
 *
 * @todo There are currently no options and this does not yet return a promise.
 * Future options to support: restrict to same user or same file system
 * as root.
 */
exports.removeAllFilesUnlink = function (path, opts, callback) {
    if (opts instanceof Function) {
        callback = opts;
        opts = {};
    }

    /*
        The internal strategy for this implementation is to
        schedule operations to a run queue, until they are exhausted.
        There are three operations we can schedule:

        unlink to remove a file, or follow up to rmdir
        rmdir to remove a dir, or follow up to readdir
        readdir to unlink files in a dir and then the dir itself

        Doing it this way eliminates any potential parallelism that
        might occur through other algorithmic approaches.  Also the
        basic algorithm above is fault tolerant - files and directories
        can be created and removed from the tree during operation, and
        the operation will still complete (eventually).

        The key to this is the run queue - it will fail if any of the
        operations calls back with an error, and will otherwise run
        until all of its operations complete in sequence, even as
        operations are added during progress.
    */
    var elided = []; // collision errors
    var count = 0; // successful unlink or rmdir

    function filesunlink(path, files, callback) {
        if (files.length == 0) {
            return (callback());
        }

        unlink(node_path.resolve(path, files.pop()), function (error) {
                if (error != null) {
                    return (callback(error));
                }

                return (filesunlink(path, files, callback));
            });
    }

    /*
        Read a directory.  If the directory no longer exists, do nothing
        further.  Otherwise unlink each file within it.
    */
    function readdirrm(path, callback) {
        fs.readdir(path, function (error, files) {
                if (error != null) {
                    if (error.code == "ENOENT") {
                        elided.push(error);

                        return (callback());
                    }

                    if (error.code == "EACCES") {
                        elided.push(error);

                        return (fs.chmod(path, 7 << 6, function (error) {
                                if (error != null) {
                                    if (error.code == "ENOENT") {
                                        elided.push(error);

                                        return (callback());
                                    }

                                    return (callback(error));
                                }

                                return (readdirrm(path, callback));
                            }));
                    }

                    return (callback(error));
                }

                if (files != null) {
                    return (filesunlink(path, files, callback));
                }

                return (callback());
            });
    }

    /*
        Remove a directory.  If the directory no longer exists,
        do nothing.  If the directory was removed successfully,
        do nothing.  If the directory was not empty, then
        invoke readdirrm to delete the contents, and then
        invoke unlink again.
    */
    function rmdir(path, callback) {
        fs.rmdir(path, function (error) {
                if (error != null) {
                    if (error.code == "ENOENT") {
                        elided.push(error);

                        return (callback());
                    }

                    if (error.code == "ENOTEMPTY") {
                        return (readdirrm(path, function (error) {
                                if (error != null) {
                                    return (callback(error));
                                }

                                return (unlink(path, callback));
                            }));
                    }

                    return (callback(error));
                }

                count++;

                return (callback());
            });
    }

    /*
        Unlink a path.  If the unlink succeeeds, no nothing further.
        If the path is a directory, schedule a rmdir().
    */
    function unlink(path, callback) {
        fs.unlink(path, function (error) {
                if (error == null) {
                    count++;

                    return (callback());
                }

                if (error.code == "ENOENT") {
                    elided.push(error);

                    return (callback());
                }

                if (error.code == "EISDIR") {
                    return (rmdir(path, callback));
                }

                return (callback(error));
            });
    }
    
    return (unlink(path, function (error) {
            callback(error, count, elided);
        }));
};

/**
 * Provide a psuedo random exponential backoff - this is a common
 * strategy for setting up retry delays.
 * Take the parameter n (assume 1 if missing or not numeric),
 * multiply it by the floor of 1.5 plus a random number
 * scaled to parameter p (assume 2 if missing) minus 1
 * Limit the result to the parameter q (assume 2^30 if missing).
 * Typical usage is:
 * n = randomExponentialBackoff(n); // randomly double n
 * n = randomExponentialBackoff(n, 1, 1000); // randomly double n up to 1000
 */
exports.randomExponentialBackoff = function (n, p, q) {
    if ((typeof(n) != "number") || isNaN(n)) {
        n = 1;
    }

    if ((typeof(p) != "number") || isNaN(p)) {
        p = 2;
    }

    if ((typeof(q) != "number") || isNaN(q)) {
        q = exports.randomExponentialMax;
    }

    return (Math.min(n * Math.floor(1.5 + (p - 1.0) * Math.random()), q));
};
exports.randomExponentialMax = 1 << 30;


/**
 * @class CompareWritable
 *
 * The CompareWritable stream is used for verification that
 * bytes written to it match bytes read from thre readable
 * provided to its constructor.  The stream will emit an
 * error for any problematic situation either within itself
 * or the passed readable.  Piped streams writing to this
 * will generally raise errors on their own behalf.
 *
 * See ../test/mono-resources.js for an example of usage.
 */
util.inherits(CompareWritable, node_stream.Writable);

function CompareWritable(readable) {
    node_stream.Writable.call(this);

    this.readable = readable;
    this.readPosition = 0; // where is readChunks[0] in the stream
    this.readChunks = [];
    this.readEnd = false;

    this.writePosition = 0; // where is writeChunks[0] in the stream
    this.writeChunks = [];
    this.writeCallbacks = [];
    this.writeEnd = false;

    this.comparePosition = 0; // how far have we compared?

    this.readable.on('error', function(error) {
            this.emit('error', error);
        }.bind(this)).
        on('data', function (chunk, encoding) {
            this.readChunks.push(chunk);
            readable.pause();
            this.compareProtected();
        }.bind(this)).
        on('end', function () {
            this.readEnd = true;
            this.compareProtected();
        }.bind(this));

    this.on('finish', function () {
            this.writeEnd = true;
            this.compareProtected();
        }.bind(this));
}

CompareWritable.prototype.compareProtected = function () {
    while ((this.readChunks.length > 0) && (this.writeChunks.length > 0)) {
        var readOffset = this.comparePosition - this.readPosition;
        var writeOffset = this.comparePosition - this.writePosition;
        var readLength = this.readChunks[0].length;
        var writeLength = this.writeChunks[0].length;
        var changedOffsets = false;

        if (readOffset >= readLength) {
            this.readChunks.splice(0, 1);
            this.readPosition += readLength;
            changedOffsets = true;
        }

        if (writeOffset >= writeLength) {
            this.writeChunks.splice(0, 1);
            this.writePosition += writeLength;
            changedOffsets = true;
        }

        if (changedOffsets) {
            // allow loop to retest
        }
        else if (this.readChunks[0][readOffset] !=
                this.writeChunks[0][writeOffset]) {
            var errorType = "different content";
            var error = new StateError("streams mismatch: " + errorType +
                " at " + (this.readPosition + readOffset));

            error.info = {
                    type: errorType,
                    position: this.comparePosition,
                    readChar: this.readChunks[0][readOffset],
                    writeChar: this.writeChunks[0][writeOffset],
                };

            return (this.emit('error', error));
        }
        else {
            this.comparePosition++;
        }
    }

    if (!this.readChunks.length && this.readEnd && this.writeChunks.length) {
        var errorType = "excessive write";
        var writeExcess = this.writePosition +
            this.writeChunks[0].length - this.comparePosition;
        var error = new StateError("streams mismatch: " + errorType +
            " " + writeExcess);

        error.info = {
                type: errorType,
                position: this.comparePosition,
                writeExcess: writeExcess,
            };

        return (this.emit('error', error));
    }

    if (!this.writeChunks.length && this.writeEnd && this.readChunks.length) {
        var errorType = "excessive read";
        var readExcess = this.readPosition +
            this.readChunks[0].length - this.comparePosition;
        var error = new StateError("streams mismatch: " + errorType +
            " " + readExcess);

        error.info = {
                type: errorType,
                position: this.comparePosition,
                readExcess: readExcess,
            };

        return (this.emit('error', error));
    }

    if (!this.readChunks.length && !this.readEnd) {
        this.readable.resume();
    }

    while (this.writeChunks.length < this.writeCallbacks.length) {
        this.writeCallbacks.splice(0, 1)[0]();
    }
}

CompareWritable.prototype._write = function (chunk, encoding, callback) {
    if (encoding != 'buffer') {
        return (callback(new Error("unsupported encoding " + encoding)));
    }

    this.writeChunks.push(chunk);
    this.writeCallbacks.push(callback);

    this.compareProtected();
}

exports.CompareWritable = CompareWritable;

/*
    Check that it is legal for us to override the base Writable
    class with our own private namespace items.
*/
["_close", "_open", "_process", "_data"].forEach(function (name) {
        if (name in node_stream.Writable.prototype) {
            throw new Error("illegal passive inheritance override: " + 
                name);
        }
    });

/**
 * BufferTransform is just a simple way of bunching up
 * byte-oriented stream traffic into larger chunks for delivery
 * to underlying streams (eg. files, HTTP responses).
 */
util.inherits(BufferTransform, node_stream.Transform);

function BufferTransform(lower, opts) {
    node_stream.Transform.call(this);

    if (lower != null) {
        this.pipe(lower);
    }

    this.buffer = null;
    this.at = 0;
    this.limit = opts && opts.limit || 4096;
}

BufferTransform.prototype.pflush = function () { 
    var buffer = this.buffer;

    if (buffer != null) {
        buffer = buffer.slice(0, this.at);

        this.buffer = null;
        this.at = 0;

        this.push(buffer);
    }
}

BufferTransform.prototype.pwrite = function (chunk) { 
    var i = 0;
    var length = chunk.length;
    var limit = this.limit;

    while (i < length) {
        var avail;
        var at = this.at;
        var buffer = this.buffer;

        if (buffer == null) {
            this.buffer = new Buffer(limit);
            this.at = 0;
        }
        else if ((avail = limit - at) == 0) {
            this.pflush();
        }
        else {
            var j = i + avail;

            if (j > length) {
                j = length;
            }

            while (i < j) {
                buffer[at++] = chunk[i++];
            }

            this.at = at;
        }
    }
}

BufferTransform.prototype._flush = function (callback) { 
    this.pflush();

    return (callback());
}

BufferTransform.prototype._transform = function (chunk, encoding, callback) { 
    if (!((encoding == null) || (encoding == "buffer"))) {
        throw new RangeError("must use a buffer encoding");
    }

    this.pwrite(chunk);

    return (callback());
}

exports.BufferTransform = BufferTransform;

util.inherits(DWritable, node_stream.Writable);

/**
 * DWritable extends Writable with the ability to consistently
 * handle asynchronous startup/teardown in combination with node stream
 * semantics (v0.10).  Override _open() and _close() to implement
 * startup and teardown features.  The default implementations just
 * call the required callback.  Note this needs to intercept _write()
 * so implementors need to use _data() for their own regular data instead.
 */
function DWritable() {
    node_stream.Writable.call(this);

    this.state = this.STATE.OPEN; // not yet opened
    this.queue = []; // queued chunks and callbacks 
}

DWritable.prototype.STATE = {
    OPEN: "open",
    OPENING: "opening",
    PROCESSING: "processing",
    PENDING: "pending",
    CLOSE: "close",
    CLOSING: "closing",
    END: "end",
    ENDING: "ending",
    ENDED: "ended",
    DONE: "done",
    ERROR: "error",
    FAILED: "failed",
};

DWritable.prototype._process = function (nstate, error) {
    if (arguments.length >= 1) {
        this.state = nstate;

        if (nstate === this.STATE.ERROR) {
            if (arguments.length >= 2) {
                this.error = error;
            }
        }
    }

    if (this.state == null) {
        this._process(this.STATE.ERROR,
            new RangeError("invalid state: " + this.state));
    }
    else if (this.state === this.STATE.OPEN) {
        this._process(this.STATE.OPENING);

        this._open(function (error) {
                if (error != null) {
                    return (this._process(this.STATE.ERROR, error));
                }

                return (this._process(this.STATE.PROCESSING));
            }.bind(this));
    }
    else if (this.state === this.STATE.OPENING) {
        // do nothing
    }
    else if (this.state === this.STATE.PROCESSING) {
        if (this.queue.length == 0) {
            return; // ignore
        }

        var call = this.queue[0];

        if (call.chunk == null) {
            return (this._process(this.STATE.CLOSE));
        }

        this._process(this.STATE.PENDING);

        if (this._trace) {
            this._trace("enter pending queue length:", this.queue.length);
        }

        this._data(call.chunk, call.encoding, 
            function (error) {
                if (error != null) {
                    return (this._process(this.STATE.ERROR, error));
                }

                if (this.queue[0] !== call) {
                    if (this._trace) {
                        this._trace("bad state queue length:",
                            this.queue.length);
                    }

                    throw new StateError("call is not first on queue!");
                }

                this.queue.splice(0, 1);

                try {
                    call.callback();
                }
                catch (e) {
                    if (this._trace != null) {
                        this._trace("error", e.stack,
                            "invoking stack", call.traceback);
                    }

                    throw e;
                }

                return (this._process(this.STATE.PROCESSING));
            }.bind(this));
    }
    else if (this.state === this.STATE.PENDING) {
        // do nothing
    }
    else if (this.state === this.STATE.CLOSE) {
        this._process(this.STATE.CLOSING);

        this._close(function (error) {
                if (error != null) {
                    return (this._process(this.STATE.ERROR, error));
                }

                return (this._process(this.STATE.END));
            }.bind(this));
    }
    else if (this.state === this.STATE.CLOSING) {
        // do nothing
    }
    else if (this.state === this.STATE.END) {
        this._process(this.STATE.ENDING);

        node_stream.Writable.prototype.end.call(this,
            function (error) {
                if (error != null) {
                    return (this._process(this.STATE.ERROR, error));
                }

                return (this._process(this.STATE.ENDED));
            }.bind(this));
    }
    else if (this.state === this.STATE.ENDING) {
        // ignore
    }
    else if (this.state === this.STATE.ENDED) {
        this._process(this.STATE.DONE);

        while (this.queue.length > 0) {
            this.queue.splice(0, 1)[0].callback();
        }
    }
    else if (this.state === this.STATE.DONE) {
        // ignore
    }
    else if (this.state === this.STATE.ERROR) { // error request
        var error = this.error;

        this._process(this.STATE.FAILED);

        if (error == null) {
            // do nothing - not sure why state was even raised
        }
        else if (this.queue.length > 0) {
            this.queue.splice(0, 1)[0].callback(error);
        }
        else {
            throw error;
        }
    }
    else if (this.state == this.STATE.FAILED) { // failed
        // do nothing
    }
    else {
        this._process(this.STATE.ERROR,
            new RangeError("unsupported state: " + this.state));
    }
}

// Just rename this _trace to get trace ... don't automate, too much logging
DWritable.prototype._xtrace = function () {
    var args = [this.__proto__.constructor.name];

    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }

    console.log.apply(console, args);
}

DWritable.prototype._open = function (callback) {
    callback();
}

DWritable.prototype._write = function (chunk, encoding, callback) {
    if (!(callback instanceof Function)) {
        throw new Error("no callback provided");
    }

    if (chunk == null) {
        if (encoding != null) {
            callback(new Error("encoding with no buffer"));
        }
    }
    else {
        if (!(chunk instanceof Buffer)) {
            callback(new Error("chunk must be a buffer"));
        }

        if (encoding != "buffer") {
            callback(new Error("encoding must be 'buffer'"));
        }
    }

    var call = { chunk: chunk, encoding: encoding, callback: callback };

    if (this._trace) {
        call.traceback = new Error().stack;
    }

    this.queue.push(call);
    this._process();
}

DWritable.prototype._data = function (chunk, encoding, callback) {
    callback(new Error("derived class must implement"));
}

DWritable.prototype._close = function (callback) {
    callback();
}

DWritable.prototype.end = function (chunk, encoding, callback) {
    if (this._trace) {
        this._trace("end() called");
    }

    if (chunk instanceof Function) {
        if (this._trace) {
            this._trace("end() called without chunk");
        }

        callback = chunk;
        chunk = null;
        encoding = null;
    }

    if (chunk != null) {
        if (this._trace) {
            this._trace("end() called with chunk");
        }

        if (encoding instanceof Function) {
            callback = encoding;
            encoding = null; // not sure
        }

        return (this.write(chunk, encoding, function (error) {
                if (error != null) {
                    return (callback(error));
                }

                this.end(callback);
            }.bind(this)));
    }

    if (this._trace) {
        this._trace("end() ready to go, callback", typeof(callback));
    }

    if (callback == null) {
        callback = function (error) {
                if (error != null) {
                    this.emit('error', error);
                }
            }.bind(this);
    }

    this._write(null, null, callback);
}

exports.DWritable = DWritable;

/**
 * This is a safe way of closing a stream in such a way that
 * the callback is called either: if both end() calls back and
 * the finish event is raised; or, an error occurs.  The idea
 * behind this is to ensure that whatever happens during a close,
 * only one callback is required.  This is used extensively in
 * internal stream processing code.
 */
exports.closeStream = function (stream, callback) {
    if (callback == null) {
        callback = function (error) {
                if (error != null) {
                    throw error;
                }
            };
    }

    var group = new RunGroup();

    stream.on('error', group.shortcut("on-error")).
        on('finish', group.callback("on-finish")).
        end(null, null, group.callback("cb-end"));

    return (group.wait(callback));
};

/**
 * A buffer adapter is just an object for allowing us to write
 * safely and consistently to a buffer, from a given offset.
 * Primarily used for manipulating protocol/format data.
 * Not really intended to be super-efficient.
 */
function BufferAdapter(buffer, offset, length) {
    if (buffer == null) {
        if (length == null) {
            length = -1;
        }

        buffer = buffer[0];
    }
    else if (typeof(buffer) == "number") {
        buffer = new Buffer(buffer);
    }
    else if (buffer instanceof Buffer) {
        // all is well
    }
    else {
        throw new RangeError("buffer is neither a number nor a Buffer");
    }

    this.buffer = buffer;

    if (offset == null) {
        offset = 0;
    }

    if (offset > buffer.length) {
        throw new RangeError("offset " + offset + " beyond buffer length " +
            buffer.length);
    }

    this.offset = offset;

    if (length == null) {
        length = buffer.length - offset;
    }

    this.length = length;

    this.calcEnd();
}

BufferAdapter.prototype.calcEnd = function () {
    if (this.length < 0) {
        this.end = this.buffer.length - this.offset;
    }
    else {
        this.end = this.offset + this.length;
    }
}

BufferAdapter.prototype.writeUInt8 = function (v) {
    if (this.offset >= this.end) {
        throw new Error("buffer too short: " + this.end);
    }

    this.buffer[this.offset++] = (v & 0xff);

    return (this);
}

BufferAdapter.prototype.writeUInt16LE = function (v) {
    return (this.
        writeUInt8(v).
        writeUInt8(v >>> 8));
}

BufferAdapter.prototype.writeUInt16BE = function (v) {
    return (this.
        writeUInt8(v >>> 8).
        writeUInt8(v));
}

BufferAdapter.prototype.writeUInt32LE = function (v) {
    return (this.
        writeUInt16LE(v).
        writeUInt16LE(v >>> 16));
}

BufferAdapter.prototype.writeUInt32BE = function (v) {
    return (this.
        writeUInt16BE(v >>> 16).
        writeUInt16BE(v));
}

BufferAdapter.prototype.writeUInt64LE = function (v) {
    var vl = v ^ 0;
    var vh = (v / 0x100000000) ^ 0;

    return (this.
        writeUInt32LE(vl).
        writeUInt32LE(vh));
}

BufferAdapter.prototype.writeUInt64BE = function (v) {
    var vl = v ^ 0;
    var vh = (v / 0x100000000) ^ 0;

    return (this.
        writeUInt32BE(vh).
        writeUInt32BE(vl));
}

BufferAdapter.prototype.writeBuffer = function (v) {
    if (this.offset + v.length > this.end) {
        throw new RangeError("offset " + this.offset +
            " with end " + this.end +
            " insufficient for " + v.length + " bytes");
    }

    v.copy(this.buffer, this.offset, 0, v.length);

    this.offset += v.length;

    return (this);
}

BufferAdapter.prototype.ensureOffset = function (v) {
    if (this.offset !== v) {
        throw new StateError("expected offset " + v +
            " but buffer is actually at " + this.offset);
    }

    return (this);
}

BufferAdapter.prototype.ensureEnd = function (v) {
    return (this.ensureOffset(this.end));
}

exports.BufferAdapter = BufferAdapter;


/** 
 * A KeepStream is just a writable that keeps the content in
 * this.buffer.  Its naively implemented and mostly used for
 * testing purposes - this won't scale.
 */
util.inherits(KeepStream, node_stream.Writable);

function KeepStream() {
    node_stream.Writable.call(this);

    this.buffer = new Buffer(0);
}

KeepStream.prototype._write = function (chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    return (callback());
}

exports.KeepStream = KeepStream;

var nowOffset = 0; // don't expose directly
var nowFunction = null; // don't expose directly

/**
 * Adjusts the time returned by Date.now() by the given offset, or
 * if now argument is provided, just returns the current offset.
 */
function adjustNow(offset) {
    if (nowFunction === null) {
        nowFunction = Date.now;
    }

    if (offset !== undefined) {
        if (typeof(offset) != "number") {
            throw new RangeError();
        }

        if (Math.floor(offset) !== offset) {
            throw new RangeError();
        }

        if (nowOffset === offset) {
            // do nothing
        }
        else {
            nowOffset = offset;

            if (offset != 0) {
                Date.now = function () {
                        return (nowFunction.apply(Date, arguments) +
                            nowOffset);
                    };

                console.log("WARNING: adjusting now() offset", offset);
            }
            else {
                Date.now = nowFunction;

                console.log("WARNING: restoring now() offset", offset);
            }
        }
    }

    return (nowOffset);
}

exports.adjustNow = adjustNow;

/**
 * Processes options in a specific way to ensure that fds
 * are not inadvertently intercepted by node.js.
 */
function processOpts(opts, defaults) {
    var ropts = {};

    for (var name in defaults) {
        ropts[name] = defaults[name];
    }

    for (var name in opts) {
        if ((name == "stdio") && (name in ropts)) { // different handling
            if (opts[name] instanceof Array) {
                opts.stdio.forEach(function (v, i) {
                        if (ropts.stdio.length == i) {
                            ropts.stdio.push(v);
                        }
                        else if (v != null) {
                            ropts.stdio[i] = v;
                        }
                    });
            }
            else {
                ropts[name] = opts[name];
            }
        }
        else {
            ropts[name] = opts[name];
        }
    }

    return (ropts);
}

/**
 * ExitError is an error class that is intended to be used
 * specifically with child_process-like objects that emit
 * an 'exit' event with multiple arguments.  Its purpose
 * is to formalize names for various exit and process
 * information so that information can be used reliably
 * by callers.
 */
util.inherits(ExitError, ExtendError);

function ExitError(message, args, opts, status, signal) {
    message += ": " + JSON.stringify(args) + " failed";

    if (status != null) {
        message += ", exit status " + status;
    }
    else {
        message += ", signal " + signal;
    }

    ExtendError.call(this, message);

    this.args = args;
    this.opts = opts;
    this.status = status;
    this.signal = signal;
}

exports.ExitError = ExitError;

/**
 * Process invokes the command given by args with child_process.spawn opts
 * as provided.  If the process spawn itself was not successful,
 * callback(error) is invoked.  Otherwise, fn(process, cb) is invoked, and
 * it waits for both cb(error, args...) and process exit to occur before
 * calling callback(error, args...).  Note that the opts are processed to
 * ensure that stdio slots are replaced with their fd numbers if the value
 * isn't specified.  This is intentional: it ensures that the invoked process
 * doesn't have fds intercepted by node, under all versions.
 *
 * Note: this is called denum_process rather than process so as not to
 * obscure the special node.js global process module name.
 */
function denum_process(args, opts, fn, callback) {
    var opts = processOpts(opts, { stdio: [0, 1, 2] });
    var p;

    try {
        p = require('child_process').spawn(args[0], args.slice(1), opts);
    }
    catch (e) {
        return (callback(new ExitError("spawn fail",
            args, opts, e.code, null)));
    }

    var group = new RunGroup();

    p.on('error', group.shortcut());

    p.on('exit', function (code, signal) {
            if (code !== 0) {
                group.report(new ExitError("spawn exit",
                    args, opts, code, signal));
            }
        });

    p.on('close', group.callback().bind(null, null)); // empty error slot

    group.submit(function (callback) {
            group.retain = callback; // retain parameters for this callback

            return (fn(p, callback));
        });

    return (group.wait(callback));
}

exports.process = denum_process;

/**
 * Just like process() except that fn(stdin, cb) is called with
 * stdin as a pipe ready for output.  The process is intended to
 * consume that output.
 */
function consume(args, opts, fn, callback) {
    return (denum_process(args, processOpts(opts, { stdio: [ "pipe" ] }),
        function (process, callback) {
            var stdin = process.stdio[0];

            stdin.on('error', function (error) {
                    return (process.emit('error', error));
                });

            return (fn(stdin, callback));
        }, callback));
}

exports.consume = consume;

/**
 * Just like process() except that fn(stdout, cb) is called with
 * stdout as a pipe ready for input.  The process is intended to
 * produce that input.
 */
function produce(args, opts, fn, callback) {
    return (denum_process(args, processOpts(opts, { stdio: [ null, "pipe" ] }),
        function (process, callback) {
            var stdout = process.stdio[1];

            stdout.on('error', function (error) {
                    return (process.emit('error', error));
                });

            return (fn(stdout, callback));
        }, callback));
}

exports.produce = produce;

/**
 * This replaces boilerplate code for wrapping a function
 * fn(args..., callback(error, results...))
 * in a setup(callback(error, args...) and a teardown(failure, args...,
 * callback).  Note: fn() will not be called if setup fails.
 * The failure parameter does not require logging - it will be injected
 * into the errors returned in the final callback(error, results...).
 *
 * The main features that this provides are the continuity of arguments
 * and the retention and merging of errors.
 *
 * An important aspect of this is that the parameters for
 * the fn and teardown are distinct from the fn(callback(args))
 * and overall callback(args).  This provides simple decoupling
 * between the wrapper and the invoked function and its eventual callback.
 */
function invokeWrapper(setup, fn, teardown, callback) {
    if (arguments.length != 4) {
        throw new RangeError("expect four function arguments");
    }

    if (!(setup instanceof Function)) {
        throw new RangeError("setup arg must be a function");
    }

    if (!(fn instanceof Function)) {
        throw new RangeError("fn arg must be a function");
    }

    if (!(teardown instanceof Function)) {
        throw new RangeError("teardown arg must be a function");
    }

    if (!(callback instanceof Function)) {
        throw new RangeError("callback arg must be a function");
    }

    return (setup(function (error) {
            if (error != null) {
                return (callback(error));
            }

            /**
             * Preserves the parameters called back from setup.
             */
            var args = [];

            /*
                Copy all of the actual arguments to results.
            */
            while (args.length < arguments.length) {
                args.push(arguments[args.length]);
            }

            // remove the error, if any
            if (args.length) {
                args.shift();
            }

            // add the callback for fn
            args.push(function (failure) {
                    /**
                     * Preserves the parameters called back from fn.
                     */
                    var results = [];

                    while (results.length < arguments.length) {
                        results.push(arguments[results.length]);
                    }

                    // prepend any failure to the teardown args
                    args.unshift(failure);

                    // remove this function from the teardown args
                    args.pop();

                    // insert the final callback handler into the teardown args
                    args.push(function (error) {
                            if (error != null) {
                                if (failure != null) {
                                    failure.chain = error;
                                }
                                else if (results.length == 0) {
                                    results.push(error);
                                }
                                else {
                                    results[0] = error;
                                }
                            }

                            return (callback.apply(null, results));
                        });

                    return (teardown.apply(null, args));
                });

            return (fn.apply(null, args));
        }));
}

exports.invokeWrapper = invokeWrapper;

/**
 * Chain together a pair of errors - may return null.
 */
function chainError(left, right) {
    var result;

    if (left == null) {
        result = right;
    }
    else if (right == null) {
        result = left;
    }
    else if (left.chain == null) {
        left.chain = right;
        result = left;
    }
    else {
        left.chain = chainError(left.chain, right);

        result = left;
    }

    return (result);
}

exports.chainError = chainError;

/**
 * Return a callback which will call fn, and then call callback
 * with whatever arguments it was passed, chaining together any
 * errors (argument[0] in all cases).  If fn is not a function,
 * then it is treated as an error to chain in.
 */
function chainWrapper(fn, callback) {
    if (!(fn instanceof Function)) {
        var error = fn;

        fn = function (callback) {
                return (callback(error));
            };
    }

    return (function () {
            var args = [];

            while (args.length < arguments.length) {
                args.push(arguments[args.length]);
            }

            return (fn(function (error) {
                    if (error != null) {
                        if (args.length == 0) {
                            args.push(error);
                        }
                        else {
                            args[0] = chainError(args[0], error);
                        }
                    }

                    callback.apply(null, args);
                }));
        });
}

exports.chainWrapper = chainWrapper;

/**
 * Call the provided callback at most once.  If overflow is provided
 * any additional calls will be sent to overflow instead, otherwise
 * they will be completely ignored (including errors).
 */
function singleCallback(callback, overflow) {
    if (!(callback instanceof Function)) {
        throw new RangeError("callback function must be provided");
    }

    if ((overflow != null) && !(overflow instanceof Function)) {
        throw new RangeError("overflow must be a function if provided");
    }

    var handled = false;

    return (function () {
            if (handled) {
                if (overflow != null) {
                    return (overflow.apply(null, arguments));
                }

                return;
            }

            handled = true;

            return (callback.apply(null, arguments));
        });
}

exports.singleCallback = singleCallback;

/**
 *  Javascript implementation of inet_aton().
 *  IP addresses are actually more flexible than we think..
 *  Refer to Linux man page inet_aton, inet_ntoa for details.
 */
function ip_aton(a) {
    var base = 0;
    var i = 0;
    var mult = 256 * 256 * 256;
    var n = 0;
    
    // remove the continuous '.'
    a = a.replace(/(\.)(\1)+/g, function (x, y, z) { return (y); });

    for (i = 0; i < a.length; i++) {
        if (a.charAt(i) == '.') {
            if (i - base <= 0) {
                //console.log( "Failed to convert '" + a + "' to valid IP." );
                return null;
            }

            n += mult * (a.substring(base, i) * 1);
            mult /= 256;
            
            if (isNaN(n)) { 
                return null;
            }

            if (mult < 1) {
                //console.log("Failed to convert '"+a+"' to IP (stop dots).");
               return null;
            }

            base = i + 1; //+1 = skip the "."
        }
    }
    // Explicitly not multiplied by "mult"; see inet_aton(3).  
    // "* 1" = "cast to int".
    n += (a.substring(base, a.length) * 1); 

    //console.log(n);
    return n;
}

exports.ip_aton = ip_aton;

/**
 *  Javascript implementation of inet_ntoa().
 *  Refer to Linux man page inet_aton, inet_ntoa for details.
 */
function ip_ntoa(n) {
    if (n == null) {
        return null;
    }

    var myN = n;

    if (myN < 0) {
        myN = ((myN>>>1) * 2) + (myN & 1);
    }
    
    if (myN < 0 || myN > 256 * 256 * 256 * 256) {
        console.log( "Bad ntoa call with '" + myN + "'." );
        return null;
    }

    //The last Math.floor isn't strictly necessary, 
    //but saves us from getting non-integers as inputs.
    return (Math.floor(myN / 256 / 256 / 256) + "." 
            + Math.floor((myN / 256 / 256) % 256) + "." 
            + Math.floor((myN / 256) % 256) + "." + Math.floor(myN % 256));
}

exports.ip_ntoa = ip_ntoa;

/**
 * Take a name and convert it to a shell environment name by:
 * transforming it to upper case; retaining underscore, ASCII alphabetical
 * characters and digits; and replacing dash and slash and space with
 * underscore.  All other characters are stripped.  The resulting
 * name will consist of only upper case characters, digits and underscore.
 */
function mungeEnvName(name) {
    if (name == null) {
        return (null);
    }

    return (name.toUpperCase().replace(/[- \/]/g, "_").
        replace(/[^A-Z0-9_]/g, ""));
}

exports.mungeEnvName = mungeEnvName;

exports.isFunction = function (v) {
        return v && {}.toString.call(v) === '[object Function]';
    }

/** Returns true if the string argument ends with the match string */
exports.endsWith = function (string, match) {
    return string.length > match.length && string.indexOf(match) === (string.length - match.length);
}