import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastCtx {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

const STYLE: Record<ToastType, { bar: string; icon: React.ReactNode }> = {
  success: { bar: 'bg-green-600', icon: <CheckCircle size={16} className="shrink-0" /> },
  error:   { bar: 'bg-red-600',   icon: <XCircle     size={16} className="shrink-0" /> },
  info:    { bar: 'bg-gray-700',  icon: <Info        size={16} className="shrink-0" /> },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) =>
    setToasts(prev => prev.filter(t => t.id !== id)), [])

  const add = useCallback((message: string, type: ToastType) => {
    const id = ++nextId.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 3500)
  }, [dismiss])

  const success = useCallback((msg: string) => add(msg, 'success'), [add])
  const error   = useCallback((msg: string) => add(msg, 'error'),   [add])
  const info    = useCallback((msg: string) => add(msg, 'info'),    [add])

  return (
    <Ctx.Provider value={{ success, error, info }}>
      {children}
      {/* Sits above mobile nav (bottom-16) on small screens, bottom-4 on desktop */}
      <div className="fixed bottom-16 sm:bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => {
          const s = STYLE[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white sm:max-w-sm ml-auto w-full sm:w-auto pointer-events-auto ${s.bar}`}
            >
              {s.icon}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100 ml-1">
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
