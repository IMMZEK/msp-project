#!/usr/bin/env node
'use strict';
// Native modules
const os = require('os');
const p = require('child_process');
const path = require('path');
// 3rd party modules
const async = require('async');
// our modules
const scriptsUtil = require('../util');
const { processManager } = scriptsUtil;
const out = process.stdout;
exports.runProtractorTests = function (config, callback = () => { }) {
    async.series([
        callback => {
            runWebdriver(config, callback);
        },
        callback => {
            runProtractor(config, callback);
        },
        callback => {
            shutdownSelenium(config, () => callback());
        }
    ], (err, [_, results]) => callback(err, results));
};
function runWebdriver(_, callback) {
    async.waterfall([
        callback => {
            scriptsUtil.setupLog(scriptsUtil.webdriverLog, callback);
        },
        (logStream, callback) => {
            out.write('Launching Webdriver\n');
            const webdriverExe = path.join(scriptsUtil.projectRoot, 'node_modules', 'webdriver-manager', 'bin', 'webdriver-manager');
            const args = [
                webdriverExe,
                'start',
                `--seleniumPort=${scriptsUtil.seleniumServerPort}`,
                `--out_dir=${scriptsUtil.webdriversPath}`
            ];
            const webdriver = p.spawn(process.execPath, args);
            webdriver.on('close', code => {
                out.write(`Webdriver exited with code ${code}\n`);
            });
            processManager.addProcess({
                child: webdriver,
                out: logStream,
                name: 'webdriver'
            });
            setTimeout(callback, 4000);
        }
    ], err => callback(err));
}
function runProtractor(argsIn, callback) {
    const { inspectBrk } = argsIn;
    out.write('Launching Protractor\n');
    async.waterfall([
        callback => {
            const protractorPath = path.parse(scriptsUtil.protractorLog);
            const protractorLog = path.join(protractorPath.dir, `${protractorPath.name}${protractorPath.ext}`);
            scriptsUtil.setupLog(protractorLog, callback);
        },
        (logStream, callback) => {
            const script = path.join(scriptsUtil.projectRoot, 'node_modules', 'protractor', 'bin', 'protractor');
            const conf = path.join(scriptsUtil.projectRoot, 'out', 'scripts-lib', 'test', 'conf.js');
            const inspectBrkPort = inspectBrk && (parseInt(inspectBrk) || 5858);
            const args = inspectBrkPort
                ? [`--inspect-brk=${inspectBrkPort}`, script, conf]
                : [script, conf];
            args.push('--params.args', JSON.stringify(argsIn));
            const child = p.spawn(process.execPath, args);
            processManager.addProcess({ child, out: logStream, name: 'protractor' });
            child.once('exit', code => {
                out.write(`Protractor exited with code ${code}\n`);
                callback();
            });
        }
    ], err => callback(err));
}
/**
 * Tries to shutdown selenium. Note there is a command "webdriver-manager shutdown"
 * but it does not work with selenium 3. Doing this workaround until this gets resolved.
 *
 */
function shutdownSelenium(_, callback) {
    const winCmd = `for /f "tokens=5" %a in ('netstat -aon ^| findstr ":${scriptsUtil.seleniumServerPort}"') do if %a NEQ 0 (taskkill /F /PID %a)`;
    const unixCmd = `lsof -t -i :${scriptsUtil.seleniumServerPort} | xargs kill`;
    const cmd = os.platform() === 'win32' ? winCmd : unixCmd;
    p.exec(cmd, callback);
}
