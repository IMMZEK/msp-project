"use strict";
const path = require('path');
const childproc = require('child_process');
const Q = (module.parent && module.parent.require('q')) || require('q');
const os = require('os');
const fs = require('fs');
const https = require('https');
const http = require('http');

const _mkdir = (dir) => {
    if (fs.existsSync(dir)) {
        let stat = fs.statSync(dir);
        if (stat.isFile()) return false;
        if (stat.isDirectory()) return true;
    } else {
        if (_mkdir(path.dirname(dir)) === true) {
            fs.mkdirSync(dir);
            return true;
        } else {
            return false;
        }
    }
}
const _copydir = (srcDir, destDir) => {
    if (_mkdir(destDir) !== true) return;
    try {
        var files = fs.readdirSync(srcDir);
    } catch(e) {
        return;
    }
    if (files.length > 0) {
        for (var i=0; i<files.length; i++) {
            let filePath = srcDir + '/' + files[i];
            let filePath2 = destDir+'/'+files[i]
            if (fs.statSync(filePath).isFile())
                fs.copyFileSync(filePath, filePath2);
            else
                _copydir(filePath, filePath2);
        }
    }
}
const _rmdir = (dirPath) => {
    try {
        var files = fs.readdirSync(dirPath);
    } catch(e) {
        return;
    }
    if (files.length > 0) {
        for (var i=0; i<files.length; i++) {
            let filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
            else
                _rmdir(filePath);
        }
    }
    fs.rmdirSync(dirPath);
}
const fetch_file = (url, localfile) => {
    const deferred = Q.defer();
    http.get(url, res=>{
        let myws = fs.createWriteStream(localfile);
        myws.on('error', x=>{ deferred.reject(x); })
        .on('finish', x=>{ deferred.resolve(x); });
        res.pipe(myws);
    }).on('error', x=>{ deferred.reject(x); });
    return deferred.promise;
}

class BSL {
    constructor() {
        let x = os.platform();
        if (x == 'win32' || x=='linux') {this.myos = x} else {this.myos = 'osx'};
        this.bsls = 'bsl-scripter';
        if (this.myos == 'win32') this.bsls += '.exe';
        this.bsltooldir = __dirname;
        //this.bsltooldir = path.join(os.tmpdir(), 'gc-bsl-storage', 'tool');
        //_mkdir(this.bsltooldir);
        this.bsluserdir =  path.join(os.tmpdir(), 'gc-bsl-storage', 'data');
        _mkdir(this.bsluserdir);
        this.bslscripter = this.bsltooldir+'/'+this.myos+'/'+this.bsls;
    }

    grab_tools(auxdir, regrab, options) {
        const fromsite = 'http://dev.ti.com/components/bsl/';
        _mkdir(this.bsltooldir+'/'+auxdir);
        let todo = [{l:this.bslscripter,r:fromsite+this.myos+'/'+this.bsls}
          ,{l:this.bsltooldir+'/'+auxdir+'/script.txt',r:fromsite+auxdir+'/script.txt'}
          ,{l:this.bsltooldir+'/'+auxdir+'/pass32_default.txt',r:fromsite+auxdir+'/pass32_default.txt' }
          ,{l:this.bsltooldir+'/'+auxdir+'/pass32_wrong.txt',r:fromsite+auxdir+'/pass32_wrong.txt'  }
          ,{l:this.bsltooldir+'/'+auxdir+'/RAM_BSL_USB.txt',r:fromsite+auxdir+'/RAM_BSL_USB.txt'}];
        let tofetch = [];
        todo.forEach((x,idx,ary)=>{
            if (regrab == true || !fs.existsSync(x.l) || !fs.statSync(x.l).isFile())
                tofetch.push(fetch_file(x.r,x.l))
        });
        return Q.all(tofetch)
    }
    prepare_input(userFile, options) {
        const local = this.bsluserdir + '/'+Date.now();
        _mkdir(local);
        _copydir(this.bsltooldir+'/'+options.auxdir, local);
        const fname = path.basename(userFile);
        let blob = fs.readFileSync(local+'/script.txt', 'utf8').replace(/\?_userfile/, fname);
        fs.writeFileSync(local+'/script.txt', blob, 'utf8');
        fs.copyFileSync(userFile, local+'/'+fname);
        return Q.resolve(local);
    }
    run_tool(tool, scriptfilename, localdir, options) {
        const deferred = Q.defer();
        let opts = {cwd: localdir};
        opts.timeout = options.timeout || 5*60*1000;
        if (!fs.existsSync(tool) || !fs.statSync(tool).isFile()) {
            return Q.reject('Cannot find tool or tool is not a file '+tool);
        }
        let toexec = () => {
          childproc.execFile(tool, [scriptfilename], opts, (err,stdout, stderr)=>{
            options.rm_localdir && _rmdir(localdir);
            deferred.resolve({err: err, stdout: stdout, stderr: stderr});
          });
        }
        try {
            toexec();
        } catch (err) {
            if (err) { // some windows may have spawn EBUSY problem
                setTimeout(() => {toexec();}, 5000);
            }
        }
        return deferred.promise;
    }
    loadProgram(filePath, options) {
        let opts = options || {};
        if (!opts.auxdir) opts.auxdir = '5xx_usb';
        opts.rm_localdir = true;
        //return this.grab_tools(opts)
        //.then(()=> this.prepare_input(filePath, opts))
        return this.prepare_input(filePath, opts)
        .then(localdir=>{
            return this.run_tool(this.bslscripter, 'script.txt', localdir, opts);
        })
    }
    customLoad(scriptfilename, options) {
        let opts = options || {};
        return this.run_tool(this.bslscripter, scriptfilename, opts.localdir, opts);
    }
}
let bsl = null;
function getLoader(loader) {
    if (loader === 'bsl') {
        if (bsl === null) {
            bsl = new BSL();
        }
        return bsl;
    }
    throw new Error("Unsupported Loader: " + loader);
}
function customLoad(loaderType, filePath, options) {
    return getLoader(loaderType).customLoad(filePath, options);
};
function loadProgram(loaderType, filePath, options) {
    return getLoader(loaderType).loadProgram(filePath, options);
};
exports.name = "BSL";

function instance() {
    return {
        commands: { loadProgram, customLoad },
    };
}
exports.instance = instance;
exports.create = function() {};

