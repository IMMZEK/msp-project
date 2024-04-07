/*****************************************************************************/
/*  mpyll.c                                                                  */
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

uint64_t __TI_P(mpyll)(uint64_t x, uint64_t y)
{
#if __TMS320C28XX_CLA__
    short i,j; /* CLA 32-bit signed comparison workaround */
#else
    int i,j;
#endif

    /*-------------------------------------------------------------------------
    * N-bit multiplies requires 2N bits. We're using 16-bit lanes to keep
    * intermediate values within 32-bit ranges.
    *------------------------------------------------------------------------*/
    uint16_t res_vec[4] = { 0 };

    /*-------------------------------------------------------------------------
    * Break up the 64-bit values into 16-bit chunks for intermediate
    * multiplies.
    *------------------------------------------------------------------------*/
    uint32_t x_hi = _HI32(x);
    uint32_t x_lo = _LO32(x);

    uint16_t x_vec[4];
    x_vec[0] = (uint16_t)x_lo;
    x_vec[1] = (uint16_t)(x_lo >> 16);
    x_vec[2] = (uint16_t)x_hi;
    x_vec[3] = (uint16_t)(x_hi >> 16);

    uint32_t y_hi = _HI32(y);
    uint32_t y_lo = _LO32(y);

    uint16_t y_vec[4];
    y_vec[0] = (uint16_t)y_lo;
    y_vec[1] = (uint16_t)(y_lo >> 16);
    y_vec[2] = (uint16_t)y_hi;
    y_vec[3] = (uint16_t)(y_hi >> 16);

    /*-------------------------------------------------------------------------
    * Accumulate the intermediate results while passing around the carry value.
    *------------------------------------------------------------------------*/
    for (i = 0; i < 4; i++)
    {
        uint16_t carry = 0;
        for (j = 0; (i + j) < 4; j++)
        {
            uint32_t intermediate = 0;
            intermediate  = (uint32_t)x_vec[i] * (uint32_t)y_vec[j];
            intermediate += (uint32_t)res_vec[i + j];
            intermediate += (uint16_t)carry;

            res_vec[i + j] = (uint16_t)(intermediate % (1 << 16));

            carry = (uint16_t)(intermediate / (1 << 16));
        }
    }

    /*-------------------------------------------------------------------------
    * Truncate to 64 bits of result.
    *------------------------------------------------------------------------*/
    uint32_t res_lo = 0;
    uint32_t res_hi = 0;

    for (i = 0; i < 2; i++)
    {
        res_lo |= res_vec[i]     << (16 * i);
        res_hi |= res_vec[i + 2] << (16 * i);
    }

    return _MAKE64(res_hi, res_lo);
}
