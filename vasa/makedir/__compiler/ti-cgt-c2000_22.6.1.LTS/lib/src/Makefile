##############################################################################
#
#
# Makefile for C2000 run-time support library version 22.6.1
#
#
##############################################################################
#
# This Makefile is automatically-generated: you usually should not edit it. 
#
##############################################################################


##############################################################################
#
# This Makefile is specific to compiler RTS library version 22.6.1.  
# The format is subject to change without notice.  This Makefile is intended
# for use with mklib, which understands which 'make' variables to set to build
# each distinct version of the RTS library.
#
# This Makefile uses GNU make language extensions.
#
##############################################################################

##############################################################################
#
# GROUPS
#
# The source files are set up in a modular fashion using "groups."  Groups
# represent major feature clusters, and usually specify source files which
# implement that feature.  When building a library which needs a particular
# feature, the group which represents that feature is "activated" by setting a
# 'make' variable.  This variable can be set directly by the user, or may be
# inferred from the setting of other variables.  Groups (and the files they
# contain) not needed for a certain library are not activated.  Some groups
# are always activated.  Groups which are not always activated are enclosed in
# an "ifeq" testing the corresponding 'make' variable (the name of the
# variable is the name of the group).
#
# Groups can specify any kind of source file (e.g. C, C++, assembly), but do
# not list header files, or source files included from other source files.
# This Makefile is focused on how to build the object files, not listing all
# of the necessary files.  Some groups do not list any source files; these
# groups may still carry information such as extra options to use when that
# group is active, or may activate other groups.  Some groups exist only to be
# tested as part of the activation condition of other groups.
#
# Groups can specify extra compiler options to use when that group is active.
# These can be options intended for all targets (UNIVERSAL_FLAGS), such as the
# CPU version, or can be intended only for a certain type of files (CPP_FLAGS)
# (e.g. the option "--exceptions")
#
##############################################################################

##############################################################################
#
# OPTIONS
#
# You can append or override some options through 'make' variables specified
# on the command line.  Not all options can be changed this way, and some
# options are dangerous to use in a Makefile (e.g. "--skip_assembler").
# Options added by groups below should not be altered; if the option is
# undesired, you're probably building the wrong library.  For example, if you
# don't want "--exceptions", you shouldn't be using EXCEPTIONS=1.
#
# You can append options to the standard list by using EXTRA_FLAGS.  This is
# useful for enabling debugging support or activating silicon errata
# workarounds:
#
# gmake LIB=some.lib EXTRA_FLAGS="-g"
#
##############################################################################

##############################################################################
# Available libraries
#
# You can build each 22.6.1 library using the appropriate command:
#
# gmake library LIB=rts2800_fpu32.lib FPU32=1 DOUBLE_DIV_NOFPU64=1
# gmake library LIB=rts2800_fpu32_eabi.lib DOUBLE_DIV_NOFPU64=1 IDIV=1 GENERIC_MATH_COMMON_32BIT=1 EABI=1 GENERIC_MATH_COMMON_DOUBLE=1 C28EABI=1 GENERIC_MATH_COMMON_FLOAT=1 CLA_MATH=1 GENERIC_MATH_COMMON_64BIT=1 GENERIC_MATH_COMMON=1 FPU32=1
# gmake library LIB=rts2800_fpu32_eabi_eh.lib C28EABI=1 GENERIC_MATH_COMMON_FLOAT=1 CLA_MATH=1 GENERIC_MATH_COMMON_DOUBLE=1 EXCEPTIONS=1 EABI=1 FPU32=1 GENERIC_MATH_COMMON=1 GENERIC_MATH_COMMON_64BIT=1 DOUBLE_DIV_NOFPU64=1 IDIV=1 EABI_TDEH=1 GENERIC_MATH_COMMON_32BIT=1
# gmake library LIB=rts2800_fpu32_eh.lib FULL_PORTABLE_EH=1 DOUBLE_DIV_NOFPU64=1 EXCEPTIONS=1 FPU32=1
# gmake library LIB=rts2800_fpu64_eabi.lib GENERIC_MATH_COMMON_32BIT=1 FPU64=1 IDIV=1 GENERIC_MATH_COMMON_64BIT=1 GENERIC_MATH_COMMON=1 EABI=1 GENERIC_MATH_COMMON_DOUBLE=1 C28EABI=1 GENERIC_MATH_COMMON_FLOAT=1 CLA_MATH=1
# gmake library LIB=rts2800_fpu64_eabi_eh.lib IDIV=1 EABI_TDEH=1 FPU64=1 GENERIC_MATH_COMMON_32BIT=1 EABI=1 GENERIC_MATH_COMMON_FLOAT=1 CLA_MATH=1 C28EABI=1 EXCEPTIONS=1 GENERIC_MATH_COMMON_DOUBLE=1 GENERIC_MATH_COMMON_64BIT=1 GENERIC_MATH_COMMON=1
# gmake library LIB=rts2800_ml.lib LARGE=1 DOUBLE_DIV_NOFPU64=1
# gmake library LIB=rts2800_ml_eabi.lib GENERIC_MATH_COMMON_32BIT=1 DOUBLE_DIV_NOFPU64=1 GENERIC_MATH_COMMON=1 GENERIC_MATH_COMMON_64BIT=1 LARGE=1 GENERIC_MATH_COMMON_FLOAT=1 CLA_MATH=1 C28EABI=1 GENERIC_MATH_COMMON_DOUBLE=1 EABI=1
# gmake library LIB=rts2800_ml_eabi_eh.lib EABI_TDEH=1 GENERIC_MATH_COMMON_32BIT=1 DOUBLE_DIV_NOFPU64=1 GENERIC_MATH_COMMON=1 GENERIC_MATH_COMMON_64BIT=1 LARGE=1 CLA_MATH=1 GENERIC_MATH_COMMON_FLOAT=1 C28EABI=1 EXCEPTIONS=1 GENERIC_MATH_COMMON_DOUBLE=1 EABI=1
# gmake library LIB=rts2800_ml_eh.lib FULL_PORTABLE_EH=1 DOUBLE_DIV_NOFPU64=1 EXCEPTIONS=1 LARGE=1
##############################################################################

ifdef CMD_FILE
 -include $(CMD_FILE)
endif
#-----------------------------------------------------------------------------
# Basic definitions
#-----------------------------------------------------------------------------
ifeq (y,$(shell [ -e $(CGT_BIN)/cl2000 ] && echo y))
  CC = $(CGT_BIN)/cl2000
else
  CC = cl2000
endif
ifeq (y,$(shell [ -e $(CGT_BIN)/ar2000 ] && echo y))
  AR = $(CGT_BIN)/ar2000
else
  AR = ar2000
endif
CD = cd

#-----------------------------------------------------------------------------
# Group TARGET
#-----------------------------------------------------------------------------
UNIVERSAL_FLAGS += --cla_support=cla0
TARGET_CLA_FLAGS += --advice:performance=none --cla_signed_compare_workaround=on

