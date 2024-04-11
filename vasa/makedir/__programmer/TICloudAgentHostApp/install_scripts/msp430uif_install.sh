#!/bin/bash

if [ "$1" == "--install" ] || [ "$1" == "--uninstall" ];then 
	SDUDEV_FILE="/etc/udev/rules.d/61-msp430uif.rules"

	# Udev rule attributes currently only need to support Ubuntu and Suse
	MSP430UIF="ATTRS{idVendor}=="\"2047\"",ATTRS{idProduct}=="\"0010\"",MODE="\"0666\"""
	MSP430EZ="ATTRS{idVendor}=="\"2047\"",ATTRS{idProduct}=="\"0013\"",MODE="\"0666\"""
	MSP430MSPFET="ATTRS{idVendor}=="\"2047\"",ATTRS{idProduct}=="\"0014\"",MODE="\"0666\"""
	MSP430HID="ATTRS{idVendor}=="\"2047\"",ATTRS{idProduct}=="\"0203\"",MODE="\"0666\"""
	MSP430HID2="ATTRS{idVendor}=="\"2047\"",ATTRS{idProduct}=="\"0204\"",MODE="\"0666\"""
    MSP430EZ430="ATTRS{idVendor}=="\"0451\"",ATTRS{idProduct}=="\"f432\"",MODE="\"0666\"""

	# Check root
	USER=`whoami`
	if [ "${USER}" != "root" ]; then
		echo "ERROR: this script must be run as root"
		exit 1
	fi

	# Remove old rules file
	if [ -e ${SDUDEV_FILE} ]; then
		rm -f ${SDUDEV_FILE}
		if [ $? -ne 0 ]; then
			echo "ERROR: failed to remove ${SDUDEV_FILE}"
			exit 1
		fi
	fi

	if [ "$1" == "--install" ];then
        # Copy udev rules to install ModemManager exceptions 
        DIR="$( cd "$( dirname "$0" )" && pwd )"
        cp "$DIR/70-mm-no-ti-emulators.rules" "/etc/udev/rules.d/70-mm-no-ti-emulators.rules"
        
		# Create the new rule file.
                echo -e "#TI MSP430UIF\n$MSP430UIF\n$MSP430EZ\n$MSP430MSPFET\n$MSP430HID\n$MSP430HID2\n$MSP430EZ430\n" > $SDUDEV_FILE

		# Change the permissions on the rule file
		chmod 644 $SDUDEV_FILE

        # For Redhat use the start_udev script
		RESTARTUDEV="/sbin/start_udev"

		# For others use "System V" service command
		if [ ! -e ${RESTARTUDEV} ]; then
			RESTARTUDEV="service udev restart"
		fi
        
		${RESTARTUDEV}
		if [ $? -ne 0 ]; then
			echo "ERROR: failed to restart udev, reboot required"
			exit 1
		fi
        
	fi

fi

exit 0
