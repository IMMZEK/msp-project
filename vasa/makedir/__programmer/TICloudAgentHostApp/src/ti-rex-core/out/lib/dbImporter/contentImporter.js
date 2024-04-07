"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentImport = void 0;
const path = require("path");
const fs = require("fs-extra");
const express_1 = require("express");
const vars_1 = require("../vars");
// define additional mime types that tirex supports
express_1.static.mime.define(vars_1.Vars.TIREX_MIME_TYPES);
async function contentImport(dinfra, contentPath = '', resourcePrefix, options) {
    // If a config file listing includes paths is given, then call this function once per include
    // path, but the source (contentPath) and destination (resourcePrefix) updated
    if (options.configFile) {
        const includePaths = await getIncludePaths(options.configFile);
        for (const includePath of includePaths) {
            await validateAndImport(dinfra, path.join(contentPath, includePath), path.join(resourcePrefix, includePath), options, true);
        }
        console.log();
        console.log('(Statistics generation skipped as only certain folders were included)');
    }
    else {
        return validateAndImport(dinfra, contentPath, resourcePrefix, options, false);
    }
}
exports.contentImport = contentImport;
async function validateAndImport(dinfra, contentPath, resourcePrefix, options, importFromSubFolder) {
    // Optionally check that no symlinks exist in the source data (as we skip those on import)
    if (options.strictValidation || options.dryRun) {
        const links = await validateContent(contentPath);
        if (links.length) {
            throw new Error('Symlinks detected in content: ' + links.join(', '));
        }
    }
    if (options.dryRun) {
        console.log('Dry run complete. Not importing content.');
        return;
    }
    // Now import using the dinfra batch-importer
    const logger = options.quiet
        ? undefined
        : options.verboseLogging
            ? verboseLogger(options.appendOnly)
            : basicLogger(options.appendOnly, importFromSubFolder ? contentPath : '');
    return doImport(dinfra, contentPath, resourcePrefix, logger, options.appendOnly, importFromSubFolder);
}
// Actually import data
function doImport(dinfra, contentPath, resourcePrefix, logger, appendOnly, importFromSubFolder) {
    return new Promise((resolve, reject) => {
        // opts supports branch/version, but we're relying on package names being unique per version
        // and also "batch", which Julian recommended not to use for now (not well tested)
        const opts = {
            batcher: {
                opBatchSize: 512,
                contentBatchSize: 16
            }
        };
        const importer = dinfra.newResourceImporter(contentPath, resourcePrefix, opts);
        importer
            .on('error', reject)
            .on('result', async (event) => {
            // Always skip links - these don't map into the database
            if (event.op === 'link') {
                importer.next();
                return;
            }
            // Log the event
            if (logger) {
                logger(event);
            }
            // Skip destroys unless explicitly told to do so
            if (event.op === 'destroy') {
                if (appendOnly) {
                    importer.next();
                    return;
                }
            }
            // Determine the mime type so it's stored in the database and added to requests
            if (event.stat) {
                // note: By default express types for mime are wrong because express specifically depends on
                // mime 1.x but @types picks ups the latest mime 2.x because of "*" in the dependency.
                // We manually installed @types/mime@1.3.1 to work around this.
                const type = express_1.static.mime.lookup(event.path);
                if (type && path.extname(event.path)) {
                    // TODO: do we need to set a default mime type if no extension?
                    // (see https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Configuring_server_MIME_types)
                    event.stat.headers = {
                        'content-type': type
                    };
                }
            }
            // Lastly, apply the change
            importer.applyStatEvent(event);
        })
            .on('end', () => {
            if (!importFromSubFolder) {
                if (logger) {
                    console.log();
                    console.log(importer.generateStats());
                }
            }
            resolve();
        })
            .next();
    });
}
function basicLogger(appendOnly, subFolder) {
    // Function to suppress duplicate simple output to one output per second
    let lastCharacter = ' ';
    let lastLog = Date.now();
    const suppressTime = 1000; // milliseconds
    function logCharacter(char) {
        if (lastCharacter !== char || Date.now() - lastLog >= suppressTime) {
            lastCharacter = char;
            lastLog = Date.now();
            process.stdout.write(char);
        }
    }
    // If importing from a sub-folder, just spit out the folder
    if (subFolder) {
        process.stdout.write('\n' + path.basename(path.basename(subFolder)));
    }
    return (event) => {
        // If not importing from a sub-folder, spit out each sub-folder found.
        // event.path should be relative to contentPath, so to see if this is a top level
        // folder (which we want to explicitly log out), we need to see if it's ./something
        // without an extra /
        if (!subFolder && event.path.split('/').length === 2) {
            lastCharacter = ' ';
            lastLog = Date.now();
            process.stdout.write('\n' + path.basename(event.path));
        }
        // Log a single character that indicates the action taken
        if (event.op === 'destroy' && !appendOnly) {
            logCharacter('-');
        }
        else if (event.op === 'import') {
            logCharacter('+');
        }
        else if (event.op === 'update') {
            logCharacter('*');
        }
        else if (event.stat && event.stat.isFile()) {
            logCharacter('.');
        }
    };
}
function verboseLogger(appendOnly) {
    return (event) => {
        // Log every file event
        if (event.op === 'destroy' && !appendOnly) {
            console.log(`destroying ${event.path}`);
        }
        else if (event.op === 'import') {
            console.log(`importing ${event.path}`);
        }
        else if (event.op === 'update') {
            console.log(`updating ${event.path}`);
        }
        else {
            console.log(`no change to ${event.path}`);
        }
    };
}
// Validate the content is good
// For now, this just checks that there's no symlinks anywhere in it
async function validateContent(contentPath) {
    const links = [];
    const contents = await fs.readdir(contentPath);
    for (const content of contents) {
        const subPath = path.join(contentPath, content);
        const stats = await fs.lstat(subPath);
        if (stats.isSymbolicLink()) {
            links.push(subPath);
        }
        else if (stats.isDirectory()) {
            const subContent = await validateContent(subPath);
            links.push(...subContent);
        }
    }
    return links;
}
async function getIncludePaths(configFile) {
    const content = (await fs.readFile(configFile)).toString();
    return content.split('\n').filter(entry => entry);
}