TARGET_ASM_SOURCE = \
	IQ28.asm \
	IQxmpy28.asm \
	abstract28.asm \
	boot28.asm \
	epilog28.asm \
	fd_add28.asm \
	fd_cmp28.asm \
	fd_mpy28.asm \
	fd_neg28.asm \
	fd_sub28.asm \
	fd_toi28.asm \
	fd_tol28.asm \
	fd_toll28.asm \
	fd_tou28.asm \
	fd_toul28.asm \
	fd_toull28.asm \
	fs_add28.asm \
	fs_cmp28.asm \
	fs_div28.asm \
	fs_mpy28.asm \
	fs_neg28.asm \
	fs_toi28.asm \
	fs_tol28.asm \
	fs_tou28.asm \
	fs_toul28.asm \
	ll_abs28.asm \
	ll_aox28.asm \
	ll_cmp28.asm \
	ll_div28.asm \
	ll_mpy28.asm \
	ll_tofd28.asm \
	ull_tofd28.asm \
	i_tofd28.asm \
	i_div28.asm \
	i_tofs28.asm \
	u_div28.asm \
	u_tofd28.asm \
	u_tofs28.asm \
	l_tofd28.asm \
	l_tofs28.asm \
	l_div28.asm \
	ul_tofd28.asm \
	ul_tofs28.asm \
	prolog28.asm

ASM_SOURCE += $(TARGET_ASM_SOURCE)


TARGET_CLA_SOURCE = \
	cla_divi.cla \
	cla_divu.cla \
	cla_remi.cla \
	cla_remu.cla \
	cla_memset.cla

TARGET_C_SOURCE = \
	cpy_tbl.c \
	memcpy.c \
	abs.c \
	strspn.c \
	pre_init.c \
	startup.c \
	autoinit.c \
	copy_zero_init.c \
	copy_decompress_none.c \
	copy_decompress_lzss.c \
	copy_decompress_rle.c \
	pprof_cio.c \
	pprof_user.c \
	outprof.c

C_SOURCE += $(TARGET_C_SOURCE)


#-----------------------------------------------------------------------------
# Group TSPA_CPP_FULL
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group CLA_MATH
#-----------------------------------------------------------------------------
ifeq ($(CLA_MATH),1)
GENERIC_MATH_COMMON_FLOAT=1
GENERIC_MATH_COMMON_DOUBLE=1
GENERIC_MATH_COMMON_32BIT=1
GENERIC_MATH_COMMON_64BIT=1
CLA_MATH_CLA_FLAGS += --cla_signed_compare_workaround=on
CLA_MATH_FLAGS += --advice:performance=none
CLA_MATH_C_FLAGS += --cla_default --cla_signed_compare_workaround=on

CLA_MATH_CLA_SOURCE = \
	addd.cla \
	divd.cla \
	neqld.cla \
	mpyd.cla \
	negd.cla \
	subd.cla \
	absd.cla \
	cvtfd.cla \
	fixdi.cla \
	fixdlli.cla \
	fixdu.cla \
	fixdull.cla \
	fltid.cla \
	fltllid.cla \
	fltud.cla \
	fltulld.cla \
	cmpd.cla \
	eqld.cla \
	ged.cla \
	gtd.cla \
	led.cla \
	ltd.cla \
	frcaddd.cla \
	frcdivd.cla \
	frcmpyd.cla \
	frcmpyd_div.cla \
	renormd.cla \
	cvtdf.cla \
	fixflli.cla \
	fixfull.cla \
	fltllif.cla \
	fltullf.cla

CLA_MATH_C_SOURCE = \
	addll.c \
	mpyll.c \
	divlli.c \
	divull.c \
	remlli.c \
	remull.c \
	asrll.c \
	lslll.c \
	lsrll.c \
	abslli.c \
	cmplli.c
endif


#-----------------------------------------------------------------------------
# Group GENERIC_MATH_COMMON_32BIT
#-----------------------------------------------------------------------------
ifeq ($(GENERIC_MATH_COMMON_32BIT),1)
GENERIC_MATH_COMMON=1
endif


#-----------------------------------------------------------------------------
# Group EDG_GENERIC_C
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group GENERIC_MATH_COMMON_64BIT
#-----------------------------------------------------------------------------
ifeq ($(GENERIC_MATH_COMMON_64BIT),1)
GENERIC_MATH_COMMON=1
endif


#-----------------------------------------------------------------------------
# Group GENERIC_MATH_COMMON_FLOAT
#-----------------------------------------------------------------------------
ifeq ($(GENERIC_MATH_COMMON_FLOAT),1)
GENERIC_MATH_COMMON=1
endif


#-----------------------------------------------------------------------------
# Group FULL_WCHAR
#-----------------------------------------------------------------------------
FULL_WCHAR_FLAGS += -DSTRIP_FBSDID -D_XOPEN_SOURCE=700 --diag_suppress=188

FULL_WCHAR_C_SOURCE = \
	wcstof.c \
	wcstod.c \
	wcstold.c \
	wcstol.c \
	wcstoul.c \
	wcstoll.c \
	wcstoull.c \
	wcstoimax.c \
	wcstoumax.c \
	wcsftime.c \
	fwprintf.c \
	fwscanf.c \
	swprintf.c \
	swscanf.c \
	vwprintf.c \
	vwscanf.c \
	wprintf.c \
	wscanf.c \
	wcscat.c \
	wcschr.c \
	wcscmp.c \
	wcscpy.c \
	wcscspn.c \
	wcsdup.c \
	wcslen.c \
	wcsncat.c \
	wcsncmp.c \
	wcsncpy.c \
	wcspbrk.c \
	wcsrchr.c \
	wcsspn.c \
	wcsstr.c \
	wcstok.c \
	wmemchr.c \
	wmemcpy.c \
	wmemcmp.c \
	wmemmove.c \
	wmemset.c \
	none_mb.c \
	fgetwc.c \
	fgetws.c \
	fputws.c \
	vfwprintf.c \
	vfwscanf.c \
	vswprintf.c \
	vswscanf.c \
	wcscoll.c \
	wcsxfrm.c

#-----------------------------------------------------------------------------
# Group GENERIC_MATH_COMMON_DOUBLE
#-----------------------------------------------------------------------------
ifeq ($(GENERIC_MATH_COMMON_DOUBLE),1)
GENERIC_MATH_COMMON=1
endif


#-----------------------------------------------------------------------------
# Group FREEBSD_MATH
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group XLOCALE
#-----------------------------------------------------------------------------
XLOCALE_FLAGS += -DSTRIP_FBSDID -D_XOPEN_SOURCE=700 --diag_suppress=188

XLOCALE_C_SOURCE = \
	xlocale.c \
	locale_inttypes.c \
	locale_stdio.c \
	locale_stdlib.c \
	locale_string.c \
	locale_strings.c \
	locale_time.c \
	locale_wchar.c

#-----------------------------------------------------------------------------
# Group GENERIC_C
#-----------------------------------------------------------------------------

