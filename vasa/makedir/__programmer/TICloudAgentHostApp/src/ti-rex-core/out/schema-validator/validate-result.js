"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateResult = void 0;
const schema_types_1 = require("./schema-types");
/**
 * Class of validation result.
 */
class ValidateResult {
    counts = {};
    logLimits = {};
    constructor() {
        Object.keys(schema_types_1.Priority).forEach((key) => {
            this.counts[schema_types_1.Priority[key]] = 0;
            this.logLimits[schema_types_1.Priority[key]] = Number.MAX_SAFE_INTEGER;
        });
    }
    resetCounts() {
        Object.keys(schema_types_1.Priority).forEach((key) => {
            this.counts[schema_types_1.Priority[key]] = 0;
        });
    }
    copy(other) {
        Object.keys(schema_types_1.Priority).forEach((key) => {
            this.counts[schema_types_1.Priority[key]] = other.counts[schema_types_1.Priority[key]];
        });
    }
    clone() {
        const newObj = new ValidateResult();
        newObj.copy(this);
        return newObj;
    }
    add(other) {
        Object.keys(schema_types_1.Priority).forEach((key) => {
            this.counts[schema_types_1.Priority[key]] += other.counts[schema_types_1.Priority[key]];
        });
    }
    delta(other) {
        const newObj = this.clone();
        Object.keys(schema_types_1.Priority).forEach((key) => {
            newObj.counts[schema_types_1.Priority[key]] -= other.counts[schema_types_1.Priority[key]];
        });
        return newObj;
    }
    isPassed() {
        return !this.hasEmergency() && !this.hasAlert() && !this.hasCritical() && !this.hasError();
    }
    hasEmergency() {
        return this.counts.emergency > 0;
    }
    hasAlert() {
        return this.counts.alert > 0;
    }
    hasCritical() {
        return this.counts.critical > 0;
    }
    hasError() {
        return this.counts.error > 0;
    }
    hasWarning() {
        return this.counts.warning > 0;
    }
    hasRecommended() {
        return this.counts.recommended > 0;
    }
    getHighestErrorLevel() {
        if (this.hasEmergency()) {
            return 4 /* RefreshMessageLevel.EMERGENCY_ABORT_REFRESH */;
        }
        if (this.hasCritical() || this.hasAlert()) {
            return 3 /* RefreshMessageLevel.CRITICAL_ABORT_PACKAGE */;
        }
        if (this.hasError()) {
            return 2 /* RefreshMessageLevel.ERROR_CONTINUE */;
        }
        if (this.hasWarning() || this.hasRecommended()) {
            return 1 /* RefreshMessageLevel.WARNING */;
        }
        return 0 /* RefreshMessageLevel.NONE */;
    }
}
exports.ValidateResult = ValidateResult;
