import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createDevice, getHomes, getRooms, getManufacturers, decodePayload } from '../services/api'
import type { Home, Room, Manufacturer, DeviceCreate } from '../types'

const PROTOCOLS = ['Matter', 'HomeKit', 'Z-Wave', 'Zigbee', 'WiFi', 'Bluetooth', 'Thread', 'Other']
const DEVICE_TYPES = [
  'Light', 'Switch', 'Plug', 'Dimmer', 'Sensor', 'Thermostat', 'Lock', 'Camera',
  'Doorbell', 'Speaker', 'Blind/Shade', 'Fan', 'Garage Door', 'Bridge/Hub',
  'Remote/Button', 'Air Purifier', 'Smoke Detector', 'CO2 Detector',
  'Motion Sensor', 'Contact Sensor', 'Water Leak Sensor', 'Security System',
  'TV/Display', 'Robot Vacuum', 'Other',
]

export default function AddDevice() {
  const navigate = useNavigate()
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [form, setForm] = useState<Partial<DeviceCreate>>({})
  const [decoding, setDecoding] = useState(false)

  useEffect(() => {
    getHomes().then(setHomes)
    getManufacturers().then(setManufacturers)
  }, [])

  useEffect(() => {
    if (form.home_id) getRooms(form.home_id).then(setRooms)
  }, [form.home_id])

  const set = (field: keyof DeviceCreate, value: string) =>
    setForm(f => ({ ...f, [field]: value || undefined }))

  const handleDecodeQR = async () => {
    if (!form.qr_code_data) return
    setDecoding(true)
    const result = await decodePayload(form.qr_code_data).catch(() => null)
    if (result) {
      setForm(f => ({
        ...f,
        protocol: result.protocol !== 'Unknown' ? result.protocol as DeviceCreate['protocol'] : f.protocol,
        pairing_code: result.pairing_code || result.passcode || f.pairing_code,
      }))
    }
    setDecoding(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.home_id) return
    const device = await createDevice(form as DeviceCreate)
    navigate(`/devices/${device.id}`)
  }

  const field = (label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      {el}
    </label>
  )

  const input = (f: keyof DeviceCreate, placeholder?: string) => (
    <input
      className="border rounded-lg px-3 py-2"
      placeholder={placeholder}
      value={(form[f] as string) ?? ''}
      onChange={e => set(f, e.target.value)}
    />
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/devices" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">Add Device</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {field('Name *', input('name', 'e.g. Living Room Lamp'))}

        {field('Home *',
          <select
            className="border rounded-lg px-3 py-2"
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
            className="border rounded-lg px-3 py-2"
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
            className="border rounded-lg px-3 py-2"
            value={form.protocol ?? ''}
            onChange={e => set('protocol', e.target.value)}
          >
            <option value="">Unknown</option>
            {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
          </select>
        )}

        {field('Device Type',
          <select
            className="border rounded-lg px-3 py-2"
            value={form.device_type ?? ''}
            onChange={e => set('device_type', e.target.value)}
          >
            <option value="">Unknown</option>
            {DEVICE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        )}

        {field('Manufacturer',
          <select
            className="border rounded-lg px-3 py-2"
            value={form.manufacturer_id ?? ''}
            onChange={e => set('manufacturer_id', e.target.value)}
          >
            <option value="">Unknown</option>
            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}

        {field('Model', input('model', 'e.g. TRADFRI LED Bulb E27'))}

        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Pairing Codes</p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 font-medium">QR Code Data</span>
              <div className="flex gap-2">
                <input
                  className="border rounded-lg px-3 py-2 flex-1 font-mono text-xs"
                  placeholder="MT:Y.K9042C00KA0648G00"
                  value={form.qr_code_data ?? ''}
                  onChange={e => set('qr_code_data', e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleDecodeQR}
                  disabled={!form.qr_code_data || decoding}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm disabled:opacity-40"
                >
                  Decode
                </button>
              </div>
            </label>
            {field('Pairing Code', input('pairing_code', 'e.g. 123-45-678'))}
          </div>
        </div>

        {field('Notes',
          <textarea
            className="border rounded-lg px-3 py-2 h-20 resize-none"
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
          />
        )}

        <button
          type="submit"
          className="mt-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40"
          disabled={!form.name || !form.home_id}
        >
          Save Device
        </button>
      </form>
    </div>
  )
}