GENERIC_C_C_SOURCE = \
	exit.c \
	_data_synch.c \
	_lock.c \
	_ltoa.c \
	_mutex.c \
	_pthread.c \
	args_main.c \
	asctime.c \
	assert.c \
	atof.c \
	atoi.c \
	atol.c \
	atoll.c \
	bcmp.c \
	bcopy.c \
	bsearch.c \
	bzero.c \
	clearerr.c \
	common_exit.c \
	ctime_.c \
	ctime64.c \
	ctype.c \
	defs.c \
	difftime.c \
	difftime64.c \
	ecvt.c \
	fcvt.c \
	ffs.c \
	gmtime.c \
	gmtime64.c \
	index.c \
	isalnum.c \
	isalpha.c \
	isascii.c \
	iscntrl.c \
	isdigit.c \
	isgraph.c \
	islower.c \
	isprint.c \
	ispunct.c \
	isspace.c \
	isupper.c \
	isxdigit.c \
	localtim.c \
	localtim64.c \
	ltoa.c \
	memccpy.c \
	memchr.c \
	memcmp.c \
	memmov.c \
	memory.c \
	memset.c \
	mktime.c \
	mktime64.c \
	perror.c \
	qsort.c \
	quick_exit.c \
	rand.c \
	rewind.c \
	rindex.c \
	setlocale.c \
	strcasecmp.c \
	strcat.c \
	strchr.c \
	strcmp.c \
	strcoll.c \
	strcpy.c \
	strcspn.c \
	strdup.c \
	strerror.c \
	strftime.c \
	strlen.c \
	strncasecmp.c \
	strncat.c \
	strncmp.c \
	strncpy.c \
	strpbrk.c \
	strrchr.c \
	strstr.c \
	strtod.c \
	strtof.c \
	strtok.c \
	strtol.c \
	strtold.c \
	strtoll.c \
	strtoul.c \
	strtoull.c \
	strtoimax.c \
	strtoumax.c \
	strxfrm.c \
	tmpfile.c \
	tmpnam.c \
	tmzone.c \
	toascii.c \
	tolower.c \
	toupper.c \
	wctype.c \
	signal.c

C_SOURCE += $(GENERIC_C_C_SOURCE)


#-----------------------------------------------------------------------------
# Group STLPORT_CPP
#-----------------------------------------------------------------------------

STLPORT_CPP_CPP_SOURCE = \
	stlport/allocators.cpp \
	stlport/bitset.cpp \
	stlport/complex.cpp \
	stlport/complex_io.cpp \
	stlport/complex_trig.cpp \
	stlport/_ctype.cpp \
	stlport/dll_main.cpp \
	stlport/istream.cpp \
	stlport/ostream.cpp \
	stlport/sstream.cpp \
	stlport/string.cpp

CPP_SOURCE += $(STLPORT_CPP_CPP_SOURCE)


#-----------------------------------------------------------------------------
# Group FPU32
#-----------------------------------------------------------------------------
ifeq ($(FPU32),1)
DOUBLE_DIV_NOFPU64=1
UNIVERSAL_FLAGS += --float_support=fpu32 --advice:performance=none 

FPU32_ASM_SOURCE = \
	fs_tofdfpu32.asm \
	fs_tollfpu32.asm \
	fs_toullfpu32.asm \
	fd_tofsfpu32.asm \
	ll_tofsfpu32.asm \
	ull_tofsfpu32.asm \
	setjmpfpu32.asm

ASM_SOURCE += $(FPU32_ASM_SOURCE)

endif


#-----------------------------------------------------------------------------
# Group FREEBSD_MATH_COMMON
#-----------------------------------------------------------------------------

FREEBSD_MATH_COMMON_C_SOURCE = \
	e_rem_pio2.c \
	e_rem_pio2f.c \
	k_rem_pio2.c

C_SOURCE += $(FREEBSD_MATH_COMMON_C_SOURCE)


#-----------------------------------------------------------------------------
# Group GENERIC_MATH_COMMON
#-----------------------------------------------------------------------------
ifeq ($(GENERIC_MATH_COMMON),1)
GENERIC_MATH_LIBRARY_INTEGER=1
CLASSIC_MATH_LIBRARY_INTEGER=1
CLASSIC_CPP_MATH_OVERLOADS=1
CLASSIC_ERRNO=1
endif


#-----------------------------------------------------------------------------
# Group LARGE
#-----------------------------------------------------------------------------
ifeq ($(LARGE),1)
DOUBLE_DIV_NOFPU64=1
UNIVERSAL_FLAGS += -ml

LARGE_ASM_SOURCE = \
	fs_tofd28.asm \
	fs_toll28.asm \
	fs_toull28.asm \
	fd_tofs28.asm \
	ll_tofs28.asm \
	ull_tofs28.asm \
	setjmp28.asm

ASM_SOURCE += $(LARGE_ASM_SOURCE)

endif


#-----------------------------------------------------------------------------
# Group C28EABI
#-----------------------------------------------------------------------------
ifeq ($(C28EABI),1)
EABI=1
UNIVERSAL_FLAGS += --abi=eabi

C28EABI_CPP_SOURCE = \
	tdeh_pr_c28x.cpp

CPP_SOURCE += $(C28EABI_CPP_SOURCE)


C28EABI_ASM_SOURCE = \
	tdeh_uwentry_c28x.asm

ASM_SOURCE += $(C28EABI_ASM_SOURCE)

endif


#-----------------------------------------------------------------------------
# Group EXCEPTIONS
#-----------------------------------------------------------------------------
ifeq ($(EXCEPTIONS),1)
CPP_FLAGS += --exceptions
endif


#-----------------------------------------------------------------------------
# Group FREEBSD_C99_COMPLEX
#-----------------------------------------------------------------------------
FREEBSD_C99_COMPLEX_C_FLAGS += --c99

#-----------------------------------------------------------------------------
# Group FREEBSD_MACHINE
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group STLPORT_LOCALE
#-----------------------------------------------------------------------------
STLPORT_LOCALE_CPP_FLAGS += -O3 --inline_recursion_limit=12

STLPORT_LOCALE_CPP_SOURCE = \
	stlport/unified_locale.cpp

#-----------------------------------------------------------------------------
# Group EABI_TDEH
#-----------------------------------------------------------------------------
ifeq ($(C28EABI),1)
ifeq ($(EXCEPTIONS),1)
EABI_TDEH=1
endif
endif

ifeq ($(EABI_TDEH),1)
UNIVERSAL_FLAGS += -D__TI_TABLE_DRIVEN_EXCEPTIONS
CPP_FLAGS += --extern_c_can_throw
EABI_TDEH_CPP_FLAGS += --building_runtime -DCHECKING=0

EABI_TDEH_CPP_SOURCE = \
	tdeh_unwinder.cpp \
	tdeh_cpp_abi.cpp \
	tdeh_pr_common.cpp \
	tdeh_init.cpp
endif


#-----------------------------------------------------------------------------
# Group FPU64
#-----------------------------------------------------------------------------
ifeq ($(FPU64),1)
UNIVERSAL_FLAGS += --float_support=fpu64

FPU64_ASM_SOURCE = \
	setjmpfpu64.asm \
	fd_div28_fpu64.asm

ASM_SOURCE += $(FPU64_ASM_SOURCE)

endif


#-----------------------------------------------------------------------------
# Group EDG_CPP_SUPPLEMENTAL
#-----------------------------------------------------------------------------
EDG_CPP_SUPPLEMENTAL_CPP_FLAGS += --building_runtime -DCHECKING=0

EDG_CPP_SUPPLEMENTAL_CPP_SOURCE = \
	exception.c \
	bad_alloc.c

#-----------------------------------------------------------------------------
# Group XLOCALE_HEADERS
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group DOUBLE_DIV_NOFPU64
#-----------------------------------------------------------------------------
ifeq ($(DOUBLE_DIV_NOFPU64),1)

DOUBLE_DIV_NOFPU64_ASM_SOURCE = \
	fd_div28.asm

ASM_SOURCE += $(DOUBLE_DIV_NOFPU64_ASM_SOURCE)

endif


#-----------------------------------------------------------------------------
# Group FULL_PORTABLE_EH
#-----------------------------------------------------------------------------
ifneq ($(C28EABI),1)
ifeq ($(EXCEPTIONS),1)
FULL_PORTABLE_EH=1
endif
endif

