import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDevices, getHomes } from '../services/api'
import type { Device, Home } from '../types'

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [homes, setHomes] = useState<Home[]>([])

  useEffect(() => {
    getDevices().then(setDevices)
    getHomes().then(setHomes)
  }, [])

  const byProtocol = devices.reduce<Record<string, number>>((acc, d) => {
    const p = d.protocol ?? 'Unknown'
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Stat label="Total Devices" value={devices.length} />
        <Stat label="Homes" value={homes.length} />
        {Object.entries(byProtocol).map(([p, n]) => (
          <Stat key={p} label={p} value={n} />
        ))}
      </div>

      <Link
        to="/devices/new"
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700"
      >
        + Add your first device
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}
