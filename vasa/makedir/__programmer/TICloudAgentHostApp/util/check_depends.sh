#!/bin/bash

# This script reads a list of dependencies and checks if they are available on the local system.
# It checks for the version of GLBIC and GLIBCXX, but not of the versions of other libraries.
#
# CCS v5.4 includes a version of glibcxx, so this version is not checked.
#
# TODO:
# - A future version of this script might use ldconfig instead of loading libraries via "testprog".
# - Check for an "unzip" program (needed by the installer).
# 
OUTPUT_DEPENDENCY_FILE=ext-depends.txt

# Need to reset LD_LIBRARY_PATH because tcl/lib interferes with this script (SDSCM00049449)
if [ "$1" != "" ]
then
	LD_LIBRARY_PATH=$2
fi

# get version of GLIBC and GLIBCXX required from the input file
GLIBC_REQUIRED=`cat $OUTPUT_DEPENDENCY_FILE|grep GLIBC:|awk '{print $2}'`
GLIBCXX_REQUIRED=`cat $OUTPUT_DEPENDENCY_FILE|grep GLIBCXX:|awk '{print $2}'`

# Check if the test program can be run. It might not be runable if ia32 libs are not installed.
./testprog 1>/dev/null 2>/dev/null
if [ $? -ne 0 ]
then
	echo "Please ensure the ia32 libraries are installed and re-run this script."
	exit
fi

# Get the version of GLIBC acutally installed.
GLIBC_VER=$(strings $(ldd testprog 2>/dev/null |grep libc.so |awk '{print $3}') |grep GLIBC_2 |sort -t. -k1,1 -k2n,2n -k3n,3n -u| tail -n 1)

# Get the version of GLIBCXX installed. This is only needed for v5.3 and earlier
GLIBCXX_LDD=$(ldd testprog 2>/dev/null | grep libstdc++.so | awk '{print $3}') 
if [ "$GLIBCXX_LDD" == "not" ] || [ "$GLIBCXX_LDD" == "" ]
then
	GLIBCXX_VER="N/A"
else
	GLIBCXX_VER=$(strings $GLIBCXX_LDD |grep GLIBCXX_[0-9] |sort -t. -k1,1 -k2n,2n -k3n,3n -u| tail -n 1)
fi

echo "Installed versions of glibc and glibcxx: $GLIBC_VER, $GLIBCXX_VER"
echo "Required versions of glibc and glibcxx:  $GLIBC_REQUIRED, $GLIBCXX_REQUIRED"

# Figure out if the installed version is new enough.
SORTED_GLIBC=`echo -e "$GLIBC_VER\n$GLIBC_REQUIRED"|sort -t. -k1,1 -k2n,2n -k3n,3n -u| tail -n 1`
SORTED_GLIBCXX=`echo -e "$GLIBCXX_VER\n$GLIBCXX_REQUIRED"|sort -t. -k1,1 -k2n,2n -k3n,3n -u| tail -n 1`

if [ $GLIBC_VER != $SORTED_GLIBC ]
then
	echo "WARNING: A more recent GLIBC version is needed to run CCS."
fi

# Check the rest of the libraries in the dependency file
./testprog

