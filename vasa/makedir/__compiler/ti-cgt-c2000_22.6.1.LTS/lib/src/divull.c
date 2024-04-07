/*****************************************************************************/
/*  divull.c       							     */
/*                                                               */
/* Copyright (c) 2015 Texas Instruments Incorporated             */
/* http://www.ti.com/                                            */
/*                                                               */
/*  Redistribution and  use in source  and binary forms, with  or without */
/*  modification,  are permitted provided  that the  following conditions */
/*  are met:                                                     */
/*                                                               */
/*     Redistributions  of source  code must  retain the  above copyright */
/*     notice, this list of conditions and the following disclaimer. */
/*                                                               */
/*     Redistributions in binary form  must reproduce the above copyright */
/*     notice, this  list of conditions  and the following  disclaimer in */
/*     the  documentation  and/or   other  materials  provided  with  the */
/*     distribution.                                             */
/*                                                               */
/*     Neither the  name of Texas Instruments Incorporated  nor the names */
/*     of its  contributors may  be used to  endorse or  promote products */
/*     derived  from   this  software  without   specific  prior  written */
/*     permission.                                               */
/*                                                               */
/*  THIS SOFTWARE  IS PROVIDED BY THE COPYRIGHT  HOLDERS AND CONTRIBUTORS */
/*  "AS IS"  AND ANY  EXPRESS OR IMPLIED  WARRANTIES, INCLUDING,  BUT NOT */
/*  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR */
/*  A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT */
/*  OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, */
/*  SPECIAL,  EXEMPLARY,  OR CONSEQUENTIAL  DAMAGES  (INCLUDING, BUT  NOT */
/*  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, */
/*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY */
/*  THEORY OF  LIABILITY, WHETHER IN CONTRACT, STRICT  LIABILITY, OR TORT */
/*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE */
/*  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */
/*                                                               */
/*****************************************************************************/

#include "64bit_util.h"

/***********************************************************************/
/*                                                                     */
/* _normull() - Leftmost bit detect of one.                            */
/*                                                                     */
/***********************************************************************/
static __inline unsigned _normull(uint64_t src)
{
#if defined(__PRU__)
/*---------------------------------------------------------------------*/
/* PRU defines an lmbd intrinsic which can speed up this calculation   */
/* considerably.                                                       */
/*---------------------------------------------------------------------*/
    unsigned int p1 = src >> 32;
    unsigned p2 = src;
    unsigned int pos;

    if ((pos = __lmbd(p1, 1)) == 32)
    {
        pos = __lmbd(p2, 1);
        if (pos == 32)
            return 64;
        else
            return (63 - pos);
    }
    else
        return (31 - pos);
#else
    uint32_t p1 = _HI32(src);
    uint32_t p2 = _LO32(src);
    uint32_t pos = 0;

    if ((p1 & 0xffffffff) != 0)
    {
        pos += 32;
        p2 = p1;
    }

    /* 32-bit LMBD */
    if ((p2 & 0xffff0000) != 0) { pos += 16; p2 >>= 16; }
    if ((p2 & 0x0000ff00) != 0) { pos +=  8; p2 >>=  8; }
    if ((p2 & 0x000000f0) != 0) { pos +=  4; p2 >>=  4; }
    if      (p2 >= 8) pos += 4;
    else if (p2 >= 4) pos += 3;
    else if (p2 >= 2) pos += 2;
    else if (p2 >= 1) pos += 1;

    return (64 - pos);
#endif
}

/***********************************************************************/
/*                                                                     */
/* _subcull() - Same as _subc(int, int), but takes 		       */
/* (uint64_t, uint64_t).      				       */
/*                                                                     */
/***********************************************************************/
static uint64_t _subcull(uint64_t src1, uint64_t src2)
{
    uint64_t res1 = ((src1-src2) << 1) | 0x1;
    uint64_t res2 = src1 << 1;
    if (src1 >= src2)
      return res1;
    else
      return res2;
}

/***********************************************************************/
/*                                                                     */
/* divull() - Unsigned 64-bit division.                                */
/*                                                                     */
/***********************************************************************/
_CODE_ACCESS uint64_t __TI_P(divull) (uint64_t x1, uint64_t x2)
{
    register int i;
    register uint64_t num;
    register uint64_t den;
    register int shift;
    uint64_t first_div = 0;
    uint64_t num64;

    shift = _normull(x2) - _normull(x1);

    if (x1 < x2) return 0;
    if (x1 == 0) return 0;
    /* ! if (x2 == 0) return  -1;  */
    if (x2 == 0) return (uint64_t) -1;

    num = x1;
    den = x2 << shift;

    num64 = (_normull(x1) == 0);

    first_div = num64 << shift;

    if (den > num) first_div >>= 1;

    if (num64)
    {
	if(den > num) { den >>= 1; num -= den; }
	else          { num -= den; den >>= 1; }
    }
    else
	shift++;

    for (i = 0; i < shift; i++)
    {
      num = _subcull(num, den);
    }

    if (shift)
        return num << (64-shift) >> (64-shift) | first_div;
    else
	return first_div;
}
