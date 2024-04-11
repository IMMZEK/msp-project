// Copyright (C) 2015-2017 Texas Instruments Incorporated - http://www.ti.com/
/*
    Note this js module contains no mutable state - please keep it that way.
*/
var Q = require('q'); // promise library
var util = require('util'); // util library for inheritance
var fs = require('fs'); // node filesystem interface
var string_decoder = require('string_decoder'); // node string decoder
var node_stream = require('stream'); // node string decoder
var zlib = require('zlib'); // node compression library
var denum = require('./denum');
var errorTypeSpecials = {
        "message" : true,
        "stack" : true,
        "arguments" : true
    };

// JSON + some extensions so we can get structural information on exceptions
// Note that these numbers are different to BSON.
TYPE = denum.cardinals(
    "ERROR", // AKA Error and prototype extensions
    "STACK", // internal stack representation
    "FRAME", // internal frame representation (name is file, value is line)
    "LIST", // AKA Array
    "MAP", // AKA Object
    "NULL", // === null
    "UNDEFINED", // === undefined
    "STRING",  // typeof() is string
    "INTEGER", // typeof() is number and no point/exponent
    "FLOAT", // typeof() is number with point or exponent
    "BOOLEAN", // typeof() is boolean
    "DATE", // typeof() is Date (stored as an ISO 8601 Date-Time string in UTC)
    "BUFFER", // binary Buffer
    "REFERENCE"); // reference to another object (seq index)
exports.TYPE = TYPE;

exports.PURPOSE = denum.cardinals(
    "NAME", // extends used for a name (long text names)
    "CHARS", // extends used for chars (long strings)
    "BYTES"); // extends used for bytes (binary data)

function Frame(name, loc) {
    this.name = name;
    this.loc = loc;
}

function Stack(stack, filter) {
    this.list = [];

    if (typeof(stack) != "string") {
        stack = stack.toString();
    }

    var sep = "\n    at ";
    var p = 0;
    var n = 0;
    var k = 0;
    var l = 0;
    var m = 0;
    var name;
    var loc;

    while ((n = stack.indexOf(sep, p)) >= 0) {
        n += sep.length;
        p = stack.indexOf("\n", n);

        if (p < n) {
            p = stack.length;
        }

        l = stack.indexOf("(", n);

        if ((l < 0) || (l >= p)) {
            k = p;
            loc = null;
        }
        else {
            k = l;

            l++;

            m = stack.indexOf(")", l);

            if ((m < 0) || (m >= p)) {
                loc = "";
            }
            else {
                loc = stack.substring(l, m);
            }
        }

        while ((k > n) && (stack.substring(k - 1, k) == " ")) {
            --k;
        }

        name = stack.substring(n, k);

        if (loc == null) {
            loc = name;
            name = "";
        }

        if ((filter == null) || filter(this, name, loc)) {
            this.list.push(new Frame(name, loc));
        }
    }
}

function Walker(replacer) {
    this.replacer = replacer; // ignored for now
    this.wstack = [];
    this.wstate = null;
    this.ignoredTypes = {};

    this.reset(); // absolutely necessary
}

Walker.prototype.reset = function () {
    this.depth = 0;
    this.topics = {};
}

/**
 * Performance: explicitly clear "topics" if you can guarantee no loops,
 * or would like to treat a graph as a tree.
 */
Walker.prototype.withNoLoops = function () {
    this.topics = null;

    return (this);
}

Walker.prototype.sendNamedValue = function (context, name, topic, last) {
    this.beginNamed(context, name);
    this.sendValue(context, topic, last);
    this.endNamed(context, name, last);
}

Walker.prototype.sendNullValue = function (context, last) {
    return (null);
}

Walker.prototype.sendUndefinedValue = function (context, last) {
    return (null);
}

Walker.prototype.sendBufferValue = function (context, topic, last) {
    return (null);
}

Walker.prototype.sendDateValue = function (context, topic, last) {
    return (null);
}

Walker.prototype.beginList = function (context, topic) {
    return (context);
}

Walker.prototype.endList = function (context, topic, last) {
    return (null);
}

Walker.prototype.sendFrame = function (context, topic, last) {
    return (null);
}

Walker.prototype.beginStack = function (context, topic) {
    return (context);
}

Walker.prototype.endStack = function (context, topic, last) {
    return (null);
}

Walker.prototype.beginNamed = function (context, name) {
    return (context);
}

Walker.prototype.endNamed = function (context, name, last) {
    return (null);
}

Walker.prototype.beginError = function (context, topic) {
    return (context);
}

Walker.prototype.endError = function (context, topic, last) {
    return (null);
}

Walker.prototype.beginMap = function (context, topic) {
    return (context);
}

Walker.prototype.endMap = function (context, topic, last) {
    return (null);
}

Walker.prototype.sendFloatValue = function (context, topic, last) {
    return (null);
}

Walker.prototype.sendIntegerValue = function (context, topic, last) {
    return (null);
}

Walker.prototype.sendBooleanValue = function (context, topic, last) {
    return (null);
}

Walker.prototype.sendStringValue = function (context, topic, last) {
    return (null);
}

Walker.prototype.sendLoopValue = function (context, topic, used, last) {
    return (null);
}

/**
 * This will return null if the topic has never been used
 * of if use tracking is not enabled.  It will return the
 * context key that the topic was written under otherwise.
 * This can be used for reconstruction of non-tree directed graphs.
 */
Walker.prototype.used = function (topic) {
    var result = null;

    if (this.topics == null) {
        // ignore since checks are suppressed
    }
    else if (typeof(topic) == "object") {
        for (var key in this.topics) {
            if (this.topics[key] === topic) {
                result = key;
            }
        }
    }
    else {
        // ignore since non-objects don't count
    }

    return (result);
}

/**
 * Mark returns the key, and associates the
 * topic with the key internally, if such tracking is enabled.
 * Key is typically a number or string, depending upon upper
 * layer implementation.  Negative numbers are used specially
 * as internally-generated automatic key, so don't use them here.
 */
Walker.prototype.mark = function (topic, key) {
    var result = key; // result is the same as the original key

    if (this.topics == null) {
        // ignore since checks are suppressed
    }
    else if (topic instanceof Object) {
        if (key == null) {
            if (this.topicAuto == null) {
                this.topicAuto = 0;
            }

            key = --this.topicAuto;
        }
        else {
            var keyType = typeof(key);

            if (keyType == "string") {
                // ignore
            }
            else if (keyType == "number") {
                // ignore
                if (key < 0) {
                    throw new RangeError("key cannot be passed negative " +
                        key);
                }
            }
            else {
                throw new RangeError("key must be a type or number, not " +
                    keyType);
            }
        }

        if (key in this.topics) {
            throw new RangeError("key has already been set " + key +
                " and topics are " + (this.topics[key] == topic ?
                "the same" : "different"));
        }

        this.topics[key] = topic;
    }
    else {
        throw new RangeError("only objects can be passed to mark");
    }

    return (result);
}

Walker.prototype.endListMachine = function () {
    var context = this.wstack.pop();
    var topic = this.wstack.pop();
    var last = this.wstack.pop();

    --this.depth;

    this.endList(context, topic, last);
}

/**
 * Note: this must only be called when we know the value is
 * allowed - take care.
 */
Walker.prototype.sendListValueMachine = function () {
    var context = this.wstack.pop();
    var topic = this.wstack.pop();
    var index = this.wstack.pop();
    var last = !this.queueNextListValueMachine(context, topic, index + 1);

    // push true if this is the last one.
    this.wstack.push(last);

    this.wstack.push(topic[index]);
    this.wstack.push(context);
    this.wstack.push(this.sendValueMachine);
}

Walker.prototype.endNamedMachine = function () {
    var context = this.wstack.pop();
    var name = this.wstack.pop();
    var last = this.wstack.pop();

    this.endNamed(context, name, last);
}

Walker.prototype.sendNamedValueMachine = function () {
    var context = this.wstack.pop();
    var topic = this.wstack.pop();
    var cnames = this.wstack.pop();
    var index = this.wstack.pop();
    var next = index + 1;
    var name = cnames[index];
    var last = (next == cnames.length);

    this.beginNamed(context, name);

    if (!last) {
        this.wstack.push(next);
        this.wstack.push(cnames);
        this.wstack.push(topic);
        this.wstack.push(context);
        this.wstack.push(this.sendNamedValueMachine);
    }

    this.wstack.push(last);
    this.wstack.push(name);
    this.wstack.push(context);
    this.wstack.push(this.endNamedMachine);

    this.wstack.push(last);
    this.wstack.push(topic[name]);
    this.wstack.push(context);
    this.wstack.push(this.sendValueMachine);
}

