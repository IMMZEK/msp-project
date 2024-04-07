#!/bin/bash

# directory of script
SCRIPT=$(readlink -f "$0")
SCRIPT_PATH=$(dirname "$SCRIPT")

# path to local user TICloudAgent
DEBUGSERVER_ROOT=$SCRIPT_PATH/deskdb/content/TICloudAgent/linux/ccs_base/DebugServer

# update PATH to include the TICloudAgent DS common bin
PATH=$PATH:$DEBUGSERVER_ROOT/../common/bin/

# default mode (flash,memory,cc32xx) and executable
MODE=flash
EXECUTABLE="$DEBUGSERVER_ROOT/bin/DSLite"

if [ "$1" == "" ] || [ "$1" == "-h" ] || [ "$1" == "--help" ] ; then
	echo
	echo "Using default 'flash' mode. (Use --listMode option to view available modes and usage)"
	echo 
fi

# list available modes
if [ "$1" == "--listMode" ]; then
	echo 
	echo "Available Modes for UniFlash CLI:"
	echo "  * flash [default]		- on-chip flash programming"
	echo "  * memory			- export memory to a file"
	echo "  * load			- simple loader [use default options]"
	echo "  * cc13xx-cc26xx-mass-erase	- unlock a locked CC13xx/CC26xx device by performing a mass erase"
	echo "  * cc23xx-unlock-debug-access	- unlock debug access for CC23xx devices"
	echo "  * noConnectFlash		- bypasses connect sequence during flash; for programming a blank CC23xx device"
if [ -d "$SCRIPT_PATH/simplelink" ]; then
	echo "  * cc31xx			- flashing SimpleLink CC31xx [imagecreator]"
	echo "  * cc32xx			- flashing SimpleLink CC32xx [imagecreator]"
fi
if [ -d "$SCRIPT_PATH/processors" ]; then
	echo "  * processors			- support ProcessorSDKSerialFlash command line parameters [Processor Serial Flash CLI Tool]"
fi
	echo
	exit 0
fi
# parse user options
USEROPTIONS="$@"

# get user specified mode, update list of user options
if [ "$1" == "--mode" ]; then
	MODE=$2
	USEROPTIONS="${@:3}"
fi

# default option to print help if none is given
if [ "$USEROPTIONS" == "" ]; then
	USEROPTIONS="-h"
fi

# CC32xx (imagecreator) support
if [ "$MODE" == "cc32xx" ] || [ "$MODE" == "cc31xx" ]; then
	cd $SCRIPT_PATH/simplelink/imagecreator/bin/
	EXECUTABLE=./SLImageCreator
	MODE=""
fi

# processorsFlashSerial support
if [ "$MODE" == "processors" ]; then
	cd $SCRIPT_PATH/processors/
	EXECUTABLE=./ProcessorSDKSerialFlash
	MODE=""
fi

# execute with given user parameters
echo "Executing the following command:"
echo ">" $EXECUTABLE $MODE $USEROPTIONS
echo

printf "For more details and examples, please refer to the UniFlash Quick Start guide.\n\n"
eval $EXECUTABLE $MODE $USEROPTIONS

rc=$?
if [[ $rc != 0 ]]; then exit $rc; fi
