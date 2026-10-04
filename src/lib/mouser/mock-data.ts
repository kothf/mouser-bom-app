import { MouserPart } from './types';

/**
 * High-fidelity catalog of popular electronic components for demo mode,
 * testing, and offline fallback when API keys are not supplied or rate-limited.
 */
export const MOCK_CATALOG: Record<string, MouserPart> = {
  'STM32F401RET6': {
    Availability: '4,120 In Stock',
    DataSheetUrl: 'https://www.st.com/resource/en/datasheet/stm32f401re.pdf',
    Description: 'ARM Microcontrollers - MCU Mainstream ARM Cortex-M4 MCU with DSP and FPU, 512 Kbytes Flash, 84 MHz CPU, ART Accelerator',
    FactoryStock: '12000',
    ImagePath: 'https://www.mouser.com/images/stmicroelectronics/images/LQFP_64_t.jpg',
    Category: 'Embedded Processors & Controllers > Microcontrollers - MCU',
    LeadTime: '12 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'STMicroelectronics',
    ManufacturerPartNumber: 'STM32F401RET6',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '511-STM32F401RET6',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/STMicroelectronics/STM32F401RET6',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$7.85', Currency: 'USD' },
      { Quantity: 10, Price: '$6.90', Currency: 'USD' },
      { Quantity: 25, Price: '$6.20', Currency: 'USD' },
      { Quantity: 100, Price: '$5.45', Currency: 'USD' },
      { Quantity: 500, Price: '$4.95', Currency: 'USD' },
    ],
  },
  'ESP32-WROOM-32E': {
    Availability: '8,450 In Stock',
    DataSheetUrl: 'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf',
    Description: 'WiFi Modules - 802.11 Wi-Fi & BT / BLE MCU Module with PCB antenna, 4MB Flash',
    FactoryStock: '25000',
    ImagePath: 'https://www.mouser.com/images/espressif/images/ESP32-WROOM-32E_t.jpg',
    Category: 'Wireless & RF Modules > WiFi Modules',
    LeadTime: '8 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Espressif Systems',
    ManufacturerPartNumber: 'ESP32-WROOM-32E',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '356-ESP32-WROOM-32E',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Espressif-Systems/ESP32-WROOM-32E',
    Reeling: true,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$3.50', Currency: 'USD' },
      { Quantity: 10, Price: '$3.10', Currency: 'USD' },
      { Quantity: 50, Price: '$2.80', Currency: 'USD' },
      { Quantity: 250, Price: '$2.45', Currency: 'USD' },
      { Quantity: 1000, Price: '$2.15', Currency: 'USD' },
    ],
  },
  'ATMEGA328P-PU': {
    Availability: '1,890 In Stock',
    DataSheetUrl: 'https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf',
    Description: '8-bit Microcontrollers - MCU 32KB In-system Flash 20MHz 1.8V-5.5V DIP-28',
    FactoryStock: '5000',
    ImagePath: 'https://www.mouser.com/images/microchip/images/28-PDIP_t.jpg',
    Category: 'Embedded Processors & Controllers > Microcontrollers - MCU',
    LeadTime: '10 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Microchip Technology',
    ManufacturerPartNumber: 'ATMEGA328P-PU',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '556-ATMEGA328P-PU',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Microchip-Technology/ATMEGA328P-PU',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$2.95', Currency: 'USD' },
      { Quantity: 10, Price: '$2.60', Currency: 'USD' },
      { Quantity: 25, Price: '$2.35', Currency: 'USD' },
      { Quantity: 100, Price: '$2.05', Currency: 'USD' },
    ],
  },
  'LM2596S-5.0/NOPB': {
    Availability: '3,210 In Stock',
    DataSheetUrl: 'https://www.ti.com/lit/ds/symlink/lm2596.pdf',
    Description: 'Switching Voltage Regulators 3A Step-Down Voltage Regulator TO-263-5',
    FactoryStock: '8000',
    ImagePath: 'https://www.mouser.com/images/texas-instruments/images/KTT0005B_t.jpg',
    Category: 'Power Management ICs > Voltage Regulators',
    LeadTime: '6 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Texas Instruments',
    ManufacturerPartNumber: 'LM2596S-5.0/NOPB',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '926-LM2596S-5.0/NOPB',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Texas-Instruments/LM2596S-5.0-NOPB',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$3.40', Currency: 'USD' },
      { Quantity: 10, Price: '$3.00', Currency: 'USD' },
      { Quantity: 50, Price: '$2.65', Currency: 'USD' },
      { Quantity: 250, Price: '$2.25', Currency: 'USD' },
    ],
  },
  'RC0603FR-0710KL': {
    Availability: '125,000 In Stock',
    DataSheetUrl: 'https://www.yageo.com/upload/products/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf',
    Description: 'Thick Film Resistors - SMD 10K OHM 1% 1/10W 0603 Surface Mount',
    FactoryStock: '500000',
    ImagePath: 'https://www.mouser.com/images/yageo/images/RC0603_t.jpg',
    Category: 'Resistors > SMD Resistors / Chip Resistors',
    LeadTime: '4 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Yageo',
    ManufacturerPartNumber: 'RC0603FR-0710KL',
    Min: '10',
    Mult: '10',
    MouserPartNumber: '603-RC0603FR-0710KL',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Yageo/RC0603FR-0710KL',
    Reeling: true,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 10, Price: '$0.10', Currency: 'USD' },
      { Quantity: 50, Price: '$0.05', Currency: 'USD' },
      { Quantity: 100, Price: '$0.03', Currency: 'USD' },
      { Quantity: 1000, Price: '$0.012', Currency: 'USD' },
      { Quantity: 5000, Price: '$0.007', Currency: 'USD' },
    ],
  },
  'CC0603KRX7R9BB104': {
    Availability: '95,400 In Stock',
    DataSheetUrl: 'https://www.yageo.com/upload/products/productsearch/datasheet/mlcc/UPY-GPHC_X7R_6.3V-to-50V_21.pdf',
    Description: 'Multilayer Ceramic Capacitors MLCC - SMD/SMT 0.1uF 50V X7R 10% 0603',
    FactoryStock: '300000',
    ImagePath: 'https://www.mouser.com/images/yageo/images/CC0603_t.jpg',
    Category: 'Capacitors > Ceramic Capacitors',
    LeadTime: '4 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Yageo',
    ManufacturerPartNumber: 'CC0603KRX7R9BB104',
    Min: '10',
    Mult: '10',
    MouserPartNumber: '603-CC0603KRX7R9BB104',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Yageo/CC0603KRX7R9BB104',
    Reeling: true,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 10, Price: '$0.12', Currency: 'USD' },
      { Quantity: 50, Price: '$0.06', Currency: 'USD' },
      { Quantity: 100, Price: '$0.035', Currency: 'USD' },
      { Quantity: 1000, Price: '$0.016', Currency: 'USD' },
      { Quantity: 4000, Price: '$0.009', Currency: 'USD' },
    ],
  },
  'LM358DR': {
    Availability: '45,200 In Stock',
    DataSheetUrl: 'https://www.ti.com/lit/ds/symlink/lm358.pdf',
    Description: 'Operational Amplifiers - Op Amps Dual Industry-Standard Low-Power Operational Amplifier SOIC-8',
    FactoryStock: '80000',
    ImagePath: 'https://www.mouser.com/images/texas-instruments/images/D0008A_t.jpg',
    Category: 'Amplifier ICs > Operational Amplifiers - Op Amps',
    LeadTime: '6 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Texas Instruments',
    ManufacturerPartNumber: 'LM358DR',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '595-LM358DR',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Texas-Instruments/LM358DR',
    Reeling: true,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$0.52', Currency: 'USD' },
      { Quantity: 25, Price: '$0.41', Currency: 'USD' },
      { Quantity: 100, Price: '$0.32', Currency: 'USD' },
      { Quantity: 500, Price: '$0.24', Currency: 'USD' },
      { Quantity: 2500, Price: '$0.17', Currency: 'USD' },
    ],
  },
  'BZX84C5V1': {
    Availability: '14,200 In Stock',
    DataSheetUrl: 'https://assets.nexperia.com/documents/data-sheet/BZX84_SERIES.pdf',
    Description: 'Zener Diodes 5.1V 250mW SOT-23 Zener Voltage Regulators',
    FactoryStock: '50000',
    ImagePath: 'https://www.mouser.com/images/nexperia/images/SOT-23_t.jpg',
    Category: 'Discrete Semiconductors > Diodes & Rectifiers > Zener Diodes',
    LeadTime: '6 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Nexperia',
    ManufacturerPartNumber: 'BZX84C5V1,215',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '771-BZX84C5V1215',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Nexperia/BZX84C5V1215',
    Reeling: true,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$0.28', Currency: 'USD' },
      { Quantity: 25, Price: '$0.19', Currency: 'USD' },
      { Quantity: 100, Price: '$0.12', Currency: 'USD' },
      { Quantity: 500, Price: '$0.08', Currency: 'USD' },
    ],
  },
  'USB4105-GF-A': {
    Availability: '0 In Stock',
    DataSheetUrl: 'https://gct.co/files/drawings/usb4105.pdf',
    Description: 'USB Connectors USB Type-C Receptacle 16 Pin Mid-Mount SMT 0.48mm',
    FactoryStock: '1500',
    ImagePath: 'https://www.mouser.com/images/gct/images/USB4105_t.jpg',
    Category: 'Connectors > USB Connectors',
    LeadTime: '14 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'GCT',
    ManufacturerPartNumber: 'USB4105-GF-A',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '640-USB4105-GF-A',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/GCT/USB4105-GF-A',
    Reeling: true,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$1.45', Currency: 'USD' },
      { Quantity: 10, Price: '$1.25', Currency: 'USD' },
      { Quantity: 100, Price: '$0.98', Currency: 'USD' },
      { Quantity: 500, Price: '$0.82', Currency: 'USD' },
    ],
  },
  'NE555DR': {
    Availability: '28,900 In Stock',
    DataSheetUrl: 'https://www.ti.com/lit/ds/symlink/ne555.pdf',
    Description: 'Timers & Support Products Precision Timer 8-SOIC',
    FactoryStock: '75000',
    ImagePath: 'https://www.mouser.com/images/texas-instruments/images/D0008A_t.jpg',
    Category: 'Clock & Timer ICs > Timers & Support Products',
    LeadTime: '4 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Texas Instruments',
    ManufacturerPartNumber: 'NE555DR',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '595-NE555DR',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Texas-Instruments/NE555DR',
    Reeling: true,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$0.45', Currency: 'USD' },
      { Quantity: 25, Price: '$0.35', Currency: 'USD' },
      { Quantity: 100, Price: '$0.28', Currency: 'USD' },
      { Quantity: 500, Price: '$0.20', Currency: 'USD' },
    ],
  },
  '546-373BX': {
    Availability: '18 In Stock',
    DataSheetUrl: 'https://www.hammfg.com/files/parts/pdf/373BX.pdf',
    Description: 'Power Transformers 700VCT 201mA 50/60Hz Plate & Filament Transformer Chassis Mount',
    FactoryStock: '45',
    ImagePath: 'https://www.mouser.com/images/hammondmanufacturing/images/300_series_t.jpg',
    Category: 'Transformers > Power Transformers',
    LeadTime: '10 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Hammond Manufacturing',
    ManufacturerPartNumber: '373BX',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '546-373BX',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Hammond-Manufacturing/373BX',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$148.50', Currency: 'USD' },
      { Quantity: 5, Price: '$138.25', Currency: 'USD' },
      { Quantity: 10, Price: '$129.80', Currency: 'USD' },
      { Quantity: 25, Price: '$121.50', Currency: 'USD' },
    ],
  },
  '373BX': {
    Availability: '18 In Stock',
    DataSheetUrl: 'https://www.hammfg.com/files/parts/pdf/373BX.pdf',
    Description: 'Power Transformers 700VCT 201mA 50/60Hz Plate & Filament Transformer Chassis Mount',
    FactoryStock: '45',
    ImagePath: 'https://www.mouser.com/images/hammondmanufacturing/images/300_series_t.jpg',
    Category: 'Transformers > Power Transformers',
    LeadTime: '10 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Hammond Manufacturing',
    ManufacturerPartNumber: '373BX',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '546-373BX',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Hammond-Manufacturing/373BX',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$148.50', Currency: 'USD' },
      { Quantity: 5, Price: '$138.25', Currency: 'USD' },
      { Quantity: 10, Price: '$129.80', Currency: 'USD' },
      { Quantity: 25, Price: '$121.50', Currency: 'USD' },
    ],
  },
  '546-159Q': {
    Availability: '62 In Stock',
    DataSheetUrl: 'https://www.hammfg.com/files/parts/pdf/159Q.pdf',
    Description: 'Audio Transformers / Chokes 7H 150mA Filter Choke Chassis Mount',
    FactoryStock: '150',
    ImagePath: 'https://www.mouser.com/images/hammondmanufacturing/images/150_series_t.jpg',
    Category: 'Transformers > Audio Transformers / Inductors & Chokes',
    LeadTime: '8 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Hammond Manufacturing',
    ManufacturerPartNumber: '159Q',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '546-159Q',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Hammond-Manufacturing/159Q',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$36.20', Currency: 'USD' },
      { Quantity: 10, Price: '$33.50', Currency: 'USD' },
      { Quantity: 25, Price: '$30.90', Currency: 'USD' },
      { Quantity: 50, Price: '$28.40', Currency: 'USD' },
    ],
  },
  '159Q': {
    Availability: '62 In Stock',
    DataSheetUrl: 'https://www.hammfg.com/files/parts/pdf/159Q.pdf',
    Description: 'Audio Transformers / Chokes 7H 150mA Filter Choke Chassis Mount',
    FactoryStock: '150',
    ImagePath: 'https://www.mouser.com/images/hammondmanufacturing/images/150_series_t.jpg',
    Category: 'Transformers > Audio Transformers / Inductors & Chokes',
    LeadTime: '8 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Hammond Manufacturing',
    ManufacturerPartNumber: '159Q',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '546-159Q',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Hammond-Manufacturing/159Q',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$36.20', Currency: 'USD' },
      { Quantity: 10, Price: '$33.50', Currency: 'USD' },
      { Quantity: 25, Price: '$30.90', Currency: 'USD' },
      { Quantity: 50, Price: '$28.40', Currency: 'USD' },
    ],
  },
  '594-MBB02070C4703FCT': {
    Availability: '12,883 In Stock',
    DataSheetUrl: 'https://www.vishay.com/docs/28766/mbb0207.pdf',
    Description: 'Metal Film Resistors - Through Hole 0.6W 470k ohms 1% 0207 Axial',
    FactoryStock: '50000',
    ImagePath: 'https://www.mouser.com/images/vishay/images/mbb0207_t.jpg',
    Category: 'Resistors > Metal Film Resistors',
    LeadTime: '6 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Vishay / Beyschlag',
    ManufacturerPartNumber: 'MBB02070C4703FCT00',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '594-MBB02070C4703FCT',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Vishay-Beyschlag/MBB02070C4703FCT00',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$0.35', Currency: 'USD' },
      { Quantity: 10, Price: '$0.22', Currency: 'USD' },
      { Quantity: 50, Price: '$0.15', Currency: 'USD' },
      { Quantity: 100, Price: '$0.098', Currency: 'USD' },
      { Quantity: 1000, Price: '$0.045', Currency: 'USD' },
    ],
  },
  'MBB02070C4703FCT': {
    Availability: '12,883 In Stock',
    DataSheetUrl: 'https://www.vishay.com/docs/28766/mbb0207.pdf',
    Description: 'Metal Film Resistors - Through Hole 0.6W 470k ohms 1% 0207 Axial',
    FactoryStock: '50000',
    ImagePath: 'https://www.mouser.com/images/vishay/images/mbb0207_t.jpg',
    Category: 'Resistors > Metal Film Resistors',
    LeadTime: '6 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Vishay / Beyschlag',
    ManufacturerPartNumber: 'MBB02070C4703FCT00',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '594-MBB02070C4703FCT',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Vishay-Beyschlag/MBB02070C4703FCT00',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$0.35', Currency: 'USD' },
      { Quantity: 10, Price: '$0.22', Currency: 'USD' },
      { Quantity: 50, Price: '$0.15', Currency: 'USD' },
      { Quantity: 100, Price: '$0.098', Currency: 'USD' },
      { Quantity: 1000, Price: '$0.045', Currency: 'USD' },
    ],
  },
  '279-ROX1SJ360R': {
    Availability: '3,189 In Stock',
    DataSheetUrl: 'https://www.te.com/commerce/DocumentDelivery/DDEController?Action=showdoc&DocId=Data+Sheet%7F1773269%7FA%7Fpdf%7FEnglish%7FENG_DS_1773269_A.pdf',
    Description: 'Metal Oxide Resistors 1W 360 Ohms 5% Flameproof Axial',
    FactoryStock: '15000',
    ImagePath: 'https://www.mouser.com/images/teconnectivity/images/ROX1_t.jpg',
    Category: 'Resistors > Metal Oxide Resistors',
    LeadTime: '8 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'TE Connectivity / Neohm',
    ManufacturerPartNumber: 'ROX1SJ360R',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '279-ROX1SJ360R',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/TE-Connectivity-Neohm/ROX1SJ360R',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$0.48', Currency: 'USD' },
      { Quantity: 10, Price: '$0.36', Currency: 'USD' },
      { Quantity: 50, Price: '$0.28', Currency: 'USD' },
      { Quantity: 100, Price: '$0.21', Currency: 'USD' },
      { Quantity: 500, Price: '$0.15', Currency: 'USD' },
    ],
  },
  'ROX1SJ360R': {
    Availability: '3,189 In Stock',
    DataSheetUrl: 'https://www.te.com/commerce/DocumentDelivery/DDEController?Action=showdoc&DocId=Data+Sheet%7F1773269%7FA%7Fpdf%7FEnglish%7FENG_DS_1773269_A.pdf',
    Description: 'Metal Oxide Resistors 1W 360 Ohms 5% Flameproof Axial',
    FactoryStock: '15000',
    ImagePath: 'https://www.mouser.com/images/teconnectivity/images/ROX1_t.jpg',
    Category: 'Resistors > Metal Oxide Resistors',
    LeadTime: '8 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'TE Connectivity / Neohm',
    ManufacturerPartNumber: 'ROX1SJ360R',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '279-ROX1SJ360R',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/TE-Connectivity-Neohm/ROX1SJ360R',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$0.48', Currency: 'USD' },
      { Quantity: 10, Price: '$0.36', Currency: 'USD' },
      { Quantity: 50, Price: '$0.28', Currency: 'USD' },
      { Quantity: 100, Price: '$0.21', Currency: 'USD' },
      { Quantity: 500, Price: '$0.15', Currency: 'USD' },
    ],
  },
  '71-RH0251K500FE02': {
    Availability: '5,668 In Stock',
    DataSheetUrl: 'https://www.vishay.com/docs/30201/rhnh.pdf',
    Description: 'Wirewound Resistors - Chassis Mount 25W 1.5K Ohm 1% Aluminum Housed',
    FactoryStock: '12000',
    ImagePath: 'https://www.mouser.com/images/vishay/images/rh_t.jpg',
    Category: 'Resistors > Wirewound Resistors > Chassis Mount Resistors',
    LeadTime: '14 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Vishay / Dale',
    ManufacturerPartNumber: 'RH0251K500FE02',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '71-RH0251K500FE02',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Vishay-Dale/RH0251K500FE02',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$11.85', Currency: 'USD' },
      { Quantity: 10, Price: '$10.40', Currency: 'USD' },
      { Quantity: 25, Price: '$9.60', Currency: 'USD' },
      { Quantity: 50, Price: '$8.90', Currency: 'USD' },
      { Quantity: 100, Price: '$8.15', Currency: 'USD' },
    ],
  },
  'RH0251K500FE02': {
    Availability: '5,668 In Stock',
    DataSheetUrl: 'https://www.vishay.com/docs/30201/rhnh.pdf',
    Description: 'Wirewound Resistors - Chassis Mount 25W 1.5K Ohm 1% Aluminum Housed',
    FactoryStock: '12000',
    ImagePath: 'https://www.mouser.com/images/vishay/images/rh_t.jpg',
    Category: 'Resistors > Wirewound Resistors > Chassis Mount Resistors',
    LeadTime: '14 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Vishay / Dale',
    ManufacturerPartNumber: 'RH0251K500FE02',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '71-RH0251K500FE02',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Vishay-Dale/RH0251K500FE02',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$11.85', Currency: 'USD' },
      { Quantity: 10, Price: '$10.40', Currency: 'USD' },
      { Quantity: 25, Price: '$9.60', Currency: 'USD' },
      { Quantity: 50, Price: '$8.90', Currency: 'USD' },
      { Quantity: 100, Price: '$8.15', Currency: 'USD' },
    ],
  },
  '71-RH0501K500FE02': {
    Availability: '3,420 In Stock',
    DataSheetUrl: 'https://www.vishay.com/docs/30201/rhnh.pdf',
    Description: 'Wirewound Resistors - Chassis Mount 50W 1.5K Ohm 1% Aluminum Housed',
    FactoryStock: '8000',
    ImagePath: 'https://www.mouser.com/images/vishay/images/rh_t.jpg',
    Category: 'Resistors > Wirewound Resistors > Chassis Mount Resistors',
    LeadTime: '14 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Vishay / Dale',
    ManufacturerPartNumber: 'RH0501K500FE02',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '71-RH0501K500FE02',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Vishay-Dale/RH0501K500FE02',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$14.20', Currency: 'USD' },
      { Quantity: 10, Price: '$12.60', Currency: 'USD' },
      { Quantity: 25, Price: '$11.50', Currency: 'USD' },
      { Quantity: 50, Price: '$10.80', Currency: 'USD' },
    ],
  },
  'RH0501K500FE02': {
    Availability: '3,420 In Stock',
    DataSheetUrl: 'https://www.vishay.com/docs/30201/rhnh.pdf',
    Description: 'Wirewound Resistors - Chassis Mount 50W 1.5K Ohm 1% Aluminum Housed',
    FactoryStock: '8000',
    ImagePath: 'https://www.mouser.com/images/vishay/images/rh_t.jpg',
    Category: 'Resistors > Wirewound Resistors > Chassis Mount Resistors',
    LeadTime: '14 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: 'Vishay / Dale',
    ManufacturerPartNumber: 'RH0501K500FE02',
    Min: '1',
    Mult: '1',
    MouserPartNumber: '71-RH0501K500FE02',
    ProductDetailUrl: 'https://www.mouser.com/ProductDetail/Vishay-Dale/RH0501K500FE02',
    Reeling: false,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: 1, Price: '$14.20', Currency: 'USD' },
      { Quantity: 10, Price: '$12.60', Currency: 'USD' },
      { Quantity: 25, Price: '$11.50', Currency: 'USD' },
      { Quantity: 50, Price: '$10.80', Currency: 'USD' },
    ],
  },
};