Walker.prototype.endMapMachine = function () {
    var context = this.wstack.pop();
    var topic = this.wstack.pop();
    var last = this.wstack.pop();

    --this.depth;

    this.endMap(context, topic, last);
}

// the walker allows all values, but some others don't ...
Walker.prototype.isAllowedValue = function (v) {
    return (true);
}

Walker.prototype.queueNextListValueMachine = function (scontext, topic, index) {
    var pushed;

    while ((index < topic.length) && !this.isAllowedValue(topic[index])) {
        index++;
    }

    if (index < topic.length) {
        this.wstack.push(index);
        this.wstack.push(topic);
        this.wstack.push(scontext);
        this.wstack.push(this.sendListValueMachine);
        pushed = true;
    }
    else {
        pushed = false;
    }

    return (pushed);
}

Walker.prototype.sendValueMachine = function () {
    var context = this.wstack.pop();
    var topic = this.wstack.pop();
    var last = this.wstack.pop();
    var value = topic;
    var used;

    if (topic === null) { // only null
        this.sendNullValue(context, last);
    }
    else if (topic === undefined) { // only undefined
        this.sendUndefinedValue(context, last);
    }
    else if ((used = this.used(topic)) != null) {
        this.sendLoopValue(context, topic, used, last);
    }
    else if (topic instanceof Buffer) {
        this.mark(topic, this.sendBufferValue(context, topic, last));
    }
    else if (topic instanceof Date) {
        this.mark(topic, this.sendDateValue(context, topic, last));
    }
    else if (topic instanceof Array) {
        var scontext = this.mark(topic, this.beginList(context, topic));

        this.wstack.push(last);
        this.wstack.push(topic);
        this.wstack.push(context);
        this.wstack.push(this.endListMachine);

        this.depth++;

        this.queueNextListValueMachine(scontext, topic, 0);
    }
    else if (topic instanceof Frame) {
        this.mark(topic, this.sendFrame(context, topic, last));
    }
    else if (topic instanceof Stack) {
        var scontext = this.mark(topic, this.beginStack(context, topic));

        this.depth++;

        for (var i = 0, n = topic.list.length; i < n; i++) {
            this.sendValue(scontext, topic.list[i], i == n - 1);
        }

        --this.depth;

        this.endStack(context, topic, last);
    }
    else if (topic instanceof Error) {
        var scontext = this.mark(topic, this.beginError(context, topic));

        this.depth++;

        this.sendNamedValue(scontext, "type", topic.constructor.name, false);
        this.sendNamedValue(scontext, "message", topic.message, false);

        var count = 0;

        if (topic.arguments != null) {
            count++;
        }

        if (topic.stack != null) { // only if set
            count++;
        }

        for (var cname in topic) {
            if (cname == null) { // either undefined or null
                // abundance of caution
            }
            else if (typeof(cname) != "string") {
                // nothing we're interested in
            }
            else if (cname in errorTypeSpecials) {
                // ignore - handled above
            }
            else {
                var ctopic = topic[cname];

                if (ctopic instanceof Function) {
                    // ignore
                }
                else if (!this.isAllowedValue(ctopic)) {
                    // not allowed in current mode
                }
                else {
                    count++;
                }
            }
        }

        if (topic.arguments != null) {
            this.sendNamedValue(scontext, "arguments", topic.arguments,
                --count != 0);
        }

        if (topic.stack != null) { // only if set
            this.sendNamedValue(scontext, "stack", new Stack(topic.stack),
                --count != 0);
        }

        for (var cname in topic) {
            if (cname == null) { // either undefined or null
                // abundance of caution
            }
            else if (typeof(cname) != "string") {
                // nothing we're interested in
            }
            else if (cname in errorTypeSpecials) {
                // ignore - handled above
            }
            else {
                var ctopic = topic[cname];

                if (ctopic instanceof Function) {
                    // ignore
                }
                else if (!this.isAllowedValue(ctopic)) {
                    // not allowed in current mode
                }
                else {
                    // @todo consider additional BSON filtering at this level
                    this.sendNamedValue(scontext, cname, ctopic,
                        --count != 0);
                }
            }
        }

        --this.depth;

        this.endError(context, topic, last);
    }
    else if (topic instanceof Object) {
        var scontext = this.mark(topic, this.beginMap(context, topic));
        var cnames = [];

        for (var cname in topic) {
            if (cname == null) { // either undefined or null
                // abundance of caution
            }
            else if (typeof(cname) != "string") {
                // nothing we're interested in
            }
            else if (!this.isAllowedValue(topic[cname])) {
                // not allowed in current mode
            }
            else {
                cnames.push(cname);
            }
        }

        this.depth++;

        this.wstack.push(last);
        this.wstack.push(topic);
        this.wstack.push(context);
        this.wstack.push(this.endMapMachine);

        if (cnames.length > 0) {
            this.wstack.push(0);
            this.wstack.push(cnames);
            this.wstack.push(topic);
            this.wstack.push(scontext);
            this.wstack.push(this.sendNamedValueMachine);
        }
    }
    else {
        type = typeof(topic);

        if (type == "number") {
            var value = "" + topic; // as string

            if (value.indexOf(".") >= 0) {
                this.sendFloatValue(context, topic, last);
            }
            else if (value.indexOf("E") >= 0) {
                this.sendFloatValue(context, topic, last);
            }
            else {
                this.sendIntegerValue(context, topic, last);
            }
        }
        else if (type == "boolean") {
            this.sendBooleanValue(context, topic, last);
        }
        else if (type == "string") {
            this.sendStringValue(context, topic, last);
        }
        else if (type in this.ignoredTypes) {
            this.ignoredTypes[type]++;
        }
        else {
            this.ignoredTypes[type] = 1;
        }
    }
}

Walker.prototype.sendValue = function (context, topic, last) {
    var level = this.wstack.length;

    this.wstack.push(last);
    this.wstack.push(topic);
    this.wstack.push(context);
    this.wstack.push(this.sendValueMachine);

    this.exhaustMachine(level);
}

Walker.prototype.stepMachine = function () {
    var fn = this.wstack.pop();

    if (!(fn instanceof Function)) {
        this.wstack.push(fn);

        throw new Error("need function at wstack=" +
            JSON.stringify(this.wstack));
    }

    fn.call(this);
}

Walker.prototype.exhaustMachine = function (level) {
    while (this.wstack.length > level) {
        this.stepMachine();
    }
}

/**
 * Partial default implementation of Walker
 */

util.inherits(DefaultWalker, Walker);

function DefaultWalker() {
    Walker.call(this);

    this.names = [];
}

DefaultWalker.prototype.sendRecord = function (context, type, name, topic) {
    throw new denum.UnsupportedError();
}

DefaultWalker.prototype.sendNullValue = function (context) {
    this.sendRecord(context, TYPE.NULL, this.cname, null);
}

DefaultWalker.prototype.sendUndefinedValue = function (context) {
    this.sendRecord(context, TYPE.UNDEFINED, this.cname, null);
}

DefaultWalker.prototype.sendBufferValue = function (context, topic) {
    return (this.sendRecord(context, TYPE.BUFFER, this.cname,
        topic.toString("base64")));
}

DefaultWalker.prototype.sendDateValue = function (context, topic) {
    return (this.sendRecord(context, TYPE.DATE, this.cname,
        topic.toISOString()));
}

DefaultWalker.prototype.beginList = function (context, topic) {
    return (this.sendRecord(context, TYPE.LIST, this.cname, null));
}

DefaultWalker.prototype.endList = function (context, topic) {
    // done
}

DefaultWalker.prototype.sendFrame = function (context, topic) {
    return (this.sendRecord(context, TYPE.FRAME, topic.name, topic.loc));
}

DefaultWalker.prototype.beginStack = function (context, topic) {
    return (this.sendRecord(context, TYPE.STACK, this.cname, null));
}

DefaultWalker.prototype.endStack = function (context, topic) {
    //done
}

DefaultWalker.prototype.beginNamed = function (context, name) {
    this.names.push(this.cname);
    this.cname = name;
}

DefaultWalker.prototype.endNamed = function (context, name, last) {
    this.cname = this.names.pop();
}

DefaultWalker.prototype.beginError = function (context, topic) {
    return (this.sendRecord(context, TYPE.ERROR, this.cname, null));
}

