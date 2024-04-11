var ti_common;
(function (ti_common) {
    var file;
    (function (file) {
        var storage;
        (function (storage) {
            'use strict';
            /*global angular, require, console, process*/
            var fs = require('fs');
            var path = require('path');
            var childProcess = require('child_process');
            //let ini = require('ini');
            var UpdateService = (function () {
                function UpdateService($log) {
                    // [TODO] check if the user update.ini exists
                    this.$log = $log;
                    this.updateExecPath = null;
                    this.foundUpdateExec = null;
                    this.checkUpdateOnStartup = true;
                    this.proxy_enable = false;
                    this.proxy_server = '';
                    this.proxy_port = '';
                    this.proxy_username = '';
                    this.proxy_password = '';
                    this.updateIniContent = {};
                    // [TODO] if not, create one based on the one in the root folder
                    // parse the update.ini to get the default values
                    this.updateIniContent = this.parseINIString(fs.readFileSync('update.ini').toString());
                    if (this.updateIniContent['Update'] && this.updateIniContent['Update']['check_for_updates_on_startup']) {
                        this.checkUpdateOnStartup = (this.updateIniContent['Update']['check_for_updates_on_startup'] === '1');
                    }
                    if (this.updateIniContent['Proxy'] && this.updateIniContent['Proxy']['enable']) {
                        this.proxy_enable = this.updateIniContent['Proxy']['enable'];
                    }
                    if (this.updateIniContent['Proxy'] && this.updateIniContent['Proxy']['server']) {
                        this.proxy_server = this.updateIniContent['Proxy']['server'];
                    }
                    if (this.updateIniContent['Proxy'] && this.updateIniContent['Proxy']['port']) {
                        this.proxy_port = this.updateIniContent['Proxy']['port'];
                    }
                    if (this.updateIniContent['Proxy'] && this.updateIniContent['Proxy']['username']) {
                        this.proxy_username = this.updateIniContent['Proxy']['username'];
                    }
                    if (this.updateIniContent['Proxy'] && this.updateIniContent['Proxy']['password']) {
                        this.proxy_password = this.updateIniContent['Proxy']['password'];
                    }
                }
                UpdateService.prototype.parseINIString = function (data) {
                    var regex = {
                        section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
                        param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,
                        comment: /^\s*;.*$/
                    };
                    var value = {};
                    var lines = data.split(/\r\n|\r|\n/);
                    var section = null;
                    lines.forEach(function (line) {
                        if (regex.comment.test(line)) {
                            return;
                        }
                        else if (regex.param.test(line)) {
                            var match = line.match(regex.param);
                            if (section) {
                                value[section][match[1]] = match[2];
                            }
                            else {
                                value[match[1]] = match[2];
                            }
                        }
                        else if (regex.section.test(line)) {
                            var match = line.match(regex.section);
                            value[match[1]] = {};
                            section = match[1];
                        }
                        else if (line.length == 0 && section) {
                            section = null;
                        }
                        ;
                    });
                    return value;
                };
                // generate the update.ini string based on user input
                UpdateService.prototype.writeINIFile = function () {
                    var updateINIStr = '[Update]\n';
                    updateINIStr += 'url = ' + this.updateIniContent['Update']['url'] + '\n';
                    updateINIStr += 'version_id = ' + this.updateIniContent['Update']['version_id'] + '\n';
                    updateINIStr += 'update_download_location = ' + this.updateIniContent['Update']['update_download_location'] + '\n';
                    updateINIStr += 'check_for_updates = ' + this.updateIniContent['Update']['check_for_updates'] + '\n';
                    updateINIStr += 'check_for_updates_on_startup = ' + (this.checkUpdateOnStartup ? 1 : 0) + '\n';
                    if (this.proxy_enable || this.proxy_server) {
                        updateINIStr += '\n[Proxy]\n';
                        updateINIStr += 'enable = ' + (this.proxy_enable ? 1 : 0) + '\n';
                        updateINIStr += 'server = ' + this.proxy_server + '\n';
                        updateINIStr += 'port = ' + this.proxy_port + '\n';
                        updateINIStr += 'username = ' + this.proxy_username + '\n';
                        updateINIStr += 'password = ' + this.proxy_password + '\n';
                    }
                    fs.writeFile('../update.ini', updateINIStr, function (err) {
                        if (err) {
                            return console.log(err);
                        }
                    });
                };
                UpdateService.prototype.getUpdateExecName = function () {
                    var osType = TICloudAgent.getOS();
                    if (osType === 'win') {
                        return 'autoupdate-windows.exe';
                    }
                    else if (osType === 'linux') {
                        return 'autoupdate-linux-x64.run';
                    }
                    else if (osType === 'osx') {
                        return 'autoupdate-osx.app';
                    }
                };
                UpdateService.prototype.checkForUpdateExec = function () {
                    if (this.foundUpdateExec === null) {
                        var nwPath = path.dirname(process.execPath);
                        if (TICloudAgent.getOS() === 'osx') {
                            nwPath = path.join(process.cwd());
                        }
                        this.updateExecPath = path.resolve(nwPath, '../', this.getUpdateExecName());
                        this.foundUpdateExec = fs.existsSync(this.updateExecPath);
                    }
                };
                UpdateService.prototype.supported = function () {
                    this.checkForUpdateExec();
                    return this.foundUpdateExec;
                };
                UpdateService.prototype.available = function (callback) {
                    var args = ['--check_for_updates', 1, '--mode', 'unattended'];
                    try {
                        var proc = void 0;
                        if (TICloudAgent.getOS() === 'osx') {
                            this.$log.info(this.updateExecPath);
                            args = ['-W', this.updateExecPath, '--args', '--check_for_updates', 1, '--mode', 'unattended'];
                            proc = childProcess.spawn('open', args, {});
                        }
                        else {
                            proc = childProcess.spawn(this.updateExecPath, args, {});
                        }
                        proc.on('exit', function (code) {
                            // the update installer indicates weather an update is available by checking the process return codes
                            callback(code);
                        });
                    }
                    catch (e) {
                        // if some error occurs, just swallow it and indicate no updates available
                        this.$log.error('Failed to check for updates! -> ' + e);
                        callback(-1);
                    }
                };
                UpdateService.prototype.install = function () {
                    try {
                        if (TICloudAgent.getOS() === 'osx') {
                            childProcess.spawn('open', ['-W', this.updateExecPath], {
                                detached: true
                            });
                        }
                        else {
                            childProcess.spawn(this.updateExecPath, [], {
                                detached: true
                            });
                        }
                        var gui = require('nw.gui');
                        gui.App.quit();
                    }
                    catch (e) {
                        // if some error occurs, just swallow it and indicate no updates available
                        this.$log.error('Failed to start update installation! -> ' + e);
                    }
                };
                UpdateService.$inject = ['$log'];
                return UpdateService;
            }());
            angular.module('ti_common').service('ticUpdateSrv', UpdateService);
        })(storage = file.storage || (file.storage = {}));
    })(file = ti_common.file || (ti_common.file = {}));
})(ti_common || (ti_common = {}));
