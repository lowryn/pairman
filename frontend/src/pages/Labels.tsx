import { useEffect, useState } from 'react'
import { getHomes, getRooms, getLabelSheetUrl } from '../services/api'
import type { Home, Room } from '../types'

export default function Labels() {
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [homeFilter, setHomeFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  useEffect(() => { getHomes().then(setHomes) }, [])
  useEffect(() => {
    if (homeFilter) getRooms(homeFilter).then(setRooms)
    else setRooms([])
  }, [homeFilter])

  const params: Record<string, string> = {}
  if (homeFilter) params.home_id = homeFilter
  if (roomFilter) params.room_id = roomFilter

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Print Labels</h1>

      <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Filter by Home</span>
          <select
            className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={homeFilter}
            onChange={e => { setHomeFilter(e.target.value); setRoomFilter('') }}
          >
            <option value="">All homes</option>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Filter by Room</span>
          <select
            className="border dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
            value={roomFilter}
            onChange={e => setRoomFilter(e.target.value)}
            disabled={!homeFilter}
          >
            <option value="">All rooms</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>

        <a
          href={getLabelSheetUrl(Object.keys(params).length ? params : undefined)}
          target="_blank"
          rel="noreferrer"
          className="bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Generate PDF Label Sheet
        </a>
        <p className="text-xs text-gray-400 text-center">16 labels per A4 page</p>
      </div>
    </div>
  )
}
