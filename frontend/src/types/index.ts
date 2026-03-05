export interface Home {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  home_id: string
  name: string
  icon?: string
  created_at: string
  updated_at: string
}

export interface Manufacturer {
  id: string
  name: string
  website?: string
  created_at: string
  updated_at: string
}

export type Protocol = 'Matter' | 'HomeKit' | 'Z-Wave' | 'Zigbee' | 'WiFi' | 'Bluetooth' | 'Thread' | 'Other'
export type SetupCodeType = 'QR' | 'NFC' | 'Manual' | 'Barcode' | 'Other'

export interface Device {
  id: string
  name: string
  home_id: string
  room_id?: string
  manufacturer_id?: string
  model?: string
  device_type?: string
  protocol?: Protocol
  pairing_code?: string
  qr_code_data?: string
  barcode_image?: string
  setup_code_type?: SetupCodeType
  serial_number?: string
  mac_address?: string
  firmware_version?: string
  admin_url?: string
  purchase_date?: string
  retailer?: string
  warranty_expiry?: string
  notes?: string
  custom_image?: string
  created_at: string
  updated_at: string
}

export interface DeviceCreate {
  name: string
  home_id: string
  room_id?: string
  manufacturer_id?: string
  model?: string
  device_type?: string
  protocol?: Protocol
  pairing_code?: string
  qr_code_data?: string
  setup_code_type?: SetupCodeType
  serial_number?: string
  mac_address?: string
  firmware_version?: string
  admin_url?: string
  purchase_date?: string
  retailer?: string
  warranty_expiry?: string
  notes?: string
}

export interface CustomField {
  id: string
  device_id: string
  key: string
  value: string
  created_at: string
}

export interface Attachment {
  id: string
  device_id: string
  filename: string
  file_type: string
  file_size: number
  description?: string
  created_at: string
}

export interface DashboardStats {
  total_devices: number
  total_homes: number
  total_rooms: number
  by_home: Array<{
    home_id: string
    home_name: string
    count: number
    rooms: Array<{ room_id: string; room_name: string; count: number }>
  }>
  by_protocol: Array<{ protocol: string; count: number }>
  by_device_type: Array<{ device_type: string; count: number }>
}

export interface DecodeResult {
  protocol: string
  raw: string
  pairing_code?: string
  passcode?: string
  vendor_id?: string
  product_id?: string
  discriminator?: number
  formatted?: string
  error?: string
}
