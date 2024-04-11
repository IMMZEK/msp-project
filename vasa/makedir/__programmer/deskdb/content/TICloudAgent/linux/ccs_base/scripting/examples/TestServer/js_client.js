/*

This script sends specific commands to the active debug session and prints the response. 
DSSClient.js is used to connect to the DSS Test Server through a TCP/IP socket.
The commands are formatted as JSON objects. 

A host and a port number must be provided as arguments.


*/



load(java.lang.System.getenv("SCRPITING_ROOT") + "/examples/TestServer/DSSClient.js");


if (arguments.length != 2) {
	throw "Usage: node js_client <local host> <port number>\n";
}


var host = arguments[0];
var port = Number(arguments[1]);


client = new DSSClient(host, port);


// Connect to the CCS json server.
client.open();

// execute command
function execute_command(cmd) {
	result = client.execute(cmd);
	if (result) {
		print(String(cmd['name']) + ": " + String(result['status']));
		// If there is a message, print it
		if ('message' in result) {
			print("  message: " + String(result['message']) + "\n");
		}
		// If a value was returned, print it
		if ('value' in result) {
			print("  value: " + String(result['value']) + "\n");
		}
	} else {
		print(String(cmd['name']) + " execution failed\n");
	}
}

//Send commands to DSS Test Server
//----------------
// This command does not exist and should FAIL.

cmd = {
	"name": "buggyrun",
}
execute_command(cmd);


// Connect to the target.
cmd = {
	"name": "connect",
}
execute_command(cmd);

// Demonstrate the use of custom commands (report current timeout value)
cmd = {
	"name": "custom_cmd",
}
execute_command(cmd);

// Set timeout value 
cmd = {
	"name": "timeout",
	"timeout": 10000,
}
execute_command(cmd);

// Demonstrate the use of custom commands (report current timeout value)
cmd = {
	"name": "custom_cmd",
}
execute_command(cmd);

// Disconnect from the target.
cmd = {
	"name": "disconnect",
}
execute_command(cmd);

// Connect to the target.
cmd = {
	"name": "connect",
}
execute_command(cmd);

// Connect to the target.
cmd = {
	"name": "connect",
}
execute_command(cmd);

// Load program.
cmd = {
	"name": "load",
	"program": "FileDoesNotExist.out",
}
execute_command(cmd);

// Load program.
cmd = {
	"name": "load",
	"program": "hello_CC2640R2_LAUNCHXL_tirtos_ccs.out",
}
execute_command(cmd);

// Redirect CIO to file.
cmd = {
	"name": "redirectCIO",
	"file": "cio.txt"
}
execute_command(cmd);

// Set breakpoint on fake symbol. Will fail
cmd = {
	"name": "setBreakpoint",
	"address": "SymbolDoesNotExist",
}
execute_command(cmd);

// Load breakpoint on main.
cmd = {
	"name": "setBreakpoint",
	"address": "main",
}
execute_command(cmd);

// Remove all breakpoints.
cmd = {
	"name": "removeAllBreakpoints",
}
execute_command(cmd);

// Execute program.
cmd = {
	"name": "run",
}
execute_command(cmd);

// Halt program.
cmd = {
	"name": "halt",
}
execute_command(cmd);

// Disable CIO redirect.
cmd = {
	"name": "redirectCIO",
}
execute_command(cmd);

// Read a 32 bit value from memory
cmd = {
	"name": "readData",
	"page": 0,
	"address": 0x20000000,
	"typeSize": 32,
	"signed": 0,
}
execute_command(cmd);

// Read several 32 bit values from memory
cmd = {
	"name": "readDataArray",
	"page": 0,
	"address": 0x20000004,
	"numValues": 8,
	"typeSize": 32,
	"signed": 0,
}
execute_command(cmd);

// Save memory to binary file.
cmd = {
	"name": "saveRawToFile",
	"page": 0,
	"address": 0x20000000,
	"file": "saveRawToFile.bin",
	"length": 1000,
	"wordSize": 32,
	"byteSwap": 0,
}
execute_command(cmd);

// Save memory to *.dat file.
cmd = {
	"name": "saveDataToFile",
	"page": 0,
	"address": 0x20000000,
	"file": "saveDataToFile.dat",
	"length": 1000,
	"ioFormat": 1,
	"append": 0,
}
execute_command(cmd);

// This will close the socket
cmd = {
	"name": "stop",
}
//execute_command(cmd)


// We are done now.
client.close();


// Duplicate close call will fail
client.close();


//------------------



