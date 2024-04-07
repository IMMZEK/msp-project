"use strict";
var _ = require("lodash");
var fs = require("fs");
var xpath = require("xpath");
var xmldom_1 = require("xmldom");
var xml2js = require("xml2js");
var metaData = require("../common/meta");
function convertPathToForwardSlashes(path) {
    return path.replace(/\\/g, "/");
}
function convertToLowerCase(value) {
    return value.toLowerCase();
}
// Create a extracter that's associated with this file
function createExtractToMeta(filePath, meta) {
    return {
        asSingle: asSingle,
        asArray: asArray,
        asDuplicate: asDuplicate,
    };
    // Iterate over the list of xpath node matchs and
    // add them to the meta data using the appropriate style and transformation
    function asSingle(nodeList, // all we really use is nodeValue
        key, transformation) {
        var values = extractAndTransform(nodeList, transformation);
        if (values.length) {
            if (meta[key] || values.length !== 1) {
                throw new Error(filePath + " contains multiple " + key + " definitions");
            }
            meta[key] = values[0];
        }
    }
    function asArray(nodeList, // all we really use is nodeValue
        key, transformation) {
        var values = extractAndTransform(nodeList, transformation);
        if (values.length) {
            meta[key] = _.uniq((meta[key] || []).concat(_.compact(values)));
        }
    }
    function asDuplicate(nodeList, // all we really use is nodeValue
        key, transformation) {
        var values = _.map(extractAndTransform(nodeList, transformation), function (value) {
            return _a = {},
                _a[key] = value,
                _a;
            var _a;
        });
        if (values.length) {
            // metaData.TICloudAgentMetaData[duplicateValueKeys] is the type
            // for both meta[key] and values, but typescript can't figure out
            // how those types muddle through the below calls.  This would work
            // if I made a specific function for each type of key, but that's
            // not worth removing the casts below to deal with...
            meta[key] = _.uniqBy((meta[key] || []).concat(values), function (entry) {
                return entry[key];
            });
        }
    }
    function extractAndTransform(nodeList, // all we really use is nodeValue
        transformation) {
        var values = _.map(nodeList, function (node) {
            return transformation ? transformation(node.nodeValue) : node.nodeValue;
        });
        return values;
    }
}
// attributes that don't make any sense to store
var filterAttributes = {
    HW_revision: true,
    XML_version: true,
};
// translate a snippet of xml into metadata
// xml : <property Type="stringfield" Value="Stellaris Cortex LM3S1xxx" id="FilterString" />
// meta : "properties": { <where properties is the key in meta>
// 			"FilterString": { <FilterString is the value of the first attribute matching attributesToUseAsPropKey>
// 				"Type": "stringfield",
// 				"Value": "Stellaris Cortex LM3S1xxx",
// 				"id": "FilterString"
// 			}
// 		}
function createExtractAttributesToMeta(filePath, meta) {
    return extractImpl;
    function extractImpl(nodeList, keyInMeta, attributesToUseAsPropKey) {
        if (nodeList && nodeList.length) {
            var keyValuePairs_1 = {};
            _.each(nodeList, function (node) {
                var property = {};
                _.each(node.attributes, function (attributeNode) {
                    if (!filterAttributes[attributeNode.nodeName]) {
                        property[attributeNode.nodeName] = attributeNode.nodeValue;
                    }
                });
                // find attribute whose value to use as key
                // cross reference attribute against attributes to use as key
                var atrributeNodeToUseAsKey;
                _.some(attributesToUseAsPropKey, function (propKey) {
                    atrributeNodeToUseAsKey = _.find(node.attributes, {
                        nodeName: propKey,
                    });
                    return atrributeNodeToUseAsKey;
                });
                if (!atrributeNodeToUseAsKey) {
                    throw new Error(filePath + " property " + JSON.stringify(property) +
                        " does not contain attribute/s " + attributesToUseAsPropKey);
                }
                keyValuePairs_1[atrributeNodeToUseAsKey.nodeValue] = property;
            });
            // meta[keyInMeta] could be either CoreMetaData or PropertyMetaData.
            // Truthfully, those two types are just maps, but meta.ts doesn't
            // define them as such so that when looked up, we have precise
            // expectations on what it looks like.  However, for this function's
            // sake, we'll just cast to allow this assignment through.
            meta[keyInMeta] = keyValuePairs_1;
        }
    }
}
// Parse any target db information out of the file and add it to the resource
function parseTargetDBFile(filePath, fileContents, meta, childFilePath) {
    var extractToMeta = createExtractToMeta(filePath, meta);
    var extractAttributesToMeta = createExtractAttributesToMeta(filePath, meta);
    var xmlDoc = new xmldom_1.DOMParser({
        locator: {},
        errorHandler: xmlParserErrorHandler,
    }).parseFromString(fileContents.toString());
    var isConnection = _.startsWith(filePath, "ccs_base/common/targetdb/connections");
    var isDriver = _.startsWith(filePath, "ccs_base/common/targetdb/drivers");
    var isDevice = _.startsWith(filePath, "ccs_base/common/targetdb/devices");
    var isBoard = _.startsWith(filePath, "ccs_base/common/targetdb/boards");
    var isCPU = _.startsWith(filePath, "ccs_base/common/targetdb/cpus");
    parseInstances();
    if (isConnection || isDriver) {
        parseConnectionType();
    }
    if (isDriver) {
        parseISAType();
    }
    if (isDevice || isBoard) {
        var tag = isDevice ? "device" : "board";
        parseNeededISAType();
        parseAttribute(tag, "description");
        parseAttribute(tag, "partnum");
        parseCores();
        parseDescOrIDasID(tag);
        parseRootProperties(["id", "Name"]);
        parseOverriddenConnectionProperties();
    }
    if (isConnection) {
        parseDescOrIDasID("connection");
        parseRootProperties(["id", "Name"]);
        parseConfigurables();
    }
    if (isCPU) {
        parseOverriddenConnectionProperties();
    }
    function getAttribute(tag, attribute) {
        return xpath.select("//" + tag + "/@" + attribute, xmlDoc);
    }
    function parseCores() {
        // get all cpu nodes
        // and instanced cpus they may be overriding and then merge the properties
        var cpuNodeList = xpath.select("//cpu[not(contains(@isa,'BYPASS'))]", xmlDoc);
        // lets merge the properties at the root node, these are the only ones we care about
        _.each(cpuNodeList, function (cpuNode) {
            var id = cpuNode.getAttribute("id");
            var instanceNodeXPathExpr = "//instance[(contains(@href,'cpus/')) and  @id='" + id + "']";
            var instancedNodes = xpath.select(instanceNodeXPathExpr, xmlDoc);
            if (instancedNodes && instancedNodes.length > 1) {
                throw new Error("Found multiple instance nodes matching cpu id " + id);
            }
            var instancedNode = instancedNodes[0];
            if (instancedNode) {
                var descAttributeInstanceNode = xpath.select("@desc", instancedNode)[0];
                var descAttributeCpuNode = xpath.select("@desc", cpuNode)[0];
                if (descAttributeInstanceNode && !descAttributeCpuNode) {
                    cpuNode.setAttribute(descAttributeInstanceNode.nodeName, descAttributeInstanceNode.nodeValue);
                }
            }
        });
        extractAttributesToMeta(cpuNodeList, "cores", ["desc", "id"]);
    }
    function parseAttribute(tag, attribute) {
        return extractToMeta.asSingle(getAttribute(tag, attribute), attribute);
    }
    function parseDescOrIDasID(tag) {
        // preference must be given to "desc"
        var nodeList = getAttribute(tag, "desc");
        if (nodeList.length) {
            extractToMeta.asSingle(nodeList, "id");
        }
        else {
            extractToMeta.asSingle(getAttribute(tag, "id"), "id");
        }
    }
    function parseInstances() {
        var instancesWithHref = getAttribute("instance", "href");
        extractToMeta.asArray(instancesWithHref, "instances", convertPathToForwardSlashes);
        var isTargetdb = _.startsWith(filePath, "ccs_base/common/targetdb/");
        if (isTargetdb) {
            var neededIsaTypesNodeList = _.flatMap(instancesWithHref, function (node) {
                var filePathName = childFilePath ? childFilePath : "ccs_base/common/targetdb/" + node.nodeValue;
                if (fs.existsSync(filePathName)) {
                    var fileContent = fs.readFileSync(filePathName).toString();
                    var tempXmlDoc = new xmldom_1.DOMParser({
                        locator: {},
                        errorHandler: xmlParserErrorHandler,
                    }).parseFromString(fileContent);
                    return _.compact(xpath.select("//cpu[not(contains(@isa,'BYPASS'))]/@isa|//router[not(contains(@isa,'BYPASS'))]/@isa", tempXmlDoc));
                }
                return []; // nothing in this case
            });
            extractToMeta.asArray(neededIsaTypesNodeList, "neededIsaTypes", convertToLowerCase);
        }
        extractToMeta.asArray(getAttribute("instance", "href"), "instances", convertPathToForwardSlashes);
        extractToMeta.asArray(xpath.select("//driver[not(contains(@file,'NONE'))]/@file", xmlDoc), "instances", convertPathToForwardSlashes);
        extractToMeta.asArray(xpath.select("//property[@Type='filepathfield']/@Value", xmlDoc), "instances", convertPathToForwardSlashes);
    }
    function parseConnectionType() {
        var attribute = getAttribute("connectionType", "Type");
        if (isConnection) {
            extractToMeta.asSingle(attribute, "connectionType", convertToLowerCase);
        }
        else {
            extractToMeta.asDuplicate(attribute, "connectionTypes", convertToLowerCase);
        }
    }
    function parseISAType() {
        // assume that there is only one or the other
        // if something has both Type and id defined
        // it would result in duplicate entries
        var nodeList = xpath.select("//isa/@id|//isa/@Type", xmlDoc);
        extractToMeta.asDuplicate(nodeList, "isaTypes", convertToLowerCase);
    }
    function parseNeededISAType() {
        var nodeList = xpath.select("//cpu[not(contains(@isa,'BYPASS'))]/@isa|//router[not(contains(@isa,'BYPASS'))]/@isa", xmlDoc);
        extractToMeta.asArray(nodeList, "neededIsaTypes", convertToLowerCase);
    }
    function parseRootProperties(attributeToUseAsPropKey) {
        var nodeList = selectProperties("/*");
        extractAttributesToMeta(nodeList, "properties", attributeToUseAsPropKey);
    }
    function parseConfigurables() {
        var nodeList = xpath.select("/*/property", xmlDoc);
        var parser = new xml2js.Parser();
        var out = [];
        _.each(nodeList, function (node) {
            var nodeStr = node.toString();
            parser.parseString(nodeStr, function (err, result) {
                if (err) {
                    throw new Error("parsePropertiesConfigurables " + err);
                }
                else {
                    out.push(result);
                }
            });
        });
        meta.configurables = out;
    }
    function parseOverriddenConnectionProperties() {
        var nodeList = selectProperties("//jtag");
        var parser = new xml2js.Parser();
        var out = [];
        _.each(nodeList, function (node) {
            var nodeStr = node.toString();
            parser.parseString(nodeStr, function (err, result) {
                if (err) {
                    throw new Error("parseOverriddenConnectionProperties " + err);
                }
                else {
                    out.push(result);
                }
            });
        });
        meta.overriddenConnectionProperties = out;
    }
    // select property nodes that are child node ( only 1 level deep)
    // parentNode - parentNode path
    function selectProperties(parentNode) {
        return xpath.select(parentNode + "/property", xmlDoc);
    }
    function xmlParserErrorHandler(level, msg) {
        console.error(filePath, level, msg);
    }
}
exports.parseTargetDBFile = parseTargetDBFile;
// Parse any target db information out of the file and add it to the resource
function parseGelFile(filePath, fileContents, meta) {
    var extractToMeta = createExtractToMeta(filePath, meta);
    // ^ - match start of line
    // (?!\s*\/\/) - assert we can't match // with only whitespace before it
    // .*\$\(GEL_file_dir\) - match $(GEL_file_dir) with anything before it
    // (?!\\"|\") - assert we can't match " or \"
    // ((?:(?!\\"|\").)*) - match (and capture) everything up a " or \"
    // .*$ - match to the end of the line
    var regex = /^(?!\s*\/\/).*\$\(GEL_file_dir\)((?:(?!\\"|\").)*).*$/mg;
    var matches = regex.exec(fileContents);
    // convert parsed regex to a nodeList object
    // with a nodeName and nodeValue property to
    // match the xml node interface supported by the parser method
    var nodeList = [];
    while (null !== matches) {
        var extractedValue = matches[1];
        nodeList.push({
            nodeValue: extractedValue,
        });
        matches = regex.exec(fileContents);
    }
    extractToMeta.asArray(nodeList, "instances", convertPathToForwardSlashes);
}
exports.parseGelFile = parseGelFile;
function parseMetaDataFile(filePath, fileContents, meta) {
    // case by case handling
    if (filePath.match(/.*defaultProperties.dat/)) {
        var xmlParserErrorHandler = function (level, msg) {
            console.error(filePath, level, msg);
        };
        var xmlDoc = new xmldom_1.DOMParser({
            locator: {},
            errorHandler: xmlParserErrorHandler,
        }).parseFromString(fileContents.toString());
        var nodeList = xpath.select("/*/property", xmlDoc);
        var parser_1 = new xml2js.Parser();
        var out_1 = [];
        _.each(nodeList, function (node) {
            var nodeStr = node.toString();
            parser_1.parseString(nodeStr, function (err, result) {
                if (err) {
                    console.error("parsePropertiesConfigurables " + err);
                }
                else {
                    out_1.push(result);
                }
            });
        });
        meta.configurables = out_1;
    }
}
exports.parseMetaDataFile = parseMetaDataFile;
// Parse any information from this object into the metadata associated with the resource
function parseMeta(filePath, zipObject, categories, resource, childFilePath) {
    var parseFunction = null;
    if (_.includes(categories, "targetdb")) {
        parseFunction = parseTargetDBFile;
    }
    else if (_.includes(categories, "gel")) {
        parseFunction = parseGelFile;
    }
    else if (_.includes(categories, "meta_data")) {
        parseFunction = parseMetaDataFile;
    }
    if (parseFunction) {
        var meta = metaData.getMeta(resource);
        var fileContents = zipObject.asText();
        parseFunction(filePath, fileContents, meta, childFilePath);
        metaData.setMeta(resource, meta);
    }
}
exports.parseMeta = parseMeta;
