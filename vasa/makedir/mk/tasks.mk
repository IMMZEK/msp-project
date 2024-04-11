#################################################################
# Default Target
#################################################################
all: CPUx_build_dir CPUx_objects CPUx_out hex

#################################################################
# mkdir
#################################################################
CPUx_build_dir:
	@mkdir -p $(CPUx_BUILD_DIR)

#################################################################
# Object Files Target
#################################################################
CPUx_objects: $(CPUx_BUILD_DIR)/F2837xD_CodeStartBranch.obj $(CPUx_BUILD_DIR)/device.obj $(CPUx_BUILD_DIR)/main.obj

$(CPUx_BUILD_DIR)/%.obj: makedir/__device/%.asm | CPUx_build_dir
	@echo 'Building file: "$<"'
	@echo 'Invoking: C2000 Compiler'
	"$(COMPILER)" $(COMMON_FLAGS) $(CPUx_DEFINES) \
	--obj_directory="$(CPUx_BUILD_DIR)" \
	"$<"
	@echo 'Finished building: "$<"'

$(CPUx_BUILD_DIR)/%.obj: makedir/__device/%.c | CPUx_build_dir
	@echo 'Building file: "$<"'
	@echo 'Invoking: C2000 Compiler'
	"$(COMPILER)" $(COMMON_FLAGS) $(CPUx_DEFINES) $(COMMON_INCLUDES) \
	--preproc_with_compile \
	--preproc_dependency="$(CPUx_BUILD_DIR)/$(basename $(<F)).d_raw" \
	--obj_directory="$(CPUx_BUILD_DIR)" \
	"$<"
	@echo 'Finished building: "$<"'

$(CPUx_BUILD_DIR)/%.obj: $(CPUx_SRC)/%.cc | CPUx_build_dir
	@echo 'Building file: "$<"'
	@echo 'Invoking: C2000 Compiler'
	"$(COMPILER)" $(COMMON_FLAGS) $(CPUx_DEFINES) $(COMMON_INCLUDES) \
	--preproc_with_compile \
	--preproc_dependency="$(CPUx_BUILD_DIR)/$(basename $(<F)).d_raw" \
	--obj_directory="$(CPUx_BUILD_DIR)" \
	"$<"
	@echo 'Finished building: "$<"'

#################################################################
# Linking
#################################################################
CPUx_out: $(CPUx_BUILD_DIR)/$(PROJ_NAME).out

$(CPUx_BUILD_DIR)/$(PROJ_NAME).out: $(CPUx_LINKER_OBJS) | CPUx_build_dir
	@echo 'Building target: "$@"'
	@echo 'Invoking: C2000 Linker'
	"$(COMPILER)" $(COMMON_FLAGS) $(COMMON_DEFINES) \
	-z \
	-m"$(CPUx_BUILD_DIR)/$(PROJ_NAME).map" \
	--stack_size=0x100 \
	--warn_sections \
	-i"$(COMPILER_ROOT)/lib" \
	-i"$(COMPILER_ROOT)/include" \
	--reread_libs \
	--xml_link_info="$(CPUx_BUILD_DIR)/$(PROJ_NAME)_linkInfo.xml" \
	--entry_point=code_start \
	--rom_model \
	-o "$@" \
	$(CPUx_LINKER_OBJS) $(LIBS)
	@echo 'Finished building target: "$@"'

#################################################################
# Hex and Flash
#################################################################
hex:
	@echo 'Hexing target: "$(CPUx_BUILD_DIR)/$(PROJ_NAME).out"'
	"$(HEX_UTIL)" "$(CPUx_BUILD_DIR)/$(PROJ_NAME).out" -boot -sci8 -a -o "$(CPUx_BUILD_DIR)/$(PROJ_NAME).txt"
	@echo 'Finished hexing.'

.PHONY: all CPUx_build_dir CPUx_objects CPUx_out hex

