#################################################################
# paths
#################################################################
MAKEDIR ?= makedir
COMPILER_ROOT := $(MAKEDIR)/__compiler/ti-cgt-c2000_22.6.1.LTS
DEVICE_ROOT := $(MAKEDIR)/__device
DRIVERLIB_ROOT := $(DEVICE_ROOT)/driverlib
CMD_ROOT := $(MAKEDIR)/__cmd
DRIVERLIB := $(DRIVERLIB_ROOT)/ccs/Release/driverlib.lib
PROJ_NAME := vasa
BUILD_DIR := build

#################################################################
# compiler
#################################################################
COMPILER := $(COMPILER_ROOT)/bin/cl2000
HEX_UTIL := $(COMPILER_ROOT)/bin/hex2000
PROGRAMMER := $(MAKEDIR)/__programmer/dslite.sh
PROGRAMMER_CCXML := makedir/__ccxml/f28379d.ccxml

#################################################################
# flags
#################################################################
COMMON_FLAGS := \
		-v28 \
		-ml \
		-mt \
		--cla_support=cla1 \
		--float_support=fpu32 \
		--tmu_support=tmu0 \
		--vcu_support=vcu2 \
		-Ooff \
		--diag_suppress=10063 \
		--diag_warning=225 \
		--diag_wrap=off \
		--display_error_number \
		--abi=eabi

#################################################################
# defines
#################################################################
COMMON_DEFINES := --define=_FLASH

#################################################################
# includes
#################################################################
COMMON_INCLUDES := \
		--include_path="$(DEVICE_ROOT)" \
		--include_path="$(DRIVERLIB_ROOT)" \
		--include_path="$(COMPILER_ROOT)/include"

#################################################################
# libs
#################################################################
LIBS := \
		$(DRIVERLIB) \
		-llibc.a