/**
 * Generates dynamic simulated component data for arbitrary part numbers
 * so that any user-uploaded BOM can be demonstrated with realistic Mouser attributes.
 */
export function generateSyntheticPart(query: string, notes?: string, designator?: string): MouserPart {
  const clean = query.trim().toUpperCase();
  const strippedPn = clean.replace(/^[0-9]{2,4}-/, '');
  const combined = `${clean} ${strippedPn} ${notes || ''} ${designator || ''}`.toUpperCase();
  const hash = Array.from(clean).reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const isPowerResistor =
    /CHASSIS|ALUMINUM|WIREWOUND|POWER RESISTOR|\b[0-9]+W\b|\bRH0|\bNH0|\bHSC|\bWH[0-9]|\bHS[0-9]|\bKAL[0-9]/i.test(
      combined
    ) || /^(RH0|NH0|HSC|WH|KAL|HS\d|TE\d|TAP\d|TCH\d)/i.test(strippedPn);

  const isResistor =
    isPowerResistor ||
    /RESISTOR|METAL FILM|METAL OXIDE|CARBON FILM|THICK FILM|THIN FILM|\bOHM\b|\bKOHM\b|\bMOHM\b|\b[0-9]+[RKM][0-9]*\b/i.test(
      combined
    ) ||
    /^(R|RC|CRCW|RES|MBB|ROX|MFR|RN|CMF|PR|WR|LR|SMA0207|SFR)/i.test(strippedPn) ||
    (designator ? /^R\d+/i.test(designator.trim()) : false);

  const isHighVoltageCap =
    /500V|450V|400V|600V|630V|ELECTROLYTIC CAN|AXIAL ELECTROLYTIC|TUBE CAP|TVA\d|B43|PEG124/i.test(
      combined
    ) || /^(TVA|B43|PEG)/i.test(strippedPn);

  const isCapacitor =
    isHighVoltageCap ||
    /CAPACITOR|CERAMIC|MLCC|ELECTROLYTIC|TANTALUM|FILM CAP|\bUF\b|\bNF\b|\bPF\b/i.test(
      combined
    ) ||
    /^(C|CC|GRM|CAP|EEU|UVR|ECE|T491)/i.test(strippedPn) ||
    (designator ? /^C\d+/i.test(designator.trim()) : false);

  const isTransformer =
    /TRANSFORMER|XFRM/i.test(combined) ||
    (designator ? /^T\d+/i.test(designator.trim()) : false);

  const isChokeOrInductor =
    /CHOKE|INDUCTOR|COIL/i.test(combined) ||
    (designator ? /^L\d+/i.test(designator.trim()) : false);

  const isTube =
    /TUBE|VALVE|\b12AX7\b|\bECC83\b|\b6L6\b|\bEL34\b|\b6V6\b|\bKT88\b|\b5AR4\b|\bGZ34\b/i.test(
      combined
    ) || /^(12AX7|ECC83|6L6|EL34|6V6|KT88|5AR4|GZ34)/i.test(strippedPn);

  const isConnector = /^(CONN|HDR|USB|MOLEX|JST)/i.test(strippedPn) || /CONNECTOR|HEADER|SOCKET|JACK/i.test(combined);

  // Realistic baseline pricing by component class
  let basePrice = 1.25;
  let category = 'Integrated Circuits';
  let moq = 1;
  let itemDescription = notes || '';

  if (isPowerResistor) {
    // 10W - 50W aluminum housed wirewound chassis mount resistors typically $9.50 - $14.50
    basePrice = 9.85 + (hash % 10) * 0.45;
    category = 'Resistors > Wirewound Resistors > Chassis Mount Resistors';
    moq = 1;
    if (!itemDescription) {
      const wattMatch = clean.match(/RH0?(\d+)/i) || combined.match(/(\d+)W/i);
      const wattage = wattMatch ? `${parseInt(wattMatch[1], 10)}W` : '25W';
      itemDescription = `Wirewound Resistors - Chassis Mount ${wattage} Precision Aluminum Housed Resistor`;
    }
  } else if (isResistor) {
    basePrice = 0.25 + (hash % 20) * 0.01; // $0.25 - $0.45 per piece
    category = 'Resistors > Metal Film / SMD Resistors';
    moq = 1;
    if (!itemDescription) {
      itemDescription = `Precision Resistor - ${clean} standard specification`;
    }
  } else if (isHighVoltageCap) {
    basePrice = 8.50 + (hash % 15) * 0.5; // $8.50 - $16.00
    category = 'Capacitors > Aluminum Electrolytic Capacitors - Leaded / High Voltage';
    moq = 1;
    if (!itemDescription) {
      itemDescription = `High-Voltage Electrolytic Filter Capacitor - ${clean}`;
    }
  } else if (isCapacitor) {
    basePrice = 0.20 + (hash % 30) * 0.01; // $0.20 - $0.50 per piece
    category = 'Capacitors > Ceramic / Film Capacitors';
    moq = 1;
    if (!itemDescription) {
      itemDescription = `Multilayer Ceramic / Film Capacitor - ${clean}`;
    }
  } else if (isTransformer) {
    basePrice = 45.0 + (hash % 80); // $45 - $125
    category = 'Transformers > Power Transformers';
    moq = 1;
    if (!itemDescription) {
      itemDescription = `Power Transformer - ${clean}`;
    }
  } else if (isChokeOrInductor) {
    basePrice = 18.0 + (hash % 25); // $18 - $43
    category = 'Inductors, Chokes & Coils';
    moq = 1;
    if (!itemDescription) {
      itemDescription = `Filter Choke / Inductor - ${clean}`;
    }
  } else if (isTube) {
    basePrice = 28.0 + (hash % 30); // $28 - $58
    category = 'Vacuum Tubes & Accessories';
    moq = 1;
    if (!itemDescription) {
      itemDescription = `Vacuum Tube Audio Component - ${clean}`;
    }
  } else if (isConnector) {
    basePrice = 1.45 + (hash % 5) * 0.4;
    category = 'Connectors';
    moq = 1;
  } else {
    basePrice = 1.15 + (hash % 10) * 0.35; // $1.15 - $4.65
    if (!itemDescription) {
      itemDescription = `Electronic Component - ${clean} standard industrial specification`;
    }
  }

  const stock = (hash * 37) % 15000;
  const mult = moq;

  const mfrPrefix = isPowerResistor
    ? 'Vishay / Dale'
    : isResistor
    ? 'Vishay / Dale'
    : isHighVoltageCap
    ? 'Vishay / Sprague'
    : isCapacitor
    ? 'Yageo'
    : isTransformer || isChokeOrInductor
    ? 'Hammond Manufacturing'
    : isTube
    ? 'JJ Electronic'
    : ['Texas Instruments', 'STMicroelectronics', 'Microchip Technology', 'Analog Devices', 'Vishay'][hash % 5];

  const mfrCode = isPowerResistor || isResistor
    ? '71'
    : isHighVoltageCap || isCapacitor
    ? '603'
    : isTransformer || isChokeOrInductor
    ? '546'
    : '595';

  return {
    Availability: stock > 0 ? `${stock.toLocaleString()} In Stock` : '0 In Stock',
    Description: itemDescription,
    FactoryStock: `${(stock * 2).toLocaleString()}`,
    Category: category,
    LeadTime: '8 Weeks',
    LifecycleStatus: 'Active',
    Manufacturer: mfrPrefix,
    ManufacturerPartNumber: strippedPn,
    Min: `${moq}`,
    Mult: `${mult}`,
    MouserPartNumber: clean.includes('-') ? clean : `${mfrCode}-${clean}`,
    ProductDetailUrl: `https://www.mouser.com/c/?q=${encodeURIComponent(clean)}`,
    Reeling: isResistor || isCapacitor,
    ROHSStatus: 'RoHS Compliant',
    PriceBreaks: [
      { Quantity: moq, Price: `$${basePrice.toFixed(2)}`, Currency: 'USD' },
      { Quantity: moq * 10, Price: `$${(basePrice * 0.88).toFixed(2)}`, Currency: 'USD' },
      { Quantity: moq * 25, Price: `$${(basePrice * 0.81).toFixed(2)}`, Currency: 'USD' },
      { Quantity: moq * 100, Price: `$${(basePrice * 0.72).toFixed(2)}`, Currency: 'USD' },
    ],
  };
}

