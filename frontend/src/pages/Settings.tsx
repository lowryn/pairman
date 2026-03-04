import { getBackupUrl } from '../services/api'

export default function Settings() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white border rounded-xl divide-y">
        <Section title="Backup & Restore">
          <a
            href={getBackupUrl()}
            download="pairman-backup.db"
            className="inline-block bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm"
          >
            Download Backup
          </a>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}
