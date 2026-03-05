import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, Printer, Pencil, Trash2 } from 'lucide-react'
import { getDevice, deleteDevice, getDeviceLabelUrl } from '../services/api'
import type { Device } from '../types'

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device | null>(null)

  useEffect(() => {
    if (id) getDevice(id).then(setDevice)
  }, [id])

  const handleDelete = async () => {
    if (!id || !confirm('Delete this device?')) return
    await deleteDevice(id)
    navigate('/devices')
  }

  if (!device) return <div className="p-8 text-gray-400">Loading…</div>

  const qrData = device.qr_code_data || device.pairing_code

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/devices" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold flex-1">{device.name}</h1>
        <Link to={`/devices/${id}/edit`} className="p-2 hover:bg-gray-100 rounded-lg">
          <Pencil size={18} />
        </Link>
        <button onClick={handleDelete} className="p-2 hover:bg-red-50 text-red-500 rounded-lg">
          <Trash2 size={18} />
        </button>
      </div>

      {qrData && (
        <div className="bg-white border rounded-xl p-6 flex flex-col items-center gap-4 mb-6">
          <QRCodeSVG value={qrData} size={200} />
          {device.pairing_code && (
            <p className="font-mono text-lg tracking-widest">
            {device.pairing_code?.length === 11
              ? `${device.pairing_code.slice(0,4)}-${device.pairing_code.slice(4,7)}-${device.pairing_code.slice(7,11)}`
              : device.pairing_code}
          </p>
          )}
          <a
            href={getDeviceLabelUrl(device.id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm"
          >
            <Printer size={16} /> Print Label
          </a>
        </div>
      )}

      <div className="bg-white border rounded-xl divide-y">
        {[
          ['Model', device.model],
          ['Protocol', device.protocol],
          ['Device Type', device.device_type],
          ['Serial Number', device.serial_number],
          ['MAC Address', device.mac_address],
          ['Firmware', device.firmware_version],
          ['Retailer', device.retailer],
          ['Purchase Date', device.purchase_date],
          ['Warranty Expires', device.warranty_expiry],
          ['Admin URL', device.admin_url],
        ].filter(([, v]) => v).map(([label, value]) => (
          <div key={label as string} className="flex px-4 py-3 text-sm">
            <span className="text-gray-500 w-36 shrink-0">{label}</span>
            <span>{value as string}</span>
          </div>
        ))}
        {device.notes && (
          <div className="px-4 py-3 text-sm">
            <p className="text-gray-500 mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{device.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
