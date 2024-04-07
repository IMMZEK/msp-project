export const command: "test <configuration>";
export const describe: "Test ti-rex-core";
export function builder(): yargs.Argv<any>;
export function runTests(args: any, callback?: () => void): void;
import yargs = require("yargs");
