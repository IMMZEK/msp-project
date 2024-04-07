// Since we don't know where CCS will be installed, we must find files relative
// to this script. To this end, we will need access to node.js's path.join function.
const { join } = require ("path");


// Initialize scripting and obtain the main debugger scripting interface
const ds = initScripting();

// Configure a 10 second timeout on all operations (by default there is no timeout)
ds.setScriptingTimeout(10000);

// Configure the debugger and open a debug session to the cortex M core
ds.configure(join(__dirname, "mspm0g3507/mspm0g3507.ccxml"));
const session = ds.openSession(/cortex/i);

session.target.connect();

// Load program
// The path provided must be an absolute path. Here we use the current script's location
// to resolve the location.
session.memory.loadProgram(join(__dirname, "mspm0g3507/modem.out"));

// Set a breakpoint at ReadNextData
const bp1 = session.breakpoints.add("ReadNextData");

// Set a second breakpoint using the address of the function ShapingFilter
const bp2Addr = session.expressions.evaluate("ShapingFilter");
const bp2 = session.breakpoints.add(bp2Addr);

// Let's define a function to run the target and check if it halts at the correct symbol
function expectRunToHaltAt(symbol) {
	// Run the target and wait for it to halt
	session.target.run();

	const symbolAddr = session.expressions.evaluate(symbol);
	const pc = session.registers.read("PC")
	if (pc === symbolAddr) {
		console.log(`Success: target is halted at ${symbol} as expected.`);
	} else {
		console.error(
			`Failure: Expected target to be halted at 0x${symbolAddr.toString(16)}, `
			`but is actually halted at 0x${pc.toString(16)}.`
		);
		process.exit(1);
	}
}

// If we run, we should hit our first breakpoint at ReadNextData
expectRunToHaltAt("ReadNextData");

// If we run a second time, we expect to halt at our second breakpoint
expectRunToHaltAt("ShapingFilter");

// Remove our first breakpoint
session.breakpoints.remove(bp1);

// The program runs in an infinite loop, so running a third time should, once again, halt at the second breakpoint
expectRunToHaltAt("ShapingFilter");

// If we remove our second breakpoint as well, we expect to run in a loop until we time out
session.breakpoints.remove(bp2);

// We expect the next run to timeout, let's reduce the timeout duration so we don't have to wait as long
ds.setScriptingTimeout(2000);

try {
	console.log("Expecting target to not halt for 2 seconds");
	session.target.run();
	console.error("Failure: Halted unexpectedly after removing both breakpoints.");
} catch (err) {
	// Check if we actually timed out, or if some other error occurred
	if (err instanceof ScriptingTimeoutError) {
		console.log("Success: we timed out while waiting for the target to halt");
		session.target.halt();
	} else {
		console.error(`Failure: unexpected error while running ${err}`);
	}
}

// shutdown the debugger
ds.shutdown();
