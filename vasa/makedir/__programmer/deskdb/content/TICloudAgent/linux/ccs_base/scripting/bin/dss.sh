#!/bin/bash
 
# Usage: dss [-dss.debug] [-dss.workspace WORKPLACE_FOLDER] DSS_JAVASCRIPT_FILE [optional script arguments]
#       

# DebugServer root directory.
DEBUGSERVER_ROOT=$(cd $(dirname "$0"); pwd)/../../DebugServer

# Java class paths
CLASSPATH=$DEBUGSERVER_ROOT/packages/ti/dss/java/js.jar:$CLASSPATH
CLASSPATH=$DEBUGSERVER_ROOT/packages/ti/dss/java/dss.jar:$CLASSPATH
# Path to DVT Scripting JAR File
CLASSPATH=$DEBUGSERVER_ROOT/../dvt/scripting/dvt_scripting.jar:$CLASSPATH
export CLASSPATH

# Use product JRE
if [ -d "$DEBUGSERVER_ROOT/../jre" ]; then
  export JAVA_HOME=$DEBUGSERVER_ROOT/../jre
  export PATH=$DEBUGSERVER_ROOT/../jre/bin:$PATH
elif [ -d "$DEBUGSERVER_ROOT/../eclipse/jre" ]; then
  export JAVA_HOME=$DEBUGSERVER_ROOT/../eclipse/jre
  export PATH=$DEBUGSERVER_ROOT/../eclipse/jre/bin:$PATH
elif [ -d "$DEBUGSERVER_ROOT/../../eclipse/jre" ]; then
  export JAVA_HOME=$DEBUGSERVER_ROOT/../../eclipse/jre
  export PATH=$DEBUGSERVER_ROOT/../../eclipse/jre/bin:$PATH
elif [ -d "$DEBUGSERVER_ROOT/../../eclipse/Ccstudio.app/jre" ]; then
  export JAVA_HOME=$DEBUGSERVER_ROOT/../../eclipse/Ccstudio.app/jre/Contents/Home
  export PATH=$DEBUGSERVER_ROOT/../../eclipse/Ccstudio.app/jre/Contents/Home/bin:$PATH
fi

WORKSPACE="-data @user.home/workspace"
OTHERARGS=""
while [ $# -gt 0 ]
do
	key="$1"
	case $key in
		-dss.debug)
		DEBUG="-dss.debug"
		shift # past argument
		;;
		-dss.workspace)
		WORKSPACE="-data $2"
		shift # past argument
		shift # past value
		;;
		*)
		if [ -z "$OTHERARGS" ]; then
			OTHERARGS="$1"
		else
			OTHERARGS="$OTHERARGS $1"
		fi
		shift # past argument
		;;
	esac
done

if [ -z "$OTHERARGS" ]; then
	echo "Usage: dss [-dss.debug] [-dss.workspace WORKPLACE_FOLDER] DSS_JAVASCRIPT_FILE [optional script arguments]"
    return 0
fi

if [ -e "$DEBUGSERVER_ROOT/../../eclipse/ccstudio" ]; then
	$DEBUGSERVER_ROOT/../../eclipse/ccstudio -nosplash -application com.ti.ccstudio.apps.runScript -product com.ti.ccstudio.branding.product $DEBUG -dss.rhinoArgs $WORKSPACE "$OTHERARGS"
else
  # fall back into the legacy method
  java org.mozilla.javascript.tools.shell.Main $OTHERARGS
fi
