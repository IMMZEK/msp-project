/*****************************************************************************/
/*  divlli.c                                                                 */
/*                                                                           */
/* Copyright (c) 2015 Texas Instruments Incorporated                         */
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

#include "64bit_util.h"

extern uint64_t __TI_P(divull)(uint64_t, uint64_t);

/***********************************************************************/
/*                                                                     */
/* divlli() - Signed 64-bit division.                                  */
/*                                                                     */
/***********************************************************************/
_CODE_ACCESS int64_t __TI_P(divlli) (int64_t a, int64_t b)
{
   /*-----------------------------------------------------------------------*/
   /* CHECK SIGNS, TAKE ABSOLUTE VALUE, AND USED UNSIGNED DIVIDE.           */
   /*-----------------------------------------------------------------------*/
   int64_t  sign = (_HI32(a) ^ _HI32(b)) >> 31;
   uint64_t ua = (a == INT64_MIN ? a : (a < 0 ? -a : a));
   uint64_t ub = (b == INT64_MIN ? b : (b < 0 ? -b : b));
   uint64_t q  = __TI_P(divull)(ua, ub);

   if (b == 0) return a ? (((uint64_t)-1) >> 1) ^ sign : 0;
                        /* saturation value or 0 */

   return sign ? -q : q;
}
