import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const TOPUP_AMOUNT = 500

export async function POST() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current balance
    const { data: account, error: fetchError } = await supabase
      .from('retainer_accounts')
      .select('id, balance')
      .eq('client_id', user.id)
      .single()

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Retainer account not found' },
        { status: 404 }
      )
    }

    const newBalance = Number(account.balance) + TOPUP_AMOUNT

    // Update balance
    const { error: updateError } = await supabase
      .from('retainer_accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', account.id)

    if (updateError) {
      console.error('Balance update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update balance' },
        { status: 500 }
      )
    }

    // Insert credit transaction
    const { error: txError } = await supabase
      .from('retainer_transactions')
      .insert({
        client_id: user.id,
        amount: TOPUP_AMOUNT,
        type: 'credit',
        description: `Retainer top-up of $${TOPUP_AMOUNT}`,
      })

    if (txError) {
      console.error('Transaction insert error:', txError)
    }

    return NextResponse.json({ balance: newBalance }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
