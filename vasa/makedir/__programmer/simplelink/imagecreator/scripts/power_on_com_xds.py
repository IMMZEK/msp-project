from time import sleep, time
import subprocess
import os

import serial


def call_with_timeout(cmd, timeout):
    proc = subprocess.Popen(cmd)

    delay = time() + timeout
    while time() < delay:
        if proc.poll() is not None:
            break
            
        sleep(1)

    return proc

	
cmd = (os.path.join("./bin", "xds110reset"), "-a", "deassert")
       
try:        

	proc = call_with_timeout(cmd, 10)
	if proc.poll() is None:
		proc.kill()
		# raise DeviceError("Power Off failure, timed out")
		
finally:
    # this line is for mac os only!!
	#serial.serialposix.TIOCSBRK = 0x2000747b
	#serial.serialposix.TIOCCBRK = 0x2000747a
    pass
	
if proc.returncode:
	print ("XDS Power Off failure: {}".format(proc.returncode))
			
