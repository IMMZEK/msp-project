"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const xml2js = require("xml2js");
const _ = require("lodash");
const vars_1 = require("../lib/vars");
// project files to be excluded from processing while generating dependencies
const EXCLUDED_PROJECT_FILE = 'SYSCONFIG_GENERATED_FILES.IPCF';
exports.generate = async (args) => {
    console.time('Elapsed time');
    // Check if package directory exists
    let packageDir = args.pkgDir ? path.normalize(args.pkgDir) : '';
    packageDir = packageDir.replace(/\\/g, '/');
    if (!fs.pathExistsSync(packageDir)) {
        throw new Error('Package installation directory could not be found.');
    }
    // Initialize dependency folder
    const metadataDir = path.posix.join(packageDir, '.metadata', '.tirex');
    const depDir = path.posix.join(metadataDir, '.dependencies');
    fs.emptyDirSync(depDir);
    // Initialize error log folder
    const errorLogStream = fs.createWriteStream(path.posix.join(depDir, 'errors.log'));
    console.log('Successfully initialized ' + depDir + ' directory.');
    // We support one and only one package.tirex.json file, so throw an error if otherwise
    const tirexPackageFilenames = glob.sync('*package.tirex.json', {
        cwd: '' + metadataDir,
        nodir: true
    });
    if (_.isEmpty(tirexPackageFilenames)) {
        throw new Error(`No *package.tirex.json files found at: ${metadataDir}`);
    }
    else if (tirexPackageFilenames.length > 1) {
        throw new Error(`Multiple *package.tirex.json files found at: ${metadataDir}`);
    }
    // Get package.tirex.json prefix (expected to be '' except for modules)
    const packageJsonPrefix = tirexPackageFilenames[0].match(/^(.*)package.tirex.json$/)[1];
    // Retrieve package name
    const packageId = readPackageJson(packageJsonPrefix, 'tirex')[0].id;
    // Retrieve root macro name and project locations
    const ccsPackageJson = readPackageJson(packageJsonPrefix, 'ccs', false);
    const rootName = ccsPackageJson ? ccsPackageJson[0].rootMacroName : undefined;
    console.log('Locating project files...');
    const projFilePaths = locateProjects(packageDir);
    const depMappingContent = {};
    let curPathIndex = 0;
    let numUnresolvedPaths = 0;
    let numUnparsedFiles = 0;
    let numErrors = 0;
    // Generate dependencies for each project
    console.log('Generating dependencies...');
    for (const projFilePath of projFilePaths) {
        // Resolve conflicts between project names
        let numConflicts = 0;
        for (let i = 0; i < curPathIndex; i++) {
            if (path.basename(projFilePaths[i]) === path.basename(projFilePath)) {
                numConflicts++;
            }
        }
        curPathIndex++;
        let depFileName = 'DEFAULT_DEPENDENCY_NAME';
        switch (path.extname(projFilePath)) {
            case '.projectSpec':
                depFileName = path.basename(projFilePath, '.projectSpec');
                break;
            case '.projectspec':
                depFileName = path.basename(projFilePath, '.projectspec');
                break;
            case '.ipcf':
                depFileName = path.basename(projFilePath, '.ipcf');
                break;
        }
        depFileName = depFileName + '_' + numConflicts + '.dependency.tirex.json';
        // Start generating dependencies for the current project
        try {
            const projContent = await fs.readFile(path.join(packageDir, projFilePath));
            const projJson = await parseXML(projContent);
            // Resolve file paths in each project
            const pathVars = [];
            let files = [];
            let key = '';
            switch (path.extname(projFilePath)) {
                case '.projectSpec':
                case '.projectspec':
                    key = '$';
                    files = projJson.projectSpec.project[0].file
                        ? projJson.projectSpec.project[0].file.map((file) => file[key])
                        : [];
                    const declaredPathVars = projJson.projectSpec.project[0]
                        .pathVariable
                        ? projJson.projectSpec.project[0].pathVariable.map((pathVar) => pathVar[key])
                        : [];
                    if (!projJson.projectSpec.project[0].file) {
                        errorLogStream.write('Unable to parse files\nIn project: ' + projFilePath + '\n\n');
                        numUnparsedFiles++;
                    }
                    // Remove duplicate path variables
                    const pathVarNames = declaredPathVars.map((pathVar) => pathVar.name);
                    let curVarIndex = 0;
                    for (const name of pathVarNames) {
                        if (pathVarNames.lastIndexOf(name) === curVarIndex) {
                            pathVars.push(declaredPathVars[curVarIndex]);
                        }
                        curVarIndex++;
                    }
                    break;
                case '.ipcf':
                    key = '_';
                    let fileGroups = projJson.iarProjectConnection.files[0].group
                        ? projJson.iarProjectConnection.files[0].group
                        : [];
                    fileGroups = fileGroups.concat(projJson.iarProjectConnection.files[0]);
                    if (!projJson.iarProjectConnection.files[0]) {
                        errorLogStream.write('Unable to parse files\nIn project: ' + projFilePath + '\n\n');
                        numUnparsedFiles++;
                    }
                    for (const fileGroup of fileGroups) {
                        if (fileGroup.path) {
                            for (const filePath of fileGroup.path) {
                                files.push(filePath[key]);
                            }
                        }
                    }
                    break;
            }
            const depContent = generateDepContent(projFilePath, files, pathVars, rootName);
            // Create dependency file for the current project
            await fs.outputJSON(path.join(depDir, depFileName), depContent, {
                spaces: 4
            });
            // Create the dependency mapping file entry for the current project
            depMappingContent[path.posix.relative(depDir, path.posix.join(packageDir, projFilePath))] = depFileName;
        }
        catch (err) {
            errorLogStream.write(err + '\nIn project: ' + projFilePath + '\n\n');
            numErrors++;
        }
    }
    // Create a dependency mapping file once all the individual dependency files have been generated
    console.log('\nSuccessfully generated ' + Object.keys(depMappingContent).length + ' dependency files.');
    console.log('\nUnparsed dependency files: ' + numUnparsedFiles);
    console.log('Dependency generation errors: ' + numErrors);
    console.log('Unresolved file paths: ' + numUnresolvedPaths);
    const depMappingFilePath = path.join(depDir, `${packageId}-${vars_1.Vars.IMPLICIT_DEPENDENCY_MAPPING_FILENAME}`);
    await fs.outputJSON(depMappingFilePath, depMappingContent, { spaces: 4 });
    console.log(`\nSuccessfully generated dependency mapping file: ${depMappingFilePath}`);
    errorLogStream.end();
    return;
    // Read and parse a 'ccs' or 'tirex' package JSON file
    function readPackageJson(prefix, packageType, throwIfNonexistent = true) {
        const jsonPath = path.posix.join(metadataDir, `${prefix}package.${packageType}.json`);
        if (!fs.pathExistsSync(jsonPath)) {
            if (throwIfNonexistent) {
                throw new Error(`Package JSON file not found: ${jsonPath}`);
            }
            else {
                return undefined;
            }
        }
        else {
            return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }
    }
    // Locate all project files in the package directory
    function locateProjects(searchDir) {
        let result = [];
        const items = fs.readdirSync(searchDir);
        // Recursively check each directory for project files
        for (const item of items) {
            const stats = fs.statSync(path.posix.join(searchDir, item));
            const lstats = fs.lstatSync(path.posix.join(searchDir, item));
            // Avoid traversing symbolic links
            if (lstats.isSymbolicLink()) {
                continue;
            }
            if (stats.isFile() &&
                (path.extname(item) === '.projectSpec' ||
                    path.extname(item) === '.projectspec' ||
                    path.extname(item) === '.ipcf') &&
                item.toUpperCase() !== EXCLUDED_PROJECT_FILE) {
                const projPath = path.posix.relative(packageDir, path.posix.join(searchDir, item));
                result.push(projPath);
            }
            else if (stats.isDirectory()) {
                result = result.concat(locateProjects(path.posix.join(searchDir, item)));
            }
        }
        return result;
    }
    // Wrap xml2js' parseString function in a promise
    function parseXML(xmlContent) {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xmlContent, (err, result) => {
                err ? reject(err) : resolve(result);
            });
        });
    }
    // Resolve file paths inside a project file
    function generateDepContent(projFilePath, files, pathVars, rootMacroName) {
        const depContent = [{ files: [] }];
        let relativeRootDir = path.relative(path.join(packageDir, path.dirname(projFilePath)), packageDir);
        relativeRootDir = relativeRootDir.replace(/\\/g, '/');
        // Resolve file paths until variables cannot be substituted
        for (const file of files) {
            let oldPath = '';
            switch (path.extname(projFilePath)) {
                case '.projectSpec':
                case '.projectspec':
                    oldPath = file.path;
                    break;
                case '.ipcf':
                    oldPath = file;
                    break;
            }
            oldPath = path.normalize(oldPath);
            const lastChar = oldPath.charAt(oldPath.length - 1);
            let newPath = oldPath;
            if (lastChar === '\\' || lastChar === '/') {
                newPath = oldPath.substr(0, oldPath.length - 1);
            }
            do {
                oldPath = newPath;
                switch (path.extname(projFilePath)) {
                    case '.projectSpec':
                    case '.projectspec':
                        let pathSegs;
                        // Replace path variables declared within project file
                        for (const pathVar of pathVars) {
                            const pathVarName = pathVar.name;
                            const pathVarValue = pathVar.path;
                            pathSegs = newPath.split(path.posix.sep);
                            if (pathSegs.indexOf(pathVarName) > -1) {
                                pathSegs[pathSegs.indexOf(pathVarName)] = pathVarValue;
                            }
                            else if (newPath.indexOf('$' + '{' + pathVarName + '}') > -1) {
                                pathSegs[pathSegs.indexOf('$' + '{' + pathVarName + '}')] =
                                    pathVarValue;
                            }
                            else if (newPath.indexOf('$' + pathVarName + '$') > -1) {
                                pathSegs[pathSegs.indexOf('$' + pathVarName + '$')] = pathVarValue;
                            }
                            newPath = pathSegs.join('/');
                        }
                        // Replace root macro name with root directory
                        pathSegs = newPath.split(path.posix.sep);
                        if (pathSegs.indexOf(rootMacroName) > -1) {
                            pathSegs[pathSegs.indexOf(rootMacroName)] = relativeRootDir;
                        }
                        else if (newPath.indexOf('$' + '{' + rootMacroName + '}') > -1) {
                            pathSegs[pathSegs.indexOf('$' + '{' + rootMacroName + '}')] =
                                relativeRootDir;
                        }
                        else if (newPath.indexOf('$' + rootMacroName + '$') > -1) {
                            pathSegs[pathSegs.indexOf('$' + rootMacroName + '$')] = relativeRootDir;
                        }
                        newPath = pathSegs.join('/');
                        break;
                    case '.ipcf':
                        // Replace root name with root directory
                        if (new RegExp(/\$.+?INSTALL_DIR\$/).test(newPath)) {
                            newPath = newPath.replace(/\$.+?INSTALL_DIR\$/, relativeRootDir);
                        }
                        else if (new RegExp(/\$\{.+?INSTALL_DIR\}/).test(newPath)) {
                            newPath = newPath.replace(/\$\{.+?INSTALL_DIR\}/, relativeRootDir);
                        }
                        else if (new RegExp(/.+?INSTALL_DIR/).test(newPath)) {
                            newPath = newPath.replace(/.+?INSTALL_DIR/, relativeRootDir);
                        }
                        break;
                }
            } while (newPath !== oldPath);
            // Transform file path for insertion into dependency file
            newPath = newPath.replace(/\\/g, '/');
            newPath = newPath.trim();
            newPath = path.posix.join(packageDir, path.dirname(projFilePath), newPath);
            newPath = path.posix.relative(path.posix.join(packageDir, path.dirname(projFilePath)), newPath);
            // Check if the path was resolved properly
            if (fs.pathExistsSync(path.posix.join(packageDir, path.dirname(projFilePath), newPath))) {
                const filename = path.basename(newPath);
                // TODO: Remove prepended '+'
                // Modify dependency file content
                switch (path.extname(projFilePath)) {
                    case '.projectSpec':
                    case '.projectspec':
                        depContent[0].files.push(('+' +
                            newPath +
                            ' -> ' +
                            (file.targetDirectory
                                ? path.posix.join(file.targetDirectory, filename)
                                : filename)));
                        break;
                    case '.ipcf':
                        // TODO: Use the copyTo property as well as a target path (similar to targetDirectory property of projectspec files)
                        // TODO: Look into what the real IAR IDE does
                        depContent[0].files.push('+' + newPath + ' -> ' + filename);
                        break;
                }
            }
            else {
                errorLogStream.write('File not found: ' + newPath + '\nIn project: ' + projFilePath + '\n\n');
                numUnresolvedPaths++;
            }
        }
        return depContent;
    }
};
exports.command = 'generate-metadata [options]';
exports.describe = 'Generate metadata to determine what items can be viewed in tirex';
exports.builder = {
    pkgDir: {
        alias: 'pd',
        describe: 'The absolute path to the package installation directory',
        string: true,
        demandOption: true
    }
};
exports.handler = async (argv) => {
    try {
        await exports.generate(argv);
    }
    catch (err) {
        console.log(err);
    }
    console.timeEnd('Elapsed time');
};
