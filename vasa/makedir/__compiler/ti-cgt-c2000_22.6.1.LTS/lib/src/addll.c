#include "64bit_util.h"

int64_t __TI_P(addll)(int64_t x, int64_t y)
{
    uint32_t x_hi = _HI32((uint64_t)x);
    uint32_t y_hi = _HI32((uint64_t)y);

    uint32_t x_lo = _LO32((uint64_t)x);
    uint32_t y_lo = _LO32((uint64_t)y);

    uint32_t carry = (y_lo > (UINT32_MAX - x_lo)) ? 1 : 0;

    uint32_t res_u32_0 = x_lo + y_lo;
    uint32_t res_u32_1 = x_hi + y_hi + carry;

    uint64_t res_u64 = _MAKE64(res_u32_1, res_u32_0);

    return (int64_t)res_u64;
}
