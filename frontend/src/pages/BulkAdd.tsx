import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Keyboard, CheckCircle, Loader2 } from 'lucide-react'
import jsQR from 'jsqr'
import Scanner from '../components/Scanner'
import { createDevice, getHomes, getManufacturers, decodePayload } from '../services/api'
import type { Device, Home, Manufacturer, DeviceCreate } from '../types'

const PROTOCOLS = ['Matter', 'HomeKit', 'Z-Wave', 'Zigbee', 'WiFi', 'Bluetooth', 'Thread', 'Other']
const DEVICE_TYPES = [
  'Light', 'Switch', 'Plug', 'Dimmer', 'Sensor', 'Thermostat', 'Lock', 'Camera',
  'Doorbell', 'Speaker', 'Blind/Shade', 'Fan', 'Garage Door', 'Bridge/Hub',
  'Remote/Button', 'Air Purifier', 'Smoke Detector', 'CO2 Detector',
  'Motion Sensor', 'Contact Sensor', 'Water Leak Sensor', 'Security System',
  'TV/Display', 'Robot Vacuum', 'Other',
]

const sel = 'border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 w-full'

export default function BulkAdd() {
  const navigate = useNavigate()
  const [homes, setHomes] = useState<Home[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Common attributes
  const [homeId, setHomeId] = useState('')
  const [deviceType, setDeviceType] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [retailer, setRetailer] = useState('')
  const [model, setModel] = useState('')
  const [protocol, setProtocol] = useState('')

  // Scan state
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [showScanner, setShowScanner] = useState(false)
  const [scannerKey, setScannerKey] = useState(0)
  const [manualCode, setManualCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [lastAdded, setLastAdded] = useState('')
  const [added, setAdded] = useState<Device[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getHomes().then(h => { setHomes(h); if (h.length) setHomeId(h[0].id) })
    getManufacturers().then(setManufacturers)
  }, [])

  const nextName = (type: string) => {
    const base = type || 'Device'
    return `${base} ${added.length + 1}`
  }

  const createFromPayload = async (payload: string) => {
    if (!homeId) { setError('Select a home first.'); return }
    setAdding(true)
    setError('')
    try {
      const decoded = await decodePayload(payload).catch(() => null)
      const body: DeviceCreate = {
        name: nextName(deviceType),
        home_id: homeId,
        device_type: deviceType || undefined,
        manufacturer_id: manufacturerId || undefined,
        retailer: retailer || undefined,
        model: model || undefined,
        protocol: (decoded?.protocol && decoded.protocol !== 'Unknown'
          ? decoded.protocol
          : protocol || undefined) as DeviceCreate['protocol'],
        qr_code_data: payload.length > 20 ? payload : undefined,
        pairing_code: decoded?.pairing_code || (payload.length <= 20 ? payload : undefined),
      }
      const device = await createDevice(body)
      setAdded(prev => [device, ...prev])
      setLastAdded(device.name)
      setTimeout(() => setLastAdded(''), 2000)
    } catch {
      setError('Failed to create device. Try again.')
    } finally {
      setAdding(false)
    }
  }

  const handleScanResult = async (text: string) => {
    setShowScanner(false)
    await createFromPayload(text)
    // Re-open scanner after brief pause
    setTimeout(() => { setScannerKey(k => k + 1); setShowScanner(true) }, 800)
  }

  const handleManualAdd = async () => {
    const code = manualCode.trim()
    if (!code) return
    setManualCode('')
    await createFromPayload(code)
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
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
        await createFromPayload(code.data)
      } else {
        setError('No QR code found in image.')
      }
    } catch {
      setError('Could not read image.')
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  return (
    <>
      {showScanner && (
        <Scanner
          key={scannerKey}
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/devices" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold dark:text-gray-100">Bulk Add Devices</h1>
        </div>

        {/* Common attributes */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">These devices are all…</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm col-span-2">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Home *</span>
              <select className={sel} value={homeId} onChange={e => setHomeId(e.target.value)}>
                <option value="">Select home…</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Device Type</span>
              <select className={sel} value={deviceType} onChange={e => setDeviceType(e.target.value)}>
                <option value="">Unknown</option>
                {DEVICE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Protocol</span>
              <select className={sel} value={protocol} onChange={e => setProtocol(e.target.value)}>
                <option value="">Unknown</option>
                {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Manufacturer</span>
              <select className={sel} value={manufacturerId} onChange={e => setManufacturerId(e.target.value)}>
                <option value="">Unknown</option>
                {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Retailer</span>
              <input
                className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100"
                value={retailer}
                onChange={e => setRetailer(e.target.value)}
                placeholder="e.g. Amazon"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm col-span-2">
              <span className="text-gray-600 dark:text-gray-300 font-medium">Model</span>
              <input
                className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. Hue White A60"
              />
            </label>
          </div>
        </div>

        {/* Scan section */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Add pairing codes</p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {([
              { m: 'scan', icon: Camera, label: 'Camera' },
              { m: 'manual', icon: Keyboard, label: 'Manual / Image' },
            ] as const).map(({ m, icon: Icon, label }) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {mode === 'scan' && (
            <button
              onClick={() => { setScannerKey(k => k + 1); setShowScanner(true) }}
              disabled={!homeId || adding}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Camera size={18} /> {adding ? 'Adding…' : 'Open Camera'}
            </button>
          )}

          {mode === 'manual' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Pairing code or QR data…"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                  disabled={adding}
                  autoFocus
                />
                <button
                  onClick={handleManualAdd}
                  disabled={!manualCode.trim() || !homeId || adding}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1"
                >
                  {adding ? <Loader2 size={15} className="animate-spin" /> : 'Add'}
                </button>
              </div>
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
                />
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          {lastAdded && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg">
              <CheckCircle size={15} /> Added: {lastAdded}
            </div>
          )}
        </div>

        {/* Added devices */}
        {added.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold dark:text-gray-100">{added.length} device{added.length !== 1 ? 's' : ''} added</h2>
              <button
                onClick={() => navigate('/devices')}
                className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
            <ul className="divide-y dark:divide-gray-700">
              {added.map(d => (
                <li key={d.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm dark:text-gray-200">{d.name}</span>
                  <Link
                    to={`/devices/${d.id}/edit`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Edit →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
