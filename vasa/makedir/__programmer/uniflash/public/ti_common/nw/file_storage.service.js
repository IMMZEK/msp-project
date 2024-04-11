var ti_common;
(function (ti_common) {
    var file;
    (function (file) {
        var storage;
        (function (storage) {
            'use strict';
            var fs = require('fs');
            var path = require('path');
            var FileStorage = (function () {
                function FileStorage($q) {
                    this.$q = $q;
                }
                FileStorage.prototype.saveFile = function (filePath, data) {
                    return this.$q(function (resolve, reject) {
                        fs.writeFile(filePath, data, function (err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve();
                            }
                        });
                    });
                };
                FileStorage.prototype.openFile = function (filePath) {
                    return this.$q(function (resolve, reject) {
                        fs.readFile(filePath, 'utf-8', function (err, data) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(data);
                            }
                        });
                    });
                };
                FileStorage.prototype.fileExists = function (filePath) {
                    return this.$q(function (resolve, reject) {
                        fs.stat(filePath, function (err, data) {
                            if (err == null) {
                                resolve(true);
                            }
                            else if (err.code === 'ENOENT') {
                                resolve(false);
                            }
                            else {
                                reject(err.code);
                            }
                        });
                    });
                };
                FileStorage.prototype.getAppDataDirectory = function () {
                    var isWin = process.platform.indexOf("win") === 0;
                    var getLocalAppData = isWin ? (process.env.LOCALAPPDATA || process.env.USERPROFILE) : (process.env.HOME);
                    var tiFolderName = isWin ? 'Texas Instruments' : '.ti';
                    var uniflashFolderName = 'uniflash';
                    return this.$q(function (resolve) {
                        var tiDir = path.join(getLocalAppData, tiFolderName);
                        if (!fs.existsSync(tiDir)) {
                            fs.mkdirSync(tiDir);
                        }
                        var appDir = path.join(tiDir, uniflashFolderName);
                        if (!fs.existsSync(appDir)) {
                            fs.mkdirSync(appDir);
                        }
                        resolve(appDir);
                    });
                };
                FileStorage.$inject = ['$q'];
                return FileStorage;
            }());
            storage.FileStorage = FileStorage;
            angular.module('ti_common').service('ticFileStorage', FileStorage);
        })(storage = file.storage || (file.storage = {}));
    })(file = ti_common.file || (ti_common.file = {}));
})(ti_common || (ti_common = {}));
