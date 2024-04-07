#!/bin/bash

#export TI_DS_ENABLE_LOGGING=1
#export TI_DS_LOGGING_OUTPUT=/tmp/my.log
#echo "---$0 ARGS--- $1 $2 $3" > /tmp/my_ticld_args.log

pushd `dirname $0` > /dev/null
SCRIPTPATH=`pwd`
popd > /dev/null

# When started from firefox, some environment variables may not be set
# We'll manually set/modify the ones we depend on here

if [ -z "$HOME" ]
then
  export HOME=~
fi

if [ -z "$TMPDIR" ]
then
  export TMPDIR=~/.ti/TICloudAgent/tmp
  mkdir -p $TMPDIR 2> /dev/null
fi

export PATH=$PATH:/usr/sbin:$SCRIPTPATH/util

# Now start node

if [ "$1" = "not_chrome" ]
then
  $SCRIPTPATH/node $SCRIPTPATH/src/main.js
else
  $SCRIPTPATH/node $SCRIPTPATH/src/main_chrome.js
fi
	

