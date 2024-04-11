#include "64bit_util.h"

/* -1 if x < y, 1 if x > y, 0 if x == y */

int __TI_P(cmpull)(uint64_t x, uint64_t y)
{
    uint32_t x_lo = _LO32(x);
    uint32_t x_hi = _HI32(x);

    uint32_t y_lo = _LO32(y);
    uint32_t y_hi = _HI32(y);

    if      (x_hi  < y_hi) return -1;
    else if (x_hi  > y_hi) return  1;
    else  /* x_hi == y_hi */
    {
        if      (x_lo  < y_lo)   return -1;
        else if (x_lo  > y_lo)   return  1;
              /* x_lo == y_lo */ return  0;
    }
}

int __TI_P(cmplli)(int64_t x, int64_t y)
{
    uint32_t x_isneg = _HI32((uint64_t)x) >> 31;
    uint32_t y_isneg = _HI32((uint64_t)y) >> 31;

    if      ( x_isneg && !y_isneg) return -1;
    else if (!x_isneg &&  y_isneg) return  1;

    /* Same sign, must check magnitudes */
    uint64_t x_mag = (uint64_t)(x_isneg ? -x : x);
    uint64_t y_mag = (uint64_t)(y_isneg ? -y : y);

    return __TI_P(cmpull)(x_mag, y_mag);
}