DefaultWalker.prototype.endError = function (context, topic) {
    // done
}

DefaultWalker.prototype.beginMap = function (context, topic) {
    return (this.sendRecord(context, TYPE.MAP, this.cname, null));
}

DefaultWalker.prototype.endMap = function (context, topic) {
    // done
}

DefaultWalker.prototype.sendFloatValue = function (context, topic) {
    return (this.sendRecord(context, TYPE.FLOAT, this.cname,
        denum.renderNumberEncoding(topic)));
}

DefaultWalker.prototype.sendIntegerValue = function (context, topic) {
    return (this.sendRecord(context, TYPE.INTEGER, this.cname,
        denum.renderNumberEncoding(topic)));
}

DefaultWalker.prototype.sendBooleanValue = function (context, topic) {
    return (this.sendRecord(context, TYPE.BOOLEAN, this.cname,
        topic.toString()));
}

DefaultWalker.prototype.sendStringValue = function (context, topic) {
    return (this.sendRecord(context, TYPE.STRING, this.cname,
        topic.toString()));
}

DefaultWalker.prototype.sendLoopValue = function (context, topic, used) {
    this.sendRecord(context, TYPE.REFERENCE, this.cname, used);
}

DefaultWalker.prototype.reset = function () {
    this.cname = null;
    this.names = []; // clear names
    Walker.prototype.reset.call(this); // clear used
}

exports.DefaultWalker = DefaultWalker;

/**
 * Walker-based JSON Stringify implementation
 */

util.inherits(Stringify, Walker);

function Stringify(replacer, shift) {
    Walker.call(this, replacer); // note reset will be called in here ...

    this.s = "";

    if (typeof(shift) == "number") {
        shift = Math.min(shift, 10); // similar to JSON.
        this.opts = { shift: shift };
    }
    else if (typeof(shift) == "object") {
        this.opts = shift;
        shift = this.opts.shift;

        if (shift == null) {
            shift = 4;
        }
    }
    else if (shift == null) {
        shift = 4; // similar to JSON.
        this.opts = { shift: shift };
    }
    else {
        throw new Error("unsupported options/whitespace arg: " +
            typeof(shift));
    }

    this.shift = shift;
    this.shiftError = null;
    this.looseFrames = false;
    this.looseTop = false;
    this.looseNames = false;

    if (this.opts.tree) {
        this.withNoLoops();
    }
}

Stringify.prototype.isAllowedValue = function (v) {
    var allow;

    if (v instanceof Function) {
        allow = false;
    }
    else if (!this.opts.strict) {
        allow = true;
    }
    else if (v === undefined) {
        allow = false;
    }
    else if (typeof(v) == "number") {
        if (Number.isNaN(v)) {
            allow = false;
        }
        else {
            allow = true;
        }
    }
    else {
        allow = true;
    }

    return (allow);
}

Stringify.prototype.reset = function () {
    this.s = "";
    this.prior = false;
    this.only = true; // do not add whitespace for only the next one

    if ((this.shiftStack == null) || (this.shiftStack.length != 0)) {
        this.shiftStack = [];
    }

    Walker.prototype.reset.call(this);
}

Stringify.prototype.resultOfValue = function (name, value) {
    this.reset();
    this.sendValue(name, value, true);

    return (this.s);
}

Stringify.prototype.quotePrivate = function (s) {
    if (typeof(s) != "string") {
        "" + s;
    }

    this.s += JSON.stringify(s);
}

Stringify.prototype.indent = function () {
    if (this.only) {
        this.only = false;
    }
    else if (this.shift < 0) {
        // nothing
    }
    else {
        this.s += "\n";

        var need = this.shift * this.depth;

        while (need > 0) {
            this.s += " ";
            --need;
        }
    }
}

Stringify.prototype.sep = function (s) {
    if (this.prior) {
        if (this.shift < 0) {
            this.s += ", ";
        }
        else {
            this.s += ",";
        }
    }

    this.indent();

    if (s != null) {
        this.s += s;
    }

    this.prior = true;
}

Stringify.prototype.nosep = function (s) {
    this.indent();

    if (s != null) {
        this.s += s;
    }

    this.prior = true;
}

Stringify.prototype.sendNullValue = function (context) {
    this.sep("null");

    return (null);
}

Stringify.prototype.sendUndefinedValue = function (context) {
    this.sep("undefined");

    return (null);
}

Stringify.prototype.b16dict = "0123456789abcdef";

Stringify.prototype.sendBufferValue = function (context, topic) {
    this.sep("{ ");
    this.quotePrivate("$bindata");
    this.s += ": ";
    var s = "0x";

    for (var i = 0, n = topic.length; i < n; i++) {
        var b = topic[i];

        s += this.b16dict[(b >> 4) & 0xf];
        s += this.b16dict[b & 0xf];
    }

    this.quotePrivate(s);
    this.s += " }";
    this.prior = true;

    return (null);
}

Stringify.prototype.sendDateValue = function (context, topic) {
    this.sep("{ ");
    this.quotePrivate("$date");
    this.s += ": ";
    this.quotePrivate(topic.toISOString());
    this.s += " }";
    this.prior = true;

    return (null);
}

Stringify.prototype.beginList = function (context, topic) {
    this.sep("[");
    this.prior = false;

    return (context);
}

Stringify.prototype.endList = function (context, topic) {
    this.only = !this.prior;
    this.nosep("]");

    return (context);
}

Stringify.prototype.sendFrame = function (context, topic) {
    if (this.looseFrames) {
        this.sep(topic.name + "() " + topic.loc);
    }
    else {
        this.sep("{ \"name\": ");
        this.quotePrivate(topic.name);
        this.s += ", \"loc\": ";
        this.quotePrivate(topic.loc);
        this.s += " }";
    }

    this.prior = true;

    return (null);
}

Stringify.prototype.beginStack = function (context, topic) {
    if (this.shiftError != null) {
        this.shiftStack.push(this.shift);
        this.shift = this.shiftError;
    }

    this.sep("[");
    this.prior = false;

    return (null);
}

Stringify.prototype.endStack = function (context, topic) {
    this.only = !this.prior;
    this.nosep("]");
    this.prior = true;

    if (this.shiftError != null) {
        this.shift = this.shiftStack.splice(this.shiftStack.length - 1)[0];
    }

    return (null);
}

Stringify.prototype.beginError = function (context, topic) {
    this.sep("{");
    this.prior = false;

    return (context);
}

Stringify.prototype.endError = function (context, topic) {
    this.only = !this.prior;
    this.nosep("}");
    this.prior = true;

    return (null);
}

Stringify.prototype.isLooseName = function (name) {
    var i = name.length - 1;
    var c;

    while ((i > 0) &&
            ((((c = name.charCodeAt(i)) >= 0x41) && (c <= 0x5a)) ||
            ((c >= 0x61) && (c <= 0x7a)) ||
            ((c >= 0x30) && (c <= 0x39)) ||
            (c == 0x5F))) {
        --i;
    }

    return ((i == 0) &&
            ((((c = name.charCodeAt(i)) >= 0x41) && (c <= 0x5a)) ||
            ((c >= 0x61) && (c <= 0x7a))));
}

Stringify.prototype.beginNamed = function (context, name) {
    this.sep("");

    if (this.looseNames && this.isLooseName(name)) {
        this.s += name;
    }
    else {
        this.quotePrivate(name);
    }

    this.s += ": ";

    this.prior = false;
    this.only = true;

    return (context);
}

Stringify.prototype.endNamed = function(context, name, last) {
    // do nothing 
    return (null);
}

Stringify.prototype.beginMap = function (context, topic) {
    this.sep("{");
    this.prior = false;

    return (context);
}

Stringify.prototype.endMap = function (context, topic) {
    this.only = !this.prior;
    this.nosep("}");
    this.prior = true;

    return (null);
}

Stringify.prototype.sendFloatValue = function (context, topic) {
    this.sep("" + topic);
    this.prior = true;

    return (null);
}

Stringify.prototype.sendIntegerValue = function (context, topic) {
    this.sep("" + topic);
    this.prior = true;

    return (null);
}

Stringify.prototype.sendBooleanValue = function (context, topic) {
    this.sep("" + topic);
    this.prior = true;

    return (null);
}

Stringify.prototype.sendStringValue = function (context, topic) {
    this.sep("");
    this.quotePrivate(topic);
    this.prior = true;

    return (null);
}

