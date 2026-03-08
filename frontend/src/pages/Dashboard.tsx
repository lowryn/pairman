import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, Plus, AlertTriangle, ShieldAlert } from 'lucide-react'
import { getStats } from '../services/api'
import type { DashboardStats, WarrantyAlert } from '../types'

const PROTOCOL_COLOURS: Record<string, { badge: string; bar: string }> = {
  Matter:    { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', bar: 'bg-violet-500' },
  HomeKit:   { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', bar: 'bg-orange-500' },
  'Z-Wave':  { badge: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',  bar: 'bg-green-500'  },
  Zigbee:    { badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', bar: 'bg-yellow-500' },
  WiFi:      { badge: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',   bar: 'bg-blue-500'   },
  Bluetooth: { badge: 'bg-sky-100    text-sky-700    dark:bg-sky-900/40    dark:text-sky-300',    bar: 'bg-sky-500'    },
  Thread:    { badge: 'bg-teal-100   text-teal-700   dark:bg-teal-900/40   dark:text-teal-300',   bar: 'bg-teal-500'   },
  Other:     { badge: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',   bar: 'bg-gray-400'   },
  Unknown:   { badge: 'bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400',   bar: 'bg-gray-400'   },
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => { getStats().then(setStats) }, [])

  if (!stats) return <div className="p-8 text-gray-400">Loading…</div>

  const { total_devices, total_homes, total_rooms, by_home, by_protocol, by_device_type, warranty_expired, warranty_expiring_soon } = stats
  const hasWarnings = warranty_expired.length > 0 || warranty_expiring_soon.length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link to="/devices" className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
          <p className="text-3xl font-bold dark:text-gray-100">{total_devices}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Devices</p>
        </Link>
        <Link to="/settings" className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
          <p className="text-3xl font-bold dark:text-gray-100">{total_homes}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Homes</p>
        </Link>
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
          <p className="text-3xl font-bold dark:text-gray-100">{total_rooms}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rooms</p>
        </div>
      </div>

      {/* Warranty alerts */}
      {hasWarnings && (
        <div className="mb-6 flex flex-col gap-3">
          {warranty_expired.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <h2 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400 mb-2">
                <ShieldAlert size={16} /> Warranty Expired
              </h2>
              <ul className="space-y-1">
                {warranty_expired.map((d: WarrantyAlert) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <Link to={`/devices/${d.id}`} className="text-red-700 dark:text-red-300 hover:underline">{d.name}</Link>
                    <span className="text-red-500 dark:text-red-400 text-xs">{d.warranty_expiry}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warranty_expiring_soon.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <h2 className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 mb-2">
                <AlertTriangle size={16} /> Expiring Within 30 Days
              </h2>
              <ul className="space-y-1">
                {warranty_expiring_soon.map((d: WarrantyAlert) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <Link to={`/devices/${d.id}`} className="text-amber-700 dark:text-amber-300 hover:underline">{d.name}</Link>
                    <span className="text-amber-500 dark:text-amber-400 text-xs">{d.warranty_expiry}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {total_devices === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <QrCode size={48} className="mx-auto mb-4 opacity-40" />
          <p className="mb-4">No devices yet.</p>
          <Link
            to="/devices/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Add your first device
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* By Home */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
            <h2 className="font-semibold mb-4 dark:text-gray-100">By Home</h2>
            <ul className="space-y-4">
              {by_home.map(home => (
                <li key={home.home_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium dark:text-gray-200">{home.home_name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{home.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${total_devices ? (home.count / total_devices) * 100 : 0}%` }}
                    />
                  </div>
                  {home.rooms.filter(r => r.count > 0).length > 0 && (
                    <ul className="pl-3 space-y-1 border-l-2 border-gray-100 dark:border-gray-700">
                      {home.rooms.filter(r => r.count > 0).map(room => (
                        <li key={room.room_id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{room.room_name}</span>
                          <span>{room.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* By Protocol */}
            {by_protocol.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
                <h2 className="font-semibold mb-4 dark:text-gray-100">By Protocol</h2>
                <ul className="space-y-2.5">
                  {by_protocol.map(({ protocol, count }) => {
                    const colours = PROTOCOL_COLOURS[protocol] ?? PROTOCOL_COLOURS.Other
                    return (
                      <li key={protocol} className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-20 text-center shrink-0 ${colours.badge}`}>
                          {protocol}
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colours.bar}`}
                            style={{ width: `${(count / total_devices) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-5 text-right shrink-0">{count}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* By Device Type */}
            {by_device_type.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
                <h2 className="font-semibold mb-4 dark:text-gray-100">By Type</h2>
                <ul className="space-y-2">
                  {by_device_type.map(({ device_type, count }) => (
                    <li key={device_type} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{device_type}</span>
                      <span className="text-gray-500 dark:text-gray-400">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
