"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.latencyLog = exports.statisticsLog = exports.debugLog = exports.totalDuration = exports.numUsersPeak = exports.numUsersAvg = exports.restartPercentage = exports.filterPercentage = exports.topSearchTermPercentage = exports.searchPercentage = exports.delayAdjustmentPercentage = exports.viewNodeDelay = exports.expandNodeDelay = void 0;
// The average time to wait before expanding another node in ms
exports.expandNodeDelay = 300;
// The average time to wait after viewing a node before moving on
exports.viewNodeDelay = 5000;
// The +/- percent to randomly vary delays
exports.delayAdjustmentPercentage = 50;
// Percentage of users using a search term
exports.searchPercentage = 50;
// Percentage of searches that use a "top" vs "random" search term
exports.topSearchTermPercentage = 50;
// Percentage of users using a filter
// This percentage is checked once to see if any filter is used, and then again per filter
exports.filterPercentage = 80;
// Percentage chance after viewing a leaf node to change filters/search and restart
exports.restartPercentage = 10;
// The number of users to simulate
//
// By looking at analyics data under the category 'tirex', we can group entries by nearest
// minute, and then select the number of unique session ids.  That gives us approximately
// the number of concurrent users per minute.
//
// On the assumption that rex usage is steadily rising, I looked at the usage for Sept 2018
// and got a peak concurrent users of 60, and average of 12.
//
// For reference, the sql query used was:
// SELECT count(distinct(sessionId)) as concurrentUsers, min(datetime)
// FROM analytics.analytics where action like 'tirex%'
// and logdate < "2018-09-30" and logdate > "2018-09-20"
// GROUP BY UNIX_TIMESTAMP(datetime) DIV 60 ORDER BY concurrentUsers DESC
exports.numUsersAvg = 12;
exports.numUsersPeak = 60;
// The duration to run the tests for in minutes
exports.totalDuration = 5;
// If logging of what nodes are accessed should be sent to the console
exports.debugLog = false;
// If overall statistics should be logged to the console
exports.statisticsLog = false;
// If brief summary information of timing should be printed to the console
// Will log one of .-+* per request, depending on how fast the response is
exports.latencyLog = false;
