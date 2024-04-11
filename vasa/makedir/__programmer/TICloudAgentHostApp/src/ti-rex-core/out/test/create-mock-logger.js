"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockLogger = void 0;
const util_1 = require("../shared/util");
const logging_1 = require("../utils/logging");
const logging_types_1 = require("../utils/logging-types");
function createMockLogger() {
    const mockDinfraLogger = {
        ...(0, util_1.mapValues)(logging_types_1.loggerLevelsDef, () => () => ({ stamp: Date.now() })),
        setPriority: () => ({ stamp: Date.now() })
    };
    return new logging_1.Logger('MockLogger', mockDinfraLogger);
}
exports.createMockLogger = createMockLogger;
