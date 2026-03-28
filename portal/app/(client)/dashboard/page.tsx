import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RetainerBalance from '@/components/RetainerBalance'
import RequestList from '@/components/RequestList'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('name, company')
    .eq('id', user.id)
    .single()

  const { data: retainerAccount } = await supabase
    .from('retainer_accounts')
    .select('balance')
    .eq('client_id', user.id)
    .single()

  const { data: requests } = await supabase
    .from('requests')
    .select('id, title, type, status, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-primary">
          Welcome back, {client?.name ?? 'Client'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{client?.company}</p>
      </div>

      {/* Retainer Balance */}
      <RetainerBalance balance={retainerAccount?.balance ?? 0} />

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Requests</h2>
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
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No requests yet.{' '}
            <Link href="/requests/new" className="text-primary font-medium hover:underline">
              Submit your first request
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
