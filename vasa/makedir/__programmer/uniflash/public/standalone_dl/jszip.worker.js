'use strict';
var zip;
self.onmessage = function (msg) {
    try {
        JSZip;
    }
    catch (e) {
        self['importScripts']('../lib/jszip/dist/jszip.js');
    }
    switch (msg.data.action) {
        case 'start':
            zip = new JSZip();
            break;
        case 'addFile':
            addFile(msg.data.filename, msg.data.contents, msg.data.options);
            break;
        case 'generate':
            generate(msg.data.type, msg.data.platform);
            break;
        default:
            throw 'jszip worker: command not recognized.';
    }
};
function addFile(filename, contents, options) {
    if (!zip) {
        throw 'jszip worker: zip not initialized.';
    }
    // console.log('webworker onmessage: addFile: ' + filename);
    if (options) {
        zip.file(filename, contents, JSON.parse(options));
    }
    else {
        zip.file(filename, contents);
    }
}
function generate(type, platform) {
    if (!zip) {
        throw 'jszip worker: zip not initialized.';
    }
    zip.generateAsync({
        type: type,
        platform: platform,
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
    }, function (status) {
        self.postMessage(status);
    })
        .then(function (content) {
        // console.log('webworker generate: created zip => ' + content);
        self.postMessage({ isDone: true, output: content }, [content]);
        zip = null;
        close();
    });
}
