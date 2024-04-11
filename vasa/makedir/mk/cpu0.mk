#################################################################
# includes
#################################################################
-include $(MK_DIR)/common.mk

#################################################################
# paths
#################################################################
CPUx_BUILD_DIR := $(BUILD_DIR)/cpu0
CPUx_SRC := cpu0

#################################################################
# options
#################################################################
CPUx_DEFINES := \
		--define=CPU1 \
		$(COMMON_DEFINES)

CPUx_SRC_C_OBJS := $(patsubst $(CPUx_SRC)/%.cc,$(CPUx_BUILD_DIR)/%.obj,$(wildcard $(CPUx_SRC)/*.cc))
CPUx_OBJS := \
		$(CPUx_BUILD_DIR)/F2837xD_CodeStartBranch.obj \
		$(CPUx_BUILD_DIR)/device.obj \
		$(CPUx_SRC_C_OBJS)
CPUx_LINKER_OBJS := \
		$(CMD_ROOT)/2837xD_FLASH_lnk_cpu0.cmd \
		$(CPUx_OBJS)

#################################################################
# this needs to be after the CPUx_ things have been declared
#################################################################
-include $(MK_DIR)/tasks.mk

clean_cpu0:
		@$(RM) -r $(CPUx_BUILD_DIR)
