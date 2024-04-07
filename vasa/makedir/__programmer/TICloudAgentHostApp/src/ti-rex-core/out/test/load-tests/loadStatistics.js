"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadStatistics = void 0;
const _ = require("lodash");
const settings_1 = require("./settings");
class LoadStatistics {
    userParams = [];
    addUser(urlParams) {
        this.userParams.push(urlParams);
    }
    log() {
        if (settings_1.statisticsLog) {
            const summary = _.groupBy(this.userParams, p => {
                const keys = Object.keys(p);
                if (keys.length) {
                    if (keys.includes('search')) {
                        return keys.length === 1 ? 'search' : 'searchAndFilter';
                    }
                    return 'filtered';
                }
                return 'unfiltered';
            });
            const uniqueSearchTerms = _.uniq(this.userParams.filter(p => p.search).map(p => p.search));
            console.log(`Unfiltered          : ${this.asPercentage(summary.unfiltered)}%`);
            console.log(`Filter-only         : ${this.asPercentage(summary.filtered)}%`);
            console.log(`Search-only         : ${this.asPercentage(summary.search)}%`);
            console.log(`Search + filter     : ${this.asPercentage(summary.searchAndFilter)}%`);
            console.log(`Unique search terms : ${uniqueSearchTerms.length}`);
        }
    }
    asPercentage(value) {
        return (_.size(value) * 100) / _.size(this.userParams);
    }
}
exports.LoadStatistics = LoadStatistics;
