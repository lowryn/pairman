import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, Printer, Pencil, Trash2, Paperclip, Download, File, FileText, ImageIcon, X, Upload } from 'lucide-react'
import { getDevice, deleteDevice, getDeviceLabelUrl, getAttachments, uploadAttachment, deleteAttachment, getAttachmentDownloadUrl } from '../services/api'
import type { Device, Attachment } from '../types'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentIcon({ fileType }: { fileType: string }) {
  if (fileType.startsWith('image/')) return <ImageIcon size={16} className="text-blue-400 shrink-0" />
  if (fileType === 'application/pdf') return <FileText size={16} className="text-red-400 shrink-0" />
  return <File size={16} className="text-gray-400 shrink-0" />
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [device, setDevice] = useState<Device | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) {
      getDevice(id).then(setDevice)
      getAttachments(id).then(setAttachments)
    }
  }, [id])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      const att = await uploadAttachment(id, file)
      setAttachments(prev => [...prev, att])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attId: string) => {
    await deleteAttachment(attId)
    setAttachments(prev => prev.filter(a => a.id !== attId))
  }

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

      {/* Attachments */}
      <div className="bg-white border rounded-xl mt-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Paperclip size={16} /> Attachments
            {attachments.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">({attachments.length})</span>
            )}
          </h2>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>

        {attachments.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400">No attachments yet.</p>
        ) : (
          <ul className="divide-y">
            {attachments.map(att => (
              <li key={att.id} className="flex items-center gap-3 px-4 py-3">
                <AttachmentIcon fileType={att.file_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.filename}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(att.file_size)}
                    {att.description && ` · ${att.description}`}
                  </p>
                </div>
                {att.file_type.startsWith('image/') && (
                  <img
                    src={getAttachmentDownloadUrl(att.id)}
                    alt={att.filename}
                    className="w-10 h-10 object-cover rounded shrink-0"
                  />
                )}
                <a
                  href={getAttachmentDownloadUrl(att.id)}
                  download={att.filename}
                  className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0"
                >
                  <Download size={15} />
                </a>
                <button
                  onClick={() => handleDeleteAttachment(att.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 shrink-0"
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
