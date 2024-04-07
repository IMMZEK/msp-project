/*jslint node: true */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var stream = require('stream');
var WriteStream = (function (_super) {
    __extends(WriteStream, _super);
    function WriteStream() {
        _super.call(this);
    }
    WriteStream.prototype._write = function (chunk, encoding, done) {
        if (!this.buffer) {
            this.buffer = chunk;
        }
        else {
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }
        done();
    };
    WriteStream.prototype.toUint8Array = function (buffer) {
        var ab = new ArrayBuffer(buffer.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return view;
    };
    WriteStream.prototype.getData = function () {
        var uint8data;
        if (this.buffer) {
            uint8data = this.toUint8Array(this.buffer);
        }
        else {
            uint8data = this.toUint8Array([]);
        }
        return uint8data;
    };
    return WriteStream;
}(stream.Writable));
var ReadStream = (function (_super) {
    __extends(ReadStream, _super);
    function ReadStream(data) {
        _super.call(this);
        this.data = data;
    }
    ReadStream.prototype._read = function () {
        this.push(this.data);
        this.push(null);
    };
    return ReadStream;
}(stream.Readable));
module.exports = {
    write: WriteStream,
    read: ReadStream
};
