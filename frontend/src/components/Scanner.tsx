import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'

const ELEMENT_ID = 'pairman-qr-scanner'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export default function Scanner({ onResult, onClose }: Props) {
  const [error, setError] = useState('')
  const qrRef = useRef<Html5Qrcode | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const qr = new Html5Qrcode(ELEMENT_ID)
    qrRef.current = qr

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => {
        if (doneRef.current) return
        doneRef.current = true
        qr.stop().catch(() => {}).finally(() => onResult(text))
      },
      undefined,
    ).catch(() => {
      setError('Camera unavailable — check your browser permissions.')
    })

    return () => {
      qr.stop().catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    qrRef.current?.stop().catch(() => {})
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <h2 className="text-white font-semibold text-lg">Scan Code</h2>
        <button onClick={handleClose} className="text-white/70 hover:text-white p-1">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {error ? (
          <div className="text-center">
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="bg-white text-black px-4 py-2 rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div id={ELEMENT_ID} className="w-full max-w-sm rounded-xl overflow-hidden" />
            <p className="text-white/50 text-sm text-center">
              Point at a Matter, HomeKit, or Z-Wave QR code
            </p>
          </>
        )}
      </div>
    </div>
  )
}
