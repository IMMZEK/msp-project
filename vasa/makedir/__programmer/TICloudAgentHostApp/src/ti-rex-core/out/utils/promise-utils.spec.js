"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const chai_1 = require("chai");
const promise_utils_1 = require("./promise-utils");
const test_helpers_1 = require("../scripts-lib/test/test-helpers");
const scriptsUtil = require("../scripts-lib/util");
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
describe('promisePipe', () => {
    it('should successfully pipe two streams', async () => {
        const reader = new MockReader();
        const writer = new MockWriter();
        await (0, promise_utils_1.promisePipe)([reader, writer]);
        (0, chai_1.expect)(writer.writtenData).to.equal(reader.mockData);
    });
    it('should successfully pipe more streams', async () => {
        const reader = new MockReader();
        const writer = new MockWriter();
        await (0, promise_utils_1.promisePipe)([reader, new MockTransform(), writer]);
        (0, chai_1.expect)(writer.writtenData).to.equal(reader.mockData + reader.mockData);
    });
    it('should catch errors at the beginning', async () => {
        try {
            await (0, promise_utils_1.promisePipe)([new MockReader(true), new MockTransform(), new MockWriter()]);
            (0, chai_1.expect)('should not get here').to.equal(null);
        }
        catch (e) {
            (0, chai_1.expect)(e.toString()).to.contain('Mock Error');
        }
    });
    it('should catch errors in the middle', async () => {
        try {
            await (0, promise_utils_1.promisePipe)([new MockReader(), new MockError(), new MockWriter()]);
            (0, chai_1.expect)('should not get here').to.equal(null);
        }
        catch (e) {
            (0, chai_1.expect)(e.toString()).to.contain('Mock Error');
        }
    });
    it('should catch errors at the end', async () => {
        try {
            await (0, promise_utils_1.promisePipe)([new MockReader(), new MockTransform(), new MockError()]);
            (0, chai_1.expect)('should not get here').to.equal(null);
        }
        catch (e) {
            (0, chai_1.expect)(e.toString()).to.contain('Mock Error');
        }
    });
    it('should detect invalid streams', async () => {
        try {
            await (0, promise_utils_1.promisePipe)([new MockWriter(), new MockReader()]);
            (0, chai_1.expect)('should not get here').to.equal(null);
        }
        catch (e) {
            (0, chai_1.expect)(e.toString()).to.contain('invalid arguments');
        }
    });
});
class MockReader extends stream_1.Readable {
    generateError;
    mockData = 'mock data';
    pushed = false;
    constructor(generateError = false) {
        super();
        this.generateError = generateError;
    }
    _read() {
        setImmediate(() => {
            if (this.generateError) {
                this.emit('error', new Error('Mock Error'));
            }
            else if (!this.pushed) {
                this.push(this.mockData);
                this.pushed = true;
            }
            else {
                this.push(null);
            }
        });
    }
}
class MockWriter extends stream_1.Writable {
    writtenData = '';
    _write(chunk, _encoding, callback) {
        setImmediate(() => {
            this.writtenData += chunk.toString();
            callback();
        });
    }
}
class MockTransform extends stream_1.Transform {
    _transform(chunk, _encoding, callback) {
        setImmediate(() => {
            this.push(chunk + chunk);
            callback();
        });
    }
}
class MockError extends stream_1.Transform {
    _transform(_chunk, _encoding, callback) {
        setImmediate(() => {
            callback(new Error('Mock Error'));
        });
    }
}
