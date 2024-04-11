"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResourceContent = exports.generatePackageOverviewContent = exports.generateDevtoolContent = exports.generateDeviceContent = exports.firstFolderInAllPackages = void 0;
exports.firstFolderInAllPackages = 'Software';
function generateDeviceContent(name, id) {
    return {
        name,
        id,
        type: 'device',
        coreTypes: [{ name: 's', id: 'aaa' }],
        description: 'I am a device'
    };
}
exports.generateDeviceContent = generateDeviceContent;
function generateDevtoolContent(name, id) {
    return {
        name,
        id,
        type: 'board',
        description: 'I am a devtool'
    };
}
exports.generateDevtoolContent = generateDevtoolContent;
function generatePackageOverviewContent(name, id, version, type, dependencies, supplements) {
    if (dependencies) {
        return {
            name,
            id,
            version,
            type,
            description: 'package overview',
            dependencies,
            allowPartialDownload: false,
            metadataVersion: '3.0.0'
        };
    }
    else if (supplements) {
        return {
            name,
            id,
            version,
            type,
            description: 'package overview',
            supplements,
            allowPartialDownload: false,
            metadataVersion: '3.0.0'
        };
    }
    else {
        return {
            name,
            id,
            version,
            type,
            description: 'package overview',
            allowPartialDownload: false,
            metadataVersion: '3.0.0'
        };
    }
}
exports.generatePackageOverviewContent = generatePackageOverviewContent;
function generateResourceContent(name, devices, devtools) {
    return {
        name,
        resourceType: 'file',
        fileType: '.html',
        location: 'example.html',
        description: 'I am a resource',
        categories: ['root', 'child'],
        devices,
        devtools
    };
}
exports.generateResourceContent = generateResourceContent;
