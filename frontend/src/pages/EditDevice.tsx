import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getDevice, updateDevice, getHomes, getRooms, getManufacturers } from '../services/api'
import type { Home, Room, Manufacturer, DeviceCreate } from '../types'
import { useToast } from '../components/ToastProvider'

const PROTOCOLS = ['Matter', 'HomeKit', 'Z-Wave', 'Zigbee', 'WiFi', 'Bluetooth', 'Thread', 'Other']
const DEVICE_TYPES = [
  'Light', 'Switch', 'Plug', 'Dimmer', 'Sensor', 'Thermostat', 'Lock', 'Camera',
  'Doorbell', 'Speaker', 'Blind/Shade', 'Fan', 'Garage Door', 'Bridge/Hub',
  'Remote/Button', 'Air Purifier', 'Smoke Detector', 'CO2 Detector',
  'Motion Sensor', 'Contact Sensor', 'Water Leak Sensor', 'Security System',
  'TV/Display', 'Robot Vacuum', 'Other',
]

const cls = 'w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      {children}
    </label>
  )
}

export default function EditDevice() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [form, setForm] = useState<Partial<DeviceCreate> | null>(null)
  const [deviceName, setDeviceName] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([getDevice(id), getHomes(), getManufacturers()]).then(([device, h, m]) => {
      setForm(device)
      setDeviceName(device.name)
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
    try {
      await updateDevice(id, form)
      navigate(`/devices/${id}`)
    } catch {
      toast.error('Failed to save changes')
    }
  }

  const inp = (f: keyof DeviceCreate, placeholder?: string, extraCls = '') => (
    <input
      className={`${cls} ${extraCls}`}
      placeholder={placeholder}
      value={(form[f] as string) ?? ''}
      onChange={e => set(f, e.target.value)}
    />
  )

  const sel = (f: keyof DeviceCreate, options: string[], emptyLabel: string) => (
    <select className={cls} value={(form[f] as string) ?? ''} onChange={e => set(f, e.target.value)}>
      <option value="">{emptyLabel}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/devices/${id}`} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">Edit Device</h1>
          {deviceName && <p className="text-sm text-gray-400 dark:text-gray-500">{deviceName}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Basic Info */}
        <Section title="Basic Info">
          <Field label="Name *">
            <input
              className={cls}
              placeholder="e.g. Living Room Lamp"
              value={form.name ?? ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Home *">
              <select
                className={cls}
                value={form.home_id ?? ''}
                onChange={e => set('home_id', e.target.value)}
                required
              >
                <option value="">Select home…</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </Field>
            <Field label="Room">
              <select
                className={cls}
                value={form.room_id ?? ''}
                onChange={e => set('room_id', e.target.value)}
                disabled={!form.home_id}
              >
                <option value="">No room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* Device Details */}
        <Section title="Device Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Protocol">{sel('protocol', PROTOCOLS, 'Unknown')}</Field>
            <Field label="Device Type">{sel('device_type', DEVICE_TYPES, 'Unknown')}</Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Manufacturer">
              <select className={cls} value={form.manufacturer_id ?? ''} onChange={e => set('manufacturer_id', e.target.value)}>
                <option value="">Unknown</option>
                {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Model">{inp('model', 'e.g. LED Bulb E27')}</Field>
          </div>
        </Section>

        {/* Pairing */}
        <Section title="Pairing">
          <Field label="QR Code Data">
            {inp('qr_code_data', 'MT:Y.K9042C00KA0648G00', 'font-mono text-xs')}
          </Field>
          <Field label="Pairing Code">{inp('pairing_code', 'e.g. 1234-567-8901')}</Field>
        </Section>

        {/* Technical */}
        <Section title="Technical">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serial Number">{inp('serial_number')}</Field>
            <Field label="MAC Address">{inp('mac_address', 'AA:BB:CC:DD:EE:FF')}</Field>
          </div>
          <Field label="Firmware Version">{inp('firmware_version')}</Field>
          <Field label="Admin URL">{inp('admin_url', 'http://192.168.1.x')}</Field>
        </Section>

        {/* Purchase & Warranty */}
        <Section title="Purchase & Warranty">
          <Field label="Retailer">{inp('retailer')}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase Date">
              <input
                type="date"
                className={cls}
                value={(form.purchase_date as string) ?? ''}
                onChange={e => set('purchase_date', e.target.value)}
              />
            </Field>
            <Field label="Warranty Expires">
              <input
                type="date"
                className={cls}
                value={(form.warranty_expiry as string) ?? ''}
                onChange={e => set('warranty_expiry', e.target.value)}
              />
            </Field>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <textarea
            className={`${cls} h-24 resize-none`}
            placeholder="Any additional notes…"
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
          />
        </Section>

        <div className="flex gap-3">
          <Link
            to={`/devices/${id}`}
            className="flex-1 text-center py-3 rounded-xl border dark:border-gray-600 font-medium text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
