#!/bin/bash

if  [ $# = 0 ] || [ ! $1 = "-s" ]
then
echo
echo "                  !!!CAUTION!!!" 
echo "Make sure XDS560 STM EMULATOR is not in use on the USB port"
read -p "Do you want to continue with the cleanup [Y]? " CONTINUE_CLEANUP
fi
DidCleanup="false"

# Check default and case, convert blank line or lower case y to capital Y
if [ -z $CONTINUE_CLEANUP ]
then
    CONTINUE_CLEANUP="Y"
fi

if [ $CONTINUE_CLEANUP = "y" ]
then
    CONTINUE_CLEANUP="Y"
fi

if [ $CONTINUE_CLEANUP != "Y" ]
then
    echo
    echo "--Cleanup Aborted"
    echo
else 
	# kill all instances of server
	for i in $(echo `pidof sd560v2u_server` | tr " " "\n")
	do
	  kill $i
	  DidCleanup="true"
	done

	# delete all the fifos 
	if [ -d "/tmp/sd560v2u_fifo" ];then
	   rm -rf "/tmp/sd560v2u_fifo"
	   DidCleanup="true"
	fi

	# delete all the semaphores if exists
	for f in "/dev/shm/sem.PID_XDS560V2U_*"
	do
	   rm -rf $f
	   DidCleanup="true"
	done

        echo
	if [ $DidCleanup == "true" ];then
	    echo "--Cleaned opened resources successfully"
        else
	    echo "--No opened resources to clean"
        fi
        echo
fi