Stringify.prototype.sendLoopValue = function (context, topic, used) {
    this.sep("");
    this.quotePrivate("$loop " + used);
    this.prior = true;

    return (null);
}

util.inherits(Streamer, Stringify);

function Streamer(writable, replacer, indent) {
    Stringify.call(this, replacer, indent);

    this.writable = writable;
    this.stringLimit = 32768;
}

/**
 * Invoke stepMachine repeatedly until the string limit is reached,
 * or the stack is exhausted, then flush any unflushed string, rinse
 * and repeat.  When the stack is exhausted and the string is flushed,
 * call back.
 */
Streamer.prototype.flushMachine = function (level, callback) {
    var self = this;

    while ((level < this.wstack.length) &&
            (this.s.length < this.stringLimit)) {
        this.stepMachine();
    }

    if (this.s.length > 0) {
        this.flush(function (error) {
                if (error != null) {
                    callback(error);
                }
                else {
                    self.flushMachine(level, callback);
                }
            });
    }
    else {
        callback();
    }
}

/**
 * This is the safe and scalable way of sending a value to a stream.
 */
Streamer.prototype.flushValue = function (topic, callback) {
    var level = this.wstack.length;

    this.wstack.push(true);
    this.wstack.push(topic);
    this.wstack.push(null); // context
    this.wstack.push(this.sendValueMachine);

    this.flushMachine(level, callback);
}

Streamer.prototype.flush = function (callback) {
    var s = this.s;

    this.s = "";

    var r = this.writable.write(s, "UTF-8");

    // this is a little stupid ... would be better if we could use write cb
    if (r) {
        callback(null);
    }
    else {
        this.writable.once('drain', callback);
    }
}

/**
 * This is an internal hack right now - should bolt it onto the
 * Walker() machine and generate the tree from there in the long run.
 * May want to refactor the lower level API of the walker as an event
 * interface (a la SAX).
 */
function Parser() {
    /**
     * The state records what we expect to parse or do next.
     */
    this.state = this.STATE.VALUE;
    /**
     * The result is pushed into the args at the end.  This is an array
     * in anticipation of use cases where multiple chunks of separately
     * parsed JSON are accrued here, though that feature not used at time
     * of writing.
     */
    this.args = [];
    /**
     * The current path into the object tree that we are building.
     */
    this.stack = [this.args];
    this.error = null;
    /**
     * An input line counter.
     */
    this.line = 1;
    /**
     * An input line column counter - not hugely accurate.
     */
    this.char = 1;
    /**
     * The text value currently being built - this can span calls and
     * accrue data over them.
     */
    this.text = null;
    /**
     * This is the depth at which the parser becomes shallow, which means
     * that it wraps up parsed content as a string rather than parsing
     * into an object sub tree.  By default this is about 2G, since
     * that will be far larger than the number of objects that node should
     * be dealing with in memory.  Theoretically, this should be able to be
     * changed at any point so long as the new and old value are both 
     * greater than the current stack depth.  An important thing to remember
     * is that the names of object properties count as a separate stack
     * level.
     */
    this.shallow = 0x7fffffff; // depth at which parser becomes shallow
    /**
     * The current segment being parsed.
     */
    this.segment = "";
    /**
     * The cached length of the segment.
     */
    this.length = 0;
    /**
     * The read position in the segment.
     */
    this.index = 0;
    /**
     * A mark for restoration or reconstruction (often less than index).
     */
    this.mark = 0;
    /**
     * The starting capture position for a shallow result (cardinal)
     * or the explicit value false.
     */
    this.capture = false;
    /**
     * Any accrued capture text over segment boundaries.
     */
    this.ctext = null;
    /**
     * Strict conformance with the standard means not accepting
     * any BSONish stream items.  By default, we're lenient about this.
     */
    this.standard = false;
    this.special = null; // frame is special, eg $date
}

/**
 * These three values are intended as immutable placeholders
 * in the stack when parsing shallow sections.  These shouldn't
 * be modified or visible in output.
 */
Parser.prototype.PLACE_ARRAY = ["x-array"];
Parser.prototype.PLACE_OBJECT = {"x-object": true};
Parser.prototype.PLACE_STRING = "x-string"; // specifically a string
Parser.prototype.PLACE_VALUE = "x-value"; // replaces any value

Parser.prototype.CHAR = {
        OPEN_BRACE: "{"/*}*/.charCodeAt(0),
        CLOSE_BRACE: /*{*/"}".charCodeAt(0),
        OPEN_BRACKET: "["/*]*/.charCodeAt(0),
        CLOSE_BRACKET: /*[*/"]".charCodeAt(0),
        NEWLINE: "\n".charCodeAt(0),
        RETURN: "\r".charCodeAt(0),
        DOUBLE_QUOTE: "\"".charCodeAt(0),
        SLASH: "/".charCodeAt(0),
        BACKSLASH: "\\".charCodeAt(0),
        TAB: 9,
        COLON: ":".charCodeAt(0),
        SPACE: " ".charCodeAt(0),
        COMMA: ",".charCodeAt(0),
        DOT: ".".charCodeAt(0),
        DASH: "-".charCodeAt(0),
        ZERO: "0".charCodeAt(0),
        NINE: "9".charCodeAt(0),
        LOWER_A: "a".charCodeAt(0),
        LOWER_B: "b".charCodeAt(0),
        LOWER_E: "e".charCodeAt(0),
        LOWER_F: "f".charCodeAt(0),
        LOWER_N: "n".charCodeAt(0),
        LOWER_R: "r".charCodeAt(0),
        LOWER_T: "t".charCodeAt(0),
        LOWER_U: "u".charCodeAt(0),
        LOWER_Z: "z".charCodeAt(0),
        UPPER_A: "A".charCodeAt(0),
        UPPER_E: "E".charCodeAt(0),
        UPPER_Z: "Z".charCodeAt(0),
    };

Parser.prototype.STATE = {};
Parser.prototype.STATE.ERROR = -1;
Parser.prototype.STATE.COUNT = 0;
Parser.prototype.STATE.END = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.DONE = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.VALUE = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.MAP = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.LIST = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.NAME = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.STRING = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.ASSIGN = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.SEPARATOR = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.NUMBER = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.NUMBER_END = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.WORD = Parser.prototype.STATE.COUNT++;
Parser.prototype.STATE.WORD_END = Parser.prototype.STATE.COUNT++;

Parser.prototype.stext = function (from, upto) {
    return (this.segment.substring(from, upto));
}

Parser.prototype.schar = function (index) {
    return (this.segment.charCodeAt(index));
}

Parser.prototype.pop = function () {
    var result = this.stack.pop();

    if (this.stack.length === this.shallow) { // important ===
        result = this.ctext; // get the accrued text so far

        if (this.mark > this.capture) {
            var save = this.segment.substring(this.capture, this.mark);

            if (result.length > 0) { // only append if we have to
                result += save;
            }
            else {
                result = save;
            }

        } // otherwise result does not change

        this.capture = false; // no longer capturing
        this.ctext = null; // clear the accrued text to non-string
    }

    return (result);
}

Parser.prototype.push = function (v) {
    if (this.stack.length === this.shallow) { // important ===
        this.capture = this.mark;
        this.ctext = "";
    }

    return (this.stack.push(v));
}

Parser.prototype.peek = function (n) {
    var l = this.stack.length;

    n = l - (n || 0) - 1;

    if ((n < 0) || (n >= l)) {
        throw new Error("illegal state");
    }

    return (this.stack[n]);
}

Parser.prototype.consume = function (skipWhite) {
    var c;

    do {
        if (this.index === this.length) {
            c = -1;
        }
        else {
            c = this.segment.charCodeAt(this.index++);

            if (c === this.CHAR.NEWLINE) {
                this.line++;
                this.char = 1;
            }
            else {
                this.char++;
            }
        }
    }
    while ((c >= 0) && (skipWhite && ((c === this.CHAR.RETURN) ||
        (c === this.CHAR.NEWLINE) || (c === this.CHAR.SPACE) ||
        (c === this.CHAR.TAB))));

    return (c);
}

/**
 * Returns: -1 on error, 0 on complete and > 0 if needs more chars.
 */
