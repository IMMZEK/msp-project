extern "C" {
#include "device.h"
#include "driverlib.h"
}

#define CPU2_PIN 32
#define CPU1_PIN 40

int main(void) {
  Device_init();
  Device_initGPIO();

  GPIO_setPadConfig(CPU1_PIN, GPIO_PIN_TYPE_PULLUP);
  GPIO_setDirectionMode(CPU1_PIN, GPIO_DIR_MODE_OUT);
  GPIO_setPadConfig(CPU2_PIN, GPIO_PIN_TYPE_PULLUP);
  GPIO_setDirectionMode(CPU2_PIN, GPIO_DIR_MODE_OUT);

  // Configure CPU2 to control the LED GPIO
  GPIO_setMasterCore(CPU2_PIN, GPIO_CORE_CPU2);
  Interrupt_initModule();
  Interrupt_initVectorTable();
  EINT;
  ERTM;

  while (1) {
    GPIO_writePin(CPU1_PIN, 1);
    DEVICE_DELAY_US(1000);
    GPIO_writePin(CPU1_PIN, 0);
    DEVICE_DELAY_US(1000);
  }
}