/**
 * Searches the mock catalog or generates a high-quality synthetic part match.
 */
export function searchMockCatalog(query: string, notes?: string, designator?: string): MouserPart[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const strippedQ = q.replace(/^[0-9]{2,4}-/, '');

  // 1. Exact match on Key, Stripped Key, MPN, or Mouser PN
  const exactMatches = Object.entries(MOCK_CATALOG)
    .filter(([key, part]) => {
      const k = key.toUpperCase();
      const strippedK = k.replace(/^[0-9]{2,4}-/, '');
      const mpn = part.ManufacturerPartNumber.toUpperCase();
      const mouserPn = part.MouserPartNumber.toUpperCase();
      return k === q || strippedK === strippedQ || mpn === q || mpn === strippedQ || mouserPn === q;
    })
    .map(([, part]) => part);

  if (exactMatches.length > 0) {
    return Array.from(new Map(exactMatches.map((p) => [p.MouserPartNumber, p])).values());
  }

  // 2. Keyword/substring search across catalog (if query has at least 3 chars)
  if (q.length >= 3) {
    const keywordMatches = Object.values(MOCK_CATALOG).filter((part) => {
      return (
        part.Description?.toUpperCase().includes(q) ||
        part.Manufacturer?.toUpperCase().includes(q) ||
        part.Category?.toUpperCase().includes(q) ||
        part.ManufacturerPartNumber?.toUpperCase().includes(q) ||
        part.MouserPartNumber?.toUpperCase().includes(q)
      );
    });

    if (keywordMatches.length > 0) {
      return Array.from(new Map(keywordMatches.map((p) => [p.MouserPartNumber, p])).values());
    }
  }

  // 3. Fallback to synthetic part generator
  return [generateSyntheticPart(query, notes, designator)];
}
