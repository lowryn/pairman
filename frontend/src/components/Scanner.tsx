import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { X } from 'lucide-react'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export default function Scanner({ onResult, onClose }: Props) {
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!window.isSecureContext) {
      setError('Camera requires HTTPS. Use https:// to access this page.')
      return
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(() => setError('Camera unavailable — check your browser permissions.'))

    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVideoPlay = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const tick = () => {
      if (doneRef.current) return
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          doneRef.current = true
          streamRef.current?.getTracks().forEach((t) => t.stop())
          onResult(code.data)
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const handleClose = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-10">
        <h2 className="text-white font-semibold text-lg">Scan Code</h2>
        <button onClick={handleClose} className="text-white/70 hover:text-white p-1">
          <X size={24} />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-white mb-6">{error}</p>
            <button onClick={handleClose} className="bg-white text-black px-5 py-2 rounded-lg font-medium">
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* Live camera feed — playsInline is critical for iOS */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onPlay={handleVideoPlay}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Viewfinder overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 relative">
              {/* Corner brackets */}
              {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 right-0 rotate-180', 'bottom-0 left-0 -rotate-90'].map((pos) => (
                <span key={pos} className={`absolute ${pos} w-8 h-8 border-white border-t-4 border-l-4`} />
              ))}
            </div>
          </div>

          <p className="absolute bottom-8 inset-x-0 text-center text-white/60 text-sm pointer-events-none">
            Point at a Matter, HomeKit, or Z-Wave QR code
          </p>
        </div>
      )}

      {/* Hidden canvas for jsQR processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
