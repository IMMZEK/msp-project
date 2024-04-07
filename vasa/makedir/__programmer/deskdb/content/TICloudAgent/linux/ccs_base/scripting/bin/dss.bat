@echo off
REM *************************************************************************
REM This script is used to run JavaScript-based DSS scripts.
REM
REM If eclipsec.exe is present, it will use the headless script launcher
REM to run the script
REM
REM Otherwise, it does this by setting up the necessary environment and invoking the
REM Rhino Javascript engine.
REM
REM Usage: dss [-dss.debug] [-dss.workspace WORKPLACE_FOLDER] DSS_JAVASCRIPT_FILE  [optional script arguments]
REM
REM *************************************************************************

setlocal ENABLEDELAYEDEXPANSION

set DEBUGSERVER=%~dp0..\..\DebugServer

if not exist "!DEBUGSERVER!\..\..\eclipse\eclipsec.exe" (
	REM if eclipsec.exe is not present, use the old way of launching the script 
	goto LAUNCH_DSS_SCRIPT
)

REM Read the command line args looking for dss.debug or dss.workspace.
set WORKSPACE=-data @user.home/workspace
set OTHERARGS=
set WORKSPACE_NEEDED=0

:readargs
REM A goto loop needs to be used here to prevent wildcard expansion. For loops always expand wildcards.
if "%~1" neq "" (
	if !WORKSPACE_NEEDED! EQU 1 (
		set WORKSPACE=-data "%~1"
		set WORKSPACE_NEEDED=0
	) else if "%~1" == "-dss.debug" (
		set DEBUG_FLAG=-dss.debug
	) else if "%~1"=="-dss.workspace" (
		set WORKSPACE_NEEDED=1
	) else (
		set OTHERARGS=!OTHERARGS! "%~1"
	)
	shift /1
	goto :readargs
)

Rem We should have matched everything but the script and optional script args. If not, there's an error.
if "%OTHERARGS%" EQU "" (
	echo Usage: dss [-dss.debug] [-dss.workspace WORKPLACE_FOLDER] DSS_JAVASCRIPT_FILE  [optional script arguments]
	goto THEEND
)

REM use the headless script launcher
:LAUNCH_IDE_SCRIPT
!DEBUGSERVER!\..\..\eclipse\eclipsec.exe -nosplash -application com.ti.ccstudio.apps.runScript -product com.ti.ccstudio.branding.product %DEBUG_FLAG% -dss.rhinoArgs %WORKSPACE% "%OTHERARGS%"

goto THEEND

:LAUNCH_DSS_SCRIPT

REM Path to Rhino JAR File
set RHINO_JAR="!DEBUGSERVER!\packages\ti\dss\java\js.jar"

REM Path to DVT Scripting JAR File
set DVT_SCRIPTING_JAR="!DEBUGSERVER!\..\dvt\scripting\dvt_scripting.jar"

REM Path to DebugServer JAR File
set SCRIPTING_JARS="!DEBUGSERVER!\packages\ti\dss\java\dss.jar"

REM If this is CCS (rather than stand-alone DSS) also add Eclipse's Equinox Launcher JAR to to the classpath
REM (need to modify to match the version of the JAR of the current version in Eclipse
if exist "!DEBUGSERVER!\..\..\eclipse\plugins\org.eclipse.equinox.launcher_1.2.0.v20110502.jar" (
	set SCRIPTING_JARS=!SCRIPTING_JARS!;"!DEBUGSERVER!\..\..\eclipse\plugins\org.eclipse.equinox.launcher_1.2.0.v20110502.jar"
)

REM Name of Rhino Shell Java Application
set RHINO_SHELL=org.mozilla.javascript.tools.shell.Main

REM Name of Rhino Debugger Java Application
set RHINO_DEBUGGER=org.mozilla.javascript.tools.debugger.Main

REM add path to Windows 32-bit on Windows 64-bit (WOW64) folder for 64bit Windows to use the 32bit applications.
if exist "!SYSTEMROOT!\SysWOW64\" set PATH=!SYSTEMROOT!\SysWOW64\;!PATH!
 
:SETUP_JRE_PATH
REM If the user chose to install the JRE with this DSS install - use that JRE. 
if exist "!DEBUGSERVER!\..\jre" (
	set JAVA_HOME=!DEBUGSERVER!\..\jre
	set PATH=!DEBUGSERVER!\..\jre\bin;!PATH!
	goto LAUNCH_SCRIPT
)

REM If this CCS (rather than stand-alone DSS) the installed jre is in \eclipse\jre
if exist "!DEBUGSERVER!\..\..\eclipse\jre" (
	set JAVA_HOME=!DEBUGSERVER!\..\..\eclipse\jre
	set PATH=!DEBUGSERVER!\..\..\eclipse\jre\bin;!PATH!
	goto LAUNCH_SCRIPT
)

REM Launch Rhino script engine.  Import the scripting package.
:LAUNCH_SCRIPT
java.exe -Xms40m -Xmx384m -cp !RHINO_JAR!;!SCRIPTING_JARS!;!DVT_SCRIPTING_JAR! !RHINO_SHELL! %1 %2 %3 %4 %5 %6 %7 %8 %9

:THEEND
endlocal
