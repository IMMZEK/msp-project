'use strict';
// TODO this script shouldn't be called by itself, instead it should be invoked in jenkins/report-test-results.js
/**
 * Generate load test report
 */
exports.generate = ({ logDir, summarize }) => {
    const impl = require('./generate-load-tests-report-impl');
    return impl.generate(logDir, summarize);
};
exports.command = 'generate-report [options]';
exports.describe = 'Generate an HTML report for any available load testing results';
exports.builder = {
    logDir: {
        describe: 'Path to a directory that contains load test JSON logs (relative or absolute)',
        string: true,
        demandOption: true
    },
    summarize: {
        describe: 'Indicates if all log files should be summarized into one report',
        boolean: true,
        default: false
    }
};
exports.handler = argv => {
    exports
        .generate(argv)
        .then(reportPath => {
        console.log(`Report(s) generated:\n\t${reportPath.join('\n\t')}`);
    })
        .catch(err => {
        console.log('An error has occured during report generation.');
        console.log(err);
        process.exit(1);
    });
};