Parser.prototype.parsePart = function (s, last) {
    if (this.length === 0) {
        this.segment = s;
        this.length = s.length;
    }
    else {
        this.segment += s;
        this.length += s.length;
    }

    var state = this.state;
    var special = this.special;
    var error = null;
    var wait = false;
    var limit = (this.length + 1) * 16;
    var c;

    while ((state > this.STATE.END) && !wait) {
        if (--limit <= 0) {
            throw new Error("illegal state: parser loop at state " + state +
                " line=" + this.line +
                " char=" + this.char +
                " text='" + this.text + "'" +
                " mark=" + this.mark +
                " index=" + this.index +
                " length=" + this.length);
        }
        else if (state === this.STATE.DONE) {
            /*
                This section of code is critical to both
                stack management and assembly of objects.
                Note that property names are pushed to the
                stack and consume a stack slot.
            */
            var v = this.peek();

            if (this.stack.length == 0) {
                error = "illegal condition: empty stack";
                state = this.STATE.ERROR;
            }
            else {
                var vv = this.peek(1);

                if (vv instanceof Array) {
                    v = this.pop(); // remove the value, must reassign

                    if (vv !== this.PLACE_ARRAY) {
                        vv.push(v);
                    }

                    state = this.STATE.SEPARATOR;
                }
                else if (vv instanceof Object) {
                    if (typeof(v) == "string") {
                        state = this.STATE.ASSIGN;
                    }
                    else {
                        error = "illegal context type " + typeof(vv) +
                            " for " + typeof(this.v);
                    }
                }
                else if (typeof(vv) == "string") {
                    v = this.pop(); // remove the value, must reassign
                    this.pop(); // remove the property, name === vv

                    var vvv = this.peek(); // get the map object

                    if (vvv !== this.PLACE_OBJECT) {
                        vvv[vv] = v; // assign the property

                        // leave on stack, change state
                        if (vv === "$date") {
                            special = vv;
                        }
                    }

                    state = this.STATE.SEPARATOR;
                }
                else {
                    error = "illegal context type " + typeof(vv) +
                        " for " + typeof(this.v);
                    state = this.STATE.ERROR;
                }
            }
        }
        else if (state === this.STATE.VALUE) {
            c = this.consume(true);

            if (c === this.CHAR.OPEN_BRACE) {
                this.mark = this.index - 1; // mark the beginning brace

                if (this.shallow <= this.stack.length) {
                    this.push(this.PLACE_OBJECT);
                }
                else {
                    this.push({});
                }

                state = this.STATE.MAP;
            }
            else if (c === this.CHAR.OPEN_BRACKET) {
                this.mark = this.index - 1; // mark the beginning bracket

                if (this.shallow <= this.stack.length) {
                    this.push(this.PLACE_ARRAY);
                }
                else {
                    this.push([]);
                }

                state = this.STATE.LIST;
            }
            else if (c === this.CHAR.DOUBLE_QUOTE) {
                this.mark = this.index;
                this.text = "";
                state = this.STATE.STRING;
            }
            else if ((c === this.CHAR.DASH) || // numbers start with these
                    ((c >= this.CHAR.ZERO) && (c <= this.CHAR.NINE))) {
                this.mark = this.index - 1;
                --this.char;
                this.text = "";
                state = this.STATE.NUMBER;
            }
            else if ((c >= this.CHAR.UPPER_A) && (c <= this.CHAR.UPPER_Z)) {
                this.mark = this.index - 1;
                --this.char;
                this.text = "";
                state = this.STATE.WORD;
            }
            else if ((c >= this.CHAR.LOWER_A) && (c <= this.CHAR.LOWER_Z)) {
                this.mark = this.index - 1;
                --this.char;
                this.text = "";
                state = this.STATE.WORD;
            }
            else if (c < 0) {
                if (last) {
                    if (this.stack.length > 1) {
                        error = "bad nesting depth " + this.stack.length;
                        state = this.STATE.ERROR;
                    }

                    state = this.STATE.END;
                }
                else {
                    wait = true; // no state change
                }
            }
            else {
                error = "illegal char " + c + " in state " + state;
                state = this.STATE.ERROR;
            }
        }
        else if (state === this.STATE.MAP) { // in a map, ready for name
            c = this.consume(true);

            if (c === this.CHAR.DOUBLE_QUOTE) {
                this.mark = this.index;
                this.text = "";
                state = this.STATE.STRING;
            }
            else if (c === this.CHAR.CLOSE_BRACE) {
                // empty map - do no special processing
                state = this.STATE.DONE;
            }
            else if (c < 0) {
                wait = true;
            }
            else {
                error = "illegal char " + c + " in state " + state;
                state = this.STATE.ERROR;
            }
        }
        else if (state === this.STATE.LIST) { // in a list, ready for value
            c = this.consume(true);

            if (c === this.CHAR.CLOSE_BRACKET) {
                state = this.STATE.DONE;
            }
            else if (c < 0) {
                wait = true;
            }
            else {
                --this.index; // wind back over non whitespace char
                state = this.STATE.VALUE;
            }
        }
        else if (state === this.STATE.STRING) { // in string
            c = this.consume(false);

            if (c === this.CHAR.DOUBLE_QUOTE) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark, this.index - 1);
                }

                this.mark = this.index;

                if (this.capture === false) {
                    this.push(this.text);
                }
                else {
                    this.push(this.PLACE_STRING);
                }

                state = this.STATE.DONE;
            }
            else if (c < 0) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark, this.index);
                }

                this.mark = this.index;

                if (last) {
                    error = "unterminated string";
                    state = this.STATE.ERROR;
                }
                else {
                    wait = true;
                }
            }
            else if (c !== this.CHAR.BACKSLASH) {
                // keep processing
            }
            else if (this.index == this.length) {
                // back over backslash
                --this.index;
                --this.char;

                if (last) {
                    error = "incomplete backslash escape";
                    state = this.STATE.ERROR;
                }
                else {
                    wait = true; // wait for more content
                }
            }
            else if ((c = this.schar(this.index++)) === 
                    this.CHAR.LOWER_U) {
                if (this.index + 4 > this.length) {
                    this.index -= 2;
                    --this.char;

                    if (last) {
                        error = "incomplete unicode escape";
                        state = this.STATE.ERROR;
                    }
                    else {
                        wait = true; // wait for more content
                    }
                }
                else {
                    var sn = this.stext(this.index, this.index + 4);
                    var n;

                    if (!/^[0-9A-Fa-f]{4}$/.test(sn)) {
                        error = "illegal unicode escape '" + sn +
                            "' in state " + state;
                        state = this.STATE.ERROR;
                    }
                    else if (isNaN(n = parseInt(sn, 16))) {
                        error = "failed unicode escape '" + sn +
                            "' in state " + state;
                        state = this.STATE.ERROR;
                    }
                    else {
                        if (this.capture === false) {
                            this.text += this.stext(this.mark,
                                this.index - 2) + String.fromCharCode(n);
                        }

                        this.index += 4;
                        this.mark = this.index;
                    }
                }
            }
            else if ((c === this.CHAR.DOUBLE_QUOTE) ||
                    (c === this.CHAR.BACKSLASH) ||
                    (c === this.CHAR.SLASH)) {
                /*
                    In this case, the char we want is c, and it is currently
                    at this.index - 1, while the escape is at this.index - 2.
                    So for these three, we don't need to add them explicitly,
                    we can just manipulate the mark to add them later.
                */
                if (this.capture === false) {
                    this.text += this.stext(this.mark, this.index - 2);
                }

                this.mark = this.index - 1;
                --this.char;
            }
            else if (c === this.CHAR.LOWER_B) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark,
                        this.index - 2) + "\b";
                }

                this.mark = this.index;
            }
            else if (c === this.CHAR.LOWER_F) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark,
                        this.index - 2) + "\f";
                }

                this.mark = this.index;
            }
            else if (c === this.CHAR.LOWER_N) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark,
                        this.index - 2) + "\n";
                }

                this.mark = this.index;
            }
            else if (c === this.CHAR.LOWER_R) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark,
                        this.index - 2) + "\r";
                }

                this.mark = this.index;
            }
            else if (c === this.CHAR.LOWER_T) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark,
                        this.index - 2) + "\t";
                }

                this.mark = this.index;
            }
            else {
                error = "illegal char " + c + " in state " + state;
                state = this.STATE.ERROR;
            }
        }
        else if (state === this.STATE.ASSIGN) {
            c = this.consume(true); // skip white

            if (c < 0) {
                if (last) {
                    error = "eof in state " + state;
                    state = this.STATE.ERROR;
                }
                else {
                    wait = true;
                }
            }
            else if (c == this.CHAR.COLON) {
                state = this.STATE.VALUE;
            }
            else {
                error = "illegal char " + c + " in state " + state;
                state = this.STATE.ERROR;
            }
        }
        else if (state === this.STATE.SEPARATOR) {
            c = this.consume(true);

            if (c < 0) {
                if (last) {
                    if (this.stack.length != 1) {
                        error = "eof in state " + state;
                        state = this.STATE.ERROR;
                    }
                    else {
                        state = this.STATE.END;
                    }
                }
                else {
                    wait = true;
                }
            }
            else if (c == this.CHAR.COMMA) {
                this.mark = this.index;

                if (this.peek() instanceof Array) {
                    state = this.STATE.VALUE;
                }
                else if (this.peek() instanceof Object) {
                    state = this.STATE.MAP;
                }
                else {
                    error = "illegal condition " + state;
                    state = this.STATE.ERROR;
                }
            }
            else if (c == this.CHAR.CLOSE_BRACE) {
                this.mark = this.index;
                state = this.STATE.DONE;

                // non-empty map - must do special processing
                if (special !== null) {
                    if (special === "$date") {
                        var v = this.pop();

                        v = new Date(v["$date"]);

                        this.push(v);
                    }
                    else {
                        // unsupported special, just ignore
                    }

                    special = null;
                }
            }
            else if (c == this.CHAR.CLOSE_BRACKET) {
                this.mark = this.index;
                state = this.STATE.DONE;
            }
            else {
                error = "illegal char " + c + " in state " + state;
                state = this.STATE.ERROR;
            }
        }
        else if (state === this.STATE.NUMBER) {
            c = this.consume(false);

            if (c < 0) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark, this.index);
                }

                this.mark = this.index;

                if (last) {
                    state = this.STATE.NUMBER_END;
                }
                else {
                    wait = true;
                }
            }
            else if ((c >= this.CHAR.ZERO) && (c <= this.CHAR.NINE)) {
                // continue
            }
            else if ((c == this.CHAR.DOT) || (c == this.CHAR.DASH)) {
                // continue
            }
            else if ((c == this.CHAR.UPPER_E) || (c == this.CHAR.LOWER_E)) {
                // continue
            }
            else {
                --this.index; // safe rewind (no white)

                if (c == this.CHAR.NEWLINE) {
                    --this.line; // hack to fix line advance - char is wrong
                }

                if (this.capture === false) {
                    this.text += this.stext(this.mark, this.index);
                }

                this.mark = this.index;
                state = this.STATE.NUMBER_END;
            }
        }
        else if (state === this.STATE.NUMBER_END) {
            if (this.capture !== false) {
                this.push(this.PLACE_VALUE);
            }
            else {
                this.push(1.0 * this.text);
            }

            state = this.STATE.DONE;
        }
        else if (state === this.STATE.WORD) {
            c = this.consume(false);

            if (c < 0) {
                if (this.capture === false) {
                    this.text += this.stext(this.mark, this.index);
                }

                this.mark = this.index;

                if (last) {
                    state = this.STATE.WORD_END;
                }
                else {
                    wait = true;
                }
            }
            else if ((c >= this.CHAR.LOWER_A) && (c <= this.CHAR.LOWER_Z)) {
                // continue
            }
            else {
                --this.index; // safe rewind (no white)

                if (c == this.CHAR.NEWLINE) {
                    --this.line; // hack to fix line advance - char is wrong
                }

                if (this.capture === false) {
                    this.text += this.stext(this.mark, this.index);
                }

                this.mark = this.index;
                state = this.STATE.WORD_END;
            }
        }
        else if (state === this.STATE.WORD_END) {
            if (this.capture !== false) {
                this.push(this.PLACE_VALUE);
                state = this.STATE.DONE;
            }
            else if (this.text == "true") {
                this.push(true);
                state = this.STATE.DONE;
            }
            else if (this.text == "false") {
                this.push(false);
                state = this.STATE.DONE;
            }
            else if (this.text == "null") {
                this.push(null);
                state = this.STATE.DONE;
            }
            else if (this.text == "undefined") {
                if (!this.standard) {
                    this.push(undefined);
                    state = this.STATE.DONE;
                }
                else {
                    error = "non-standard keyword: " + this.text;
                    state = this.STATE.ERROR;
                }
            }
            else {
                error = "invalid keyword: " + this.text;
                state = this.STATE.ERROR;
            }
        }
        else {
            error = "illegal state " + state;
            state = this.STATE.ERROR;
        }
    }

    if (state == null) {
        error = "illegal null state";
        state = this.STATE.ERROR;
    }

    this.error = error;
    this.state = state;
    this.special = special;

    var discard = Math.max(0, Math.min(this.mark, this.index));

    if (this.shallow < this.stack.length) {
        var save = this.segment.substring(this.capture, discard);

        if (this.ctext.length > 0) { // only append if necessary
            this.ctext += save;
        }
        else {
            this.ctext = save;
        }

        this.capture = 0; // catch up to discard
    }

    if (discard == this.length) {
        this.segment = "";
        this.length = 0;
    }
    else {
        this.segment = this.segment.substring(discard);
        this.length -= discard;
    }

    this.index -= discard;
    this.mark -= discard;

    return (this.state);
}

