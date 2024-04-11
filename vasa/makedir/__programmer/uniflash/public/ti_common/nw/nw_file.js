var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ti_common;
(function (ti_common) {
    var file;
    (function (file_1) {
        'use strict';
        var fs = require('fs');
        var NWFile = (function (_super) {
            __extends(NWFile, _super);
            function NWFile($q, name, size, isLocal) {
                if (size === void 0) { size = null; }
                if (isLocal === void 0) { isLocal = true; }
                _super.call(this, name, NWFile.TYPE, size, isLocal);
                this.$q = $q;
            }
            NWFile.prototype.bufferToBlob = function (buffer) {
                return this.$q(function (resolve, reject) {
                    var ab = new ArrayBuffer(buffer.length);
                    var uint8array = new Uint8Array(ab);
                    for (var i = 0; i < buffer.length; ++i) {
                        uint8array[i] = buffer[i];
                    }
                    resolve(new Blob([uint8array]));
                });
            };
            NWFile.prototype.blobToBuffer = function (blob) {
                return this.$q(function (resolve, reject) {
                    var fileReader = new FileReader();
                    fileReader.onload = function () {
                        var buffer = new Buffer(this.result);
                        resolve(buffer);
                    };
                    fileReader.readAsArrayBuffer(blob);
                });
            };
            // set the file contents
            NWFile.prototype.setContents = function (contents) {
                var _this = this;
                return this.$q(function (resolve, reject) {
                    var data = contents;
                    if (contents instanceof Blob) {
                        data = _this.blobToBuffer(contents);
                    }
                    fs.writeFileSync(_this.path, data);
                    resolve('file saved to ' + _this.path);
                });
            };
            // get the contents of the file
            NWFile.prototype.getContents = function (contentType) {
                var _this = this;
                return this.$q(function (resolve, reject) {
                    if (!contentType || contentType === file_1.ContentType.Text) {
                        resolve(fs.readFileSync(_this.path, 'utf-8'));
                    }
                    else {
                        resolve(_this.bufferToBlob(fs.readFileSync(_this.path)));
                    }
                });
            };
            NWFile.prototype.delete = function () {
                var _this = this;
                return this.$q(function (resolve) {
                    resolve(fs.unlinkSync(_this.path));
                });
            };
            NWFile.prototype.calculateChecksum = function () {
                var _this = this;
                return this.$q(function (resolve) {
                    fs.stat(_this.path, function (err, data) {
                        if (err === null) {
                            var childProcess = require('child_process');
                            var file_2 = _this;
                            var proc_1;
                            var token_1 = "";
                            var index_1 = 0;
                            var osType = TICloudAgent.getOS();
                            try {
                                if (osType === 'win') {
                                    proc_1 = childProcess.spawn("certutil", ['-hashfile', file_2.path, 'MD5'], {});
                                    token_1 = "\r\n";
                                    index_1 = 1;
                                }
                                else {
                                    proc_1 = childProcess.spawn("md5sum", [file_2.path], {});
                                    token_1 = " ";
                                    index_1 = 0;
                                }
                                proc_1.stdout.on('data', function (data) {
                                    file_2.checksum = data.toString().split(token_1)[index_1];
                                    // console.log(data.toString());
                                    proc_1.kill();
                                    resolve();
                                });
                                proc_1.on('error', function () {
                                    // ignore error
                                    proc_1.kill();
                                    resolve();
                                });
                            }
                            catch (e) {
                                // ignore error
                                proc_1.kill();
                                resolve();
                            }
                        }
                        else {
                            resolve();
                        }
                    });
                });
            };
            NWFile.TYPE = 'NWFile';
            return NWFile;
        }(ti_common.file.File));
        file_1.NWFile = NWFile;
        var NWFileFactory = (function () {
            function NWFileFactory($q) {
                var _this = this;
                this.$q = $q;
                this.create = function (path) {
                    var size = null;
                    try {
                        return new NWFile(_this.$q, path, fs.statSync(path).size);
                    }
                    catch (err) {
                        return new NWFile(_this.$q, path);
                    }
                };
            }
            NWFileFactory.prototype.createFromJSON = function (obj) {
                if (obj.type !== NWFile.TYPE)
                    throw obj.type + ' is not of the type of ' + NWFile.TYPE;
                return new NWFile(this.$q, obj.path, obj.size);
            };
            NWFileFactory.$inject = ['$q'];
            return NWFileFactory;
        }());
        var NWPlatformConfig = (function () {
            function NWPlatformConfig() {
            }
            // no serivce, just config
            NWPlatformConfig.prototype.$get = function () {
                return {};
            };
            return NWPlatformConfig;
        }());
        angular.module('ti_common').provider('ticPlatformConfig', NWPlatformConfig);
        // File factory in the cloud case
        angular.module('ti_common').service('ticFileFactory', NWFileFactory);
    })(file = ti_common.file || (ti_common.file = {}));
})(ti_common || (ti_common = {}));
