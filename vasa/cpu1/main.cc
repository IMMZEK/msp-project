extern "C" {
#include "device.h"
#include "driverlib.h"
}

int main(void) {
  Device_init();

  Device_initGPIO();
  GPIO_setPadConfig(3, GPIO_PIN_TYPE_STD);
  GPIO_setDirectionMode(3, GPIO_DIR_MODE_OUT);
  GPIO_setPadConfig(53, GPIO_PIN_TYPE_STD);
  GPIO_setDirectionMode(53, GPIO_DIR_MODE_OUT);

  // GPIO_setMasterCore(53, GPIO_CORE_CPU2);

  for (;;) {
    GPIO_writePin(3, 0);
    DEVICE_DELAY_US(500000);
    GPIO_writePin(3, 1);
    DEVICE_DELAY_US(500000);
  }
}
