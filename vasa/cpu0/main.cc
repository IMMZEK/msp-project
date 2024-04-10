extern "C" {
#include "device.h"
#include "driverlib.h"
}

int main(void) {
  // Initialize device clock and peripherals
  Device_init();

#ifdef _STANDALONE
#ifdef _FLASH
  // Send boot command to allow the CPU2 application to begin execution
  Device_bootCPU2(C1C2_BROM_BOOTMODE_BOOT_FROM_FLASH);
#else
  // Send boot command to allow the CPU2 application to begin execution
  Device_bootCPU2(C1C2_BROM_BOOTMODE_BOOT_FROM_RAM);
#endif // _FLASH
#endif // _STANDALONE

  // Initialize GPIO and configure the GPIO pin as a push-pull output
  Device_initGPIO();
  GPIO_setPadConfig(DEVICE_GPIO_PIN_LED1, GPIO_PIN_TYPE_STD);
  GPIO_setDirectionMode(DEVICE_GPIO_PIN_LED1, GPIO_DIR_MODE_OUT);
  GPIO_setPadConfig(DEVICE_GPIO_PIN_LED2, GPIO_PIN_TYPE_STD);
  GPIO_setDirectionMode(DEVICE_GPIO_PIN_LED2, GPIO_DIR_MODE_OUT);

  // Configure CPU2 to control the LED GPIO
  GPIO_setMasterCore(DEVICE_GPIO_PIN_LED2, GPIO_CORE_CPU2);

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
    GPIO_writePin(DEVICE_GPIO_PIN_LED1, 0);

    //// Delay for a bit.
    DEVICE_DELAY_US(500000);

    // Turn off LED
    GPIO_writePin(DEVICE_GPIO_PIN_LED1, 1);

    // Delay for a bit.
    DEVICE_DELAY_US(500000);
  }
}
