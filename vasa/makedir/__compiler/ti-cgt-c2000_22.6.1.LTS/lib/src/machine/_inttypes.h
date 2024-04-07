/*****************************************************************************/
/*  _INTTYPES.H                                                              */
/*                                                                           */
/* Copyright (c) 2019 Texas Instruments Incorporated                         */
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

/*-
 * SPDX-License-Identifier: BSD-2-Clause-NetBSD
 *
 * Copyright (c) 2001 The NetBSD Foundation, Inc.
 * All rights reserved.
 *
 * This code is derived from software contributed to The NetBSD Foundation
 * by Klaus Klein.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE NETBSD FOUNDATION, INC. AND CONTRIBUTORS
 * ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE FOUNDATION OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *	From: $NetBSD: int_fmtio.h,v 1.2 2001/04/26 16:25:21 kleink Exp $
 * $FreeBSD$
 */

#ifndef _MACHINE_INTTYPES_H_
#define _MACHINE_INTTYPES_H_

/*
 * Macros for format specifiers.
 */

/* fprintf(3) macros for signed integers. */

#define	PRId8		"hhd"	/* int8_t */
#define	PRId16		"d"	/* int16_t */
#define	PRId32		"ld"	/* int32_t */
#define	PRId64		"lld"	/* int64_t */
#define	PRIdLEAST8	"d"	/* int_least8_t */
#define	PRIdLEAST16	"d"	/* int_least16_t */
#define	PRIdLEAST32	"ld"	/* int_least32_t */
#define	PRIdLEAST64	"lld"	/* int_least64_t */
#define	PRIdFAST8	"d"	/* int_fast8_t */
#define	PRIdFAST16	"d"	/* int_fast16_t */
#define	PRIdFAST32	"ld"	/* int_fast32_t */
#define	PRIdFAST64	"lld"	/* int_fast64_t */
#define	PRIdMAX		"jd"	/* intmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	PRIdPTR		"ld"	/* intptr_t */
#else
#define	PRIdPTR		"d"	/* intptr_t */
#endif

#define	PRIi8		"hhi"	/* int8_t */
#define	PRIi16		"i"	/* int16_t */
#define	PRIi32		"li"	/* int32_t */
#define	PRIi64		"lli"	/* int64_t */
#define	PRIiLEAST8	"i"	/* int_least8_t  */
#define	PRIiLEAST16	"i"	/* int_least16_t */
#define	PRIiLEAST32	"li"	/* int_least32_t */
#define	PRIiLEAST64	"lli"	/* int_least64_t */
#define	PRIiFAST8	"i"	/* int_fast8_t */
#define	PRIiFAST16	"i"	/* int_fast16_t */
#define	PRIiFAST32	"li"	/* int_fast32_t */
#define	PRIiFAST64	"lli"	/* int_fast64_t */
#define	PRIiMAX		"ji"	/* intmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	PRIiPTR		"li"	/* intptr_t */
#else
#define	PRIiPTR		"i"	/* intptr_t */
#endif

/* fprintf(3) macros for unsigned integers. */

#define	PRIo8		"hho"	/* uint8_t */
#define	PRIo16		"o"	/* uint16_t */
#define	PRIo32		"lo"	/* uint32_t */
#define	PRIo64		"llo"	/* uint64_t */
#define	PRIoLEAST8	"o"	/* uint_least8_t */
#define	PRIoLEAST16	"o"	/* uint_least16_t */
#define	PRIoLEAST32	"lo"	/* uint_least32_t */
#define	PRIoLEAST64	"llo"	/* uint_least64_t */
#define	PRIoFAST8	"o"	/* uint_fast8_t */
#define	PRIoFAST16	"o"	/* uint_fast16_t */
#define	PRIoFAST32	"lo"	/* uint_fast32_t */
#define	PRIoFAST64	"llo"	/* uint_fast64_t */
#define	PRIoMAX		"jo"	/* uintmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	PRIoPTR		"lo"	/* uintptr_t */
#else
#define	PRIoPTR		"o"	/* uintptr_t */
#endif

