import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, QrCode, SlidersHorizontal, X, ShieldAlert, AlertTriangle } from 'lucide-react'
import { getDevices, getHomes, getRooms, getManufacturers, getAttachmentDownloadUrl, getTags } from '../services/api'
import type { Device, Home, Room, Manufacturer } from '../types'

const PROTOCOLS = ['Matter', 'HomeKit', 'Z-Wave', 'Zigbee', 'WiFi', 'Bluetooth', 'Thread', 'Other']
const DEVICE_TYPES = [
  'Light', 'Switch', 'Plug', 'Dimmer', 'Sensor', 'Thermostat', 'Lock', 'Camera',
  'Doorbell', 'Speaker', 'Blind/Shade', 'Fan', 'Garage Door', 'Bridge/Hub',
  'Remote/Button', 'Air Purifier', 'Smoke Detector', 'CO2 Detector',
  'Motion Sensor', 'Contact Sensor', 'Water Leak Sensor', 'Security System',
  'TV/Display', 'Robot Vacuum', 'Other',
]

const PROTOCOL_COLOURS: Record<string, string> = {
  Matter:    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  HomeKit:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Z-Wave':  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Zigbee:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  WiFi:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Bluetooth: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Thread:    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Other:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function warrantyStatus(expiry?: string): 'expired' | 'soon' | null {
  if (!expiry) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(expiry)
  if (d < today) return 'expired'
  const soon = new Date(today); soon.setDate(soon.getDate() + 30)
  if (d <= soon) return 'soon'
  return null
}

export default function DeviceList() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<Device[]>([])
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState('')
  const [homeFilter, setHomeFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [protocolFilter, setProtocolFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [mfrFilter, setMfrFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  useEffect(() => {
    getHomes().then(setHomes)
    getManufacturers().then(setManufacturers)
    getRooms().then(r => setAllRooms(r))
    getTags().then(setAllTags)
  }, [])

  useEffect(() => {
    if (homeFilter) getRooms(homeFilter).then(setRooms)
    else setRooms([])
  }, [homeFilter])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (search)         params.search = search
    if (homeFilter)     params.home_id = homeFilter
    if (roomFilter)     params.room_id = roomFilter
    if (protocolFilter) params.protocol = protocolFilter
    if (typeFilter)     params.device_type = typeFilter
    if (mfrFilter)      params.manufacturer_id = mfrFilter
    if (tagFilter)      params.tag = tagFilter
    getDevices(params).then(setDevices)
  }, [search, homeFilter, roomFilter, protocolFilter, typeFilter, mfrFilter, tagFilter])

  const activeFilterCount = [homeFilter, roomFilter, protocolFilter, typeFilter, mfrFilter, tagFilter].filter(Boolean).length

  const clearFilters = () => {
    setHomeFilter(''); setRoomFilter(''); setProtocolFilter(''); setTypeFilter(''); setMfrFilter(''); setTagFilter('')
  }

  const roomName = (id?: string) => allRooms.find(r => r.id === id)?.name
  const mfrName  = (id?: string) => manufacturers.find(m => m.id === id)?.name
  const homeName = (id?: string) => homes.find(h => h.id === id)?.name

  const selectCls = 'border dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-100">Devices</h1>
        <Link
          to="/devices/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Add Device
        </Link>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
            placeholder="Search name, model, serial, pairing code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400'
              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Manufacturer</label>
            <select className={selectCls} value={mfrFilter} onChange={e => setMfrFilter(e.target.value)}>
              <option value="">All manufacturers</option>
              {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tag</label>
            <select className={selectCls} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
              <option value="">All tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Results count */}
      {(search || activeFilterCount > 0) && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{devices.length} device{devices.length !== 1 ? 's' : ''} found</p>
      )}

      {/* Device grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => (
          <div
            key={device.id}
            onClick={() => navigate(`/devices/${device.id}`)}
            className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold truncate dark:text-gray-100">{device.name}</h2>
                {device.model && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{device.model}</p>}
                {!device.model && mfrName(device.manufacturer_id) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{mfrName(device.manufacturer_id)}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {warrantyStatus(device.warranty_expiry) === 'expired' && (
                  <span title="Warranty expired"><ShieldAlert size={15} className="text-red-400" /></span>
                )}
                {warrantyStatus(device.warranty_expiry) === 'soon' && (
                  <span title="Warranty expiring soon"><AlertTriangle size={15} className="text-amber-400" /></span>
                )}
                {device.thumbnail_attachment_id
                  ? <img
                      src={getAttachmentDownloadUrl(device.thumbnail_attachment_id)}
                      alt=""
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  : (device.qr_code_data || device.pairing_code) && (
                      <QrCode size={18} className="text-gray-300 dark:text-gray-600" />
                    )
                }
              </div>
            </div>

            {(device.home_id || device.room_id) && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 truncate">
                {[homeName(device.home_id), roomName(device.room_id)].filter(Boolean).join(' · ')}
              </p>
            )}

            <div className="mt-2 flex gap-1.5 flex-wrap">
              {device.protocol && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROTOCOL_COLOURS[device.protocol] ?? PROTOCOL_COLOURS.Other}`}>
                  {device.protocol}
                </span>
              )}
              {device.device_type && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {device.device_type}
                </span>
              )}
              {device.manufacturer_id && device.model && mfrName(device.manufacturer_id) && (
                <span className="text-xs bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {mfrName(device.manufacturer_id)}
                </span>
              )}
              {device.tags.map(tag => (
                <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <QrCode size={48} className="mx-auto mb-4 opacity-40" />
          <p>{search || activeFilterCount > 0 ? 'No devices match your filters.' : 'No devices yet. Add your first device to get started.'}</p>
        </div>
      )}
    </div>
  )
}
