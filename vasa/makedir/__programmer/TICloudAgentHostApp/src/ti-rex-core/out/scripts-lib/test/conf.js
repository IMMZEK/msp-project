'use strict';
// native modules
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
// 3rd party
const glob = require('glob');
// our modules
const scriptsUtil = require('../util');
function getBrowsers(platform) {
    const browsers = [
        {
            browserName: 'chrome',
            loggingPrefs: {
                driver: 'INFO',
                browser: 'INFO'
            }
        },
        {
            browserName: 'firefox',
            loggingPrefs: {
                driver: 'INFO',
                browser: 'INFO'
            }
        }
        // ,{
        //     // Chromium
        //     browserName: 'chrome',
        //     chromeOptions: {
        //         binary: '/home/auser/Downloads/chrome-linux/chrome'
        //     }
        // }
    ];
    if (platform === 'darwin') {
        // Need to run command 'sudo safaridriver --enable' once to set up mac for testing
        browsers.push({
            browserName: 'safari',
            loggingPrefs: {
                driver: 'INFO',
                browser: 'INFO'
            }
        });
    }
    return browsers;
}
exports.config = {
    seleniumAddress: `http://localhost:${scriptsUtil.seleniumServerPort}/wd/hub`,
    /*
       With direct connect protractor will launch and connect to directly to the
       drivers locally for you, without the need for the selenium server in between.
       This is faster but only works locally and only with chrome and firefox.
    */
    // directConnect: true,
    multiCapabilities: getBrowsers(os.platform()),
    /*
        limit # of sessions to 1 so that the report for each browser doesn't write over the
        report of the browser that just finished, but instead rewrite the name of the report
        to prevent this behaviour
    */
    maxSessions: 1,
    // Time to wait for page load
    getPageTimeout: 5000,
    // Time to wait for async tasks to finish
    allScriptsTimeout: 30000,
    framework: 'mocha',
    mochaOpts: {
        reporter: 'mochawesome',
        reporterOptions: {
            inlineAssets: true,
            quiet: true,
            reportDir: path.dirname(scriptsUtil.protractorHtmlReport),
            reportFilename: path.basename(scriptsUtil.protractorHtmlReport)
        }
    },
    specs: glob.sync(`${scriptsUtil.projectRoot}/out/**/*.spec.js`),
    onPrepare: function () {
        // tslint:disable-next-line no-var-requires
        require('source-map-support').install();
        // require('longjohn');
        const { setTestingGlobals } = require('./test-helpers');
        setTestingGlobals(JSON.parse(browser.params.args));
        browser.waitForAngularEnabled(false);
        // Clear browser console logs
        const browserConsolePath = path.parse(scriptsUtil.browserConsoleLog);
        browser.getCapabilities().then(cap => {
            const browserName = cap.get('browserName');
            const browserConsoleLog = path.join(browserConsolePath.dir, `${browserConsolePath.name}-${browserName}${browserConsolePath.ext}`);
            fs.outputFile(browserConsoleLog, '');
        });
        // Set the size of the browser window (makes testing more predictable)
        browser
            .manage()
            .window()
            .setSize(1200, 800);
        // Wait 3 seconds before giving up on finding an element
        browser
            .manage()
            .timeouts()
            .implicitlyWait(3000);
        return new Promise(function (resolve) {
            browser.getCapabilities().then(cap => {
                browser.name = cap.get('browserName');
                resolve();
            });
        });
    },
    onComplete: function () {
        try {
            const htmlReportPath = path.parse(scriptsUtil.protractorHtmlReport);
            fs.renameSync(scriptsUtil.protractorHtmlReport, path.join(htmlReportPath.dir, `${htmlReportPath.name}-${browser.name}${htmlReportPath.ext}`));
            const jsonReportPath = path.parse(scriptsUtil.protractorJSONReport);
            fs.renameSync(scriptsUtil.protractorJSONReport, path.join(jsonReportPath.dir, `${jsonReportPath.name}-${browser.name}${jsonReportPath.ext}`));
        }
        catch (err) {
            console.log('Got an error in onComplete');
            console.error(err);
        }
    }
};
