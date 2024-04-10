extern "C" {
#include "device.h"
#include "driverlib.h"
}

#define CPU2_PIN 32
#define CPU1_PIN 40

int main(void) {
  Device_init();
  Interrupt_initModule();
  Interrupt_initVectorTable();
  EINT;
  ERTM;

  while (1) {
    GPIO_writePin(CPU2_PIN, 1);
    DEVICE_DELAY_US(1000000);
    GPIO_writePin(CPU2_PIN, 0);
    DEVICE_DELAY_US(1000000);
  }
}
