"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.folderNodeWithValidGroup = void 0;
// 3rd party
const _ = require("lodash");
// determine if we want to run this test
const test_helpers_1 = require("../../scripts-lib/test/test-helpers");
const scriptsUtil = require("../../scripts-lib/util");
if (test_helpers_1.testingGlobals.testConfig !== scriptsUtil.TestConfig.SERVER_INDEPENDENT) {
    // @ts-ignore
    return;
}
// our modules
const ajax_harness_1 = require("../../test/ajax-harness/ajax-harness");
const browser_emulator_1 = require("../../test/frontend/browser-emulator");
const expect_1 = require("../../test/expect");
const initialize_server_harness_data_1 = require("../../test/server-harness/initialize-server-harness-data");
const response_data_1 = require("../../shared/routes/response-data");
const Data = require("../../test/server-harness/server-harness-data");
const server_interface_1 = require("./server-interface");
const errors_1 = require("../../shared/errors");
////////////////////////////////////////////////////////////////////////////////
/// Data
////////////////////////////////////////////////////////////////////////////////
const { rootNode, folderNodeNoGroup, folderNodeGroupDoesNotExist, 
// Devices
device1, device2, device3, device4, 
// Devtools
devtool1, devtool2 } = Data;
// Packages & Package groups
const PACKAGE_GROUP_PUBLIC_UID_1 = '1';
const PACKAGE_GROUP_PUBLIC_UID_2 = '2';
const packageMsp = {
    name: 'msp430ware',
    packageVersion: '1.0.0',
    packagePublicId: '1',
    packagePublicUid: '1',
    packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_1],
    packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
    dependencies: [],
    isInstallable: true,
    installCommand: { win: './msp430.exe' },
    downloadUrl: { win: 'msp/msp430.zip' },
    aliases: [],
    modules: [],
    moduleGroups: []
};
const packageSla = {
    name: 'sla',
    packageVersion: '7.0.0',
    packagePublicId: '2',
    packagePublicUid: '7',
    packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_1],
    packageType: "SubPackage" /* Nodes.PackageType.SUB_PACKAGE */,
    dependencies: [
        {
            packagePublicId: packageMsp.packagePublicId,
            versionRange: packageMsp.packageVersion,
            dependencyType: "optional" /* PackageDependencyType.OPTIONAL */
        }
    ],
    isInstallable: true,
    installCommand: { win: './sla.exe' },
    downloadUrl: { win: 'sla.zip' },
    aliases: [],
    modules: [],
    moduleGroups: []
};
const package3 = {
    name: 'foo',
    packageVersion: '1.1.1',
    packagePublicId: '2and3',
    packagePublicUid: 'bar',
    packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_2],
    packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
    dependencies: [],
    isInstallable: true,
    installCommand: { win: './foo.exe' },
    downloadUrl: { win: 'foobar/baz.zip' },
    aliases: [],
    modules: [],
    moduleGroups: []
};
const packageGroup1 = {
    packageGroupVersion: '1.2.3',
    packageGroupPublicId: 'msp',
    packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_1,
    packagesPublicUids: [packageMsp.packagePublicUid, packageSla.packagePublicUid],
    mainPackagePublicUid: packageMsp.packagePublicUid,
    hideByDefault: false,
    packagesToListVersionsFrom: []
};
const packageGroup2 = {
    packageGroupVersion: '1.2.1',
    packageGroupPublicId: 'msp',
    packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_2,
    packagesPublicUids: [package3.packagePublicUid],
    mainPackagePublicUid: package3.packagePublicUid,
    hideByDefault: false,
    packagesToListVersionsFrom: []
};
// Nodes
exports.folderNodeWithValidGroup = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '112',
    nodePublicId: 'public112',
    name: 'Folder 2',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: packageMsp.packagePublicUid,
    packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_1,
    filterData: {
        filterPackageGroup: []
    }
};
const folderNode2 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '2',
    nodePublicId: 'public2',
    name: 'Folder 2',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    }
};
const folderNode3 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '3',
    nodePublicId: 'public3',
    name: 'Folder 3',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    }
};
const folderNode4 = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '4',
    nodePublicId: 'public4',
    name: 'Folder 4',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: [],
        filterDevice: [device2, device3].map(item => item.publicId),
        filterDevtool: [devtool1, devtool2].map(item => item.publicId)
    }
};
const leafNode = {
    nodeType: response_data_1.Nodes.NodeType.LEAF_NODE,
    nodeDbId: '9',
    nodePublicId: 'public9',
    name: 'Leaf a',
    descriptor: {
        isDownloadable: true,
        isImportable: false,
        programmingLanguage: "C" /* Nodes.ProgrammingLanguage.C */,
        icon: "SourceCode_C" /* Nodes.Icon.SOURCE_CODE_C */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    },
    description: 'this is a description',
    link: 'hello'
};
const folderWithOverviewNode = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '4',
    nodePublicId: 'public4',
    name: 'Folder 4',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Markdown" /* Nodes.ContentType.MARKDOWN */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    },
    overview: {
        overviewText: 'this is an overview',
        overviewImage: 'overview_img.png',
        overviewType: "Overview" /* Nodes.OverviewType.OVERVIEW */
    }
};
const folderWithOverviewLinkNode = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
    nodeDbId: '5',
    nodePublicId: 'public5',
    name: 'Folder 5',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Markdown" /* Nodes.ContentType.MARKDOWN */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    },
    overview: {
        overviewLink: 'overview.md',
        overviewType: "OverviewLink" /* Nodes.OverviewType.OVERVIEW_LINK */
    }
};
const folderWithResourceNode = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE,
    nodeDbId: '6',
    nodePublicId: 'public6',
    name: 'Folder 6',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    }
};
const folderWithResourceWithOverviewNode = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE,
    nodeDbId: '7',
    nodePublicId: 'public7',
    name: 'Folder 7',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    },
    overview: {
        overviewText: 'this is an overview',
        overviewImage: 'overview_img.png',
        overviewType: "Overview" /* Nodes.OverviewType.OVERVIEW */
    }
};
const folderWithResourceWithOverviewLinkNode = {
    nodeType: response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE,
    nodeDbId: '8',
    nodePublicId: 'public8',
    name: 'Folder 8',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo',
    filterData: {
        filterPackageGroup: []
    },
    overview: {
        overviewLink: 'overview.md',
        overviewType: "OverviewLink" /* Nodes.OverviewType.OVERVIEW_LINK */
    }
};
const packageFolderNode = {
    nodeType: response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE,
    nodeDbId: '10',
    nodePublicId: 'public10',
    name: 'Folder 10',
    descriptor: {
        icon: "Package" /* Nodes.Icon.PACKAGE */
    },
    contentType: "Other" /* Nodes.ContentType.OTHER */,
    filterData: {
        filterPackageGroup: []
    },
    packagePublicUid: 'foo',
    packageGroupPublicUid: 'pgrp_foo'
};
// Variants
const variant2 = {
    variant: { compiler: 'ccs', kernel: 'freertos' },
    nodeDbId: folderNode2.nodeDbId
};
const variant3 = {
    variant: { compiler: 'gcc', kernel: 'nortos' },
    nodeDbId: folderNode3.nodeDbId
};
const variant4 = {
    variant: { compiler: 'iar', kernel: 'nortos' },
    nodeDbId: folderNode4.nodeDbId
};
// TableItems
const tableItem1 = {
    tableItemDbId: 'table-1',
    tableItemPublicId: 'table-public-1',
    tableItemNodeDbId: 'table-node-1',
    name: 'Table item 1',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: []
    },
    variants: []
};
const tableItem2 = {
    tableItemDbId: 'table-2',
    tableItemPublicId: 'table-public-2',
    tableItemNodeDbId: 'table-node-2',
    name: 'Table item 2',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: [],
        filterCompiler: ['ccs']
    },
    variants: [variant2]
};
const tableItem3 = {
    tableItemDbId: 'table-3',
    tableItemPublicId: 'table-public-3',
    tableItemNodeDbId: 'table-node-3',
    name: 'Table item 3',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: [],
        filterCompiler: ['gcc']
    },
    variants: [variant3, variant2]
};
const tableItem4 = {
    tableItemDbId: 'table-4',
    tableItemPublicId: 'table-public-4',
    tableItemNodeDbId: 'table-node-4',
    name: 'Table item 4',
    descriptor: {
        icon: "Folder" /* Nodes.Icon.FOLDER */
    },
    filterData: {
        filterPackageGroup: []
    },
    variants: [variant3, variant4]
};
// Filter data
const emptyFilterData = {
    compilers: [],
    devices: [],
    devtools: [],
    ides: [],
    kernels: [],
    languages: [],
    resourceClasses: [],
    packages: []
};
const filterDataEmpty = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
    filterData: emptyFilterData
};
const filterData1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
    filterData: {
        languages: [{ publicId: '1', name: 'English' }, { publicId: '2', name: 'Chinese' }],
        devices: [{ publicId: '1', name: '741opamp' }],
        devtools: [{ publicId: '1', name: 'wrench' }],
        resourceClasses: [{ publicId: '1', name: 'pdf' }],
        ides: [{ publicId: '1', name: 'CCS' }],
        compilers: [{ publicId: '1', name: 'gcc' }],
        kernels: [{ publicId: '1', name: 'linux' }],
        packages: [packageMsp]
    }
};
const filterData2 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
    filterData: {
        languages: [{ publicId: '1', name: 'English' }, { publicId: '2', name: 'Chinese' }],
        devices: [{ publicId: '1', name: 'device-foo' }],
        devtools: [{ publicId: '1', name: 'devtool-foo' }, { publicId: '2', name: 'devtool-bar' }],
        resourceClasses: [{ publicId: '1', name: 'pdf' }],
        ides: [{ publicId: '1', name: 'CCS' }],
        compilers: [{ publicId: '1', name: 'gcc-foo' }],
        kernels: [{ publicId: '1', name: 'linux' }],
        packages: [packageMsp]
    }
};
const filterData3 = {
    ...emptyFilterData,
    devices: [device1, device2, device3, device4],
    packages: [packageMsp, packageSla]
};
const filterData4 = {
    ...emptyFilterData,
    devices: [device1, device2, device3, device4],
    packages: [packageMsp, packageSla],
    packageGroups: [packageGroup1]
};
const filterData5 = {
    ...emptyFilterData,
    devices: [device1, device2, device3, device4],
    devtools: [devtool1, devtool2],
    packages: [packageMsp, packageSla],
    packageGroups: [packageGroup1]
};
const nodeData1 = {
    inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
    filterData: {
        ...emptyFilterData,
        packages: [packageMsp, packageSla, package3],
        packageGroups: [packageGroup1, packageGroup2]
    },
    rootNode,
    hierarchy: {
        [rootNode]: [exports.folderNodeWithValidGroup, folderNodeNoGroup, folderNodeGroupDoesNotExist].map(item => item.nodeDbId)
    },
    nodeData: {
        [exports.folderNodeWithValidGroup.nodeDbId]: exports.folderNodeWithValidGroup,
        [folderNodeNoGroup.nodeDbId]: folderNodeNoGroup,
        [folderNodeGroupDoesNotExist.nodeDbId]: folderNodeGroupDoesNotExist
    }
};
///////////////////////////////////////////////////////////////////////////////
/// Code
///////////////////////////////////////////////////////////////////////////////
/**
 * Note the server-interface is relativly straight forward. The main purpose of these tests
 * is to test the server-harness.
 * By testing at this level we also test the fake-server.
 */
