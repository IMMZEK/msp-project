'use strict';
const p = require('child_process');
const path = require('path');
const async = require('async');
const util = require('./util');
const { processManager } = util;
const entryFile = path.join(util.projectRoot, 'app.js');
function runTirex(config, callback = () => { }) {
    if (config.dinfra) {
        config.dinfra = util.resolvePath(config.dinfra);
    }
    runRemoteServer(config, callback);
}
exports.runTirex = runTirex;
function runRemoteServer(config, callback) {
    async.waterfall([
        (callback) => {
            const { nodeArgs, dinfra, remoteServerConfig, out } = setValues(config);
            // prepare the args
            const remoteServerArgs = `${dinfra} ${remoteServerConfig}`;
            const args = `${nodeArgs} ${entryFile} ${remoteServerArgs}`.trim().split(' ');
            // run the remoteserver
            out.write('Launching Remoteserver\n');
            const remoteserver = p.spawn(process.execPath, args, {
                cwd: util.projectRoot
            });
            remoteserver.on('close', (code) => {
                out.write(`Remoteserver exited with code ${code}\n`);
            });
            util.setupLog(util.remoteServerLog, (err, logStream) => {
                callback(err, remoteserver, logStream);
            });
        },
        (remoteserver, logStream, callback) => {
            processManager.addProcess({
                child: remoteserver,
                out: logStream,
                name: 'remoteserver'
            });
            setTimeout(callback, 500);
        }
    ], callback);
}
function setValues({ inspect, production, dinfra, inspectBrk, out = process.stdout }) {
    let nodeArgs = '--max_old_space_size=3072 ';
    if (inspect || inspectBrk) {
        let inspectOption = '';
        if (inspect) {
            inspectOption = '--inspect=';
        }
        else if (inspectBrk) {
            inspectOption = '--inspect-brk=';
        }
        nodeArgs += inspectOption + util.remoteServerDebugPort;
    }
    const configFolder = production ? 'config' : 'config-develop';
    return {
        nodeArgs: nodeArgs.trim(),
        dinfra: `${dinfra} config-develop/dconfig_auser.json`,
        remoteServerConfig: `${configFolder}/app_remoteserver.json`,
        out
    };
}
//
// Yargs Command config
//
exports.command = 'start [options]';
exports.describe = 'Run ti-rex-core';
exports.builder = {
    dinfra: {
        describe: 'the location of dinfra.js (relative to current working directory or absolute)',
        demandOption: true
    },
    production: {
        describe: 'run in production mode',
        boolean: true,
        default: false
    },
    inspectBrk: {
        describe: 'run in inspectBrk',
        boolean: true,
        default: false
    },
    inspect: {
        describe: 'run in inspect',
        boolean: true,
        default: false
    }
};
exports.handler = function (argv) {
    runTirex(argv, (err) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
    });
};
