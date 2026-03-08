import { useEffect, useState } from 'react'
import { Printer, QrCode } from 'lucide-react'
import { getHomes, getRooms, getManufacturers, getDevices, getLabelSheetUrl } from '../services/api'
import type { Device, Home, Room, Manufacturer } from '../types'

const PROTOCOLS = ['Matter', 'HomeKit', 'Z-Wave', 'Zigbee', 'WiFi', 'Bluetooth', 'Thread', 'Other']
const DEVICE_TYPES = [
  'Light', 'Switch', 'Plug', 'Dimmer', 'Sensor', 'Thermostat', 'Lock', 'Camera',
  'Doorbell', 'Speaker', 'Blind/Shade', 'Fan', 'Garage Door', 'Bridge/Hub',
  'Remote/Button', 'Air Purifier', 'Smoke Detector', 'CO2 Detector',
  'Motion Sensor', 'Contact Sensor', 'Water Leak Sensor', 'Security System',
  'TV/Display', 'Robot Vacuum', 'Other',
]

const selectCls = 'border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100'

export default function Labels() {
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [devices, setDevices] = useState<Device[]>([])

  const [homeFilter, setHomeFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [protocolFilter, setProtocolFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    getHomes().then(setHomes)
    getManufacturers().then(setManufacturers)
  }, [])

  useEffect(() => {
    if (homeFilter) getRooms(homeFilter).then(setRooms)
    else { setRooms([]); setRoomFilter('') }
  }, [homeFilter])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (homeFilter)     params.home_id = homeFilter
    if (roomFilter)     params.room_id = roomFilter
    if (protocolFilter) params.protocol = protocolFilter
    if (typeFilter)     params.device_type = typeFilter
    getDevices(params).then(setDevices)
  }, [homeFilter, roomFilter, protocolFilter, typeFilter])

  const labelParams: Record<string, string> = {}
  if (homeFilter)     labelParams.home_id = homeFilter
  if (roomFilter)     labelParams.room_id = roomFilter
  if (protocolFilter) labelParams.protocol = protocolFilter
  if (typeFilter)     labelParams.device_type = typeFilter

  const mfrName = (id?: string) => manufacturers.find(m => m.id === id)?.name

  const withCode = devices.filter(d => d.qr_code_data || d.pairing_code)
  const withoutCode = devices.filter(d => !d.qr_code_data && !d.pairing_code)
  const pages = Math.ceil(withCode.length / 16)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Print Labels</h1>

      <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-3">Filter devices</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Home</label>
            <select className={selectCls} value={homeFilter} onChange={e => { setHomeFilter(e.target.value); setRoomFilter('') }}>
              <option value="">All homes</option>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Room</label>
            <select className={selectCls} value={roomFilter} onChange={e => setRoomFilter(e.target.value)} disabled={!homeFilter}>
              <option value="">All rooms</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Protocol</label>
            <select className={selectCls} value={protocolFilter} onChange={e => setProtocolFilter(e.target.value)}>
              <option value="">All protocols</option>
              {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Device Type</label>
            <select className={selectCls} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {DEVICE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
            {withCode.length} label{withCode.length !== 1 ? 's' : ''}
            {pages > 0 && <span className="font-normal text-gray-400 dark:text-gray-500"> · {pages} page{pages !== 1 ? 's' : ''}</span>}
          </h2>
          {withoutCode.length > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {withoutCode.length} device{withoutCode.length !== 1 ? 's' : ''} skipped (no code)
            </span>
          )}
        </div>

        {withCode.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <QrCode size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No devices with pairing codes match these filters.</p>
          </div>
        ) : (
          <ul className="divide-y dark:divide-gray-800 max-h-72 overflow-y-auto">
            {withCode.map(d => (
              <li key={d.id} className="flex items-center justify-between py-2 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium dark:text-gray-200 truncate">{d.name}</p>
                  {(d.model || mfrName(d.manufacturer_id)) && (
                    <p className="text-xs text-gray-400 truncate">
                      {[mfrName(d.manufacturer_id), d.model].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <QrCode size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <a
        href={withCode.length > 0 ? getLabelSheetUrl(Object.keys(labelParams).length ? labelParams : undefined) : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={withCode.length === 0}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
          withCode.length > 0
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed pointer-events-none'
        }`}
      >
        <Printer size={16} />
        {withCode.length > 0 ? `Generate PDF — ${withCode.length} label${withCode.length !== 1 ? 's' : ''}` : 'No labels to generate'}
      </a>
      <p className="text-xs text-gray-400 text-center mt-2">48.5 × 25.4 mm labels, 16 per A4 page</p>
    </div>
  )
}
