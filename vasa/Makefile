MAKEDIR := makedir
MK_DIR := $(MAKEDIR)/mk

CPU_CORE ?= 0
-include $(MK_DIR)/cpu$(CPU_CORE).mk

clean:
		@$(RM) -r $(BUILD_DIR)
		@echo 'All clean'
