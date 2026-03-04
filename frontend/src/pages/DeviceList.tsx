import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, QrCode } from 'lucide-react'
import { getDevices, getHomes, getRooms } from '../services/api'
import type { Device, Home, Room } from '../types'

export default function DeviceList() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState<Device[]>([])
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [search, setSearch] = useState('')
  const [homeFilter, setHomeFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  useEffect(() => {
    getHomes().then(setHomes)
    getDevices().then(setDevices)
  }, [])

  useEffect(() => {
    if (homeFilter) getRooms(homeFilter).then(setRooms)
    else setRooms([])
  }, [homeFilter])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (homeFilter) params.home_id = homeFilter
    if (roomFilter) params.room_id = roomFilter
    getDevices(params).then(setDevices)
  }, [search, homeFilter, roomFilter])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Devices</h1>
        <Link
          to="/devices/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Add Device
        </Link>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            placeholder="Search devices…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={homeFilter}
          onChange={e => { setHomeFilter(e.target.value); setRoomFilter('') }}
        >
          <option value="">All homes</option>
          {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={roomFilter}
          onChange={e => setRoomFilter(e.target.value)}
          disabled={!homeFilter}
        >
          <option value="">All rooms</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => (
          <div
            key={device.id}
            onClick={() => navigate(`/devices/${device.id}`)}
            className="bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold">{device.name}</h2>
                {device.model && <p className="text-sm text-gray-500">{device.model}</p>}
              </div>
              {(device.qr_code_data || device.pairing_code) && (
                <QrCode size={20} className="text-gray-400 shrink-0" />
              )}
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {device.protocol && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {device.protocol}
                </span>
              )}
              {device.device_type && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {device.device_type}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <QrCode size={48} className="mx-auto mb-4 opacity-40" />
          <p>No devices yet. Add your first device to get started.</p>
        </div>
      )}
    </div>
  )
}
