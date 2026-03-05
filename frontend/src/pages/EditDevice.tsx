import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getDevice, updateDevice, getHomes, getRooms, getManufacturers } from '../services/api'
import type { Home, Room, Manufacturer, DeviceCreate } from '../types'

const PROTOCOLS = ['Matter', 'HomeKit', 'Z-Wave', 'Zigbee', 'WiFi', 'Bluetooth', 'Thread', 'Other']
const DEVICE_TYPES = [
  'Light', 'Switch', 'Plug', 'Dimmer', 'Sensor', 'Thermostat', 'Lock', 'Camera',
  'Doorbell', 'Speaker', 'Blind/Shade', 'Fan', 'Garage Door', 'Bridge/Hub',
  'Remote/Button', 'Air Purifier', 'Smoke Detector', 'CO2 Detector',
  'Motion Sensor', 'Contact Sensor', 'Water Leak Sensor', 'Security System',
  'TV/Display', 'Robot Vacuum', 'Other',
]

export default function EditDevice() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [form, setForm] = useState<Partial<DeviceCreate> | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getDevice(id), getHomes(), getManufacturers()]).then(([device, h, m]) => {
      setForm(device)
      setHomes(h)
      setManufacturers(m)
      if (device.home_id) getRooms(device.home_id).then(setRooms)
    })
  }, [id])

  useEffect(() => {
    if (form?.home_id) getRooms(form.home_id).then(setRooms)
  }, [form?.home_id])

  if (!form) return <div className="p-8 text-gray-400">Loading…</div>

  const set = (field: keyof DeviceCreate, value: string) =>
    setForm(f => ({ ...f, [field]: value || undefined }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !form) return
    await updateDevice(id, form)
    navigate(`/devices/${id}`)
  }

  const field = (label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 dark:text-gray-300 font-medium">{label}</span>
      {el}
    </label>
  )

  const input = (f: keyof DeviceCreate, placeholder?: string) => (
    <input
      className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
      placeholder={placeholder}
      value={(form[f] as string) ?? ''}
      onChange={e => set(f, e.target.value)}
    />
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/devices/${id}`} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold dark:text-gray-100">Edit Device</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {field('Name *', input('name', 'e.g. Living Room Lamp'))}

        {field('Home *',
          <select
            className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={form.home_id ?? ''}
            onChange={e => set('home_id', e.target.value)}
            required
          >
            <option value="">Select home…</option>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}

        {field('Room',
          <select
            className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={form.room_id ?? ''}
            onChange={e => set('room_id', e.target.value)}
            disabled={!form.home_id}
          >
            <option value="">No room</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}

        {field('Protocol',
          <select
            className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={form.protocol ?? ''}
            onChange={e => set('protocol', e.target.value)}
          >
            <option value="">Unknown</option>
            {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
          </select>
        )}

        {field('Device Type',
          <select
            className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={form.device_type ?? ''}
            onChange={e => set('device_type', e.target.value)}
          >
            <option value="">Unknown</option>
            {DEVICE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        )}

        {field('Manufacturer',
          <select
            className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={form.manufacturer_id ?? ''}
            onChange={e => set('manufacturer_id', e.target.value)}
          >
            <option value="">Unknown</option>
            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}

        {field('Model', input('model', 'e.g. TRADFRI LED Bulb E27'))}

        <div className="border-t dark:border-gray-700 pt-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Pairing Codes</p>
          <div className="flex flex-col gap-3">
            {field('QR Code Data',
              <input
                className="border dark:border-gray-600 rounded-lg px-3 py-2 font-mono text-xs dark:bg-gray-800 dark:text-gray-100"
                placeholder="MT:Y.K9042C00KA0648G00"
                value={form.qr_code_data ?? ''}
                onChange={e => set('qr_code_data', e.target.value)}
              />
            )}
            {field('Pairing Code', input('pairing_code', 'e.g. 123-45-678'))}
          </div>
        </div>

        {field('Serial Number', input('serial_number'))}
        {field('MAC Address', input('mac_address', 'e.g. AA:BB:CC:DD:EE:FF'))}
        {field('Firmware Version', input('firmware_version'))}
        {field('Admin URL', input('admin_url', 'http://192.168.1.x'))}
        {field('Retailer', input('retailer'))}

        {field('Notes',
          <textarea
            className="border dark:border-gray-600 rounded-lg px-3 py-2 h-20 resize-none dark:bg-gray-800 dark:text-gray-100"
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
          />
        )}

        <div className="flex gap-3 mt-2">
          <Link
            to={`/devices/${id}`}
            className="flex-1 text-center py-3 rounded-lg border dark:border-gray-600 font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
