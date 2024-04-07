const repl = require("repl");
const ds = initScripting();
console.log("Interactive scripting session started.");
console.log("Debugger scripting object is bound to 'ds'.");
console.log("Use Ctrl+D plus Return to exit.")
const scriptRepl = repl.start({ prompt: ">> " });
scriptRepl.context["ds"] = ds;
scriptRepl.on("exit", () => ds.shutdown());