exports.Parser = Parser;

var default_json_opts = { tree: true, strict: true, shift: 4 };

/**
 * Asynchronously loads compressed JSON in a scalable way from the
 * provided path, and provides the results via callback(error, json).
 */
exports.loadGZJSONPath = function (zpath, opts, callback) {
        if (callback === undefined) { // do not match null
            return (Q.nfcall(exports.loadGZJSONPath, // shortcut to Q
                zpath, opts));
        }

        if (opts == null) {
            opts = default_json_opts;
        }


        var stream = fs.createReadStream(zpath, {}).
            on('error', function (error) {
                callback(error);
                callback = function () { }; // do nothing after error
            });
        var dec = new string_decoder.StringDecoder("utf8");
        var parser = new Parser();

        stream.pipe(zlib.createGunzip()).
            on("error", function (error) {
                callback(error);
                callback = function () { }; // do nothing after error
            }).
            on("data", function (buf) {
                if (parser.parsePart(dec.write(buf), false) < 0) {
                    callback(new Error(parser.error +
                        " " + zpath + "(" + parser.line + "," + 
                        parser.char + ") near/after " + parser.text));
                    callback = function () { }; // do nothing after error
                }
            }).
            on("end", function () {
                if (parser.parsePart(dec.end(), true) < 0) {
                    callback(new Error(parser.error +
                        " " + zpath + "(" + parser.line + "," + 
                        parser.char + ") near/after " + parser.text));
                }
                else if (parser.args.length == 0) { // nothing in stream
                    callback(null, null);
                }
                else {
                    callback(null, parser.args[0]);
                }
            });
    };

util.inherits(ParserStream, node_stream.Transform);

function ParserStream(opts) {
    if (opts == null) {
        opts = {};
    }

    opts.objectMode = true;

    node_stream.Transform.call(this, opts);

    this.path = (opts && opts.path) || "<unknown>";
    this.depth = (opts && opts.depth) || 2;
    this.parser = new Parser();

    if (opts && opts.shallow) {
        this.parser.shallow = this.depth;
    }

    this.dec = new string_decoder.StringDecoder("utf8");
    this.total = 0;
}

ParserStream.prototype._ltransform = function (decoded, last, callback) {
    if (this.parser.parsePart(decoded, last) < 0) {
        return (callback(new Error(this.parser.error +
            " " + this.path + "(" + this.parser.line + "," + 
            this.parser.char + ") near/after " + this.parser.text)));
    }

    this.total += decoded.length;

    var index = this.depth - 1;

    if (this.parser.stack.length > index) {
        var item = this.parser.stack[index];

        if (!(item instanceof Array)) {
            item = null;
        }
        else if (item.length < (last ? 1 : 2)) {
            item = null;
        }
        else {
            var count;

            if (last) {
                count = item.length;
            }
            else {
                count = item.length - 1;
            }

            this.push(item.splice(0, count));
        }
    }

    callback();
}

ParserStream.prototype._transform = function (chunk, encoding, callback) {
    this._ltransform(this.dec.write(chunk), false, callback);
}

ParserStream.prototype._flush = function (callback) {
    this._ltransform(this.dec.end(), true, callback);
}

exports.ParserStream = ParserStream;

/**
 * Asynchronously loads uncompressed JSON in a scalable way from the
 * provided path, and provides the results via callback(error, json).
 */
