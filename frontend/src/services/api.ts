import axios from 'axios'
import type { Home, Room, Manufacturer, Device, DeviceCreate, DecodeResult, DashboardStats } from '../types'

const api = axios.create({ baseURL: '/api/v1' })

// Homes
export const getHomes = () => api.get<Home[]>('/homes').then(r => r.data)
export const createHome = (data: Omit<Home, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<Home>('/homes', data).then(r => r.data)
export const updateHome = (id: string, data: Partial<Home>) =>
  api.put<Home>(`/homes/${id}`, data).then(r => r.data)
export const deleteHome = (id: string) => api.delete(`/homes/${id}`)

// Rooms
export const getRooms = (home_id?: string) =>
  api.get<Room[]>('/rooms', { params: { home_id } }).then(r => r.data)
export const createRoom = (data: Omit<Room, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<Room>('/rooms', data).then(r => r.data)
export const updateRoom = (id: string, data: Partial<Room>) =>
  api.put<Room>(`/rooms/${id}`, data).then(r => r.data)
export const deleteRoom = (id: string) => api.delete(`/rooms/${id}`)

// Manufacturers
export const getManufacturers = () =>
  api.get<Manufacturer[]>('/manufacturers').then(r => r.data)
export const createManufacturer = (data: Omit<Manufacturer, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<Manufacturer>('/manufacturers', data).then(r => r.data)
export const deleteManufacturer = (id: string) => api.delete(`/manufacturers/${id}`)

// Devices
export const getDevices = (params?: Record<string, string>) =>
  api.get<Device[]>('/devices', { params }).then(r => r.data)
export const getDevice = (id: string) =>
  api.get<Device>(`/devices/${id}`).then(r => r.data)
export const createDevice = (data: DeviceCreate) =>
  api.post<Device>('/devices', data).then(r => r.data)
export const updateDevice = (id: string, data: Partial<DeviceCreate>) =>
  api.put<Device>(`/devices/${id}`, data).then(r => r.data)
export const deleteDevice = (id: string) => api.delete(`/devices/${id}`)
export const getDeviceQrUrl = (id: string) => `/api/v1/devices/${id}/qr`
export const getDeviceLabelUrl = (id: string) => `/api/v1/devices/${id}/label`
export const getLabelSheetUrl = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return `/api/v1/devices/labels${qs}`
}

// Scan
export const decodePayload = (payload: string) =>
  api.post<DecodeResult>('/scan/decode', { payload }).then(r => r.data)

// Import / Export
export const getExportUrl = (format: 'json' | 'csv') => `/api/v1/devices/export?format=${format}`
export const importDevices = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ imported: number; skipped: number }>('/devices/import', form).then(r => r.data)
}

// Backup
export const getBackupUrl = () => '/api/v1/backup'

// Stats
export const getStats = () => api.get<DashboardStats>('/stats').then(r => r.data)
