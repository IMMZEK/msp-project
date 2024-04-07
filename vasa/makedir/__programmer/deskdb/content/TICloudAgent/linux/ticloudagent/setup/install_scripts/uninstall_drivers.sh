#!/bin/bash

SCRIPTPATH=$(dirname $0)

if [ -f ${SCRIPTPATH}/ti_xds100_linux_install.sh ]; then

	${SCRIPTPATH}/ti_xds100_linux_install.sh --uninstall

fi


if [ -f ${SCRIPTPATH}/msp430uif_install.sh ]; then

	${SCRIPTPATH}/msp430uif_install.sh --uninstall

fi




