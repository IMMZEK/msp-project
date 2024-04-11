"use strict";
const spawnDS_1 = require("../spawnDS");
const moduleFactory = {
    name: "DS",
    create: (onClose) => {
        return (0, spawnDS_1.spawnDS)(onClose, []);
    },
};
module.exports = moduleFactory;