exports.loadJSONStream = function (stream, opts, callback) {
        if (callback === undefined) { // do not match null
            return (Q.nfcall(exports.loadJSONStream, // shortcut to Q
                stream, opts));
        }

        if (opts == null) {
            opts = default_json_opts;
        }

        var dec = new string_decoder.StringDecoder("utf8");
        var parser = new Parser();

        stream.on("error", function (error) {
                callback(error);
                callback = function () { }; // do nothing after error
            }).
            on("data", function (buf) {
                if (parser.parsePart(dec.write(buf), false) < 0) {
                    callback(new Error(parser.error +
                        "(" + parser.line + "," + 
                        parser.char + ") near/after " + parser.text));
                    callback = function () { }; // do nothing after error
                }
            }).
            on("end", function () {
                if (parser.parsePart(dec.end(), true) < 0) {
                    callback(new Error(parser.error +
                        "(" + parser.line + "," + 
                        parser.char + ") near/after " + parser.text));
                }
                else if (parser.args.length == 0) { // nothing in stream
                    callback(null, null);
                }
                else {
                    callback(null, parser.args[0]);
                }
            });
    };

/**
 * Asynchronously loads compressed JSON in a scalable way from the
 * provided path, and provides the results via callback(error, json).
 */
exports.loadJSONPath = function (path, opts, callback) {
        if (callback === undefined) { // do not match null
            return (Q.nfcall(exports.loadJSONPath, // shortcut to Q
                path, opts));
        }

        if (opts == null) {
            opts = default_json_opts;
        }

        var stream = fs.createReadStream(path, null).
            on('error', function (error) {
                callback(error);
                callback = function () { }; // do nothing after error
            });
        var dec = new string_decoder.StringDecoder("utf8");
        var parser = new Parser();

        stream.
            on("error", function (error) {
                callback(error);
                callback = function () { }; // do nothing after error
            }).
            on("data", function (buf) {
                if (parser.parsePart(dec.write(buf), false) < 0) {
                    callback(new Error(parser.error +
                        " " + path + "(" + parser.line + "," + 
                        parser.char + ") near/after " + parser.text));
                    callback = function () { }; // do nothing after error
                }
            }).
            on("end", function () {
                if (parser.parsePart(dec.end(), true) < 0) {
                    callback(new Error(parser.error +
                        " " + path + "(" + parser.line + "," + 
                        parser.char + ") near/after " + parser.text));
                }
                else if (parser.args.length == 0) { // nothing in stream
                    callback(null, null);
                }
                else {
                    callback(null, parser.args[0]);
                }
            });
    };

/**
 * Convert an extended JSON object (with our custom extensions such as buffers
 * and references) into our internal array-of-arrays representation.
 * 
 * This array-of-arrays representation is used instead of a nested JSON-like
 * object for full compatibility with the extended JSON format, as well as its
 * compactness and compressibility for efficient storage in a single SQL
 * database binary field.
 * 
 * While this representation isn't so readable, that's ok given that it's for
 * internal use only.
 * 
 * This format mirrors that used in the SQL database, with each inner array
 * corresponding to a database row. This minimizes any risk of an
 * incompatibility between these two formats.
 * 
 * @param {Object} json - extended JSON object to be converted
 * 
 * @returns {Array} - array-of-array representation of the extended JSON object
*/
exports.arrayifyExtendedJson = function (json) {
    var walker = new ArrayJSONWalker();
    walker.sendJson(json);
    return (walker.array);
}

/**
 * Implements a Walker to convert extended JSON to an internal array-of-arrays
 * representation.
 */

util.inherits(ArrayJSONWalker, DefaultWalker);

function ArrayJSONWalker() {
    DefaultWalker.call(this);
    this.array = [];
}

ArrayJSONWalker.prototype.sendRecord = function (context, type, name, topic) {

    var value = (topic !== null) ? value = "" + topic : null;

    this.array.push([context, type, name, value]);

    this.cname = null; // clear any cname we may have used

    return (this.array.length); // sequence
}

ArrayJSONWalker.prototype.sendJson = function (json) {

    this.reset();

    if (json == null) {
        throw new RangeError("need json object");
    }

    this.sendValue(0, json, true);
}

/**
 * Parse our internal array-of-arrays extended JSON representation.
 * 
 * @param {Array} array - array-of-array representation of extended JSON
 * 
 * @returns {Object} - parsed extended JSON object
 * 
 * @see {@link arrayifyExtendedJson} for details on our array-of-arrays
 * extended JSON representation.
 */
exports.parseArrayifiedExtendedJSON = function (arrayifiedJson) {

    var parts = [];

    if (!(arrayifiedJson instanceof Array)) {
        throw new RangeError("array expected not " + typeof(arrayifiedJson));
    }

    arrayifiedJson.forEach(function (vals, idx) {
            var part = {
                parent: vals[0],
                type: vals[1],
                name: vals[2],
                value: vals[3]
            };
            parts[idx + 1] = part;

            part.json = parseExtendedJsonPart(part, parts);
        });

    return assembleExtendedJsonParts(parts);
}

/**
 * Parse a json segment from the given extended JSON part
 * 
 * @param {Array} part - the part to be parsed
 * @param {Object|Array} parts - either an array or map (with sequences as
 * keys) of JSON object parts
 * 
 * @returns {*} the parsed JSON segment
 */
function parseExtendedJsonPart(part, parts) {

    switch (part.type) {
        case TYPE.NULL:
            return null;
        case TYPE.UNDEFINED:
            return undefined;
        case TYPE.BUFFER:
            return new Buffer(part.value, 'base64');
        case TYPE.DATE:
            return new Date(part.value);
        case TYPE.LIST:
        case TYPE.STACK:
            return [];
        case TYPE.MAP:
        case TYPE.ERROR:
            return {};
        case TYPE.STRING:
            return part.value;
        case TYPE.INTEGER:
            return denum.parseNumberEncoding(part.value);
        case TYPE.FLOAT:
            return denum.parseNumberEncoding(part.value);
        case TYPE.BOOLEAN:
            return (part.value == "true");
        case TYPE.FRAME:
            return {
                name: part.name,
                loc: part.value
            };
        case TYPE.REFERENCE:
            return parts[1 * part.value].json;
        default:
            throw new Error("unsupported json obj type " + type);
    }
}

exports.parseExtendedJsonPart = parseExtendedJsonPart;

/**
 * Assemble the given json segments into a json array
 * 
 * @param {Object|Array} parts - either an array or map (with sequences as
 * keys) of json segments
 * @returns {Array} the assembled json array
 */
function assembleExtendedJsonParts(parts) {

    // Create a phantom record to handle the root array
    parts[0] = { type: TYPE.LIST, json: [] };

    // Get highest parts key (can't use max here as keys may be numeric strings)
    const maxSeq = Object.keys(parts).reduce(function (accum, curr) {
            curr = 1 * curr;
            return curr > accum ? curr : accum;
        }, 0);

    // Put child json segments in their parent objects/arrays
    for (var seq = 1; seq <= maxSeq; seq++) {
        if (seq in parts) {
            var vals = parts[seq];
            var parent = vals.parent;
            var pvals = parts[parent];
            var ptype = pvals.type;
            var pobj = pvals.json;

            if (ptype == TYPE.LIST) {
                pobj.push(vals.json);
            }
            else if (ptype == TYPE.MAP) {
                pobj[vals.name] = vals.json;
            }
            else if (ptype == TYPE.ERROR) {
                pobj[vals.name] = vals.json;
            }
            else if (ptype == TYPE.STACK) {
                pobj.push(vals.json);
            }
            else {
                throw new Error("unsupported json parent type: " + ptype);
            }
        }
    }

    return parts[0].json;
}

exports.assembleExtendedJsonParts = assembleExtendedJsonParts;

/**
 * Asynchronously saves compressed JSON in a scalable way to the
 * provided path.
 */
exports.saveGZJSONPath = function (zpath, json, opts, callback) {
        if (callback === undefined) { // do not match null
            return (Q.nfcall(exports.saveGZJSONPath, // shortcut to Q
                zpath, json, opts));
        }

        if (opts == null) {
            opts = default_json_opts;
        }

        var stream = fs.createWriteStream(zpath).
            on('error', function (error) {
                callback(error);
                callback = function () {}; // do nothing
            }).
            on('finish', function () {
                callback();
                callback = function () {}; // do nothing
            });

        var zstream = zlib.createGzip().
            on('error', function (error) {
                callback(error);
                callback = function () {}; // do nothing
            });

        zstream.pipe(stream);

        var writer = new Streamer(zstream, null, opts);

        writer.flushValue(json, function (error) {
                if (error != null) {
                    callback(error);
                    callback = function () {}; // do nothing
                }
                else {
                    zstream.end();
                }
            });
    };

