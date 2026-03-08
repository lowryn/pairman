import { useEffect, useRef, useState } from 'react'
import { Trash2, Plus, Upload, Pencil, Check, X } from 'lucide-react'
import {
  getHomes, createHome, deleteHome,
  getRooms, createRoom, deleteRoom,
  getManufacturers, createManufacturer, deleteManufacturer,
  getExportUrl, importDevices,
  getBackupUrl, restoreBackup,
  getTags, renameTag, deleteTag,
} from '../services/api'
import type { Home, Room, Manufacturer } from '../types'
import { useToast } from '../components/ToastProvider'

export default function Settings() {
  const toast = useToast()
  const [homes, setHomes] = useState<Home[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editingTagValue, setEditingTagValue] = useState('')

  const [newHome, setNewHome] = useState('')
  const [newRoom, setNewRoom] = useState('')
  const [newRoomHome, setNewRoomHome] = useState('')
  const [newMfr, setNewMfr] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const restoreRef = useRef<HTMLInputElement>(null)

  const reload = () => {
    getHomes().then(h => { setHomes(h); if (!newRoomHome && h.length) setNewRoomHome(h[0].id) })
    getRooms().then(setRooms)
    getManufacturers().then(setManufacturers)
    getTags().then(setTags)
  }

  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addHome = async () => {
    const name = newHome.trim()
    if (!name) return
    try {
      await createHome({ name })
      setNewHome('')
      reload()
      toast.success(`Home "${name}" added`)
    } catch {
      toast.error('Failed to add home')
    }
  }

  const addRoom = async () => {
    const name = newRoom.trim()
    if (!name || !newRoomHome) return
    try {
      await createRoom({ name, home_id: newRoomHome })
      setNewRoom('')
      reload()
      toast.success(`Room "${name}" added`)
    } catch {
      toast.error('Failed to add room')
    }
  }

  const addMfr = async () => {
    const name = newMfr.trim()
    if (!name) return
    try {
      await createManufacturer({ name })
      setNewMfr('')
      reload()
      toast.success(`Manufacturer "${name}" added`)
    } catch {
      toast.error('Failed to add manufacturer')
    }
  }

  const saveTagRename = async () => {
    if (!editingTag || !editingTagValue.trim()) return
    try {
      await renameTag(editingTag, editingTagValue.trim())
      setEditingTag(null)
      getTags().then(setTags)
      toast.success('Tag renamed')
    } catch {
      toast.error('Failed to rename tag')
    }
  }

  const homeById = (id: string) => homes.find(h => h.id === id)?.name ?? id

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Settings</h1>

      <div className="flex flex-col gap-4">
        {/* Homes */}
        <Section title="Homes">
          <ul className="divide-y dark:divide-gray-700 mb-3">
            {homes.length === 0 && <li className="py-2 text-sm text-gray-400">No homes yet</li>}
            {homes.map(h => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span className="text-sm dark:text-gray-200">{h.name}</span>
                <button
                  onClick={() => deleteHome(h.id).then(() => { reload(); toast.success(`"${h.name}" deleted`) }).catch(() => toast.error('Failed to delete home'))}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              className="border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm flex-1 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Home name"
              value={newHome}
              onChange={e => setNewHome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHome()}
            />
            <button onClick={addHome} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700">
              <Plus size={14} /> Add
            </button>
          </div>
        </Section>

        {/* Rooms */}
        <Section title="Rooms">
          <ul className="divide-y dark:divide-gray-700 mb-3">
            {rooms.length === 0 && <li className="py-2 text-sm text-gray-400">No rooms yet</li>}
            {rooms.map(r => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span className="text-sm dark:text-gray-200">{r.name} <span className="text-gray-400">— {homeById(r.home_id)}</span></span>
                <button
                  onClick={() => deleteRoom(r.id).then(() => { reload(); toast.success(`"${r.name}" deleted`) }).catch(() => toast.error('Failed to delete room'))}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          {homes.length === 0
            ? <p className="text-sm text-gray-400">Add a home first</p>
            : (
              <div className="flex gap-2">
                <select
                  className="border dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
                  value={newRoomHome}
                  onChange={e => setNewRoomHome(e.target.value)}
                >
                  {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <input
                  className="border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm flex-1 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Room name"
                  value={newRoom}
                  onChange={e => setNewRoom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRoom()}
                />
                <button onClick={addRoom} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700">
                  <Plus size={14} /> Add
                </button>
              </div>
            )
          }
        </Section>

        {/* Manufacturers */}
        <Section title="Manufacturers">
          <ul className="divide-y dark:divide-gray-700 mb-3">
            {manufacturers.length === 0 && <li className="py-2 text-sm text-gray-400">No manufacturers yet</li>}
            {manufacturers.map(m => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span className="text-sm dark:text-gray-200">{m.name}</span>
                <button
                  onClick={() => deleteManufacturer(m.id).then(() => { reload(); toast.success(`"${m.name}" deleted`) }).catch(() => toast.error('Failed to delete manufacturer'))}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              className="border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm flex-1 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Manufacturer name"
              value={newMfr}
              onChange={e => setNewMfr(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMfr()}
            />
            <button onClick={addMfr} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700">
              <Plus size={14} /> Add
            </button>
          </div>
        </Section>

        {/* Tags */}
        <Section title="Tags">
          <ul className="divide-y dark:divide-gray-700 mb-2">
            {tags.length === 0 && <li className="py-2 text-sm text-gray-400">No tags yet</li>}
            {tags.map(tag => (
              <li key={tag} className="flex items-center justify-between py-2 gap-2">
                {editingTag === tag ? (
                  <>
                    <input
                      className="border dark:border-gray-600 rounded px-2 py-1 text-sm flex-1 dark:bg-gray-800 dark:text-gray-100"
                      value={editingTagValue}
                      onChange={e => setEditingTagValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTagRename(); if (e.key === 'Escape') setEditingTag(null) }}
                      autoFocus
                    />
                    <button onClick={saveTagRename} className="p-1 text-green-600 hover:text-green-800"><Check size={15} /></button>
                    <button onClick={() => setEditingTag(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={15} /></button>
                  </>
                ) : (
                  <>
                    <span className="text-sm dark:text-gray-200 flex-1">{tag}</span>
                    <button onClick={() => { setEditingTag(tag); setEditingTagValue(tag) }} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"><Pencil size={14} /></button>
                    <button
                      onClick={() => deleteTag(tag).then(() => { getTags().then(setTags); toast.success(`Tag "${tag}" deleted`) }).catch(() => toast.error('Failed to delete tag'))}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Section>

        {/* Import / Export */}
        <Section title="Import & Export">
          <div className="flex flex-wrap gap-2 mb-2">
            <a
              href={getExportUrl('json')}
              download="pairman-export.json"
              className="inline-block bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 px-4 py-2 rounded-lg text-sm"
            >
              Export JSON
            </a>
            <a
              href={getExportUrl('csv')}
              download="pairman-export.csv"
              className="inline-block bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 px-4 py-2 rounded-lg text-sm"
            >
              Export CSV
            </a>
            <button
              onClick={() => importRef.current?.click()}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 px-4 py-2 rounded-lg text-sm"
            >
              <Upload size={14} /> Import CSV / JSON
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                toast.info('Importing…')
                try {
                  const result = await importDevices(file)
                  toast.success(`Imported ${result.imported} device${result.imported !== 1 ? 's' : ''}${result.skipped ? `, ${result.skipped} skipped` : ''}`)
                } catch {
                  toast.error('Import failed — check the file format')
                }
                if (importRef.current) importRef.current.value = ''
              }}
            />
          </div>
          <p className="text-xs text-gray-400">
            CSV/JSON must have columns: name, home, room, manufacturer, model, device_type, protocol, pairing_code, qr_code_data…
          </p>
        </Section>

        {/* Backup & Restore */}
        <Section title="Backup & Restore">
          <div className="flex flex-wrap gap-2">
            <a
              href={getBackupUrl()}
              download="pairman-backup.db"
              className="inline-block bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 px-4 py-2 rounded-lg text-sm"
            >
              Download Backup
            </a>
            <button
              onClick={() => restoreRef.current?.click()}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 px-4 py-2 rounded-lg text-sm"
            >
              <Upload size={14} /> Restore from Backup
            </button>
            <input
              ref={restoreRef}
              type="file"
              accept=".db"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!confirm('This will replace ALL current data with the backup. Continue?')) return
                toast.info('Restoring…')
                try {
                  await restoreBackup(file)
                  toast.success('Restore successful — reloading…')
                  setTimeout(() => window.location.reload(), 1500)
                } catch {
                  toast.error('Restore failed — make sure the file is a valid Pairman backup')
                }
                if (restoreRef.current) restoreRef.current.value = ''
              }}
            />
          </div>
        </Section>

        {/* About */}
        <Section title="About">
          <div className="text-sm space-y-1">
            <p className="dark:text-gray-200"><span className="text-gray-500 dark:text-gray-400 w-36 inline-block">App</span>Pairman</p>
            <p className="dark:text-gray-200"><span className="text-gray-500 dark:text-gray-400 w-36 inline-block">Version</span>0.1.0</p>
            <p className="dark:text-gray-200"><span className="text-gray-500 dark:text-gray-400 w-36 inline-block">Description</span>Self-hosted smart home pairing code manager</p>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4">
      <h2 className="font-semibold mb-3 dark:text-gray-100">{title}</h2>
      {children}
    </div>
  )
}
