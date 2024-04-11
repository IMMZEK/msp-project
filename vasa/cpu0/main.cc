extern "C" {
#include "device.h"
}

#define CPU1_PIN 40
#define CPU2_PIN 32

int main(void) {
  Device_init();
  Device_initGPIO();

  GPIO_setPadConfig(CPU1_PIN, GPIO_PIN_TYPE_PULLUP);
  GPIO_setDirectionMode(CPU1_PIN, GPIO_DIR_MODE_OUT);
  GPIO_setPadConfig(CPU2_PIN, GPIO_PIN_TYPE_PULLUP);
  GPIO_setDirectionMode(CPU2_PIN, GPIO_DIR_MODE_OUT);

  while (1) {
    GPIO_writePin(CPU1_PIN, 1);
    GPIO_writePin(CPU2_PIN, 1);
    DEVICE_DELAY_US(200000);
    GPIO_writePin(CPU1_PIN, 0);
    GPIO_writePin(CPU2_PIN, 0);
    DEVICE_DELAY_US(200000);
  }
}
