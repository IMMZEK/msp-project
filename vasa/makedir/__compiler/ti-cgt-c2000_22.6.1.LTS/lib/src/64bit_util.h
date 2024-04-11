#include <stdint.h>
#include <limits.h>
#include <_ti_config.h>
#include "abi_prefix.h"

#if defined (__PRU__)
#  define _LO32(x) ((uint32_t) ((uint64_t)x))
#  define _HI32(x) ((uint32_t)(((uint64_t)x) >> 32))
#  define _MAKE64(h, l) (((uint64_t)(h) << 32) | (l))
#elif defined(__TMS320C28XX_CLA__) && defined(__TI_EABI__)
#  define _LO32(x)      (__low_u32_from_u64(x))
#  define _HI32(x)      (__high_u32_from_u64(x))
#  define _MAKE64(h, l) (__u64_from_u32x2((h), (l)))
#else
#  error "Target not defined in 64bit_util.h"
#endif