#define	PRIu8		"hhu"	/* uint8_t */
#define	PRIu16		"u"	/* uint16_t */
#define	PRIu32		"lu"	/* uint32_t */
#define	PRIu64		"llu"	/* uint64_t */
#define	PRIuLEAST8	"u"	/* uint_least8_t */
#define	PRIuLEAST16	"u"	/* uint_least16_t */
#define	PRIuLEAST32	"lu"	/* uint_least32_t */
#define	PRIuLEAST64	"llu"	/* uint_least64_t */
#define	PRIuFAST8	"u"	/* uint_fast8_t */
#define	PRIuFAST16	"u"	/* uint_fast16_t */
#define	PRIuFAST32	"lu"	/* uint_fast32_t */
#define	PRIuFAST64	"llu"	/* uint_fast64_t */
#define	PRIuMAX		"ju"	/* uintmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	PRIuPTR		"lu"	/* uintptr_t */
#else
#define	PRIuPTR		"u"	/* uintptr_t */
#endif

#define	PRIx8		"hhx"	/* uint8_t */
#define	PRIx16		"x"	/* uint16_t */
#define	PRIx32		"lx"	/* uint32_t */
#define	PRIx64		"llx"	/* uint64_t */
#define	PRIxLEAST8	"x"	/* uint_least8_t */
#define	PRIxLEAST16	"x"	/* uint_least16_t */
#define	PRIxLEAST32	"lx"	/* uint_least32_t */
#define	PRIxLEAST64	"llx"	/* uint_least64_t */
#define	PRIxFAST8	"x"	/* uint_fast8_t */
#define	PRIxFAST16	"x"	/* uint_fast16_t */
#define	PRIxFAST32	"lx"	/* uint_fast32_t */
#define	PRIxFAST64	"llx"	/* uint_fast64_t */
#define	PRIxMAX		"jx"	/* uintmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	PRIxPTR		"lx"	/* uintptr_t */
#else
#define	PRIxPTR		"x"	/* uintptr_t */
#endif

#define	PRIX8		"hhX"	/* uint8_t */
#define	PRIX16		"X"	/* uint16_t */
#define	PRIX32		"lX"	/* uint32_t */
#define	PRIX64		"llX"	/* uint64_t */
#define	PRIXLEAST8	"X"	/* uint_least8_t */
#define	PRIXLEAST16	"X"	/* uint_least16_t */
#define	PRIXLEAST32	"lX"	/* uint_least32_t */
#define	PRIXLEAST64	"llX"	/* uint_least64_t */
#define	PRIXFAST8	"X"	/* uint_fast8_t */
#define	PRIXFAST16	"X"	/* uint_fast16_t */
#define	PRIXFAST32	"lX"	/* uint_fast32_t */
#define	PRIXFAST64	"llX"	/* uint_fast64_t */
#define	PRIXMAX		"jX"	/* uintmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	PRIXPTR		"lX"	/* uintptr_t */
#else
#define	PRIXPTR		"X"	/* uintptr_t */
#endif

/* fscanf(3) macros for signed integers. */

#define	SCNd8		"hhd"	/* int8_t */
#define	SCNd16		"d"	/* int16_t */
#define	SCNd32		"ld"	/* int32_t */
#define	SCNd64		"lld"	/* int64_t */
#define	SCNdLEAST8	"hhd"	/* int_least8_t */
#define	SCNdLEAST16	"d"	/* int_least16_t */
#define	SCNdLEAST32	"ld"	/* int_least32_t */
#define	SCNdLEAST64	"lld"	/* int_least64_t */
#define	SCNdFAST8	"d"	/* int_fast8_t */
#define	SCNdFAST16	"d"	/* int_fast16_t */
#define	SCNdFAST32	"ld"	/* int_fast32_t */
#define	SCNdFAST64	"lld"	/* int_fast64_t */
#define	SCNdMAX		"jd"	/* intmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	SCNdPTR		"ld"	/* intptr_t */
#else
#define	SCNdPTR		"d"	/* intptr_t */
#endif

