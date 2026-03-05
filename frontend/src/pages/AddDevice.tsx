import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Camera, ImageUp, Keyboard, CheckCircle } from 'lucide-react'
import jsQR from 'jsqr'
import Scanner from '../components/Scanner'
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

type InputMode = 'scan' | 'image' | 'manual'

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

  const applyDecodeResult = async (payload: string) => {
    setForm(f => ({ ...f, qr_code_data: payload }))
    setScanBadge('Decoding…')
    const result = await decodePayload(payload).catch(() => null)
    if (result && result.protocol !== 'Unknown') {
      setForm(f => ({
        ...f,
        protocol: result.protocol as DeviceCreate['protocol'],
        pairing_code: result.pairing_code || result.passcode || f.pairing_code,
      }))
      setScanBadge(`Detected: ${result.protocol}`)
    } else {
      setScanBadge('Code captured')
    }
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

      // jsQR needs the QR code modules to be a reasonable pixel size.
      // Phone camera photos (12MP+) are too large — scale down to max 1024px.
      const MAX_DIM = 1024
      const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.home_id) return
    const device = await createDevice(form as DeviceCreate)
    navigate(`/devices/${device.id}`)
  }

  const field = (label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 dark:text-gray-300 font-medium">{label}</span>
      {el}
    </label>
  )

  const inp = (f: keyof DeviceCreate, placeholder?: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
      placeholder={placeholder}
      value={(form[f] as string) ?? ''}
      onChange={e => set(f, e.target.value)}
      {...extra}
    />
  )

  // Unique model names from existing devices (via manufacturer context) — simple datalist
  const modelSuggestions = Array.from(new Set(manufacturers.map(m => m.name))).sort()

  return (
    <>
      {showScanner && (
        <Scanner onResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/devices" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold dark:text-gray-100">Add Device</h1>
        </div>

        {/* Code input mode selector */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">How do you want to add the pairing code?</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {([
              { mode: 'scan', icon: Camera, label: 'Scan Camera' },
              { mode: 'image', icon: ImageUp, label: 'Upload Image' },
              { mode: 'manual', icon: Keyboard, label: 'Manual Entry' },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  inputMode === mode
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
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
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
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
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-medium">QR Code Data</span>
                <input
                  className="border dark:border-gray-600 rounded-lg px-3 py-2 font-mono text-xs dark:bg-gray-800 dark:text-gray-100"
                  placeholder="MT:Y.K9042C00KA0648G00"
                  value={form.qr_code_data ?? ''}
                  onChange={e => set('qr_code_data', e.target.value)}
                />
              </label>
              {field('Pairing Code', inp('pairing_code', 'e.g. 123-45-678'))}
            </div>
          )}

          {/* Scan result badge */}
          {scanBadge && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle size={16} />
              {scanBadge}
            </div>
          )}

          {/* Show captured QR data read-only when not in manual mode */}
          {inputMode !== 'manual' && form.qr_code_data && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{form.qr_code_data}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {field('Name *', inp('name', 'e.g. Living Room Lamp'))}

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

          {field('Model',
            <>
              <input
                className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
                placeholder="e.g. TRADFRI LED Bulb E27"
                list="model-suggestions"
                value={form.model ?? ''}
                onChange={e => set('model', e.target.value)}
              />
              <datalist id="model-suggestions">
                {modelSuggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </>
          )}

          {field('Notes',
            <textarea
              className="border dark:border-gray-600 rounded-lg px-3 py-2 h-20 resize-none dark:bg-gray-800 dark:text-gray-100"
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
    </>
  )
}
