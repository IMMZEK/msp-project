"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 3rd party
const _ = require("lodash");
const child_process_1 = require("child_process");
const path = require("path");
const fs = require("fs-extra");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.REMOTESERVER) {
    // @ts-ignore
    return;
}
// our modules
const nodes_utils_1 = require("./nodes-utils");
const expect_1 = require("../../test/expect");
const { mochaServerPort } = scriptsUtil;
// tslint:disable-next-line:no-var-requires
const dinfra = require(test_helpers_1.testingGlobals.dinfraPath);
const app = 'http://localhost:' + mochaServerPort;
///////////////////////////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////////////////////////
describe('/api/content', () => {
    describe('valid db update', () => {
        describe('before db update', () => {
            before(async function beforeCallback() {
                this.timeout(20000);
                const emptyContentPath = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(emptyContentPath);
                await (0, nodes_utils_1.updateDBContent)(emptyContentPath);
            });
            it('should return an error trying to fetch a not yet imported file', async () => {
                const result = await expect_1.chai.request(app).get('/content/sanityTest/file');
                (0, expect_1.expect)(result.status).to.equal(404);
            });
        });
        describe('after db update', () => {
            const testContent = {
                sanityTest: {
                    file: 'sample data'
                },
                specialCharsTest: {
                    'folder with spaces': {
                        'file with spaces': 'special chars work'
                    }
                },
                mediumNamesTest: {
                    [generateLongPath(20)]: {
                        file: 'medium names work'
                    }
                },
                longNamesTest: {
                    [generateLongPath(255)]: {
                        file: 'long names work'
                    }
                },
                bigFileTest: {
                    file: generateBigData(1000)
                },
                mimeTypeTest: {
                    'svgFile.svg': 'dummy svg data',
                    'jsonFile.json': '{"dummy": "data"}',
                    'source.c': 'dummy c code',
                    'file.hex': 'dummy hex data',
                    'image.png': 'dummy image data',
                    // special tirex types:
                    'source.ino': 'dummy c code',
                    'lnk.cmd': 'dummy cmd code',
                    'sysConfig.syscfg': 'dummy js code'
                },
                compressionTest: {
                    'big.txt': generateBigData(10),
                    'big.png': generateBigData(10),
                    'small.txt': 'not a log of data'
                },
                archiveTest: {
                    'text.text': 'dummy text data',
                    'binary.png': 'dummy binary data',
                    subFolder: {
                        'text2.text': 'dummy text data2',
                        'binary2.png': 'dummy binary data2'
                    }
                }
            };
            // Can't use fat arrow function as we need 'this' to increase the timeout
            let contentPath;
            before(function beforeCallback() {
                this.timeout(20000);
                contentPath = (0, test_helpers_1.getUniqueFolderName)();
                (0, nodes_utils_1.createContent)(contentPath, testContent);
                return (0, nodes_utils_1.updateDBContent)(contentPath);
            });
            it('should get an existing file', async () => {
                const res = await expect_1.chai.request(app).get('/content/sanityTest/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(testContent.sanityTest.file);
                (0, expect_1.expect)(res).to.have.header('etag');
            });
            it('should get an error for a non-existant file', async () => {
                const result = await expect_1.chai.request(app).get('/content/invalid/file/name');
                (0, expect_1.expect)(result.status).to.equal(404);
            });
            it('should get content with special characters in the name', async () => {
                const res = await expect_1.chai
                    .request(app)
                    .get('/content/specialCharsTest/folder%20with%20spaces/file%20with%20spaces');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(testContent.specialCharsTest['folder with spaces']['file with spaces']);
            });
            it('should get content in moderately deep folders', async () => {
                const path = Object.keys(testContent.mediumNamesTest)[0];
                const res = await expect_1.chai
                    .request(app)
                    .get('/content/mediumNamesTest/' + path + '/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(testContent.mediumNamesTest[path].file);
            });
            it('should get content in very deep folders', async () => {
                const path = Object.keys(testContent.longNamesTest)[0];
                const res = await expect_1.chai.request(app).get('/content/longNamesTest/' + path + '/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(testContent.longNamesTest[path].file);
            });
            it('should get large file content', async () => {
                const res = await expect_1.chai.request(app).get('/content/bigFileTest/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(testContent.bigFileTest.file);
            }).timeout(20000);
            describe('mime types', () => {
                const expectedMimeTypes = {
                    'svgFile.svg': 'image/svg+xml',
                    'jsonFile.json': 'application/json',
                    'source.c': 'text/x-c',
                    'image.png': 'image/png',
                    'file.hex': 'application/text',
                    // special tirex types
                    'source.ino': 'text/x-c',
                    'lnk.cmd': 'text/x-c',
                    'sysConfig.syscfg': 'application/javascript'
                };
                _.map(expectedMimeTypes, (mimeType, fileName) => {
                    it(fileName + ': should get mime type ' + mimeType, async () => {
                        const res = await expect_1.chai
                            .request(app)
                            .get('/content/mimeTypeTest/' + fileName);
                        (0, expect_1.expect)(res).to.have.status(200);
                        (0, expect_1.expect)(res).to.have.header('content-type', mimeType);
                    });
                });
            });
            describe('compression', () => {
                it('should get large content files compressed', async () => {
                    const res = await expect_1.chai.request(app).get('/content/compressionTest/big.txt');
                    (0, expect_1.expect)(res).to.have.status(200);
                    (0, expect_1.expect)(res.text).to.equal(testContent.compressionTest['big.txt']);
                    (0, expect_1.expect)(res).to.have.header('content-encoding', 'gzip');
                    (0, expect_1.expect)(res).to.not.have.header('content-length');
                });
                it('should get small files uncompressed', async () => {
                    const res = await expect_1.chai.request(app).get('/content/compressionTest/small.txt');
                    (0, expect_1.expect)(res).to.have.status(200);
                    (0, expect_1.expect)(res.text).to.equal(testContent.compressionTest['small.txt']);
                    (0, expect_1.expect)(res).to.not.have.header('content-encoding', 'gzip');
                    (0, expect_1.expect)(res).to.have.header('content-length');
                });
                it('should get uncompressible files uncompressed', async () => {
                    const res = await expect_1.chai.request(app).get('/content/compressionTest/big.png');
                    (0, expect_1.expect)(res).to.have.status(200);
                    (0, expect_1.expect)(res.body.toString()).to.equal(testContent.compressionTest['big.png']);
                    (0, expect_1.expect)(res).to.not.have.header('content-encoding');
                    (0, expect_1.expect)(res).to.have.header('content-length');
                });
                it('should get files uncompressed, if compression not accepted', async () => {
                    const res = await expect_1.chai
                        .request(app)
                        .get('/content/compressionTest/big.txt')
                        .set('accept-encoding', '');
                    (0, expect_1.expect)(res).to.have.status(200);
                    (0, expect_1.expect)(res.text).to.equal(testContent.compressionTest['big.txt']);
                    (0, expect_1.expect)(res).to.not.have.header('content-encoding', 'gzip');
                    (0, expect_1.expect)(res).to.have.header('content-length');
                });
                it('should get weak etags for compressed content', async () => {
                    const res = await expect_1.chai.request(app).get('/content/compressionTest/big.txt');
                    (0, expect_1.expect)(res).to.have.status(200);
                    (0, expect_1.expect)(res).to.have.header('etag', /W\/".*/);
                });
                it('should get strong etags for uncompressed content', async () => {
                    const res = await expect_1.chai
                        .request(app)
                        .get('/content/compressionTest/big.txt')
                        .set('accept-encoding', '');
                    (0, expect_1.expect)(res).to.have.status(200);
                    (0, expect_1.expect)(res).to.have.header('etag');
                    (0, expect_1.expect)(res).to.not.have.header('etag', /W\/".*/);
                });
            });
            it('should download directores as a zip file', async () => {
                const res = await expect_1.chai
                    .request(app)
                    .get('/content/archiveTest;archive=zip')
                    .buffer()
                    .parse(binaryParser);
                (0, expect_1.expect)(res).to.have.status(200);
                // Write data to local file system and extract it
                const tempDir = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(tempDir);
                const file = path.join(tempDir, 'archive.zip');
                fs.writeFileSync(file, res.body);
                (0, child_process_1.execSync)('unzip ' + file, { cwd: tempDir });
                // Walk through all the expected files/folders and verify content
                _.each(testContent.archiveTest, (expectedContent, fileName) => {
                    if (typeof expectedContent === 'string') {
                        verifyContent(expectedContent, path.join(tempDir, fileName));
                    }
                    else {
                        _.each(expectedContent, (subContent, subfileName) => {
                            verifyContent(subContent, path.join(tempDir, fileName, subfileName));
                        });
                    }
                });
                function verifyContent(expectedContent, fullPath) {
                    const actualContent = fs.readFileSync(fullPath).toString();
                    (0, expect_1.expect)(expectedContent).to.equal(actualContent);
                }
            });
            it('should set the resource stats match the file system', async () => {
                await verifyFileStats(contentPath);
            });
        });
        describe('after db clean', () => {
            before(async function beforeCallback() {
                this.timeout(20000);
                const emptyContentPath = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(emptyContentPath);
                await (0, nodes_utils_1.updateDBContent)(emptyContentPath);
            });
            it('should no longer get a file in that update', async () => {
                const result = await expect_1.chai.request(app).get('/content/sanityTest/file');
                (0, expect_1.expect)(result.status).to.equal(404);
            });
        });
        describe('after db re-update', () => {
            const initialContent = {
                folder: {
                    file: 'initial data'
                },
                deleteTest: {
                    file: 'will be deleted'
                }
            };
            const newContent = {
                folder: {
                    file: 'changed data'
                },
                newFolder: {
                    file: 'new data'
                }
            };
            let contentPath;
            before(async function beforeCallback() {
                this.timeout(20000);
                const initialContentPath = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(initialContentPath);
                (0, nodes_utils_1.createContent)(initialContentPath, initialContent);
                await (0, nodes_utils_1.updateDBContent)(initialContentPath);
                contentPath = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(contentPath);
                (0, nodes_utils_1.createContent)(contentPath, newContent);
                await (0, nodes_utils_1.updateDBContent)(contentPath);
            });
            it('should get updated data', async () => {
                const res = await expect_1.chai.request(app).get('/content/folder/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(newContent.folder.file);
            });
            it('should not get removed files', async () => {
                const result = await expect_1.chai.request(app).get('/content/deleteTest/file');
                (0, expect_1.expect)(result.status).to.equal(404);
            });
            it('should get new data', async () => {
                const res = await expect_1.chai.request(app).get('/content/newFolder/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(newContent.newFolder.file);
            });
            it('should set the resource stats match the file system', async () => {
                await verifyFileStats(contentPath);
            });
        });
        describe('after db append only', () => {
            const initialContent = {
                folder: {
                    file: 'initial data',
                    file2: 'short data'
                },
                deleteTest: {
                    file: 'should not be deleted'
                }
            };
            const newContent = {
                folder: {
                    file: 'changed data',
                    file2: 'long data (to verify file size updates)'
                },
                newFolder: {
                    file: 'new data'
                }
            };
            before(async function beforeCallback() {
                this.timeout(20000);
                const contentPath = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(contentPath);
                (0, nodes_utils_1.createContent)(contentPath, initialContent);
                await (0, nodes_utils_1.updateDBContent)(contentPath);
                const contentPath2 = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(contentPath2);
                (0, nodes_utils_1.createContent)(contentPath2, newContent);
                await (0, nodes_utils_1.updateDBContent)(contentPath2, { appendOnly: true });
            });
            it('should get updated data', async () => {
                const res = await expect_1.chai.request(app).get('/content/folder/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(newContent.folder.file);
            });
            it('should get files not in the new set', async () => {
                const res = await expect_1.chai.request(app).get('/content/deleteTest/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(initialContent.deleteTest.file);
            });
            it('should get new data', async () => {
                const res = await expect_1.chai.request(app).get('/content/newFolder/file');
                (0, expect_1.expect)(res).to.have.status(200);
                (0, expect_1.expect)(res.text).to.equal(newContent.newFolder.file);
            });
        });
    });
    describe('skipping symlinks', () => {
        before(async function beforeCallback() {
            this.timeout(20000);
            const contentPath = (0, test_helpers_1.getUniqueFolderName)();
            fs.emptyDirSync(contentPath);
            (0, nodes_utils_1.createContent)(contentPath, {
                realFolder: {
                    realFile: 'data'
                },
                linkedFile: 'realFolder',
                realFolder1: {
                    realFile1: 'data'
                },
                linkedFolder: {
                    linkedFile: '../realFolder1/realFile1'
                }
            });
            await (0, nodes_utils_1.updateDBContent)(contentPath);
        });
        it('should not skip real files', async () => {
            const res = await expect_1.chai.request(app).get('/content/realFolder/realFile');
            (0, expect_1.expect)(res).to.have.status(200);
        });
        it('should skip symlinked directories', async () => {
            const result = await expect_1.chai.request(app).get('/content/linkedFile');
            (0, expect_1.expect)(result.status).to.equal(404);
        });
        it('should skip symlinked files', async () => {
            const result = await expect_1.chai.request(app).get('/content/linkedFolder/linkedFile');
            (0, expect_1.expect)(result.status).to.equal(404);
        });
    });
    describe('rejecting symlinks', () => {
        it('should fail if directories are symlinked', async () => {
            try {
                const linkedFolderContentPath = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(linkedFolderContentPath);
                (0, nodes_utils_1.createContent)(linkedFolderContentPath, {
                    realFolder: {
                        realFile: 'data'
                    },
                    linkedFile: 'realFolder'
                });
                await (0, nodes_utils_1.updateDBContent)(linkedFolderContentPath, { strictValidation: true });
                (0, expect_1.expect)('should not get here').to.equal(true);
            }
            catch (e) {
                (0, expect_1.expect)(e.toString()).to.contain('Symlinks detected in content: ');
                (0, expect_1.expect)(e.toString()).to.contain('/linkedFile');
            }
        });
        it('should fail if files are symlinked', async () => {
            try {
                const linkedFilePath = (0, test_helpers_1.getUniqueFolderName)();
                fs.emptyDirSync(linkedFilePath);
                (0, nodes_utils_1.createContent)(linkedFilePath, {
                    realFolder: {
                        realFile: 'data'
                    },
                    linkedFolder: {
                        linkedFile: '../realFolder/realFile'
                    }
                });
                await (0, nodes_utils_1.updateDBContent)(linkedFilePath, { strictValidation: true });
                (0, expect_1.expect)('should not get here').to.equal(true);
            }
            catch (e) {
                (0, expect_1.expect)(e.toString()).to.contain('Symlinks detected in content: ');
                (0, expect_1.expect)(e.toString()).to.contain('/linkedFolder/linkedFile');
            }
        });
    });
    describe('after db update of specified include folders', () => {
        const initialContent = {
            folder1: {
                // excluded from update
                file: 'should not change',
                file2: 'should not be deleted'
            },
            folder2: {
                // included in update
                file: 'should be changed',
                file2: 'should be deleted'
            }
        };
        const newContent = {
            folder1: {
                // excluded from update
                file: 'changed data',
                // file2: 'deleted'
                file3: 'new data'
            },
            folder2: {
                // included in update
                file: 'changed data',
                // file2: 'deleted'
                file3: 'new data'
            },
            folder3: {
                // included in update, and new
                file: 'new data'
            }
        };
        before(async function beforeCallback() {
            this.timeout(20000);
            const contentPath = (0, test_helpers_1.getUniqueFolderName)();
            fs.emptyDirSync(contentPath);
            (0, nodes_utils_1.createContent)(contentPath, initialContent);
            await (0, nodes_utils_1.updateDBContent)(contentPath);
            const contentPath2 = (0, test_helpers_1.getUniqueFolderName)();
            fs.emptyDirSync(contentPath2);
            (0, nodes_utils_1.createContent)(contentPath2, newContent);
            const configFileFolder = (0, test_helpers_1.getUniqueFolderName)();
            fs.emptyDirSync(configFileFolder);
            const configFile = path.join(configFileFolder, 'config.cfg');
            await fs.writeFile(configFile, 'folder2\nfolder3');
            await (0, nodes_utils_1.updateDBContent)(contentPath2, { configFile });
        });
        it('should not change excluded data', async () => {
            let res = await expect_1.chai.request(app).get('/content/folder1/file');
            (0, expect_1.expect)(res).to.have.status(200);
            (0, expect_1.expect)(res.text).to.equal(initialContent.folder1.file);
            res = await expect_1.chai.request(app).get('/content/folder1/file2');
            (0, expect_1.expect)(res).to.have.status(200);
            (0, expect_1.expect)(res.text).to.equal(initialContent.folder1.file2);
        });
        it('should change included data', async () => {
            let res = await expect_1.chai.request(app).get('/content/folder2/file');
            (0, expect_1.expect)(res).to.have.status(200);
            (0, expect_1.expect)(res.text).to.equal(newContent.folder2.file);
            const result = await expect_1.chai.request(app).get('/content/folder2/file2');
            (0, expect_1.expect)(result.status).to.equal(404);
            res = await expect_1.chai.request(app).get('/content/folder2/file3');
            (0, expect_1.expect)(res).to.have.status(200);
            (0, expect_1.expect)(res.text).to.equal(newContent.folder2.file3);
        });
        it('should insert new included data', async () => {
            const res = await expect_1.chai.request(app).get('/content/folder3/file');
            (0, expect_1.expect)(res).to.have.status(200);
            (0, expect_1.expect)(res.text).to.equal(newContent.folder3.file);
        });
    });
});
function generateLongPath(length) {
    let result = '';
    for (let i = 0; i < length; ++i) {
        result += i.toPrecision() + '/';
    }
    return result + length.toString();
}
function generateBigData(size) {
    const result = [];
    for (let i = 0; i < size; ++i) {
        result.push('Lots of data');
    }
    return result
        .map(() => result.join())
        .map(() => result.join())
        .join();
}
function binaryParser(res, cb) {
    res.setEncoding('binary');
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        cb(null, new Buffer(data, 'binary'));
    });
}
async function verifyFileStats(contentPath) {
    const prefix = scriptsUtil.getMochaConfig().dbResourcePrefix;
    const results = [];
    await dinfra
        .queryResources()
        .withNamePrefix(prefix)
        .invoke()
        .progress(result => {
        // ignore "lastUpdate" which is an internal file
        if (!result.name.endsWith('lastUpdate')) {
            results.push(result);
        }
    });
    // tslint:disable-next-line:no-unused-expression
    (0, expect_1.expect)(results).to.not.be.empty;
    results.forEach(result => {
        const filePath = result.name.slice(prefix.length);
        const stats = fs.statSync(path.join(contentPath + filePath));
        (0, expect_1.expect)(stats.mtime.toISOString()).to.equal(new Date(result.modified).toISOString());
        (0, expect_1.expect)(stats.size).to.equal(result.size);
    });
}
