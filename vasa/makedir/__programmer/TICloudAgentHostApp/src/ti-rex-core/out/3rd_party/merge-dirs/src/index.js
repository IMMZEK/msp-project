"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeDirs = exports.conflictResolvers = void 0;
/*

  (The MIT License)

  Copyright (C) 2005-2013 Kai Davenport

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
const fs = require("fs-extra");
const inquirer_1 = require("inquirer");
const path_1 = require("path");
exports.conflictResolvers = {
    ask: 'ask',
    skip: 'skip',
    overwrite: 'overwrite'
};
async function copyFile(file, location, move) {
    // await fs.mkdir((file).split('/').slice(0, -1).join('/'), 0x1ed, true);
    // await fs.writeFile(file, fs.readFileSync(location))
    await fs.remove(file);
    if (move) {
        await fs.move(location, file);
    }
    else {
        await fs.copy(location, file);
    }
}
function renameQuestionFactory(dest) {
    const defaultNewName = `conflict-${dest.split(path_1.default.sep).pop()}`;
    return {
        type: 'input',
        name: 'fileName',
        message: 'What do you want to name the second file?',
        default: defaultNewName
    };
}
function conflictQuestionFactory(f1, f2) {
    return {
        type: 'list',
        name: 'resolution',
        message: `conflict: ${f1} - ${f2}`,
        choices: [
            'skip',
            new inquirer_1.default.Separator(),
            'overwrite',
            new inquirer_1.default.Separator(),
            'keep both'
        ]
    };
}
function saveRenamedFile(src, dest) {
    return async (answer) => {
        const newName = answer.fileName;
        const newDest = dest
            .split(path_1.default.sep)
            .slice(0, -1)
            .join(path_1.default.sep) +
            path_1.default.sep +
            newName;
        await copyFile(newDest, src, true);
    };
}
function resolveConflict(src, dest) {
    return async (answer) => {
        switch (answer.resolution) {
            case 'overwrite':
                await copyFile(src, dest, true);
                break;
            case 'keep both':
                inquirer_1.default.prompt([renameQuestionFactory(dest)], saveRenamedFile(src, dest));
                break;
            default:
        }
    };
}
function fileAsk(src, dest) {
    const question = conflictQuestionFactory(src, dest);
    inquirer_1.default.prompt([question], resolveConflict(src, dest));
}
/*
 * Note src will be moved into dest if move = true (i.e src will no longer exist after operation)
*/
async function mergeDirs(src, dest, conflictResolver = exports.conflictResolvers.overwrite, move = true) {
    const files = await fs.readdir(src);
    await Promise.all(files.map(async (file) => {
        const srcFile = '' + src + '/' + file;
        const destFile = '' + dest + '/' + file;
        const stats = await fs.lstat(srcFile);
        if (!(await fs.pathExists(destFile))) {
            await copyFile(destFile, srcFile, move);
        }
        else if (stats.isDirectory()) {
            await mergeDirs(srcFile, destFile, conflictResolver);
        }
        else {
            switch (conflictResolver) {
                case exports.conflictResolvers.ask:
                    fileAsk(srcFile, destFile);
                    break;
                case exports.conflictResolvers.overwrite:
                    await copyFile(destFile, srcFile, move);
                    break;
                case exports.conflictResolvers.skip:
                // console.log(`${destFile} exists, skipping...`);
            }
        }
    }));
}
exports.mergeDirs = mergeDirs;
