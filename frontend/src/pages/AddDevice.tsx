import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Camera, ImageUp, Keyboard, CheckCircle } from 'lucide-react'
import jsQR from 'jsqr'
import Scanner from '../components/Scanner'
import { createDevice, deleteDevice, getHomes, getRooms, getManufacturers, decodePayload, lookupByCode } from '../services/api'
import type { Home, Room, Manufacturer, DeviceCreate } from '../types'

const PROTOCOLS = ['Matter', 'HomeKit', 'Z-Wave', 'Zigbee', 'WiFi', 'Bluetooth', 'Thread', 'Other']
const DEVICE_TYPES = [
  'Light', 'Switch', 'Plug', 'Dimmer', 'Sensor', 'Thermostat', 'Lock', 'Camera',
  'Doorbell', 'Speaker', 'Blind/Shade', 'Fan', 'Garage Door', 'Bridge/Hub',
  'Remote/Button', 'Air Purifier', 'Smoke Detector', 'CO2 Detector',
  'Motion Sensor', 'Contact Sensor', 'Water Leak Sensor', 'Security System',
  'TV/Display', 'Robot Vacuum', 'Other',
]

type InputMode = 'scan' | 'image' | 'manual'

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

export default function AddDevice() {
  const navigate = useNavigate()
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [form, setForm] = useState<Partial<DeviceCreate>>({})
  const [inputMode, setInputMode] = useState<InputMode>('scan')
  const [showScanner, setShowScanner] = useState(false)
  const [scanBadge, setScanBadge] = useState('')
  const [imageError, setImageError] = useState('')
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null)
  const pendingSubmit = useRef(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getHomes().then(setHomes)
    getManufacturers().then(setManufacturers)
  }, [])

  useEffect(() => {
    if (form.home_id) getRooms(form.home_id).then(setRooms)
    else setRooms([])
  }, [form.home_id])

  const set = (field: keyof DeviceCreate, value: string) =>
    setForm(f => ({ ...f, [field]: value || undefined }))

  const checkDuplicate = async (pairing_code?: string, qr_code_data?: string) => {
    if (!pairing_code && !qr_code_data) return
    const existing = await lookupByCode({ pairing_code, qr_code_data }).catch(() => null)
    if (existing) setDuplicate({ id: existing.id, name: existing.name })
  }

  const applyDecodeResult = async (payload: string) => {
    setForm(f => ({ ...f, qr_code_data: payload }))
    setScanBadge('Decoding…')
    const result = await decodePayload(payload).catch(() => null)
    let pairingCode: string | undefined
    if (result && result.protocol !== 'Unknown') {
      pairingCode = result.pairing_code || result.passcode || undefined
      setForm(f => ({
        ...f,
        protocol: result.protocol as DeviceCreate['protocol'],
        pairing_code: pairingCode || f.pairing_code,
      }))
      setScanBadge(`Detected: ${result.protocol}`)
    } else {
      setScanBadge('Code captured')
    }
    await checkDuplicate(pairingCode, payload)
  }

  const handleScanResult = (text: string) => {
    setShowScanner(false)
    applyDecodeResult(text)
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError('')
    setScanBadge('Scanning image…')
    try {
      const bitmap = await createImageBitmap(file)
      const MAX_DIM = 1024
      const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(bitmap, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code?.data) {
        await applyDecodeResult(code.data)
      } else {
        setScanBadge('')
        setImageError('No QR code found. Try a clearer, closer photo of just the QR code.')
      }
    } catch {
      setScanBadge('')
      setImageError('Could not process that image.')
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const doSave = async () => {
    const device = await createDevice(form as DeviceCreate)
    navigate(`/devices/${device.id}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.home_id) return
    // For manual entry, check for duplicate at submit time
    if (!pendingSubmit.current) {
      const existing = await lookupByCode({
        pairing_code: form.pairing_code,
        qr_code_data: form.qr_code_data,
      }).catch(() => null)
      if (existing) {
        setDuplicate({ id: existing.id, name: existing.name })
        return
      }
    }
    pendingSubmit.current = false
    await doSave()
  }

  const handleOverwrite = async () => {
    if (!duplicate) return
    await deleteDevice(duplicate.id)
    setDuplicate(null)
    pendingSubmit.current = true
    await doSave()
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
    <>
      {showScanner && (
        <Scanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}

      {duplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-semibold dark:text-gray-100 mb-2">Duplicate pairing code</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              <span className="font-medium text-gray-900 dark:text-gray-200">{duplicate.name}</span> already has this pairing code. What would you like to do?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleOverwrite}
                className="w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Overwrite — delete existing and save new
              </button>
              <button
                onClick={() => { setDuplicate(null); navigate(`/devices/${duplicate.id}/edit`) }}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Edit existing device
              </button>
              <button
                onClick={() => setDuplicate(null)}
                className="w-full py-2.5 rounded-lg border dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/devices" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold dark:text-gray-100">Add Device</h1>
        </div>

        {/* Pairing code input */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-5 mb-4">
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-3">Pairing Code</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              { mode: 'scan',   icon: Camera,   label: 'Camera' },
              { mode: 'image',  icon: ImageUp,  label: 'Image'  },
              { mode: 'manual', icon: Keyboard, label: 'Manual' },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  inputMode === mode
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>

          {inputMode === 'scan' && (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Camera size={18} /> Open Camera
            </button>
          )}

          {inputMode === 'image' && (
            <div className="flex flex-col gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
              />
              {imageError && <p className="text-sm text-red-500">{imageError}</p>}
            </div>
          )}

          {inputMode === 'manual' && (
            <div className="flex flex-col gap-3">
              <Field label="QR Code Data">
                <input
                  className={`${cls} font-mono text-xs`}
                  placeholder="MT:Y.K9042C00KA0648G00"
                  value={form.qr_code_data ?? ''}
                  onChange={e => set('qr_code_data', e.target.value)}
                />
              </Field>
              <Field label="Pairing Code">{inp('pairing_code', 'e.g. 1234-567-8901')}</Field>
            </div>
          )}

          {scanBadge && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg">
              <CheckCircle size={16} /> {scanBadge}
            </div>
          )}
          {inputMode !== 'manual' && form.qr_code_data && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{form.qr_code_data}</p>
          )}
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
              <Field label="Model">
                <>
                  <input
                    className={cls}
                    placeholder="e.g. LED Bulb E27"
                    list="model-suggestions"
                    value={form.model ?? ''}
                    onChange={e => set('model', e.target.value)}
                  />
                  <datalist id="model-suggestions">
                    {manufacturers.map(m => <option key={m.id} value={m.name} />)}
                  </datalist>
                </>
              </Field>
            </div>
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
            <Field label="Retailer">{inp('retailer', 'e.g. Amazon')}</Field>
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

          <button
            type="submit"
            className="bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
            disabled={!form.name || !form.home_id}
          >
            Save Device
          </button>
        </form>
      </div>
    </>
  )
}
