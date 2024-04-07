/****************************************************************************/
/*  _printfi_support.h                                                      */
/*                                                                          */
/* Copyright (c) 2020 Texas Instruments Incorporated                        */
/* http://www.ti.com/                                                       */
/*                                                                          */
/*  Redistribution and  use in source  and binary forms, with  or without   */
/*  modification,  are permitted provided  that the  following conditions   */
/*  are met:                                                                */
/*                                                                          */
/*     Redistributions  of source  code must  retain the  above copyright   */
/*     notice, this list of conditions and the following disclaimer.        */
/*                                                                          */
/*     Redistributions in binary form  must reproduce the above copyright   */
/*     notice, this  list of conditions  and the following  disclaimer in   */
/*     the  documentation  and/or   other  materials  provided  with  the   */
/*     distribution.                                                        */
/*                                                                          */
/*     Neither the  name of Texas Instruments Incorporated  nor the names   */
/*     of its  contributors may  be used to  endorse or  promote products   */
/*     derived  from   this  software  without   specific  prior  written   */
/*     permission.                                                          */
/*                                                                          */
/*  THIS SOFTWARE  IS PROVIDED BY THE COPYRIGHT  HOLDERS AND CONTRIBUTORS   */
/*  "AS IS"  AND ANY  EXPRESS OR IMPLIED  WARRANTIES, INCLUDING,  BUT NOT   */
/*  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR   */
/*  A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT   */
/*  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,   */
/*  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL  DAMAGES  (INCLUDING, BUT  NOT   */
/*  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,   */
/*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY   */
/*  THEORY OF  LIABILITY, WHETHER IN CONTRACT, STRICT  LIABILITY, OR TORT   */
/*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE   */
/*  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.    */
/*                                                                          */
/****************************************************************************/
#ifndef __PRINTFI_SUPPORT_H
#define __PRINTFI_SUPPORT_H

/****************************************************************************/
/*  Use NAME() to add a suffix onto applicable function names               */
/****************************************************************************/
#define JOIN(x,y) x ## _ ## y
#define EVALUATE(x,y) JOIN(x,y)
#define NAME(fun) EVALUATE(fun, _PRINTFI)

/****************************************************************************/
/* Put applicable functions into unique sections and avoid inlining for     */
/* clang (when LTO is run, inlining can cause the definition of             */
/* specialization variant routines to be split into separate object files,  */
/* violating linker's assumption that all specialization variant routines   */
/* are defined in the same object file).                                    */
/****************************************************************************/
# if defined(__clang__)
#define DEFINE_SPECIALIZATION(scn) __attribute__((noinline, section(scn)))
#else
#define DEFINE_SPECIALIZATION(scn) __attribute__((section(scn)))
#endif

#define HEX_CONV(conv) (conv == 'x' || conv == 'X' || conv == 'p')
#define SIGNED_CONV(conv) (conv != 'u' && conv != 'o' && !HEX_CONV(conv))
enum { NO_FLAG, MINUS_FLAG, ISNAN_FLAG, ISPINF_FLAG, ISNINF_FLAG };

/****************************************************************************/
/*  Avoid inlining float formatting conversion routines that negatively     */
/*  impact stack size for arm-llvm. This will increase final code size      */
/*  results by about 200 bytes when the full __TI_printfi definition is     */
/*  used.                                                                   */
/****************************************************************************/
# if defined(__clang__)
# define CLANG_NOINLINE __attribute__((noinline))
# else
# define CLANG_NOINLINE
# endif

#endif
