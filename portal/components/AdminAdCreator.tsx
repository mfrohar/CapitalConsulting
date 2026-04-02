'use client'

import { useState, useEffect, useCallback } from 'react'

const PLATFORMS = [
  { value: 'facebook',  label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'google',    label: 'Google Display' },
  { value: 'twitter',   label: 'Twitter / X' },
]

interface AdCreative {
  id: string
  headline: string
  body_copy: string | null
  cta: string | null
  platform: string
  audience_description: string | null
  moda_job_id: string | null
  moda_status: 'generating' | 'processing' | 'ready' | 'failed'
  image_url: string | null
  status: 'draft' | 'sent_for_approval' | 'approved' | 'rejected' | 'revision_requested'
  rejection_reason: string | null
  sent_at: string | null
}

interface Props {
  requestId: string
  mode: string
}

export default function AdminAdCreator({ requestId, mode }: Props) {
  const [creative, setCreative] = useState<AdCreative | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(false)

  // Form state
  const [headline, setHeadline] = useState('')
  const [bodyCopy, setBodyCopy] = useState('')
  const [cta, setCta] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [audience, setAudience] = useState('')

  const fetchCreative = useCallback(async () => {
    const res = await fetch(`/api/admin/requests/${requestId}/ad`)
    const data = await res.json()
    if (data.creative) {
      setCreative(data.creative)
      // Pre-fill form with existing values
      setHeadline(data.creative.headline || '')
      setBodyCopy(data.creative.body_copy || '')
      setCta(data.creative.cta || '')
      setPlatform(data.creative.platform || 'instagram')
      setAudience(data.creative.audience_description || '')
    }
    setLoading(false)
    return data.creative
  }, [requestId])

  useEffect(() => {
    fetchCreative()
  }, [fetchCreative])

  // Poll while Moda is generating
  useEffect(() => {
    if (!creative || creative.moda_status !== 'generating') {
      setPolling(false)
      return
    }
    setPolling(true)
    const interval = setInterval(async () => {
      const updated = await fetchCreative()
      if (updated?.moda_status !== 'generating') {
        clearInterval(interval)
        setPolling(false)
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [creative?.moda_status, fetchCreative])

  const handleGenerate = async () => {
    if (!headline || !platform) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          body_copy: bodyCopy,
          cta,
          platform,
          audience_description: audience,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start ad generation')
      setCreative(data.creative)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/ad/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish')
      await fetchCreative()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPublishing(false)
    }
  }

  if (mode !== 'firm_creates') return null
  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-gray-400 text-sm">Loading ad workspace...</p>
    </div>
  )

  const isGenerating = creative?.moda_status === 'generating' || polling
  const isReady = creative?.moda_status === 'ready' && creative?.image_url
  const isSent = creative?.status === 'sent_for_approval'
  const isApproved = creative?.status === 'approved'
  const isRejected = creative?.status === 'rejected'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Ad Creative</h2>
        <span className="text-xs text-gray-400">Powered by Moda</span>
      </div>

      {/* Rejection feedback from client */}
      {isRejected && creative?.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700 mb-1">Client requested changes:</p>
          <p className="text-sm text-red-600">{creative.rejection_reason}</p>
        </div>
      )}

      {/* Approval badge */}
      {isApproved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium text-green-700">Client approved this ad</p>
        </div>
      )}

      {/* Ad Brief Form */}
      {!isSent && !isApproved && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="e.g. Transform Your Business in 30 Days"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Copy</label>
              <textarea
                value={bodyCopy}
                onChange={e => setBodyCopy(e.target.value)}
                rows={2}
                placeholder="e.g. Expert marketing strategies tailored for your industry..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call to Action</label>
              <input
                type="text"
                value={cta}
                onChange={e => setCta(e.target.value)}
                placeholder="e.g. Book a Free Call"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform <span className="text-red-500">*</span>
              </label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PLATFORMS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <input
                type="text"
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Small business owners in Ottawa, 35-55"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || isGenerating || !headline}
            className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Generating with Moda...
              </>
            ) : creative?.image_url ? (
              'Regenerate Ad'
            ) : (
              'Generate Ad with Moda'
            )}
          </button>
        </div>
      )}

      {/* Preview */}
      {isGenerating && !isReady && (
        <div className="border border-dashed border-gray-300 rounded-xl h-64 flex flex-col items-center justify-center gap-3 bg-gray-50">
          <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-gray-500">Moda is generating your ad...</p>
          <p className="text-xs text-gray-400">This usually takes 20–40 seconds</p>
        </div>
      )}

      {creative?.moda_status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
          Ad generation failed. Please try again.
        </div>
      )}

      {(isReady || isSent || isApproved) && creative?.image_url && (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <img src={creative.image_url} alt={creative.headline} className="w-full object-cover" />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p><span className="font-medium text-gray-700">Headline:</span> {creative.headline}</p>
            {creative.body_copy && <p><span className="font-medium text-gray-700">Body:</span> {creative.body_copy}</p>}
            {creative.cta && <p><span className="font-medium text-gray-700">CTA:</span> {creative.cta}</p>}
            <p>
              <span className="font-medium text-gray-700">Platform:</span>{' '}
              <span className="capitalize">{creative.platform}</span>
            </p>
          </div>

          {isSent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sent to client for approval on {creative.sent_at ? new Date(creative.sent_at).toLocaleDateString('en-CA') : '—'}
            </div>
          )}

          {isReady && !isSent && !isApproved && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {publishing ? 'Sending...' : 'Send to Client for Approval'}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
