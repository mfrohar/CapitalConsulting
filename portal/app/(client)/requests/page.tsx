import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RequestList from '@/components/RequestList'
import Link from 'next/link'

export default async function RequestsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: requests } = await supabase
    .from('requests')
    .select('id, title, type, status, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Requests</h1>
          <p className="text-gray-500 text-sm mt-1">All your submitted content requests</p>
        </div>
        <Link
          href="/requests/new"
          className="bg-primary hover:bg-blue-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + New Request
        </Link>
      </div>

      {requests && requests.length > 0 ? (
        <RequestList requests={requests} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No requests yet</p>
          <p className="text-sm mb-4">Get started by submitting your first content request.</p>
          <Link
            href="/requests/new"
            className="bg-primary hover:bg-blue-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            Submit a Request
          </Link>
        </div>
      )}
    </div>
  )
}