ifeq ($(FULL_PORTABLE_EH),1)
FULL_PORTABLE_EH_CPP_FLAGS += --building_runtime -DCHECKING=0

FULL_PORTABLE_EH_CPP_SOURCE = \
	eh_util.c \
	throw.c
endif


#-----------------------------------------------------------------------------
# Group FREEBSD_FENV
#-----------------------------------------------------------------------------

FREEBSD_FENV_C_SOURCE = \
	fenv.c

C_SOURCE += $(FREEBSD_FENV_C_SOURCE)


#-----------------------------------------------------------------------------
# Group IDIV
#-----------------------------------------------------------------------------
ifeq ($(IDIV),1)
IDIV_ASM_FLAGS += --idiv_support=idiv0

IDIV_ASM_SOURCE = \
	traditional_div_i16byi16.asm \
	traditional_div_u16byu16.asm \
	euclidean_div_i16byi16.asm \
	modulo_div_i16byi16.asm \
	traditional_div_i32byi32.asm \
	traditional_div_u32byu32.asm \
	traditional_div_i32byu32.asm \
	euclidean_div_i32byi32.asm \
	euclidean_div_i32byu32.asm \
	modulo_div_i32byi32.asm \
	modulo_div_i32byu32.asm \
	traditional_div_i32byi16.asm \
	traditional_div_u32byu16.asm \
	euclidean_div_i32byi16.asm \
	modulo_div_i32byi16.asm \
	traditional_div_i64byi64.asm \
	traditional_div_u64byu64.asm \
	traditional_div_i64byu64.asm \
	euclidean_div_i64byi64.asm \
	euclidean_div_i64byu64.asm \
	modulo_div_i64byi64.asm \
	modulo_div_i64byu64.asm \
	traditional_div_i64byi32.asm \
	traditional_div_u64byu32.asm \
	traditional_div_i64byu32.asm \
	euclidean_div_i64byi32.asm \
	euclidean_div_i64byu32.asm \
	modulo_div_i64byi32.asm \
	modulo_div_i64byu32.asm
endif


#-----------------------------------------------------------------------------
# Group EDG_C99_COMPLEX_HELPER
#-----------------------------------------------------------------------------
EDG_C99_COMPLEX_HELPER_CPP_FLAGS += --building_runtime -DCHECKING=0

EDG_C99_COMPLEX_HELPER_CPP_SOURCE = \
	c99_complex.c

#-----------------------------------------------------------------------------
# Group FREEBSD_MATH_TI_SUPPLEMENT
#-----------------------------------------------------------------------------
FREEBSD_MATH_TI_SUPPLEMENT_C_FLAGS += --c99

FREEBSD_MATH_TI_SUPPLEMENT_C_SOURCE = \
	ti_fenv.c \
	ti_fmax.c \
	ti_nan.c

#-----------------------------------------------------------------------------
# Group GENERIC_C_SIZE_OPTIMIZED
#-----------------------------------------------------------------------------
GENERIC_C_SIZE_OPTIMIZED_FLAGS += 

GENERIC_C_SIZE_OPTIMIZED_C_SOURCE = \
	printf.c \
	fprintf.c \
	_printfi.c \
	_printfi_template.c \
	_printfi_vector.c \
	snprintf.c \
	sprintf.c \
	vfprintf.c \
	vprintf.c \
	vsnprintf.c \
	vsprintf.c \
	_scanfi.c \
	_scanfi_min.c \
	_scanfi_nf.c \
	fscanf.c \
	sscanf.c \
	fclose.c \
	feof.c \
	ferror.c \
	fflush.c \
	fgetc.c \
	fgetpos.c \
	fgets.c \
	fopen.c \
	fputc.c \
	fputs.c \
	fread.c \
	fseek.c \
	fsetpos.c \
	ftell.c \
	fwrite.c \
	_bufread.c \
	_io_perm.c \
	getenv.c \
	getdevice.c \
	setbuf.c \
	setvbuf.c \
	ungetc.c

#-----------------------------------------------------------------------------
# Group GENERIC_MATH_LIBRARY_INTEGER
#-----------------------------------------------------------------------------

GENERIC_MATH_LIBRARY_INTEGER_C_SOURCE = \
	div.c \
	ldiv.c \
	lldiv.c

C_SOURCE += $(GENERIC_MATH_LIBRARY_INTEGER_C_SOURCE)


#-----------------------------------------------------------------------------
# Group FREEBSD_MATH_64_BIT
#-----------------------------------------------------------------------------
FREEBSD_MATH_64_BIT_C_FLAGS += --c99

FREEBSD_MATH_64_BIT_C_SOURCE = \
	b_exp.c \
	b_log.c \
	b_tgamma.c \
	e_acos.c \
	e_acosh.c \
	e_asin.c \
	e_atan2.c \
	e_atanh.c \
	e_cosh.c \
	e_exp.c \
	e_fmod.c \
	e_lgamma.c \
	e_lgamma_r.c \
	e_log.c \
	e_log10.c \
	e_log2.c \
	e_pow.c \
	e_remainder.c \
	e_sinh.c \
	e_sqrt.c \
	k_cos.c \
	k_sin.c \
	k_tan.c \
	s_asinh.c \
	s_atan.c \
	s_cbrt.c \
	s_ceil.c \
	s_cos.c \
	s_erf.c \
	s_exp2.c \
	s_expm1.c \
	s_fabs.c \
	s_floor.c \
	s_fma.c \
	s_frexp.c \
	s_ilogb.c \
	s_logb.c \
	s_modf.c \
	s_nextafter.c \
	s_remquo.c \
	s_rint.c \
	s_round.c \
	s_scalbn.c \
	s_sin.c \
	s_tan.c \
	s_tanh.c \
	s_trunc.c

#-----------------------------------------------------------------------------
# Group GENERIC_OPTIONS
#-----------------------------------------------------------------------------
ASM_FLAGS += 
CPP_FLAGS += --rtti -fg
UNIVERSAL_FLAGS += -c --ti_lib --keep_unneeded_types=false --diag_warning=225 --quiet -O4

#-----------------------------------------------------------------------------
# Group GENERIC_EDG
#-----------------------------------------------------------------------------
GENERIC_EDG_CPP_FLAGS += --building_runtime -DCHECKING=0

GENERIC_EDG_CPP_SOURCE = \
	array_del.c \
	array_new.c \
	array_nodel.c \
	array_nonew.c \
	array_pdel.c \
	array_pnew.c \
	delete.c \
	delnothrow.c \
	dtor_list.c \
	error.c \
	guard.c \
	memzero.c \
	new.c \
	newhandler.c \
	newnothrow.c \
	placedel.c \
	placenew.c \
	pure_virt.c \
	rtti.c \
	set_new.c \
	typeinfo.c \
	vars.c \
	vec_cctor.c \
	vec_newdel.c \
	vla_alloc.c

#-----------------------------------------------------------------------------
# Group OPENBSD_C99_COMPLEX
#-----------------------------------------------------------------------------
OPENBSD_C99_COMPLEX_C_FLAGS += --c99

OPENBSD_C99_COMPLEX_C_SOURCE = \
	s_clog.c \
	s_clogf.c \
	s_clogl.c \
	s_cpow.c \
	s_cpowf.c \
	s_cpowl.c

