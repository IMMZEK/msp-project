/*****************************************************************************/
/*  _TYPES.H                                                                 */
/*                                                                           */
/* Copyright (c) 2017 Texas Instruments Incorporated                         */
/* http://www.ti.com/                                                        */
/*                                                                           */
/*  Redistribution and  use in source  and binary forms, with  or without    */
/*  modification,  are permitted provided  that the  following conditions    */
/*  are met:                                                                 */
/*                                                                           */
/*     Redistributions  of source  code must  retain the  above copyright    */
/*     notice, this list of conditions and the following disclaimer.         */
/*                                                                           */
/*     Redistributions in binary form  must reproduce the above copyright    */
/*     notice, this  list of conditions  and the following  disclaimer in    */
/*     the  documentation  and/or   other  materials  provided  with  the    */
/*     distribution.                                                         */
/*                                                                           */
/*     Neither the  name of Texas Instruments Incorporated  nor the names    */
/*     of its  contributors may  be used to  endorse or  promote products    */
/*     derived  from   this  software  without   specific  prior  written    */
/*     permission.                                                           */
/*                                                                           */
/*  THIS SOFTWARE  IS PROVIDED BY THE COPYRIGHT  HOLDERS AND CONTRIBUTORS    */
/*  "AS IS"  AND ANY  EXPRESS OR IMPLIED  WARRANTIES, INCLUDING,  BUT NOT    */
/*  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR    */
/*  A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT    */
/*  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,    */
/*  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL  DAMAGES  (INCLUDING, BUT  NOT    */
/*  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,    */
/*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY    */
/*  THEORY OF  LIABILITY, WHETHER IN CONTRACT, STRICT  LIABILITY, OR TORT    */
/*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE    */
/*  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.     */
/*                                                                           */
/*****************************************************************************/

#ifndef _MACHINE__TYPES_H_
#define	_MACHINE__TYPES_H_

#ifndef _SYS_CDEFS_H_
#error this file needs sys/cdefs.h as a prerequisite
#endif

#ifdef __TI_COMPILER_VERSION__
#pragma diag_push
/* This file is required to use base types */
#pragma CHECK_MISRA("-6.3")
#endif

#if defined(__TI_EABI__)
#define _TARGET_DEFAULTS_TO_TIME64
#endif

/*
 * Basic types upon which most other types are built.
 */
#if defined(__TMS320C28XX_CLA__)
    typedef          short  __int16_t;
    typedef unsigned short __uint16_t;
    typedef          int    __int32_t;
    typedef unsigned int   __uint32_t;
#else
    typedef          int    __int16_t;
    typedef unsigned int   __uint16_t;
    typedef          long   __int32_t;
    typedef unsigned long  __uint32_t;
#endif

#ifndef lint
__extension__
#endif
/* LONGLONG */
typedef	long long		__int64_t;
#ifndef lint
__extension__
#endif
/* LONGLONG */
typedef	unsigned long long	__uint64_t;

/*
 * Standard type definitions.
 */
typedef	__uint32_t	__clock_t;		/* clock()... */
typedef	__int32_t	__critical_t;
typedef	double		__double_t;
typedef	float		__float_t;
typedef	__int32_t	__intfptr_t;
typedef	__int64_t	__intmax_t;
#if defined(__TMS320C28XX_CLA__)
typedef	__int16_t	__intptr_t;
#else
typedef __int32_t       __intptr_t;
#endif

typedef	__int16_t	__int_fast8_t;
typedef	__int16_t	__int_fast16_t;
typedef	__int32_t	__int_fast32_t;
typedef	__int64_t	__int_fast64_t;
typedef	__int16_t	__int_least8_t;
typedef	__int16_t	__int_least16_t;
typedef	__int32_t	__int_least32_t;
typedef	__int64_t	__int_least64_t;
typedef	__PTRDIFF_T_TYPE__ __ptrdiff_t;		/* ptr1 - ptr2 */
typedef	__int16_t	__register_t;
typedef	__int32_t	__segsz_t;		/* segment size (in pages) */
typedef	__SIZE_T_TYPE__	__size_t;		/* sizeof() */
typedef	__int32_t	__ssize_t;		/* byte count or error */
#if defined(_TARGET_DEFAULTS_TO_TIME64) || \
    (defined(__TI_TIME_USES_64) && __TI_TIME_USES_64)
typedef	__int64_t	__time_t;		/* time()... */
#else
typedef __uint32_t      __time_t;
#endif
typedef	__uint32_t	__uintfptr_t;
typedef	__uint64_t	__uintmax_t;
#if defined(__TMS320C28XX_CLA__)
typedef	__uint16_t	__uintptr_t;
#else
typedef	__uint32_t	__uintptr_t;
#endif

typedef	__uint16_t	__uint_fast8_t;
typedef	__uint16_t	__uint_fast16_t;
typedef	__uint32_t	__uint_fast32_t;
typedef	__uint64_t	__uint_fast64_t;
typedef	__uint16_t	__uint_least8_t;
typedef	__uint16_t	__uint_least16_t;
typedef	__uint32_t	__uint_least32_t;
typedef	__uint64_t	__uint_least64_t;
typedef	__uint16_t	__u_register_t;
typedef	__uint32_t	__vm_offset_t;
typedef	__uint32_t	__vm_paddr_t;
typedef	__uint32_t	__vm_size_t;

typedef	__WCHAR_T_TYPE__ ___wchar_t;
#define	__WCHAR_MIN	0		/* min value for a wchar_t */

#ifdef __TI_COMPILER_VERSION__
#if !defined(__TI_WCHAR_T_BITS__) || __TI_WCHAR_T_BITS__ == 16
#    define __WCHAR_MAX 0xffffu
#else
#    define __WCHAR_MAX 0xffffffffu
#endif
#else
#define	__WCHAR_MAX	__UINT_MAX	/* max value for a wchar_t */
#endif

/*
 * POSIX target specific _off_t type definition
 */
typedef long int _off_t;

/*
 * Unusual type definitions.
 */
typedef char* __va_list;

#if defined(__TI_COMPILER_VERSION__)
#pragma diag_pop
#endif

#endif /* _MACHINE__TYPES_H_ */
