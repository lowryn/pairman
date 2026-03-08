import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, Plus, Home, DoorOpen, Building2, ShieldAlert, AlertTriangle, ChevronRight } from 'lucide-react'
import { getStats } from '../services/api'
import type { DashboardStats } from '../types'

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

  const { total_devices, total_homes, total_rooms, total_manufacturers,
          recently_added, by_home, by_protocol, by_device_type,
          warranty_expired, warranty_expiring_soon } = stats

  const warrantyAlerts = [
    ...warranty_expired.map(d => ({ ...d, status: 'expired' as const })),
    ...warranty_expiring_soon.map(d => ({ ...d, status: 'soon' as const })),
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-100">Dashboard</h1>
        <Link
          to="/devices/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={15} /> Add Device
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link to="/devices" className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
            <QrCode size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold dark:text-gray-100">{total_devices}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Devices</p>
          </div>
        </Link>
        <Link to="/settings" className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg shrink-0">
            <Home size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-bold dark:text-gray-100">{total_homes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Homes</p>
          </div>
        </Link>
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg shrink-0">
            <DoorOpen size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold dark:text-gray-100">{total_rooms}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rooms</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg shrink-0">
            <Building2 size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold dark:text-gray-100">{total_manufacturers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manufacturers</p>
          </div>
        </div>
      </div>

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
        <>
          {/* Warranty alerts */}
          {warrantyAlerts.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 mb-6">
              <h2 className="font-semibold mb-3 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Warranty Alerts
              </h2>
              <ul className="divide-y dark:divide-gray-800">
                {warrantyAlerts.map(d => (
                  <li key={d.id}>
                    <Link to={`/devices/${d.id}`} className="flex items-center justify-between py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        {d.status === 'expired'
                          ? <ShieldAlert size={14} className="text-red-400 shrink-0" />
                          : <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        }
                        <span className="text-sm dark:text-gray-200">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${d.status === 'expired' ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {d.status === 'expired' ? 'Expired' : 'Expiring'} {d.warranty_expiry}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left column */}
            <div className="lg:col-span-3 flex flex-col gap-6">

              {/* By Home */}
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
                <h2 className="font-semibold mb-4 dark:text-gray-100">By Home</h2>
                <ul className="space-y-4">
                  {by_home.map(home => (
                    <li key={home.home_id}>
                      <div className="flex items-center justify-between mb-1">
                        <Link to={`/devices?home_id=${home.home_id}`} className="text-sm font-medium dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400">
                          {home.home_name}
                        </Link>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{home.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
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

              {/* Recently Added */}
              {recently_added.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold dark:text-gray-100">Recently Added</h2>
                    <Link to="/devices" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
                  </div>
                  <ul className="divide-y dark:divide-gray-800">
                    {recently_added.map(d => (
                      <li key={d.id}>
                        <Link to={`/devices/${d.id}`} className="flex items-center justify-between py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors">
                          <div>
                            <p className="text-sm font-medium dark:text-gray-200">{d.name}</p>
                            {(d.protocol || d.device_type) && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {[d.protocol, d.device_type].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                  <ul className="space-y-2.5">
                    {by_device_type.map(({ device_type, count }) => (
                      <li key={device_type} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-24 shrink-0 truncate">{device_type}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-400 dark:bg-gray-500 rounded-full"
                            style={{ width: `${(count / total_devices) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-5 text-right shrink-0">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  )
}
