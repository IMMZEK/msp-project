#!/bin/bash


STARTDIR=`dirname $0`
USER=`whoami`

# Check root
if [ "${USER}" != "root" ]; then
	echo "ERROR: this script must be run as root"
	exit 1
fi


cp -f ../ccs_base/emulation/analysis/bin/ctprof.1.gz /usr/share/man/man1/ctprof.1.gz

if [ $? -ne 0 ]; then
	echo "ERROR: failed to install cToolsProf man-page"
	exit 2
fi