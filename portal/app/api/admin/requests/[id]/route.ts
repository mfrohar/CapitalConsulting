import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const COMPLETION_COST = 100 // $100 deducted per completed request

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Verify the caller is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify caller is admin
    const { data: caller } = await adminSupabase
      .from('clients')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, quoted_price } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const requestId = params.id

    // Fetch the current request to get client_id and current status
    const { data: existingRequest, error: fetchError } = await adminSupabase
      .from('requests')
      .select('id, client_id, status, title, quoted_price')
      .eq('id', requestId)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const wasAlreadyCompleted = existingRequest.status === 'completed'
    const isBeingCompleted = status === 'completed' && !wasAlreadyCompleted

    // Build update payload
    const updates: Record<string, unknown> = { status }
    if (quoted_price !== undefined && quoted_price !== '') {
      updates.quoted_price = parseFloat(quoted_price)
    }
    if (isBeingCompleted) {
      updates.completed_at = new Date().toISOString()
    }

    // Update request status
    const { error: updateError } = await adminSupabase
      .from('requests')
      .update(updates)
      .eq('id', requestId)

    if (updateError) {
      console.error('Request update error:', updateError)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    // If newly completed → deduct $100 from client's retainer
    if (isBeingCompleted) {
      const clientId = existingRequest.client_id

      // Get current balance
      const { data: account, error: accountError } = await adminSupabase
        .from('retainer_accounts')
        .select('id, balance')
        .eq('client_id', clientId)
        .single()

      if (accountError || !account) {
        console.error('Could not find retainer account for client:', clientId)
      } else {
        const newBalance = Math.max(0, Number(account.balance) - COMPLETION_COST)

        // Deduct balance
        await adminSupabase
          .from('retainer_accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', account.id)

        // Log debit transaction
        await adminSupabase
          .from('retainer_transactions')
          .insert({
            client_id: clientId,
            amount: COMPLETION_COST,
            type: 'debit',
            description: `Request completed: ${existingRequest.title}`,
          })
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