/**
 * Asynchronously saves uncompressed JSON in a scalable way to the
 * provided stream.
 */
exports.saveJSONStream = function (stream, json, opts, callback) {
        if (callback === undefined) { // do not match null
            return (Q.nfcall(exports.saveJSONStream, // shortcut to Q
                stream, json, opts));
        }

        if (opts == null) {
            opts = default_json_opts;
        }

        stream.
            on('error', function (error) {
                callback(error);
            }).
            on('finish', function () {
                callback();
            });

        var writer = new Streamer(stream, null, opts);

        writer.flushValue(json, function (error) {
                if (error !=  null) {
                    callback(error);
                }
                else {
                    stream.end();
                }
            });
    };

/**
 * Asynchronously saves uncompressed JSON in a scalable way to the
 * provided path.
 */
exports.saveJSONPath = function (rpath, json, opts, callback) {
        if (callback === undefined) { // do not match null
            return (Q.nfcall(exports.saveJSONPath, // shortcut to Q
                rpath, json, opts));
        }

        if (opts == null) {
            opts = default_json_opts;
        }

        var stream = fs.createWriteStream(rpath).
            on('error', function (error) {
                callback(error);
            }).
            on('finish', function () {
                callback();
            });
        var writer = new Streamer(stream, null, opts);

        writer.flushValue(json, function (error) {
                if (error != null) {
                    callback(error);
                }
                else {
                    stream.end();
                }
            });
    };

/**
 * This is an "impure" JSON+BSON+TI stringify method that is
 * intended to make junk like buffers, dates and stack traces
 * readable in the same way that they are written out to the DB.
 * Mostly, this is intended for use by the logging functions when
 * they log to console, but it can be used for any other purpose
 * too.  This does not complain about loops.  There is no parser
 * for it.
 */
exports.stringify = function (topic, replacer, white) {
        var walker = new Stringify(replacer, white);

        return (walker.resultOfValue(null, topic));
    };

/**
 * Delete the associated JSON data during an "efficient delete".
 */
exports.inEfficientDelete = function (eDel, tablePrefix) {
    eDel.withLeftJoin(tablePrefix + "values", "scope");
    eDel.withLeftJoin(tablePrefix + "extends", "scope");
}

exports.Walker = Walker; // so we can use the walker elsewhere
exports.Stringify = Stringify;
exports.Streamer = Streamer;
exports.Stack = Stack;

/**
 * Create a copy of a subject BSON+ tree, using the same equivalency
 * rules as simpleTreeCompare().  Primitives are copied by value,
 * arrays, objects, buffers and dates are copied by common rules.
 */
function simpleTreeCopy(subject) {
    var result;

    if (subject === undefined) {
        result = subject;
    }
    else if (subject === null) {
        result = subject;
    }
    else {
        var type = typeof(subject);

        if (type === "string") {
            result = subject;
        }
        else if (type === "number") {
            result = subject;
        }
        else if (type === "boolean") {
            result = subject;
        }
        else if (subject instanceof Date) {
            result = new Date(subject.valueOf());
        }
        else if (subject instanceof Buffer) {
            result = new Buffer(subject);
        }
        else if (subject instanceof Array) {
            var i = 0;
            var length = subject.length;

            result = [];

            while (i < length) {
                result.push(simpleTreeCopy(subject[i++]));
            }
        }
        else if (subject instanceof Object) {
            result = {};

            for (var name in subject) {
                result[name] = simpleTreeCopy(subject[name]);
            }
        }
        else {
            throw new RangeError("unexpected type: " + type);
        }
    }

    return (result);
}

exports.simpleTreeCopy = simpleTreeCopy;

/**
 * Compare an assumed tree of BSON+ values and return true if they
 * match.  This treats undefined and null as separate values and
 * requires that the input objects are pure tree graphs.  The
 * optional reporter will get called for the specific differences.
 * Note that the optional path must be supplied as an array of components
 * in order for the reporter to provide path information.
 */
function simpleTreeCompare(left, right, path, reporter) {
    var result;

    if (left === right) {
        result = true;
    }
    else {
        var ltype = typeof(left);
        var rtype = typeof(right);

        if (ltype !== rtype) {
            result = false; // cannot possibly be the same

            if (reporter) {
                reporter(path, "different types", ltype, rtype);
            }
        }
        else if (ltype === "boolean") {
            if (left !== right) {
                if (reporter) {
                    reporter(path, "different booleans", left, right);
                }

                result = false;
            }
            else {
                result = true;
            }
        }
        else if (ltype === "string") {
            if (left !== right) {
                if (reporter) {
                    reporter(path, "different strings", left, right);
                }

                result = false;
            }
            else {
                result = true;
            }
        }
        else if (ltype === "number") {
            if (left !== right) {
                if (reporter) {
                    reporter(path, "different numbers", left, right);
                }

                result = false;
            }
            else {
                result = true;
            }
        }
        else if (left instanceof Date) {
            if (!(right instanceof Date)) {
                if (reporter) {
                    reporter(path, "different classes", left, right);
                }

                result = false;
            }
            else if (left.valueOf() !== right.valueOf()) {
                if (reporter) {
                    reporter(path, "different dates", left, right);
                }

                result = false;
            }
            else {
                result = true;
            }
        }
        else if (left instanceof Buffer) {
            var length;

            if (!(right instanceof Buffer)) {
                if (reporter) {
                    reporter(path, "different classes", left, right);
                }

                result = false;
            }
            else if ((length = left.length) != right.length) {
                if (reporter) {
                    reporter(path, "different buffer lengths",
                        left.length, right.length);
                }

                result = false;
            }
            else {
                var i = 0;

                result = true;

                while (result && (i < length)) {
                    result = (left[i] === right[i]);
                    i++;
                }

                if (!result) {
                    if (reporter) {
                        reporter(path, "different buffer contents at", i - 1);
                    }
                }
            }
        }
        else if (left instanceof Array) {
            var length;

            if (!(right instanceof Array)) {
                if (reporter) {
                    reporter(path, "different classes", left, right);
                }

                result = false;
            }
            else if ((length = left.length) != right.length) {
                if (reporter) {
                    reporter(path, "different array lengths",
                        left.length, right.length);
                }

                result = false;
            }
            else {
                var i = 0;

                result = true;

                while (result && (i < length)) {
                    result = simpleTreeCompare(left[i], right[i],
                        ((path != null) ?
                        (path.slice(0).push(i), path) :
                        null),
                        reporter);
                    i++;
                }
            }
        }
        else if (left instanceof Object) {
            if (!(right instanceof Object)) {
                result = false;

                if (reporter) {
                    reporter(path, "different classes", left, right);
                }
            }
            else {
                result = true;

                for (var name in left) {
                    if (!(name in right)) {
                        if (reporter) {
                            reporter(path, "right missing property", name);
                        }

                        result = false;
                        break;
                    }

                    if (!simpleTreeCompare(left[name], right[name],
                            ((path != null) ?
                            (path.slice(0).push(name), path) :
                            null),
                            reporter)) {
                        result = false;
                        break;
                    }
                }

                if (result) {
                    for (var name in right) {
                        if (!(name in left)) {
                            if (reporter) {
                                reporter(path, "left missing property", name);
                            }

                            result = false;
                            break;
                        }
                    }
                }
            }
        }
        else {
            throw new RangeError("unexpected type: " + type);
        }
    }

    return (result);
}

exports.simpleTreeCompare = simpleTreeCompare;

/**
 * Creates a stream that reads a single JSON object and will return it
 * to the callback when done.
 */
function parseStream(opts, callback) {
    if (opts instanceof Function) {
        callback = opts;
        opts = null;
    }

    return (new ParserStream().
        on('error', function () {
            return (callback(error));
        }).
        on('finish', function () {
            return (callback(null, this.parser.args[0]));
        }));
}

exports.parseStream = parseStream;

/**
 * Writes the json to the stream and invokes the callback once flushed.
 * Note: this does not call stream.end().
 */
function writeToStream(stream, json, opts, callback) {
    if (opts instanceof Function) {
        callback = opts;
        opts = null;
    }

    new Streamer(stream, null, opts).
        flushValue(json, function (error) {
                if (error != null) {
                    return (callback(error));
                }

                return (callback());
            });
}

exports.writeToStream = writeToStream;

