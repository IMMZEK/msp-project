import sys
import DSSClient

if (len(sys.argv) != 3):
    raise Exception("Usage: python python_client <local host> <port number>\n")


host = sys.argv[1]
port = int(sys.argv[2])

client = DSSClient.DSSClient(host, port);


# Connect to the CCS json server.
client.open()

# execute command
def execute_command(cmd):
    result = client.execute(cmd)
    
    if (result):

        print(str(cmd['name'])+": "+str(result['status']))
        # If there is a message, print it
        if ('message' in result.keys()):           
        	print ("  message: "+str(result['message'])+"\n")
        # If a value was returned, print it
        if ('value' in result.keys()):           
        	print("  value: "+str(result['value'])+"\n")
    else:
        print (str(cmd['name'])+" execution failed\n")

#Send commands to DSS Test Server
#----------------
# This command does not exist and should FAIL.

cmd = {
	"name": "buggyrun",
}
execute_command(cmd)


# Connect to the target.
cmd = {
	"name": "connect",
}
execute_command(cmd)

# Demonstrate the use of custom commands (report current timeout value)
cmd = {
	"name": "custom_cmd",
}
execute_command(cmd)

# Set timeout value 
cmd = {
	"name": "timeout",
	"timeout": 10000,
}
execute_command(cmd)

# Demonstrate the use of custom commands (report current timeout value)
cmd = {
	"name": "custom_cmd",
}
execute_command(cmd)

# Disconnect from the target.
cmd = {
	"name": "disconnect",
}
execute_command(cmd)

# Connect to the target.
cmd = {
	"name": "connect",
}
execute_command(cmd)

# Connect to the target.
cmd = {
	"name": "connect",
}
execute_command(cmd)

# Load program.
cmd = {
	"name": "load",
	"program": "FileDoesNotExist.out",
}
execute_command(cmd)

# Load program.
cmd = {
	"name": "load",
	"program": "hello_CC2640R2_LAUNCHXL_tirtos_ccs.out",
}
execute_command(cmd)

# Redirect CIO to file.
cmd = {
	"name": "redirectCIO",
	"file": "cio.txt"
}
execute_command(cmd)

# Set breakpoint on fake symbol. Will fail
cmd = {
	"name": "setBreakpoint",
	"address": "SymbolDoesNotExist",
}
execute_command(cmd)

# Load breakpoint on main.
cmd = {
	"name": "setBreakpoint",
	"address": "main",
}
execute_command(cmd)

# Remove all breakpoints.
cmd = {
	"name": "removeAllBreakpoints",
}
execute_command(cmd)

# Execute program.
cmd = {
	"name": "run",
}
execute_command(cmd)

# Halt program.
cmd = {
	"name": "halt",
}
execute_command(cmd)

# Disable CIO redirect.
cmd = {
	"name": "redirectCIO",
}
execute_command(cmd)

# Read a 32 bit value from memory
cmd = {
	"name": "readData",
	"page": 0,
	"address": 0x20000000,
	"typeSize": 32,
	"signed": 0,
}
execute_command(cmd)

# Read several 32 bit values from memory
cmd = {
	"name": "readDataArray",
	"page": 0,
	"address": 0x20000004,
	"numValues": 8,	
	"typeSize": 32,
	"signed": 0,
}
execute_command(cmd)

# Save memory to binary file.
cmd = {
	"name": "saveRawToFile",
	"page": 0,
	"address": 0x20000000,
	"file": "saveRawToFile.bin",
	"length": 1000,
	"wordSize": 32,
	"byteSwap": 0,
}      
execute_command(cmd)

# Save memory to *.dat file.
cmd = {
	"name": "saveDataToFile",
	"page": 0,
	"address": 0x20000000,
	"file": "saveDataToFile.dat",
	"length": 1000,
	"ioFormat": 1,
	"append": 0,
}
execute_command(cmd)

# This will close the socket
cmd = {
	"name": "stop",
}
#execute_command(cmd)


# We are done now.
client.close()


# Duplicate close call will fail
client.close()


#------------------



