import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// POST — Publish ad to client for approval
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: caller } = await admin.from('clients').select('role').eq('id', user.id).single()
    if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify ad is ready to publish
    const { data: creative } = await admin
      .from('ad_creatives')
      .select('*')
      .eq('request_id', params.id)
      .single()

    if (!creative) return NextResponse.json({ error: 'No ad creative found' }, { status: 404 })
    if (!creative.image_url) return NextResponse.json({ error: 'Ad image not ready yet' }, { status: 400 })

    // Mark ad as sent for approval
    await admin
      .from('ad_creatives')
      .update({ status: 'sent_for_approval', sent_at: new Date().toISOString() })
      .eq('request_id', params.id)

    // Move request to awaiting_approval
    await admin
      .from('requests')
      .update({ status: 'awaiting_approval' })
      .eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Ad publish error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
