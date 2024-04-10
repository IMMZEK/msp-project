extern "C" {
#include "device.h"
#include "driverlib.h"
}

int main(void) {
  // Initialize device clock and peripherals
  Device_init();

  // Initialize GPIO and configure the GPIO pin as a push-pull output
  //
  // This is configured by CPU1

  // Initialize PIE and clear PIE registers. Disables CPU interrupts.
  Interrupt_initModule();

  // Initialize the PIE vector table with pointers to the shell Interrupt
  // Service Routines (ISR).
  Interrupt_initVectorTable();

  // Enable Global Interrupt (INTM) and realtime interrupt (DBGM)
  EINT;
  ERTM;

  // Loop Forever
  for (;;) {
    // Turn on LED
    GPIO_writePin(DEVICE_GPIO_PIN_LED2, 0);

    // Delay for a bit.
    DEVICE_DELAY_US(500000);

    // Turn off LED
    GPIO_writePin(DEVICE_GPIO_PIN_LED2, 1);

    // Delay for a bit.
    DEVICE_DELAY_US(500000);
  }
}
