#include "64bit_util.h"

int64_t __TI_P(abslli)(int64_t x)
{
    return (x < 0) ? -x : x;
}
