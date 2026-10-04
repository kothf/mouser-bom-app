export interface SampleBom {
  name: string;
  description: string;
  items: Array<{
    partNumber: string;
    quantity: number;
    designator: string;
    description: string;
  }>;
}

export const SAMPLE_BOMS: Record<string, SampleBom> = {
  iotNode: {
    name: 'Smart IoT Environmental Sensor Node',
    description: 'ESP32 Wi-Fi/BLE MCU, Power Supply, Sensors & Passives',
    items: [
      {
        partNumber: 'ESP32-WROOM-32E',
        quantity: 2,
        designator: 'U1',
        description: 'Wi-Fi & Bluetooth Dual Core MCU Module with 4MB Flash',
      },
      {
        partNumber: 'LM2596S-5.0/NOPB',
        quantity: 1,
        designator: 'U2',
        description: '3A Step-Down Voltage Regulator 5.0V',
      },
      {
        partNumber: 'RC0603FR-0710KL',
        quantity: 25,
        designator: 'R1-R25',
        description: '10K Ohm 1% 1/10W 0603 Surface Mount Resistor',
      },
      {
        partNumber: 'CC0603KRX7R9BB104',
        quantity: 20,
        designator: 'C1-C20',
        description: '0.1uF 50V X7R 10% 0603 Ceramic Capacitor',
      },
      {
        partNumber: 'BZX84C5V1',
        quantity: 2,
        designator: 'D1, D2',
        description: 'Zener Diode 5.1V 250mW SOT-23',
      },
      {
        partNumber: 'USB4105-GF-A',
        quantity: 1,
        designator: 'J1',
        description: 'USB Type-C Receptacle 16 Pin Mid-Mount',
      },
    ],
  },
  motorController: {
    name: 'STM32 Industrial Motor Controller',
    description: 'STM32F4 Cortex-M4 MCU, Op-Amps, Timer & Filter Passives',
    items: [
      {
        partNumber: 'STM32F401RET6',
        quantity: 1,
        designator: 'U1',
        description: 'ARM Cortex-M4 32-bit MCU 84MHz 512KB Flash LQFP-64',
      },
      {
        partNumber: 'LM358DR',
        quantity: 2,
        designator: 'U3, U4',
        description: 'Dual Operational Amplifier SOIC-8 Current Sense',
      },
      {
        partNumber: 'NE555DR',
        quantity: 1,
        designator: 'U5',
        description: 'Precision Timer SOIC-8',
      },
      {
        partNumber: 'RC0603FR-0710KL',
        quantity: 50,
        designator: 'R1-R50',
        description: '10k Ohm 0603 1%',
      },
      {
        partNumber: 'CC0603KRX7R9BB104',
        quantity: 40,
        designator: 'C1-C40',
        description: '100nF 50V 0603 Ceramic Capacitor',
      },
      {
        partNumber: 'ATMEGA328P-PU',
        quantity: 1,
        designator: 'U2',
        description: 'Co-processor 8-bit AVR 20MHz DIP-28',
      },
    ],
  },
  hammondPowerSupply: {
    name: 'Hammond High-Voltage Tube Power Supply',
    description: 'Hammond 373BX Plate/Filament Transformer & 159Q Filter Choke',
    items: [
      {
        partNumber: '546-373BX',
        quantity: 1,
        designator: 'PWR_XFRM',
        description: 'Hammond 373BX 700VCT 201mA Transformer',
      },
      {
        partNumber: '546-159Q',
        quantity: 1,
        designator: 'CHOKE',
        description: 'Hammond 159Q 7H 150mA Filter Choke',
      },
    ],
  },
};