describe('[frontend] ServerInterface', function () {
    // First test with a rejection seems to take longer
    this.timeout(10000);
    before(() => (0, browser_emulator_1.browserEmulator)());
    describe("api/nodesData" /* API.GET_NODES_DATA */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        const data1 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2
            },
            filterData: emptyFilterData
        };
        const data2 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId],
                [folderNode2.nodeDbId]: [folderNode3.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2,
                [folderNode3.nodeDbId]: folderNode3
            },
            filterData: emptyFilterData
        };
        it('Should get a single node', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getNodesData([folderNode2.nodeDbId]);
            validateFolderNode(folderNode2, false, args.dbIdToData[folderNode2.nodeDbId]);
        });
        it('Should handle a request for the root node by rejecting it', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const promise = serverInterface.getNodesData([rootNode]);
            await (0, expect_1.expect)(promise)
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '400');
        });
        it('Should get multiple nodes', async function () {
            await ajaxHarness.setupTestFakeServer(data2);
            const args = await serverInterface.getNodesData([
                folderNode2.nodeDbId,
                folderNode3.nodeDbId
            ]);
            validateFolderNode(folderNode2, true, args.dbIdToData[folderNode2.nodeDbId]);
            validateFolderNode(folderNode3, false, args.dbIdToData[folderNode3.nodeDbId]);
        });
        it('Should handle an invalid node id', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            return (0, expect_1.expect)(serverInterface.getNodesData(['3']))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        it('Should handle no node ids provided by rejecting it', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            return (0, expect_1.expect)(serverInterface.getNodesData([]))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '400');
        });
        it('Should handle all node types and variants', async function () {
            const folderNode = _.cloneDeep(folderNode2);
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                rootNode,
                hierarchy: {
                    [rootNode]: [leafNode.nodeDbId, folderNode.nodeDbId],
                    [folderNode.nodeDbId]: [
                        folderWithOverviewNode.nodeDbId,
                        folderWithOverviewLinkNode.nodeDbId
                    ],
                    [folderWithOverviewNode.nodeDbId]: [
                        folderWithResourceNode.nodeDbId,
                        folderWithResourceWithOverviewNode.nodeDbId,
                        folderWithResourceWithOverviewLinkNode.nodeDbId,
                        packageFolderNode.nodeDbId
                    ]
                },
                nodeData: {
                    [leafNode.nodeDbId]: leafNode,
                    [folderNode.nodeDbId]: folderNode,
                    [folderWithOverviewNode.nodeDbId]: folderWithOverviewNode,
                    [folderWithResourceNode.nodeDbId]: folderWithResourceNode,
                    [folderWithResourceWithOverviewNode.nodeDbId]: folderWithResourceWithOverviewNode,
                    [folderWithResourceWithOverviewLinkNode.nodeDbId]: folderWithResourceWithOverviewLinkNode,
                    [packageFolderNode.nodeDbId]: packageFolderNode
                },
                filterData: emptyFilterData
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = await serverInterface.getNodesData([
                leafNode.nodeDbId,
                folderNode.nodeDbId,
                folderWithOverviewNode.nodeDbId,
                folderWithResourceNode.nodeDbId,
                folderWithResourceWithOverviewNode.nodeDbId,
                folderWithResourceWithOverviewLinkNode.nodeDbId,
                packageFolderNode.nodeDbId
            ]);
            validateLeafNode(leafNode, false, args.dbIdToData[leafNode.nodeDbId]);
            validateFolderNode(folderNode, true, args.dbIdToData[folderNode.nodeDbId]);
            validateFolderNode(folderWithOverviewNode, true, args.dbIdToData[folderWithOverviewNode.nodeDbId]);
            validateFolderWithResourceNode(folderWithResourceNode, false, args.dbIdToData[folderWithResourceNode.nodeDbId]);
            validateFolderWithResourceNode(folderWithResourceWithOverviewNode, false, args.dbIdToData[folderWithResourceWithOverviewNode.nodeDbId]);
            validateFolderWithResourceNode(folderWithResourceWithOverviewLinkNode, false, args.dbIdToData[folderWithResourceWithOverviewLinkNode.nodeDbId]);
            validatePackageNode(packageFolderNode, false, args.dbIdToData[packageFolderNode.nodeDbId]);
        });
        function validateLeafNode(inputNode, hasChildren, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeDbId, name, descriptor: { icon, ...restDescriptor }, contentType, packagePublicUid, packageGroupPublicUid, nodeType } = inputNode;
            if (!icon) {
                throw new Error('icon for input data undefined');
            }
            else if (resultNode.nodeType !== response_data_1.Nodes.NodeType.LEAF_NODE) {
                throw new Error(`incorrect node type ${resultNode.nodeType}`);
            }
            const expectNode = {
                nodeType,
                nodeDbId,
                nodePublicId: 'public' + nodeDbId,
                name,
                descriptor: {
                    ...restDescriptor,
                    icon,
                    hasChildren
                },
                contentType,
                packagePublicUid,
                packageGroupPublicUid
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validateFolderNode(inputNode, hasChildren, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeDbId, name, descriptor: { icon, ...restDescriptor }, contentType, packagePublicUid, packageGroupPublicUid, nodeType } = inputNode;
            if (!icon) {
                throw new Error('icon for input data undefined');
            }
            else if (resultNode.nodeType !== response_data_1.Nodes.NodeType.FOLDER_NODE) {
                throw new Error(`incorrect node type ${resultNode.nodeType}`);
            }
            const expectNode = {
                nodeType,
                nodeDbId,
                nodePublicId: 'public' + nodeDbId,
                name,
                descriptor: {
                    ...restDescriptor,
                    icon,
                    hasChildren
                },
                contentType,
                packagePublicUid,
                packageGroupPublicUid
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validateFolderWithResourceNode(inputNode, hasChildren, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeDbId, name, descriptor: { icon, ...restDescriptor }, contentType, packagePublicUid, packageGroupPublicUid, nodeType } = inputNode;
            if (!icon) {
                throw new Error('icon for input data undefined');
            }
            else if (resultNode.nodeType !== response_data_1.Nodes.NodeType.FOLDER_WITH_HIDDEN_RESOURCE_NODE) {
                throw new Error(`incorrect node type ${resultNode.nodeType}`);
            }
            const expectNode = {
                nodeType,
                nodeDbId,
                nodePublicId: 'public' + nodeDbId,
                name,
                descriptor: {
                    ...restDescriptor,
                    icon,
                    hasChildren
                },
                contentType,
                packagePublicUid,
                packageGroupPublicUid
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validatePackageNode(inputNode, hasChildren, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeDbId, name, nodeType, descriptor: { icon, ...restDescriptor }, contentType, packagePublicUid, packageGroupPublicUid } = inputNode;
            if (!icon) {
                throw new Error('icon for input data undefined');
            }
            else if (resultNode.nodeType !== response_data_1.Nodes.NodeType.PACKAGE_FOLDER_NODE) {
                throw new Error(`incorrect node type ${resultNode.nodeType}`);
            }
            const expectNode = {
                nodeType,
                nodeDbId,
                nodePublicId: 'public' + nodeDbId,
                name,
                descriptor: {
                    ...restDescriptor,
                    icon,
                    hasChildren
                },
                contentType,
                packagePublicUid,
                packageGroupPublicUid
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
    });
    describe("api/nodeExtendedData" /* API.GET_NODE_EXTENDED_DATA */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        const data1 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2
            },
            filterData: emptyFilterData
        };
        it('Should get a single node', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getExtendedNodesData(folderNode2.nodeDbId);
            validateFolderExtendedNode(folderNode2, [folderNode2.nodeDbId], args.dbIdToChildExtData[folderNode2.nodeDbId]);
        });
        it('Should handle a request for the root node by rejecting it', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            return (0, expect_1.expect)(serverInterface.getExtendedNodesData('1'))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '400');
        });
        it('Should handle an invalid node id', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            return (0, expect_1.expect)(serverInterface.getNodesData([folderNode3.nodeDbId]))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        it('Should handle no node ids provided by rejecting it', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            return (0, expect_1.expect)(serverInterface.getExtendedNodesData(''))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '400');
        });
        it('Should handle all node types and variants', async function () {
            const nodeLeaf = _.cloneDeep(leafNode);
            const nodeFolder = _.cloneDeep(folderNode2);
            const nodeFolderWithOverview = _.cloneDeep(folderWithOverviewNode);
            const nodeFolderWithOverviewLink = _.cloneDeep(folderWithOverviewLinkNode);
            const nodeFolderWithResourceNode = _.cloneDeep(folderWithResourceNode);
            const nodeFolderWithResourceNodeWithOverview = _.cloneDeep(folderWithResourceWithOverviewNode);
            const nodeFolderWithResourceNodeWithOverviewLink = _.cloneDeep(folderWithResourceWithOverviewLinkNode);
            const nodePackageFolder = _.cloneDeep(packageFolderNode);
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                rootNode,
                hierarchy: {
                    [rootNode]: [nodeLeaf.nodeDbId, nodeFolder.nodeDbId],
                    [nodeFolder.nodeDbId]: [
                        nodeFolderWithOverview.nodeDbId,
                        nodeFolderWithOverviewLink.nodeDbId
                    ],
                    [nodeFolderWithOverview.nodeDbId]: [
                        nodeFolderWithResourceNode.nodeDbId,
                        nodeFolderWithResourceNodeWithOverview.nodeDbId,
                        nodeFolderWithResourceNodeWithOverviewLink.nodeDbId,
                        nodePackageFolder.nodeDbId
                    ]
                },
                nodeData: {
                    [nodeLeaf.nodeDbId]: nodeLeaf,
                    [nodeFolder.nodeDbId]: nodeFolder,
                    [nodeFolderWithOverview.nodeDbId]: nodeFolderWithOverview,
                    [nodeFolderWithResourceNode.nodeDbId]: nodeFolderWithResourceNode,
                    [nodeFolderWithResourceNodeWithOverview.nodeDbId]: nodeFolderWithResourceNodeWithOverview,
                    [nodeFolderWithResourceNodeWithOverviewLink.nodeDbId]: nodeFolderWithResourceNodeWithOverviewLink,
                    [nodePackageFolder.nodeDbId]: nodePackageFolder
                },
                filterData: emptyFilterData
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = {
                ...(await serverInterface.getExtendedNodesData(nodeLeaf.nodeDbId))
                    .dbIdToChildExtData,
                ...(await serverInterface.getExtendedNodesData(nodeFolder.nodeDbId))
                    .dbIdToChildExtData,
                ...(await serverInterface.getExtendedNodesData(nodeFolderWithOverview.nodeDbId))
                    .dbIdToChildExtData,
                ...(await serverInterface.getExtendedNodesData(nodeFolderWithResourceNode.nodeDbId))
                    .dbIdToChildExtData,
                ...(await serverInterface.getExtendedNodesData(nodeFolderWithResourceNodeWithOverview.nodeDbId)).dbIdToChildExtData,
                ...(await serverInterface.getExtendedNodesData(nodeFolderWithResourceNodeWithOverviewLink.nodeDbId)).dbIdToChildExtData,
                ...(await serverInterface.getExtendedNodesData(nodePackageFolder.nodeDbId))
                    .dbIdToChildExtData
            };
            validateLeafExtendedNode(nodeLeaf, [nodeLeaf.nodeDbId], args[nodeLeaf.nodeDbId]);
            validateFolderExtendedNode(nodeFolder, [nodeFolder.nodeDbId], args[nodeFolder.nodeDbId]);
            validateFolderWithOverviewExtendedNode(nodeFolderWithOverview, [nodeFolder.nodeDbId, nodeFolderWithOverview.nodeDbId], args[nodeFolderWithOverview.nodeDbId]);
            validateFolderWithResourceExtentedNode(nodeFolderWithResourceNode, [
                nodeFolder.nodeDbId,
                nodeFolderWithOverview.nodeDbId,
                nodeFolderWithResourceNode.nodeDbId
            ], args[nodeFolderWithResourceNode.nodeDbId]);
            validateFolderWithResourceWithOveriewExtentedNode(nodeFolderWithResourceNodeWithOverview, [
                nodeFolder.nodeDbId,
                nodeFolderWithOverview.nodeDbId,
                nodeFolderWithResourceNodeWithOverview.nodeDbId
            ], args[nodeFolderWithResourceNodeWithOverview.nodeDbId]);
            validateFolderWithResourceWithOverviewLinkExtendedNode(nodeFolderWithResourceNodeWithOverviewLink, [
                nodeFolder.nodeDbId,
                nodeFolderWithOverview.nodeDbId,
                nodeFolderWithResourceNodeWithOverviewLink.nodeDbId
            ], args[nodeFolderWithResourceNodeWithOverviewLink.nodeDbId]);
            validatePackageFolderExtendedNode(nodePackageFolder, [nodeFolder.nodeDbId, nodeFolderWithOverview.nodeDbId, nodePackageFolder.nodeDbId], args[nodePackageFolder.nodeDbId]);
        });
        function validateFolderExtendedNode(inputNode, path, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeType, nodeDbId } = inputNode;
            const expectNode = {
                nodeType,
                nodeDbId,
                nodeDbIdPath: path
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validateLeafExtendedNode(inputNode, path, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeType, nodeDbId, description, link } = inputNode;
            const expectNode = {
                nodeType,
                nodeDbId,
                description,
                link,
                nodeDbIdPath: path,
                linkType: resultNode.linkType
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validateFolderWithOverviewExtendedNode(inputNode, path, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeType, nodeDbId, overview } = inputNode;
            const expectNode = {
                nodeType,
                nodeDbId,
                overview,
                nodeDbIdPath: path
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validateFolderWithResourceExtentedNode(inputNode, path, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeType, nodeDbId } = inputNode;
            const expectNode = {
                nodeType,
                nodeDbId,
                nodeDbIdPath: path
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validateFolderWithResourceWithOveriewExtentedNode(inputNode, path, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeType, nodeDbId, overview } = inputNode;
            const expectNode = {
                nodeType,
                nodeDbId,
                overview,
                nodeDbIdPath: path
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validateFolderWithResourceWithOverviewLinkExtendedNode(inputNode, path, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeType, nodeDbId, overview } = inputNode;
            const expectNode = {
                nodeType,
                nodeDbId,
                overview,
                nodeDbIdPath: path
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
        function validatePackageFolderExtendedNode(inputNode, path, resultNode) {
            (0, expect_1.expect)(resultNode).to.exist;
            const { nodeType, nodeDbId } = inputNode;
            const expectNode = {
                nodeType,
                nodeDbId,
                nodeDbIdPath: path
            };
            (0, expect_1.expect)(resultNode).to.deep.equal(expectNode);
        }
    });
    describe("api/filteredChildrenNodeIds" /* API.GET_FILTERED_CHILDREN_NODE_IDS */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        const folderNode4 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '4',
            nodePublicId: 'public4',
            name: 'Folder 4',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            }
        };
        const folderNode5 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '5',
            nodePublicId: 'public5',
            name: 'Folder 5',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [...packageSla.packageGroupPublicUids]
            }
        };
        const folderNode6 = {
            ...folderNode3,
            filterData: {
                filterPackageGroup: [...packageMsp.packageGroupPublicUids]
            }
        };
        const data1 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId],
                [folderNode2.nodeDbId]: [folderNode3.nodeDbId, folderNode4.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2,
                [folderNode3.nodeDbId]: folderNode3,
                [folderNode4.nodeDbId]: folderNode4
            },
            filterData: filterData3
        };
        const data2 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode4.nodeDbId]
            },
            nodeData: {
                [folderNode4.nodeDbId]: folderNode4
            },
            filterData: filterData3
        };
        const data3 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId],
                [folderNode2.nodeDbId]: [folderNode6.nodeDbId, folderNode5.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2,
                [folderNode5.nodeDbId]: folderNode6,
                [folderNode5.nodeDbId]: folderNode5
            },
            filterData: filterData3
        };
        it('Should filter children who directly match the filter', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getFilteredChildrenNodeIds([folderNode2.nodeDbId], {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            });
            validateResult(args, {
                [folderNode2.nodeDbId]: [folderNode4.nodeDbId]
            });
        });
        it('Should filter children who directly match the filter (package filtering)', async function () {
            await ajaxHarness.setupTestFakeServer(data3);
            const args = await serverInterface.getFilteredChildrenNodeIds([folderNode2.nodeDbId], {
                filterPackageGroup: [...packageSla.packageGroupPublicUids]
            });
            validateResult(args, {
                [folderNode2.nodeDbId]: [folderNode5.nodeDbId]
            });
        });
        it('Should filter children who indirectly match the filter (their descendants do)', async function () {
            const node2 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '2',
                nodePublicId: 'public2',
                name: 'Folder 2',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device3.name]
                }
            };
            const node3 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '3',
                nodePublicId: 'public3',
                name: 'Folder 3',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device4.name]
                }
            };
            const node4 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '4',
                nodePublicId: 'public4',
                name: 'Folder 4',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device2.name]
                }
            };
            const node5 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '5',
                nodePublicId: 'public5',
                name: 'Folder 5',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device1.name]
                }
            };
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                rootNode,
                hierarchy: {
                    [rootNode]: [node4.nodeDbId],
                    [node4.nodeDbId]: [node2.nodeDbId, node3.nodeDbId],
                    [node2.nodeDbId]: [node5.nodeDbId]
                },
                nodeData: {
                    [node2.nodeDbId]: node2,
                    [node3.nodeDbId]: node3,
                    [node4.nodeDbId]: node4,
                    [node5.nodeDbId]: node5
                },
                filterData: filterData3
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = await serverInterface.getFilteredChildrenNodeIds([node4.nodeDbId], {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            });
            validateResult(args, {
                [node4.nodeDbId]: [node2.nodeDbId]
            });
        });
        it('Should handle multiple parent ids', async function () {
            const node2 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '2',
                nodePublicId: 'public2',
                name: 'Folder 2',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device3.name]
                }
            };
            const node3 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '3',
                nodePublicId: 'public3',
                name: 'Folder 3',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device4.name]
                }
            };
            const node4 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '4',
                nodePublicId: 'public4',
                name: 'Folder 4',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device2.name]
                }
            };
            const node5 = {
                nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
                nodeDbId: '5',
                nodePublicId: 'public5',
                name: 'Folder 5',
                descriptor: {},
                contentType: "Other" /* Nodes.ContentType.OTHER */,
                packagePublicUid: 'foo',
                packageGroupPublicUid: 'pgrp_foo',
                filterData: {
                    filterPackageGroup: [],
                    filterDevice: [device1.name]
                }
            };
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
                rootNode,
                hierarchy: {
                    [rootNode]: [node2.nodeDbId, node3.nodeDbId],
                    [node2.nodeDbId]: [node4.nodeDbId],
                    [node3.nodeDbId]: [node5.nodeDbId]
                },
                nodeData: {
                    [node2.nodeDbId]: node2,
                    [node3.nodeDbId]: node3,
                    [node4.nodeDbId]: node4,
                    [node5.nodeDbId]: node5
                },
                filterData: filterData3
            };
            await ajaxHarness.setupTestFakeServer(data);
            const args = await serverInterface.getFilteredChildrenNodeIds([node2.nodeDbId, node3.nodeDbId], {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            });
            validateResult(args, {
                [node2.nodeDbId]: [],
                [node3.nodeDbId]: [node5.nodeDbId]
            });
        });
        it('Should handle the root node as a parent id', async function () {
            await ajaxHarness.setupTestFakeServer(data2);
            const args = await serverInterface.getFilteredChildrenNodeIds([rootNode], {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            });
            validateResult(args, {
                [rootNode]: [folderNode4.nodeDbId]
            });
        });
        it('Should handle a non-existent parent id', async function () {
            await ajaxHarness.setupTestFakeServer(data2);
            return (0, expect_1.expect)(serverInterface.getFilteredChildrenNodeIds([folderNode3.nodeDbId], {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            }))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        function validateResult(result, expectedResultIds) {
            (0, expect_1.expect)(result).to.exist;
            const { parentToChildDbId } = result;
            (0, expect_1.expect)(parentToChildDbId).to.exist;
            Object.keys(parentToChildDbId).map(id => {
                const resultIds = parentToChildDbId[id];
                if (expectedResultIds[id].length > 0) {
                    (0, expect_1.expect)(resultIds).to.deep.equal(expectedResultIds[id]);
                }
                else {
                    (0, expect_1.expect)(resultIds).to.be.empty;
                }
            });
        }
    });
    describe("api/expandedFilteredDescendantNodesData" /* API.GET_EXPANDED_FILTERED_DESCENDANT_NODES_DATA */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        const node2 = { ...folderNode2 };
        const node3 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '3',
            nodePublicId: 'public3',
            name: 'Folder 3',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [],
                filterDevice: [device2.name]
            }
        };
        const node4 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '4',
            nodePublicId: 'public4',
            name: 'Folder 4',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            }
        };
        const node5 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '5',
            nodePublicId: 'public5',
            name: 'Folder 5',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [],
                filterDevice: [device2.name]
            }
        };
        const node6 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '6',
            nodePublicId: 'public6',
            name: 'Folder 6',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            }
        };
        const node7 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '7',
            nodePublicId: 'public7',
            name: 'Folder 7',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            }
        };
        const node8 = {
            nodeType: response_data_1.Nodes.NodeType.FOLDER_NODE,
            nodeDbId: '8',
            nodePublicId: 'public8',
            name: 'Folder 8',
            descriptor: {},
            contentType: "Other" /* Nodes.ContentType.OTHER */,
            packagePublicUid: 'foo',
            packageGroupPublicUid: 'pgrp_foo',
            filterData: {
                filterPackageGroup: [],
                filterDevice: []
            }
        };
        const data1 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [node2.nodeDbId],
                [node2.nodeDbId]: [node3.nodeDbId, node4.nodeDbId]
            },
            nodeData: {
                [node2.nodeDbId]: node2,
                [node3.nodeDbId]: node3,
                [node4.nodeDbId]: node4
            },
            filterData: filterData3
        };
        const data2 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [node2.nodeDbId],
                [node2.nodeDbId]: [node3.nodeDbId, node8.nodeDbId],
                [node8.nodeDbId]: [node5.nodeDbId, node6.nodeDbId]
            },
            nodeData: {
                [node2.nodeDbId]: node2,
                [node3.nodeDbId]: node3,
                [node8.nodeDbId]: node8,
                [node5.nodeDbId]: node5,
                [node6.nodeDbId]: node6
            },
            filterData: filterData3
        };
        const data3 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [node2.nodeDbId],
                [node2.nodeDbId]: [node7.nodeDbId]
            },
            nodeData: {
                [node2.nodeDbId]: node2,
                [node7.nodeDbId]: node7
            },
            filterData: filterData3
        };
        it('Should get a single child node', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getExpandedFilteredDescendantNodesData(node2.nodeDbId, {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            });
            validateResult(args, {
                [node2.nodeDbId]: [node4.nodeDbId]
            });
        });
        it('Should handle root node as parent id', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getExpandedFilteredDescendantNodesData(rootNode, {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            });
            validateResult(args, {
                [rootNode]: [node2.nodeDbId],
                [node2.nodeDbId]: [node4.nodeDbId]
            });
        });
        it('Should filter children who indirectly match the filter (their descendants do)', async function () {
            await ajaxHarness.setupTestFakeServer(data2);
            const args = await serverInterface.getExpandedFilteredDescendantNodesData(node2.nodeDbId, {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            });
            validateResult(args, {
                [node2.nodeDbId]: [node8.nodeDbId],
                [node8.nodeDbId]: [node6.nodeDbId]
            });
        });
        it('Should handle an invalid node id', async function () {
            await ajaxHarness.setupTestFakeServer(data3);
            return (0, expect_1.expect)(serverInterface.getExpandedFilteredDescendantNodesData('4', {
                filterPackageGroup: [],
                filterDevice: [device1.name]
            }))
                .to.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        it("Should handle a filter option that doesn't apply", async function () {
            await ajaxHarness.setupTestFakeServer(data3);
            const args = await serverInterface.getExpandedFilteredDescendantNodesData(node2.nodeDbId, {
                filterPackageGroup: [],
                filterDevice: [device2.name]
            });
            validateResult(args, {});
        });
        function validateResult(result, expectedResultIds) {
            (0, expect_1.expect)(result).to.exist;
            Object.keys(result.parentToChildData).map(id => {
                const resultIds = result.parentToChildData[id].map(node => node.nodeDbId);
                if (expectedResultIds[id].length > 0) {
                    (0, expect_1.expect)(resultIds).to.deep.equal(expectedResultIds[id]);
                }
                else {
                    (0, expect_1.expect)(resultIds).to.be.empty;
                }
            });
        }
    });
    describe("api/filteredTableItemsData" /* API.GET_FILTERED_TABLE_ITEMS_DATA */, function () {
        const data = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.TABLE_ITEM_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId, folderNode3.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2,
                [folderNode3.nodeDbId]: folderNode3
            },
            filterData: emptyFilterData,
            tableItemHierarchy: {
                [tableItem1.tableItemDbId]: [tableItem2.tableItemDbId, tableItem3.tableItemDbId]
            },
            tableItemData: {
                [tableItem1.tableItemDbId]: tableItem1,
                [tableItem2.tableItemDbId]: tableItem2,
                [tableItem3.tableItemDbId]: tableItem3
            }
        };
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        it('Should handle an empty filter', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const args = await serverInterface.getFilteredTableItemsData(tableItem1.tableItemNodeDbId, {
                filterPackageGroup: []
            }, false);
            validateResult(args, [tableItem2, tableItem3], tableItem1);
        });
        it('Should handle a filter which applies to the children', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const args = await serverInterface.getFilteredTableItemsData(tableItem1.tableItemNodeDbId, {
                filterPackageGroup: [],
                filterCompiler: ['ccs']
            }, false);
            validateResult(args, [tableItem2], tableItem1);
        });
        it('Should handle an invalid parent id', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const promise = serverInterface.getFilteredTableItemsData('invalid-id', {
                filterPackageGroup: []
            }, false);
            await (0, expect_1.expect)(promise)
                .to.be.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        function validateResult(result, expectedItems, requestedParent) {
            const children = result.parentToChildDbId[requestedParent.tableItemNodeDbId];
            (0, expect_1.expect)(_.isEmpty(children)).to.be.false;
            (0, expect_1.expect)(children.map(item => item.tableItemDbId)).to.deep.equal(expectedItems.map(item => item.tableItemDbId));
        }
    });
    describe("api/nodeDataForTableItemVariant" /* API.GET_NODE_DATA_FOR_TABLE_ITEM_VARIANT */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        const data = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.TABLE_ITEM_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId, folderNode3.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2,
                [folderNode3.nodeDbId]: folderNode3
            },
            filterData: emptyFilterData,
            tableItemHierarchy: {
                [tableItem1.tableItemDbId]: [tableItem2.tableItemDbId, tableItem3.tableItemDbId]
            },
            tableItemData: {
                [tableItem1.tableItemDbId]: tableItem1,
                [tableItem2.tableItemDbId]: tableItem2,
                [tableItem3.tableItemDbId]: tableItem3
            }
        };
        it('Should get the node data for a table item with only one variant', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const args = await serverInterface.getNodeDataForTableItemVariant(tableItem2.tableItemDbId, { filterPackageGroup: [] }, variant2.variant);
            validateResult(args, variant2);
        });
        it('Should handle multiple variants', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const args = await serverInterface.getNodeDataForTableItemVariant(tableItem3.tableItemDbId, { filterPackageGroup: [] }, variant3.variant);
            validateResult(args, variant3);
        });
        it('Should handle no variants', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const promise = serverInterface.getNodeDataForTableItemVariant(tableItem1.tableItemDbId, { filterPackageGroup: [] }, variant2.variant);
            await (0, expect_1.expect)(promise)
                .to.be.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        it('Should handle an invalid table item id', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const promise = serverInterface.getNodeDataForTableItemVariant('invalid-id', { filterPackageGroup: [] }, variant2.variant);
            await (0, expect_1.expect)(promise)
                .to.be.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        it('Should handle an invalid node db id', async function () {
            // Should really be a 500, but we re-use getNodes underneath
            await ajaxHarness.setupTestFakeServer(data);
            const promise = serverInterface.getNodeDataForTableItemVariant(tableItem4.tableItemDbId, { filterPackageGroup: [] }, variant4.variant);
            await (0, expect_1.expect)(promise)
                .to.be.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        it('Should handle an invalid variant (compiler)', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const promise = serverInterface.getNodeDataForTableItemVariant(tableItem2.tableItemDbId, { filterPackageGroup: [] }, { ...variant2.variant, compiler: 'gcc' });
            await (0, expect_1.expect)(promise)
                .to.be.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        it('Should handle an invalid variant (kernel)', async function () {
            await ajaxHarness.setupTestFakeServer(data);
            const promise = serverInterface.getNodeDataForTableItemVariant(tableItem2.tableItemDbId, { filterPackageGroup: [] }, { ...variant2.variant, kernel: 'nortos' });
            await (0, expect_1.expect)(promise)
                .to.be.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        function validateResult(result, variant) {
            const nodeData = result.dbIdToData[variant.nodeDbId];
            (0, expect_1.expect)(nodeData.nodeDbId).to.deep.equal(variant.nodeDbId);
        }
    });
    describe("api/filterOptions" /* API.GET_FILTER_OPTIONS */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        it('Should get empty filter options', async function () {
            await ajaxHarness.setupTestFakeServer(filterDataEmpty);
            const result = await serverInterface.getFilterOptions();
            validateResult(result, filterDataEmpty);
        });
        it('Should get non empty filter options', async function () {
            await ajaxHarness.setupTestFakeServer(filterData1);
            const result = await serverInterface.getFilterOptions();
            validateResult(result, filterData1);
        });
        function validateResult(result, data) {
            const expected = { packageGroups: result.packageGroups, ...data.filterData };
            // @ts-ignore
            delete expected.packages;
            (0, expect_1.expect)(result).to.deep.equal(expected);
        }
    });
    describe.skip("api/rootNode" /* API.GET_ROOT_NODE */, function () { });
    describe("api/searchSuggestions" /* API.GET_SEARCH_SUGGESTIONS */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        it('Should get the suggestions for something with matches', async function () {
            await ajaxHarness.setupTestFakeServer(filterData2);
            const result = await serverInterface.getSearchSuggestions(device1.name, {
                filterPackageGroup: []
            });
            (0, expect_1.expect)(result.sort()).to.deep.equal(['device-foo', 'devtool-foo', 'gcc-foo'].sort());
        });
        it('Should handle something without matches (returns empty array)', async function () {
            await ajaxHarness.setupTestFakeServer(filterData2);
            const result = await serverInterface.getSearchSuggestions(device3.name, {
                filterPackageGroup: []
            });
            (0, expect_1.expect)(result).to.have.length(0);
        });
    });
    describe("api/packages" /* API.GET_PACKAGES */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        it('Should get a list of packages', async function () {
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
                filterData: filterData3
            };
            await ajaxHarness.setupTestFakeServer(data);
            const result = await serverInterface.getPackages();
            validateResult(result, [packageMsp, packageSla]);
        });
        it('Should handle no packages available (returns an empty array)', async function () {
            await ajaxHarness.setupTestFakeServer(filterDataEmpty);
            const result = await serverInterface.getPackages();
            validateResult(result, []);
        });
        it('Should stable sort the packages by version (newest to oldest)', async function () {
            const pkg2 = {
                name: 'Package 2',
                packageVersion: '5.0.0',
                packagePublicId: 'a',
                packagePublicUid: '2',
                packageGroupPublicUids: ['11'],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package2.exe' },
                downloadUrl: { win: 'pkg/package2.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const pkg3 = {
                name: 'Package 3',
                packageVersion: '5.1.1',
                packagePublicId: 'a',
                packagePublicUid: '3',
                packageGroupPublicUids: ['12'],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package3.exe' },
                downloadUrl: { win: 'pkg/package3.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const pkg4 = {
                name: 'Package 4',
                packageVersion: '1.1.1',
                packagePublicId: 'b',
                packagePublicUid: '4',
                packageGroupPublicUids: ['13'],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package4.exe' },
                downloadUrl: { win: 'pkg/package4.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const pkg5 = {
                name: 'Package 5',
                packageVersion: '5.0.0',
                packagePublicId: 'b',
                packagePublicUid: '5',
                packageGroupPublicUids: ['14'],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package5.exe' },
                downloadUrl: { win: 'pkg/package5.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const pkg6 = {
                name: 'Package 6',
                packageVersion: '5.1.1',
                packagePublicId: 'c',
                packagePublicUid: '6',
                packageGroupPublicUids: ['15'],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package6.exe' },
                downloadUrl: { win: 'pkg/package6.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const pkg7 = {
                name: 'Package 7',
                packageVersion: '1.1.1',
                packagePublicId: 'c',
                packagePublicUid: '7',
                packageGroupPublicUids: ['16'],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package7.exe' },
                downloadUrl: { win: 'pkg/package7.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
                filterData: {
                    compilers: [],
                    devices: [],
                    devtools: [],
                    ides: [],
                    kernels: [],
                    languages: [],
                    resourceClasses: [],
                    packages: [pkg7, pkg2, pkg6, pkg3, pkg5, pkg4]
                }
            };
            await ajaxHarness.setupTestFakeServer(data);
            const result = await serverInterface.getPackages();
            validateResult(result, [pkg6, pkg7, pkg3, pkg2, pkg5, pkg4]);
        });
        function validateResult(result, data) {
            (0, expect_1.expect)(result).to.deep.equal(data);
        }
    });
    describe("api/packageGroups" /* API.GET_PACKAGE_GROUPS */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        it('Should get a list of package groups', async function () {
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
                filterData: filterData4
            };
            await ajaxHarness.setupTestFakeServer(data);
            const result = await serverInterface.getPackageGroups();
            (0, expect_1.expect)(result).to.deep.equal([packageGroup1]);
        });
        it('Should get a list of package groups (auto generated package groups)', async function () {
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
                filterData: filterData3
            };
            await ajaxHarness.setupTestFakeServer(data);
            const result = await serverInterface.getPackageGroups();
            (0, expect_1.expect)(result).to.have.length(1);
            (0, expect_1.expect)(result[0].packagesPublicUids.sort()).to.deep.equal([
                packageMsp.packagePublicUid,
                packageSla.packagePublicUid
            ]);
        });
        it('Should handle no package groups available (returns an empty array)', async function () {
            await ajaxHarness.setupTestFakeServer(filterDataEmpty);
            const result = await serverInterface.getPackageGroups();
            (0, expect_1.expect)(result).to.have.length(0);
        });
        it('Should stable sort the groups by version (newest to oldest)', async function () {
            const PACKAGE_GROUP_PUBLIC_UID_1 = '1';
            const PACKAGE_GROUP_PUBLIC_UID_2 = '2';
            const PACKAGE_GROUP_PUBLIC_UID_3 = '3';
            const package2 = {
                name: 'foo',
                packageVersion: '5.0.0',
                packagePublicId: '2',
                packagePublicUid: '4_3',
                packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_1],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package2.exe' },
                downloadUrl: { win: 'pkg/package2.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const package3 = {
                name: 'bar',
                packageVersion: '1.1.1',
                packagePublicId: '3',
                packagePublicUid: '4_2',
                packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_2],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package3.exe' },
                downloadUrl: { win: 'pkg/package3.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const package4 = {
                name: 'baz',
                packageVersion: '4.6.2',
                packagePublicId: '4',
                packagePublicUid: '4_1',
                packageGroupPublicUids: [PACKAGE_GROUP_PUBLIC_UID_3],
                packageType: "MainPackage" /* Nodes.PackageType.MAIN_PACKAGE */,
                dependencies: [],
                isInstallable: true,
                installCommand: { win: './package4.exe' },
                downloadUrl: { win: 'pkg/package4.zip' },
                aliases: [],
                modules: [],
                moduleGroups: []
            };
            const packageGroup1 = {
                packageGroupVersion: '1.2.3',
                packageGroupPublicId: 'msp',
                packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_1,
                packagesPublicUids: [package2.packagePublicUid],
                mainPackagePublicUid: package2.packagePublicUid,
                hideByDefault: false,
                packagesToListVersionsFrom: []
            };
            const packageGroup2 = {
                packageGroupVersion: '2.2.3',
                packageGroupPublicId: 'msp',
                packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_2,
                packagesPublicUids: [package3.packagePublicUid],
                mainPackagePublicUid: package3.packagePublicUid,
                hideByDefault: false,
                packagesToListVersionsFrom: []
            };
            const packageGroup3 = {
                packageGroupVersion: '0.2.3',
                packageGroupPublicId: 'sla',
                packageGroupPublicUid: PACKAGE_GROUP_PUBLIC_UID_3,
                packagesPublicUids: [package4.packagePublicUid],
                mainPackagePublicUid: package4.packagePublicUid,
                hideByDefault: false,
                packagesToListVersionsFrom: []
            };
            const data = {
                inputType: initialize_server_harness_data_1.ServerDataInput.InputType.FILTER_DATA_ONLY,
                filterData: {
                    ...emptyFilterData,
                    packages: [package2, package3, package4],
                    packageGroups: [packageGroup1, packageGroup3, packageGroup2]
                }
            };
            await ajaxHarness.setupTestFakeServer(data);
            const result = await serverInterface.getPackageGroups();
            (0, expect_1.expect)(result).to.deep.equal([packageGroup2, packageGroup1, packageGroup3]);
        });
    });
    describe.skip("api/nodeDownload" /* API.GET_NODE_DOWNLOAD */, function () { });
    describe.skip("api/importProject" /* API.GET_IMPORT_PROJECT */, function () { });
    describe("api/importInfo" /* API.GET_IMPORT_INFO */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        const data1 = {
            inputType: initialize_server_harness_data_1.ServerDataInput.InputType.NODE_DATA,
            rootNode,
            hierarchy: {
                [rootNode]: [folderNode2.nodeDbId, folderNode4.nodeDbId]
            },
            nodeData: {
                [folderNode2.nodeDbId]: folderNode2,
                [folderNode4.nodeDbId]: folderNode4
            },
            filterData: filterData5
        };
        it('Should get the import info for a node', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getImportInfo(folderNode4.nodeDbId, {
                filterPackageGroup: []
            });
            validateResult(args, [devtool1, devtool2, device2, device3].map(item => item.publicId));
        });
        it('Should handle filter narrowing the results', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getImportInfo(folderNode4.nodeDbId, {
                filterPackageGroup: [],
                filterDevice: [device3, device4].map(item => item.publicId),
                filterDevtool: [devtool2].map(item => item.publicId)
            });
            validateResult(args, [devtool2, device3].map(item => item.publicId));
        });
        it('Should handle nodes which have no import info', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            const args = await serverInterface.getImportInfo(folderNode2.nodeDbId, {
                filterPackageGroup: []
            });
            validateResult(args, []);
        });
        it('Should handle an invalid node id', async function () {
            await ajaxHarness.setupTestFakeServer(data1);
            return (0, expect_1.expect)(serverInterface.getImportInfo(folderNode3.nodeDbId, {
                filterPackageGroup: []
            }))
                .to.be.eventually.be.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        });
        function validateResult(result, expectedItems) {
            (0, expect_1.expect)(result.targets.sort()).to.deep.equal(expectedItems.sort());
        }
    });
    describe.skip("api/serverConfig" /* API.GET_SERVER_CONFIG */, function () { });
    describe("api/nodePublicIdToDbId" /* API.GET_NODE_PUBLIC_ID_TO_DB_ID */, function () {
        let ajaxHarness;
        let serverInterface;
        beforeEach(function () {
            serverInterface = new server_interface_1.ServerInterface();
            ajaxHarness = new ajax_harness_1.AjaxHarness({ serverType: ajax_harness_1.ServerType.FAKE_SERVER });
        });
        afterEach(function () {
            ajaxHarness.cleanup();
        });
        it('Should handle a node which exists and has a group', async function () {
            await ajaxHarness.setupTestFakeServer(nodeData1);
            const node = exports.folderNodeWithValidGroup;
            const pkg = packageMsp;
            const nodeDbId = await serverInterface.getNodePublicIdToDbId(node.nodePublicId, node.packageGroupPublicUid, pkg.packagePublicId, false);
            (0, expect_1.expect)(nodeDbId).to.deep.equal(node.nodeDbId);
        });
        it('Should handle a node with no group', async function () {
            await ajaxHarness.setupTestFakeServer(nodeData1);
            const node = folderNodeGroupDoesNotExist;
            await negativeTest(node.nodePublicId, PACKAGE_GROUP_PUBLIC_UID_1, packageMsp.packagePublicId);
        });
        it('Should handle a node which does not exist', async function () {
            await ajaxHarness.setupTestFakeServer(nodeData1);
            await negativeTest('fakeNodeId', PACKAGE_GROUP_PUBLIC_UID_1, packageMsp.packagePublicId);
        });
        it('Should handle a node which exists but its group does not', async function () {
            await ajaxHarness.setupTestFakeServer(nodeData1);
            const node = folderNodeGroupDoesNotExist;
            if (!node.packageGroupPublicUid) {
                throw new Error(`Unexpected node with node group ${node}`);
            }
            await negativeTest(node.nodePublicId, node.packageGroupPublicUid, packageMsp.packagePublicId);
        });
        it('Should handle a node which exists but it does not belong to the provided group', async function () {
            await ajaxHarness.setupTestFakeServer(nodeData1);
            const node = exports.folderNodeWithValidGroup;
            const pkg = packageMsp;
            await negativeTest(node.nodePublicId, PACKAGE_GROUP_PUBLIC_UID_2, pkg.packagePublicId);
        });
        async function negativeTest(nodePublicId, packageGroupPublicUid, packagePublicId) {
            return (0, expect_1.expect)(serverInterface.getNodePublicIdToDbId(nodePublicId, packageGroupPublicUid, packagePublicId, false))
                .to.be.eventually.rejectedWith(errors_1.NetworkError)
                .and.eventually.have.property('statusCode', '404');
        }
    });
    describe.skip("api/rex3LinkToDbId" /* API.GET_REX3_LINK_TO_DB_ID */, function () { });
});
