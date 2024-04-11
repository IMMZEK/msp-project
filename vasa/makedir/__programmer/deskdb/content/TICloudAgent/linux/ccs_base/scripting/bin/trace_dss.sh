#!/bin/bash

# DebugServer root directory.
DEBUGSERVER_ROOT=$(cd $(dirname "$0"); pwd)/../../DebugServer

# Java class paths
CLASSPATH=$DEBUGSERVER_ROOT/../emulation/analysis/bin/ctoolsTraceScripting.jar:$CLASSPATH
CLASSPATH=$DEBUGSERVER_ROOT/packages/ti/dss/java/js.jar:$CLASSPATH
CLASSPATH=$DEBUGSERVER_ROOT/packages/ti/dss/java/dss.jar:$CLASSPATH
CLASSPATH=$DEBUGSERVER_ROOT/../dvt/scripting/dvt_scripting.jar:$CLASSPATH
export CLASSPATH

# Configure CCS path
export CCS_V4_CTOOLSCRIPT_DIR=${DEBUGSERVER_ROOT}/..

# Add emulation shared objects to library path
export LD_LIBRARY_PATH=$DEBUGSERVER_ROOT/../emulation/analysis/bin:${LD_LIBRARY_PATH}

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
fi

# Run Tcl test script
java org.mozilla.javascript.tools.shell.Main "$@"
