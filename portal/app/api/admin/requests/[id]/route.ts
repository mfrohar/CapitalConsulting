import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const COST_PER_REQUEST = 100

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: adminClient } = await supabase
      .from('clients')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminClient?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body
    const admin = createAdminClient()

    // Get the request
    const { data: req, error: reqError } = await admin
      .from('requests')
      .select('id, client_id, title, status')
      .eq('id', params.id)
      .single()

    if (reqError || !req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Update status
    const { error: updateError } = await admin
      .from('requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // If completing, deduct $100 from retainer
    if (status === 'completed' && req.status !== 'completed') {
      const { data: retainer } = await admin
        .from('retainer_accounts')
        .select('id, balance')
        .eq('client_id', req.client_id)
        .single()

      if (retainer) {
        const newBalance = Math.max(0, Number(retainer.balance) - COST_PER_REQUEST)

        await admin
          .from('retainer_accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', retainer.id)

        await admin.from('retainer_transactions').insert({
          client_id: req.client_id,
          amount: COST_PER_REQUEST,
          type: 'debit',
          description: `Request completed: ${req.title}`,
        })
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Admin request update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
