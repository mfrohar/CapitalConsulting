/**
 * Moda API client
 * Docs: https://docs.moda.app/llms-full.txt
 */

const MODA_BASE = 'https://api.moda.app/v1'
const MODA_API_KEY = process.env.MODA_API_KEY

function modaHeaders() {
  return {
    Authorization: `Bearer ${MODA_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export interface ModaJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  canvas_id?: string
  error?: string
}

export interface AdBrief {
  headline: string
  bodyCopy?: string
  cta?: string
  platform: string
  audienceDescription?: string
  businessName?: string
}

/**
 * Build a design prompt from an ad brief
 */
function buildPrompt(brief: AdBrief): string {
  const platformDimensions: Record<string, string> = {
    facebook:  'Facebook Feed ad (1200x628px landscape)',
    instagram: 'Instagram Feed ad (1080x1080px square)',
    linkedin:  'LinkedIn Sponsored Content ad (1200x627px landscape)',
    google:    'Google Display ad (1200x628px landscape)',
    twitter:   'Twitter/X ad (1200x675px landscape)',
  }
  const format = platformDimensions[brief.platform] ?? 'social media ad'

  return [
    `Create a professional ${format} for ${brief.businessName ?? 'a business'}.`,
    `Headline: "${brief.headline}"`,
    brief.bodyCopy    ? `Body copy: "${brief.bodyCopy}"` : '',
    brief.cta         ? `Call to action button: "${brief.cta}"` : '',
    brief.audienceDescription ? `Target audience: ${brief.audienceDescription}` : '',
    'Style: Modern, clean, professional. Bold headline. Clear hierarchy.',
    'Use a strong visual focal point with contrasting colors that draw attention.',
    'Make the CTA button prominent and easy to read.',
  ].filter(Boolean).join('\n')
}

/**
 * Start a Moda design job. Returns job_id immediately.
 */
export async function startModaJob(brief: AdBrief): Promise<ModaJob> {
  const prompt = buildPrompt(brief)

  const res = await fetch(`${MODA_BASE}/jobs`, {
    method: 'POST',
    headers: modaHeaders(),
    body: JSON.stringify({
      prompt,
      canvas_name: `Ad — ${brief.headline.slice(0, 40)}`,
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Moda job creation failed: ${res.status} — ${err.detail ?? 'Unknown error'}`)
  }

  return res.json()
}

/**
 * Poll a job by ID. Call repeatedly until status is 'completed' or 'failed'.
 */
export async function getModaJob(jobId: string): Promise<ModaJob> {
  const res = await fetch(`${MODA_BASE}/jobs/${jobId}`, {
    headers: modaHeaders(),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    throw new Error(`Moda job fetch failed: ${res.status}`)
  }

  return res.json()
}

/**
 * Export a completed canvas as PNG. Returns a public download URL.
 */
export async function exportModaCanvas(canvasId: string): Promise<string> {
  const res = await fetch(
    `${MODA_BASE}/canvases/${canvasId}/export?format=png`,
    {
      headers: modaHeaders(),
      signal: AbortSignal.timeout(30000),
    }
  )

  if (!res.ok) {
    throw new Error(`Moda canvas export failed: ${res.status}`)
  }

  const data = await res.json()
  // Moda returns { url: '...' } or similar
  return data.url ?? data.download_url ?? data.file_url
}
