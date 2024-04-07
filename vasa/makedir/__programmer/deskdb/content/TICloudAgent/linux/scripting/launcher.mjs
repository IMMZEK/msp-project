import { initScripting, ScriptingTimeoutError } from "scripting";
import { join, isAbsolute } from "node:path";

global.initScripting = initScripting;
global.ScriptingTimeoutError = ScriptingTimeoutError;

let script = process.argv[2];
if (!isAbsolute(script)) {
	script = join(process.cwd(), script);
}

await import("file://" + script);
