#! /bin/bash
# ==========================================================================
# 
# - install or uninstall 99-icdi.rules file in /etc/udev/rules.d directory.
# - set up the .desktop file to register the ccstools url handler
#
# pass parameter "--install" to install 
# pass parameter "--uninstall" to uninstall
#
# This script needs to be executed as root.
#
if [ "${1}" = "" ];
then
    echo "Usage: ${0} --install or --uninstall"
    exit 1
fi

typeset DESKTOP_FILE=/usr/share/applications/ticloudagent.desktop
pushd `dirname $0` > /dev/null
typeset SCRIPTPATH=`pwd`
popd > /dev/null

if [ "${1}" = "--install" ];
then
  
	echo "Install ${DESKTOP_FILE}"
	#remove the existing file
	rm -f ${DESKTOP_FILE}
	
	printf "[Desktop Entry]\n" >> ${DESKTOP_FILE}
	printf "Encoding=UTF-8\n" >> ${DESKTOP_FILE}
	printf "Version=1.0\n" >> ${DESKTOP_FILE}
	printf "Type=Application\n" >> ${DESKTOP_FILE}
	printf "Terminal=false\n" >> ${DESKTOP_FILE}

	printf "Exec=${SCRIPTPATH}/ticloudagent.sh %%u\n" >> ${DESKTOP_FILE}
	printf "Name=TI Cloud Agent\n" >> ${DESKTOP_FILE}
	printf "Comment=TI Cloud Agent\n" >> ${DESKTOP_FILE}
	printf "Categories=Application\n" >> ${DESKTOP_FILE}
	printf "MimeType=x-scheme-handler/ticloudagent\n" >> ${DESKTOP_FILE}
	printf "NoDisplay=true\n" >> ${DESKTOP_FILE}
	
	update-desktop-database
	
	${SCRIPTPATH}/install_scripts/install_drivers.sh
	
    exit 0
fi

if [ "${1}" = "--uninstall" ];
then
 	
	echo "Remove ${DESKTOP_FILE}"
    # remove the file if any
    rm -f ${DESKTOP_FILE}
	update-desktop-database
	
	${SCRIPTPATH}/install_scripts/uninstall_drivers.sh
	
    exit 0
fi

