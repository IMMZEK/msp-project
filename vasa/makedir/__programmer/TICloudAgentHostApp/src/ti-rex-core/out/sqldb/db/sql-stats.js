"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlStats = void 0;
// TODO: Replace with SQL logging with benchmarks
class SqlStats {
    sqlStats = {};
    sqlStatCounter = 0;
    enabled = false;
    resetSqlStats() {
        this.sqlStats = {};
        this.sqlStatCounter = 0;
    }
    enableStatCollection(enabled) {
        this.enabled = enabled;
    }
    addSqlStats(statName, statParams, statValues) {
        if (this.enabled) {
            const seqStatValues = { seq: ++this.sqlStatCounter, ...statValues };
            let paramStats = this.sqlStats[statName];
            if (paramStats === undefined) {
                paramStats = {};
                this.sqlStats[statName] = paramStats;
            }
            const statParamsS = JSON.stringify(statParams);
            let stats = paramStats[statParamsS];
            if (stats === undefined) {
                stats = [];
                paramStats[statParamsS] = stats;
            }
            stats.push(seqStatValues);
        }
    }
    getSqlStats() {
        return this.sqlStats;
    }
}
exports.SqlStats = SqlStats;
