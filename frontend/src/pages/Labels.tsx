import { useEffect, useState } from 'react'
import { Printer, QrCode } from 'lucide-react'
import { getHomes, getRooms, getManufacturers, getDevices, fetchLabelSheet, getLabelTemplates } from '../services/api'
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
  const [templates, setTemplates] = useState<{ key: string; name: string; labels_per_sheet: number }[]>([])
  const [templateKey, setTemplateKey] = useState('custom')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const [generating, setGenerating] = useState(false)

  const [homeFilter, setHomeFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [protocolFilter, setProtocolFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    getHomes().then(setHomes)
    getManufacturers().then(setManufacturers)
    getLabelTemplates().then(setTemplates)
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
    setLoading(true)
    getDevices(params).then(setDevices).finally(() => setLoading(false))
  }, [homeFilter, roomFilter, protocolFilter, typeFilter])

  const withCode = devices.filter(d => d.qr_code_data || d.pairing_code)
  const withoutCode = devices.filter(d => !d.qr_code_data && !d.pairing_code)

  // When the filtered device list changes, select all by default.
  // Depend on `devices` (not `withCode`) because `withCode` is recomputed each render.
  useEffect(() => {
    setSelected(new Set(devices.filter(d => d.qr_code_data || d.pairing_code).map(d => d.id)))
  }, [devices])

  const toggleDevice = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const allSelected = withCode.length > 0 && selected.size === withCode.length
  const noneSelected = selected.size === 0

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(withCode.map(d => d.id)))

  const mfrName = (id?: string) => manufacturers.find(m => m.id === id)?.name

  const selectedTemplate = templates.find(t => t.key === templateKey)
  const selectedPages = selectedTemplate && selected.size > 0
    ? Math.ceil(selected.size / selectedTemplate.labels_per_sheet)
    : 0

  const generateParams = (): Record<string, string> | undefined => {
    if (noneSelected) return undefined
    const params: Record<string, string> = { template: templateKey }
    if (allSelected) {
      if (homeFilter)     params.home_id = homeFilter
      if (roomFilter)     params.room_id = roomFilter
      if (protocolFilter) params.protocol = protocolFilter
      if (typeFilter)     params.device_type = typeFilter
    } else {
      params.ids = Array.from(selected).join(',')
    }
    return params
  }

  const handleGenerate = async () => {
    const params = generateParams()
    if (!params) return
    setGenerating(true)
    try {
      const blob = await fetchLabelSheet(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pairman-labels.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Print Labels</h1>

      {/* Filters */}
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

      {/* Label template */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-3">Label template</h2>
        <div className="flex flex-col gap-2">
          {templates.map(t => (
            <label key={t.key} className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              templateKey === t.key
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="template"
                  value={t.key}
                  checked={templateKey === t.key}
                  onChange={() => setTemplateKey(t.key)}
                  className="accent-blue-600"
                />
                <span className="text-sm dark:text-gray-200">{t.name}</span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{t.labels_per_sheet}/sheet</span>
            </label>
          ))}
        </div>
      </div>

      {/* Device selection */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
            {withCode.length === 0 ? 'No printable devices' : (
              <>
                {selected.size} of {withCode.length} selected
                {selectedPages > 0 && (
                  <span className="font-normal text-gray-400 dark:text-gray-500">
                    {' · '}{selectedPages} page{selectedPages !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {withoutCode.length > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                {withoutCode.length} skipped (no code)
              </span>
            )}
            {withCode.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Loading…</div>
        ) : withCode.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <QrCode size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No devices with pairing codes match these filters.</p>
          </div>
        ) : (
          <ul className="divide-y dark:divide-gray-800 max-h-72 overflow-y-auto -mx-1">
            {withCode.map(d => (
              <li
                key={d.id}
                onClick={() => toggleDevice(d.id)}
                className="flex items-center gap-3 py-2 px-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggleDevice(d.id)}
                  onClick={e => e.stopPropagation()}
                  className="accent-blue-600 shrink-0 w-4 h-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium dark:text-gray-200 truncate">{d.name}</p>
                  {(d.model || mfrName(d.manufacturer_id)) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
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

      <button
        onClick={handleGenerate}
        disabled={noneSelected || generating}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors w-full ${
          !noneSelected && !generating
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
        }`}
      >
        <Printer size={16} />
        {generating
          ? 'Generating…'
          : noneSelected
            ? 'No labels selected'
            : `Generate PDF — ${selected.size} label${selected.size !== 1 ? 's' : ''}`}
      </button>
      {selectedTemplate && selected.size > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">{selectedTemplate.name}</p>
      )}
    </div>
  )
}