#-----------------------------------------------------------------------------
# Group CLASSIC_CPP_MATH_OVERLOADS
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group FREEBSD_SYS_HEADERS
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group GENERIC_SYS
#-----------------------------------------------------------------------------

GENERIC_SYS_C_SOURCE = \
	write.c \
	unlink.c \
	hostclock.c \
	hostclose.c \
	hostgetenv.c \
	hostlseek.c \
	hostopen.c \
	hostread.c \
	hostrename.c \
	hosttime.c \
	hostunlink.c \
	hostwrite.c \
	host_device.c \
	trgmsg.c \
	time.c \
	time64.c \
	rename.c \
	remove.c \
	remove_device.c \
	read.c \
	open.c \
	lseek.c \
	close.c \
	clock.c \
	add_device.c

C_SOURCE += $(GENERIC_SYS_C_SOURCE)


#-----------------------------------------------------------------------------
# Group FREEBSD_C99_COMPLEX_64_BIT
#-----------------------------------------------------------------------------
FREEBSD_C99_COMPLEX_64_BIT_C_FLAGS += --c99

FREEBSD_C99_COMPLEX_64_BIT_C_SOURCE = \
	catrig.c \
	k_exp.c \
	s_ccosh.c \
	s_cexp.c \
	s_csinh.c \
	s_csqrt.c \
	s_ctanh.c \
	s_log1p.c \
	e_hypot.c \
	s_copysign.c

#-----------------------------------------------------------------------------
# Group TSPA_COMPLEX_HEADERS
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group CLASSIC_MATH_LIBRARY_INTEGER
#-----------------------------------------------------------------------------

CLASSIC_MATH_LIBRARY_INTEGER_C_SOURCE = \
	labs.c \
	llabs.c \
	imaxabs.c \
	imaxdiv.c

C_SOURCE += $(CLASSIC_MATH_LIBRARY_INTEGER_C_SOURCE)


#-----------------------------------------------------------------------------
# Group CLASSIC_ERRNO
#-----------------------------------------------------------------------------

CLASSIC_ERRNO_C_SOURCE = \
	errno.c

C_SOURCE += $(CLASSIC_ERRNO_C_SOURCE)


#-----------------------------------------------------------------------------
# Group EABI
#-----------------------------------------------------------------------------
ifeq ($(EABI),1)
EABI_CPP_FLAGS += --building_runtime -DCHECKING=0

EABI_CPP_SOURCE = \
	decode.c
endif


#-----------------------------------------------------------------------------
# Group FREEBSD_MATH_32_BIT
#-----------------------------------------------------------------------------
FREEBSD_MATH_32_BIT_C_FLAGS += --c99

FREEBSD_MATH_32_BIT_C_SOURCE = \
	e_acosf.c \
	e_acoshf.c \
	e_asinf.c \
	e_atan2f.c \
	e_atanhf.c \
	e_coshf.c \
	e_expf.c \
	e_fmodf.c \
	e_lgammaf.c \
	e_lgammaf_r.c \
	e_log10f.c \
	e_log2f.c \
	e_logf.c \
	e_powf.c \
	e_remainderf.c \
	e_sinhf.c \
	e_sqrtf.c \
	k_cosf.c \
	k_sinf.c \
	k_tanf.c \
	s_asinhf.c \
	s_atanf.c \
	s_cbrtf.c \
	s_ceilf.c \
	s_cosf.c \
	s_erff.c \
	s_exp2f.c \
	s_expm1f.c \
	s_fabsf.c \
	s_fdim.c \
	s_floorf.c \
	s_fmaf.c \
	s_frexpf.c \
	s_ilogbf.c \
	s_logbf.c \
	s_llrint.c \
	s_llrintf.c \
	s_llrintl.c \
	s_llround.c \
	s_llroundf.c \
	s_llroundl.c \
	s_lrint.c \
	s_lrintf.c \
	s_lrintl.c \
	s_lround.c \
	s_lroundf.c \
	s_lroundl.c \
	s_modff.c \
	s_nearbyint.c \
	s_nextafterf.c \
	s_nexttowardf.c \
	s_remquof.c \
	s_rintf.c \
	s_roundf.c \
	s_scalbln.c \
	s_scalbnf.c \
	s_sinf.c \
	s_tanf.c \
	s_tanhf.c \
	s_tgammaf.c \
	s_truncf.c

#-----------------------------------------------------------------------------
# Group FREEBSD_C99_COMPLEX_COMMON
#-----------------------------------------------------------------------------

#-----------------------------------------------------------------------------
# Group FREEBSD_C99_COMPLEX_32_BIT
#-----------------------------------------------------------------------------
FREEBSD_C99_COMPLEX_32_BIT_C_FLAGS += --c99

FREEBSD_C99_COMPLEX_32_BIT_C_SOURCE = \
	catrigf.c \
	k_expf.c \
	s_carg.c \
	s_cargf.c \
	s_cargl.c \
	s_ccoshf.c \
	s_cexpf.c \
	s_cimag.c \
	s_cimagf.c \
	s_cimagl.c \
	s_conj.c \
	s_conjf.c \
	s_conjl.c \
	s_cproj.c \
	s_cprojf.c \
	s_cprojl.c \
	s_creal.c \
	s_crealf.c \
	s_creall.c \
	s_csinhf.c \
	s_csqrtf.c \
	s_ctanhf.c \
	w_cabs.c \
	w_cabsf.c \
	w_cabsl.c \
	s_log1pf.c \
	e_hypotf.c \
	s_copysignf.c

#-----------------------------------------------------------------------------
# Group C2800
#-----------------------------------------------------------------------------
UNIVERSAL_FLAGS += -v28


FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1 = $(patsubst %.c,$(OBJ)/%.c.obj,$(FREEBSD_C99_COMPLEX_32_BIT_C_SOURCE))
$(FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(FREEBSD_C99_COMPLEX_32_BIT_FLAGS) $(C_FLAGS) $(FREEBSD_C99_COMPLEX_32_BIT_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

FREEBSD_MATH_32_BIT_C_OBJS_2 = $(patsubst %.c,$(OBJ)/%.c.obj,$(FREEBSD_MATH_32_BIT_C_SOURCE))
$(FREEBSD_MATH_32_BIT_C_OBJS_2): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(FREEBSD_MATH_32_BIT_FLAGS) $(C_FLAGS) $(FREEBSD_MATH_32_BIT_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

EABI_CPP_OBJS_3 = $(patsubst %.c,$(OBJ)/%.c.obj,$(EABI_CPP_SOURCE))
$(EABI_CPP_OBJS_3): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(EABI_FLAGS) $(CPP_FLAGS) $(EABI_CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

FULL_WCHAR_C_OBJS_4 = $(patsubst %.c,$(OBJ)/%.c.obj,$(FULL_WCHAR_C_SOURCE))
$(FULL_WCHAR_C_OBJS_4): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(FULL_WCHAR_FLAGS) $(C_FLAGS) $(FULL_WCHAR_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

CLA_MATH_CLA_OBJS_5 = $(patsubst %.cla,$(OBJ)/%.cla.obj,$(CLA_MATH_CLA_SOURCE))
$(CLA_MATH_CLA_OBJS_5): $(OBJ)/%.cla.obj: %.cla
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(CLA_MATH_FLAGS) $(C_FLAGS) $(CLA_MATH_CLA_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

CLA_MATH_C_OBJS_6 = $(patsubst %.c,$(OBJ)/%.c.obj,$(CLA_MATH_C_SOURCE))
$(CLA_MATH_C_OBJS_6): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(CLA_MATH_FLAGS) $(C_FLAGS) $(CLA_MATH_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7 = $(patsubst %.c,$(OBJ)/%.c.obj,$(FREEBSD_C99_COMPLEX_64_BIT_C_SOURCE))
$(FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(FREEBSD_C99_COMPLEX_64_BIT_FLAGS) $(C_FLAGS) $(FREEBSD_C99_COMPLEX_64_BIT_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

OPENBSD_C99_COMPLEX_C_OBJS_8 = $(patsubst %.c,$(OBJ)/%.c.obj,$(OPENBSD_C99_COMPLEX_C_SOURCE))
$(OPENBSD_C99_COMPLEX_C_OBJS_8): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(OPENBSD_C99_COMPLEX_FLAGS) $(C_FLAGS) $(OPENBSD_C99_COMPLEX_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

GENERIC_EDG_CPP_OBJS_9 = $(patsubst %.c,$(OBJ)/%.c.obj,$(GENERIC_EDG_CPP_SOURCE))
$(GENERIC_EDG_CPP_OBJS_9): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(GENERIC_EDG_FLAGS) $(CPP_FLAGS) $(GENERIC_EDG_CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

FREEBSD_MATH_64_BIT_C_OBJS_10 = $(patsubst %.c,$(OBJ)/%.c.obj,$(FREEBSD_MATH_64_BIT_C_SOURCE))
$(FREEBSD_MATH_64_BIT_C_OBJS_10): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(FREEBSD_MATH_64_BIT_FLAGS) $(C_FLAGS) $(FREEBSD_MATH_64_BIT_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11 = $(patsubst %.c,$(OBJ)/%.c.obj,$(GENERIC_C_SIZE_OPTIMIZED_C_SOURCE))
$(GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(GENERIC_C_SIZE_OPTIMIZED_FLAGS) $(C_FLAGS) $(GENERIC_C_SIZE_OPTIMIZED_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12 = $(patsubst %.c,$(OBJ)/%.c.obj,$(FREEBSD_MATH_TI_SUPPLEMENT_C_SOURCE))
$(FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(FREEBSD_MATH_TI_SUPPLEMENT_FLAGS) $(C_FLAGS) $(FREEBSD_MATH_TI_SUPPLEMENT_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

EDG_C99_COMPLEX_HELPER_CPP_OBJS_13 = $(patsubst %.c,$(OBJ)/%.c.obj,$(EDG_C99_COMPLEX_HELPER_CPP_SOURCE))
$(EDG_C99_COMPLEX_HELPER_CPP_OBJS_13): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(EDG_C99_COMPLEX_HELPER_FLAGS) $(CPP_FLAGS) $(EDG_C99_COMPLEX_HELPER_CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

IDIV_ASM_OBJS_14 = $(patsubst %.asm,$(OBJ)/%.asm.obj,$(IDIV_ASM_SOURCE))
$(IDIV_ASM_OBJS_14): $(OBJ)/%.asm.obj: %.asm
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(IDIV_FLAGS) $(ASM_FLAGS) $(IDIV_ASM_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ)
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(IDIV_FLAGS) $(ASM_FLAGS) $(IDIV_ASM_FLAGS) -I$(INC) -fr $(OBJ) -fs $(OBJ) -ft $(OBJ) --asm_dependency=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

FULL_PORTABLE_EH_CPP_OBJS_15 = $(patsubst %.c,$(OBJ)/%.c.obj,$(FULL_PORTABLE_EH_CPP_SOURCE))
$(FULL_PORTABLE_EH_CPP_OBJS_15): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(FULL_PORTABLE_EH_FLAGS) $(CPP_FLAGS) $(FULL_PORTABLE_EH_CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

TARGET_CLA_OBJS_16 = $(patsubst %.cla,$(OBJ)/%.cla.obj,$(TARGET_CLA_SOURCE))
$(TARGET_CLA_OBJS_16): $(OBJ)/%.cla.obj: %.cla
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(TARGET_FLAGS) $(C_FLAGS) $(TARGET_CLA_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17 = $(patsubst %.c,$(OBJ)/%.c.obj,$(EDG_CPP_SUPPLEMENTAL_CPP_SOURCE))
$(EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(EDG_CPP_SUPPLEMENTAL_FLAGS) $(CPP_FLAGS) $(EDG_CPP_SUPPLEMENTAL_CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

XLOCALE_C_OBJS_18 = $(patsubst %.c,$(OBJ)/%.c.obj,$(XLOCALE_C_SOURCE))
$(XLOCALE_C_OBJS_18): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(XLOCALE_FLAGS) $(C_FLAGS) $(XLOCALE_C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

EABI_TDEH_CPP_OBJS_19 = $(patsubst %.cpp,$(OBJ)/%.cpp.obj,$(EABI_TDEH_CPP_SOURCE))
$(EABI_TDEH_CPP_OBJS_19): $(OBJ)/%.cpp.obj: %.cpp
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(EABI_TDEH_FLAGS) $(CPP_FLAGS) $(EABI_TDEH_CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

STLPORT_LOCALE_CPP_OBJS_20 = $(patsubst %.cpp,$(OBJ)/%.cpp.obj,$(STLPORT_LOCALE_CPP_SOURCE))
$(STLPORT_LOCALE_CPP_OBJS_20): $(OBJ)/%.cpp.obj: %.cpp
	$(CC) $< $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(STLPORT_LOCALE_FLAGS) $(CPP_FLAGS) $(STLPORT_LOCALE_CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

ASM_OBJS_21 = $(patsubst %.asm,$(OBJ)/%.asm.obj,$(ASM_SOURCE))
$(ASM_OBJS_21): $(OBJ)/%.asm.obj: %.asm
	$(CC) $< $(EXTRA_FLAGS) $(STANDARD_FLAGS) $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(UNIVERSAL_FLAGS) $(ASM_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ)
	$(CC) $< $(EXTRA_FLAGS) $(STANDARD_FLAGS) $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(UNIVERSAL_FLAGS) $(ASM_FLAGS) -I$(INC) -fr $(OBJ) -fs $(OBJ) -ft $(OBJ) --asm_dependency=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

CPP_OBJS_22 = $(patsubst %.cpp,$(OBJ)/%.cpp.obj,$(CPP_SOURCE))
$(CPP_OBJS_22): $(OBJ)/%.cpp.obj: %.cpp
	$(CC) $< $(EXTRA_FLAGS) $(STANDARD_FLAGS) $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(UNIVERSAL_FLAGS) $(CPP_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

C_OBJS_23 = $(patsubst %.c,$(OBJ)/%.c.obj,$(C_SOURCE))
$(C_OBJS_23): $(OBJ)/%.c.obj: %.c
	$(CC) $< $(EXTRA_FLAGS) $(STANDARD_FLAGS) $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(UNIVERSAL_FLAGS) $(C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

CLA_OBJS_24 = $(patsubst %.cla,$(OBJ)/%.cla.obj,$(CLA_SOURCE))
$(CLA_OBJS_24): $(OBJ)/%.cla.obj: %.cla
	$(CC) $< $(EXTRA_FLAGS) $(STANDARD_FLAGS) $(EXTRA_FLAGS) $(UNIVERSAL_FLAGS) $(UNIVERSAL_FLAGS) $(C_FLAGS) -I$(INC) -fe $@ -fs $(OBJ) -ft $(OBJ) -ppa -ppd=$(OBJ)/$(basename $(@F)).pp
	@$(CP_CMD) $(OBJ)/$(basename $(@F)).pp $(OBJ)/$(basename $(@F)).P
	@$(SED_CMD) -e 's/#.*//' -e 's/^[^:]*: *//' -e 's/ *\$$//' \
	-e '/^$$/ d' -e 's/$$/ :/' < $(OBJ)/$(basename $(@F)).pp >> $(OBJ)/$(basename $(@F)).P
	@$(RM_CMD) -f $(OBJ)/$(basename $(@F)).pp

ALL_OBJS = $(FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1) $(FREEBSD_MATH_32_BIT_C_OBJS_2) $(EABI_CPP_OBJS_3) $(FULL_WCHAR_C_OBJS_4) $(CLA_MATH_CLA_OBJS_5) $(CLA_MATH_C_OBJS_6) $(FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7) $(OPENBSD_C99_COMPLEX_C_OBJS_8) $(GENERIC_EDG_CPP_OBJS_9) $(FREEBSD_MATH_64_BIT_C_OBJS_10) $(GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11) $(FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12) $(EDG_C99_COMPLEX_HELPER_CPP_OBJS_13) $(IDIV_ASM_OBJS_14) $(FULL_PORTABLE_EH_CPP_OBJS_15) $(TARGET_CLA_OBJS_16) $(EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17) $(XLOCALE_C_OBJS_18) $(EABI_TDEH_CPP_OBJS_19) $(STLPORT_LOCALE_CPP_OBJS_20) $(ASM_OBJS_21) $(CPP_OBJS_22) $(C_OBJS_23) $(CLA_OBJS_24)
RELATIVE_FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1 := $(foreach obj,$(FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1),$(subst $(OBJ)/,,$(obj)))
RELATIVE_FREEBSD_MATH_32_BIT_C_OBJS_2 := $(foreach obj,$(FREEBSD_MATH_32_BIT_C_OBJS_2),$(subst $(OBJ)/,,$(obj)))
RELATIVE_EABI_CPP_OBJS_3 := $(foreach obj,$(EABI_CPP_OBJS_3),$(subst $(OBJ)/,,$(obj)))
RELATIVE_FULL_WCHAR_C_OBJS_4 := $(foreach obj,$(FULL_WCHAR_C_OBJS_4),$(subst $(OBJ)/,,$(obj)))
RELATIVE_CLA_MATH_CLA_OBJS_5 := $(foreach obj,$(CLA_MATH_CLA_OBJS_5),$(subst $(OBJ)/,,$(obj)))
RELATIVE_CLA_MATH_C_OBJS_6 := $(foreach obj,$(CLA_MATH_C_OBJS_6),$(subst $(OBJ)/,,$(obj)))
RELATIVE_FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7 := $(foreach obj,$(FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7),$(subst $(OBJ)/,,$(obj)))
RELATIVE_OPENBSD_C99_COMPLEX_C_OBJS_8 := $(foreach obj,$(OPENBSD_C99_COMPLEX_C_OBJS_8),$(subst $(OBJ)/,,$(obj)))
RELATIVE_GENERIC_EDG_CPP_OBJS_9 := $(foreach obj,$(GENERIC_EDG_CPP_OBJS_9),$(subst $(OBJ)/,,$(obj)))
RELATIVE_FREEBSD_MATH_64_BIT_C_OBJS_10 := $(foreach obj,$(FREEBSD_MATH_64_BIT_C_OBJS_10),$(subst $(OBJ)/,,$(obj)))
RELATIVE_GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11 := $(foreach obj,$(GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11),$(subst $(OBJ)/,,$(obj)))
RELATIVE_FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12 := $(foreach obj,$(FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12),$(subst $(OBJ)/,,$(obj)))
RELATIVE_EDG_C99_COMPLEX_HELPER_CPP_OBJS_13 := $(foreach obj,$(EDG_C99_COMPLEX_HELPER_CPP_OBJS_13),$(subst $(OBJ)/,,$(obj)))
RELATIVE_IDIV_ASM_OBJS_14 := $(foreach obj,$(IDIV_ASM_OBJS_14),$(subst $(OBJ)/,,$(obj)))
RELATIVE_FULL_PORTABLE_EH_CPP_OBJS_15 := $(foreach obj,$(FULL_PORTABLE_EH_CPP_OBJS_15),$(subst $(OBJ)/,,$(obj)))
RELATIVE_TARGET_CLA_OBJS_16 := $(foreach obj,$(TARGET_CLA_OBJS_16),$(subst $(OBJ)/,,$(obj)))
RELATIVE_EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17 := $(foreach obj,$(EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17),$(subst $(OBJ)/,,$(obj)))
RELATIVE_XLOCALE_C_OBJS_18 := $(foreach obj,$(XLOCALE_C_OBJS_18),$(subst $(OBJ)/,,$(obj)))
RELATIVE_EABI_TDEH_CPP_OBJS_19 := $(foreach obj,$(EABI_TDEH_CPP_OBJS_19),$(subst $(OBJ)/,,$(obj)))
RELATIVE_STLPORT_LOCALE_CPP_OBJS_20 := $(foreach obj,$(STLPORT_LOCALE_CPP_OBJS_20),$(subst $(OBJ)/,,$(obj)))
RELATIVE_ASM_OBJS_21 := $(foreach obj,$(ASM_OBJS_21),$(subst $(OBJ)/,,$(obj)))
RELATIVE_CPP_OBJS_22 := $(foreach obj,$(CPP_OBJS_22),$(subst $(OBJ)/,,$(obj)))
RELATIVE_C_OBJS_23 := $(foreach obj,$(C_OBJS_23),$(subst $(OBJ)/,,$(obj)))
RELATIVE_CLA_OBJS_24 := $(foreach obj,$(CLA_OBJS_24),$(subst $(OBJ)/,,$(obj)))

-include $(ALL_OBJS:.obj=.P)

library: $(ALL_OBJS)
	@echo "Creating library $(LIB)"
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_FREEBSD_MATH_32_BIT_C_OBJS_2)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_EABI_CPP_OBJS_3)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_FULL_WCHAR_C_OBJS_4)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_CLA_MATH_CLA_OBJS_5)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_CLA_MATH_C_OBJS_6)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_OPENBSD_C99_COMPLEX_C_OBJS_8)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_GENERIC_EDG_CPP_OBJS_9)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_FREEBSD_MATH_64_BIT_C_OBJS_10)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_EDG_C99_COMPLEX_HELPER_CPP_OBJS_13)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_IDIV_ASM_OBJS_14)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_FULL_PORTABLE_EH_CPP_OBJS_15)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_TARGET_CLA_OBJS_16)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_XLOCALE_C_OBJS_18)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_EABI_TDEH_CPP_OBJS_19)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_STLPORT_LOCALE_CPP_OBJS_20)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_ASM_OBJS_21)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_CPP_OBJS_22)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_C_OBJS_23)
	$(CD) $(OBJ); $(AR) -qa $(LIB) $(RELATIVE_CLA_OBJS_24)

info:
	@echo FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1 $(FREEBSD_C99_COMPLEX_32_BIT_C_OBJS_1)
	@echo FREEBSD_MATH_32_BIT_C_OBJS_2 $(FREEBSD_MATH_32_BIT_C_OBJS_2)
	@echo EABI_CPP_OBJS_3 $(EABI_CPP_OBJS_3)
	@echo FULL_WCHAR_C_OBJS_4 $(FULL_WCHAR_C_OBJS_4)
	@echo CLA_MATH_CLA_OBJS_5 $(CLA_MATH_CLA_OBJS_5)
	@echo CLA_MATH_C_OBJS_6 $(CLA_MATH_C_OBJS_6)
	@echo FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7 $(FREEBSD_C99_COMPLEX_64_BIT_C_OBJS_7)
	@echo OPENBSD_C99_COMPLEX_C_OBJS_8 $(OPENBSD_C99_COMPLEX_C_OBJS_8)
	@echo GENERIC_EDG_CPP_OBJS_9 $(GENERIC_EDG_CPP_OBJS_9)
	@echo FREEBSD_MATH_64_BIT_C_OBJS_10 $(FREEBSD_MATH_64_BIT_C_OBJS_10)
	@echo GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11 $(GENERIC_C_SIZE_OPTIMIZED_C_OBJS_11)
	@echo FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12 $(FREEBSD_MATH_TI_SUPPLEMENT_C_OBJS_12)
	@echo EDG_C99_COMPLEX_HELPER_CPP_OBJS_13 $(EDG_C99_COMPLEX_HELPER_CPP_OBJS_13)
	@echo IDIV_ASM_OBJS_14 $(IDIV_ASM_OBJS_14)
	@echo FULL_PORTABLE_EH_CPP_OBJS_15 $(FULL_PORTABLE_EH_CPP_OBJS_15)
	@echo TARGET_CLA_OBJS_16 $(TARGET_CLA_OBJS_16)
	@echo EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17 $(EDG_CPP_SUPPLEMENTAL_CPP_OBJS_17)
	@echo XLOCALE_C_OBJS_18 $(XLOCALE_C_OBJS_18)
	@echo EABI_TDEH_CPP_OBJS_19 $(EABI_TDEH_CPP_OBJS_19)
	@echo STLPORT_LOCALE_CPP_OBJS_20 $(STLPORT_LOCALE_CPP_OBJS_20)
	@echo ASM_OBJS_21 $(ASM_OBJS_21)
	@echo CPP_OBJS_22 $(CPP_OBJS_22)
	@echo C_OBJS_23 $(C_OBJS_23)
	@echo CLA_OBJS_24 $(CLA_OBJS_24)
	@echo ASM_FLAGS $(ASM_FLAGS)
	@echo CLA_MATH_CLA_FLAGS $(CLA_MATH_CLA_FLAGS)
	@echo CLA_MATH_C_FLAGS $(CLA_MATH_C_FLAGS)
	@echo CLA_MATH_FLAGS $(CLA_MATH_FLAGS)
	@echo CPP_FLAGS $(CPP_FLAGS)
	@echo C_FLAGS $(C_FLAGS)
	@echo EABI_CPP_FLAGS $(EABI_CPP_FLAGS)
	@echo EABI_FLAGS $(EABI_FLAGS)
	@echo EABI_TDEH_CPP_FLAGS $(EABI_TDEH_CPP_FLAGS)
	@echo EABI_TDEH_FLAGS $(EABI_TDEH_FLAGS)
	@echo EDG_C99_COMPLEX_HELPER_CPP_FLAGS $(EDG_C99_COMPLEX_HELPER_CPP_FLAGS)
	@echo EDG_C99_COMPLEX_HELPER_FLAGS $(EDG_C99_COMPLEX_HELPER_FLAGS)
	@echo EDG_CPP_SUPPLEMENTAL_CPP_FLAGS $(EDG_CPP_SUPPLEMENTAL_CPP_FLAGS)
	@echo EDG_CPP_SUPPLEMENTAL_FLAGS $(EDG_CPP_SUPPLEMENTAL_FLAGS)
	@echo EXTRA_FLAGS $(EXTRA_FLAGS)
	@echo FREEBSD_C99_COMPLEX_32_BIT_C_FLAGS $(FREEBSD_C99_COMPLEX_32_BIT_C_FLAGS)
	@echo FREEBSD_C99_COMPLEX_32_BIT_FLAGS $(FREEBSD_C99_COMPLEX_32_BIT_FLAGS)
	@echo FREEBSD_C99_COMPLEX_64_BIT_C_FLAGS $(FREEBSD_C99_COMPLEX_64_BIT_C_FLAGS)
	@echo FREEBSD_C99_COMPLEX_64_BIT_FLAGS $(FREEBSD_C99_COMPLEX_64_BIT_FLAGS)
	@echo FREEBSD_MATH_32_BIT_C_FLAGS $(FREEBSD_MATH_32_BIT_C_FLAGS)
	@echo FREEBSD_MATH_32_BIT_FLAGS $(FREEBSD_MATH_32_BIT_FLAGS)
	@echo FREEBSD_MATH_64_BIT_C_FLAGS $(FREEBSD_MATH_64_BIT_C_FLAGS)
	@echo FREEBSD_MATH_64_BIT_FLAGS $(FREEBSD_MATH_64_BIT_FLAGS)
	@echo FREEBSD_MATH_TI_SUPPLEMENT_C_FLAGS $(FREEBSD_MATH_TI_SUPPLEMENT_C_FLAGS)
	@echo FREEBSD_MATH_TI_SUPPLEMENT_FLAGS $(FREEBSD_MATH_TI_SUPPLEMENT_FLAGS)
	@echo FULL_PORTABLE_EH_CPP_FLAGS $(FULL_PORTABLE_EH_CPP_FLAGS)
	@echo FULL_PORTABLE_EH_FLAGS $(FULL_PORTABLE_EH_FLAGS)
	@echo FULL_WCHAR_C_FLAGS $(FULL_WCHAR_C_FLAGS)
	@echo FULL_WCHAR_FLAGS $(FULL_WCHAR_FLAGS)
	@echo GENERIC_C_SIZE_OPTIMIZED_C_FLAGS $(GENERIC_C_SIZE_OPTIMIZED_C_FLAGS)
	@echo GENERIC_C_SIZE_OPTIMIZED_FLAGS $(GENERIC_C_SIZE_OPTIMIZED_FLAGS)
	@echo GENERIC_EDG_CPP_FLAGS $(GENERIC_EDG_CPP_FLAGS)
	@echo GENERIC_EDG_FLAGS $(GENERIC_EDG_FLAGS)
	@echo IDIV_ASM_FLAGS $(IDIV_ASM_FLAGS)
	@echo IDIV_FLAGS $(IDIV_FLAGS)
	@echo OPENBSD_C99_COMPLEX_C_FLAGS $(OPENBSD_C99_COMPLEX_C_FLAGS)
	@echo OPENBSD_C99_COMPLEX_FLAGS $(OPENBSD_C99_COMPLEX_FLAGS)
	@echo STANDARD_FLAGS $(STANDARD_FLAGS)
	@echo STLPORT_LOCALE_CPP_FLAGS $(STLPORT_LOCALE_CPP_FLAGS)
	@echo STLPORT_LOCALE_FLAGS $(STLPORT_LOCALE_FLAGS)
	@echo TARGET_CLA_FLAGS $(TARGET_CLA_FLAGS)
	@echo TARGET_FLAGS $(TARGET_FLAGS)
	@echo UNIVERSAL_FLAGS $(UNIVERSAL_FLAGS)
	@echo XLOCALE_C_FLAGS $(XLOCALE_C_FLAGS)
	@echo XLOCALE_FLAGS $(XLOCALE_FLAGS)