#define	SCNi8		"hhi"	/* int8_t */
#define	SCNi16		"i"	/* int16_t */
#define	SCNi32		"li"	/* int32_t */
#define	SCNi64		"lli"	/* int64_t */
#define	SCNiLEAST8	"hhi"	/* int_least8_t */
#define	SCNiLEAST16	"i"	/* int_least16_t */
#define	SCNiLEAST32	"li"	/* int_least32_t */
#define	SCNiLEAST64	"lli"	/* int_least64_t */
#define	SCNiFAST8	"i"	/* int_fast8_t */
#define	SCNiFAST16	"i"	/* int_fast16_t */
#define	SCNiFAST32	"li"	/* int_fast32_t */
#define	SCNiFAST64	"lli"	/* int_fast64_t */
#define	SCNiMAX		"ji"	/* intmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	SCNiPTR		"li"	/* intptr_t */
#else
#define	SCNiPTR		"i"	/* intptr_t */
#endif

/* fscanf(3) macros for unsigned integers. */

#define	SCNo8		"hho"	/* uint8_t */
#define	SCNo16		"o"	/* uint16_t */
#define	SCNo32		"lo"	/* uint32_t */
#define	SCNo64		"llo"	/* uint64_t */
#define	SCNoLEAST8	"hho"	/* uint_least8_t */
#define	SCNoLEAST16	"o"	/* uint_least16_t */
#define	SCNoLEAST32	"lo"	/* uint_least32_t */
#define	SCNoLEAST64	"llo"	/* uint_least64_t */
#define	SCNoFAST8	"o"	/* uint_fast8_t */
#define	SCNoFAST16	"o"	/* uint_fast16_t */
#define	SCNoFAST32	"lo"	/* uint_fast32_t */
#define	SCNoFAST64	"llo"	/* uint_fast64_t */
#define	SCNoMAX		"jo"	/* uintmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	SCNoPTR		"lo"	/* uintptr_t */
#else
#define	SCNoPTR		"o"	/* uintptr_t */
#endif

#define	SCNu8		"hhu"	/* uint8_t */
#define	SCNu16		"u"	/* uint16_t */
#define	SCNu32		"lu"	/* uint32_t */
#define	SCNu64		"llu"	/* uint64_t */
#define	SCNuLEAST8	"hhu"	/* uint_least8_t */
#define	SCNuLEAST16	"u"	/* uint_least16_t */
#define	SCNuLEAST32	"lu"	/* uint_least32_t */
#define	SCNuLEAST64	"llu"	/* uint_least64_t */
#define	SCNuFAST8	"u"	/* uint_fast8_t */
#define	SCNuFAST16	"u"	/* uint_fast16_t */
#define	SCNuFAST32	"lu"	/* uint_fast32_t */
#define	SCNuFAST64	"llu"	/* uint_fast64_t */
#define	SCNuMAX		"ju"	/* uintmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	SCNuPTR		"lu"	/* uintptr_t */
#else
#define	SCNuPTR		"u"	/* uintptr_t */
#endif

#define	SCNx8		"hhx"	/* uint8_t */
#define	SCNx16		"x"	/* uint16_t */
#define	SCNx32		"lx"	/* uint32_t */
#define	SCNx64		"llx"	/* uint64_t */
#define	SCNxLEAST8	"hhx"	/* uint_least8_t */
#define	SCNxLEAST16	"x"	/* uint_least16_t */
#define	SCNxLEAST32	"lx"	/* uint_least32_t */
#define	SCNxLEAST64	"llx"	/* uint_least64_t */
#define	SCNxFAST8	"x"	/* uint_fast8_t */
#define	SCNxFAST16	"x"	/* uint_fast16_t */
#define	SCNxFAST32	"lx"	/* uint_fast32_t */
#define	SCNxFAST64	"llx"	/* uint_fast64_t */
#define	SCNxMAX		"jx"	/* uintmax_t */

#if !defined(__TMS320C28XX_CLA__)
#define	SCNxPTR		"lx"	/* uintptr_t */
#else
#define	SCNxPTR		"x"	/* uintptr_t */
#endif

#endif /* !_MACHINE_INTTYPES_H_ */
