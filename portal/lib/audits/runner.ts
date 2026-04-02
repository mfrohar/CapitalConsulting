import { createAdminClient } from '@/lib/supabase-admin'
import {
  checkMetaTags,
  checkImageOptimization,
  checkSSLCertificate,
  checkMobileViewport,
  checkImageAltText,
  checkHeadingStructure,
  checkOpenGraph,
  checkCanonicalUrl,
} from './checks'
import { calculateOverallScore } from './scores'
import { CHECK_DIMENSIONS, TOTAL_CHECKS } from './types'
import type { CheckResult } from './types'

interface CheckDef {
  name: string
  run: (html: string, url: string) => Promise<CheckResult> | CheckResult
}

const CHECK_PIPELINE: CheckDef[] = [
  { name: 'ssl_certificate',    run: (_, url) => checkSSLCertificate(url) },
  { name: 'meta_tags',          run: (html) => checkMetaTags(html) },
  { name: 'mobile_viewport',    run: (html) => checkMobileViewport(html) },
  { name: 'heading_structure',  run: (html) => checkHeadingStructure(html) },
  { name: 'image_alt_text',     run: (html) => checkImageAltText(html) },
  { name: 'image_optimization', run: (html) => checkImageOptimization(html) },
  { name: 'open_graph',         run: (html) => checkOpenGraph(html) },
  { name: 'canonical_url',      run: (html) => checkCanonicalUrl(html) },
]

export async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CapitalConsultingAudit/1.0; +https://capitalconsulting.com)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!response.ok) return null
    const text = await response.text()
    return text
  } catch {
    return null
  }
}

/**
 * Run all audit checks for a URL, saving each result to DB immediately (streaming to DB).
 * Updates web_audits.progress_pct after each check.
 */
export async function runAudit(auditId: string, url: string): Promise<void> {
  const supabase = createAdminClient()

  // Mark audit as in_progress
  await supabase
    .from('web_audits')
    .update({ status: 'in_progress', progress_pct: 0 })
    .eq('id', auditId)

  // Fetch page HTML once
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const html = await fetchPageHtml(normalizedUrl)

  if (!html) {
    await supabase
      .from('web_audits')
      .update({ status: 'failed', progress_pct: 0 })
      .eq('id', auditId)
    return
  }

  const completedChecks: { score: number; dimension: string; status: string }[] = []

  // Run each check sequentially — save to DB immediately after each one
  for (let i = 0; i < CHECK_PIPELINE.length; i++) {
    const checkDef = CHECK_PIPELINE[i]
    const dimension = CHECK_DIMENSIONS[checkDef.name]

    try {
      const result = await checkDef.run(html, normalizedUrl)

      // Stream result to DB immediately
      await supabase.from('audit_checks').upsert({
        audit_id: auditId,
        check_name: checkDef.name,
        dimension,
        status: result.status,
        score: result.score,
        findings: result.findings,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'audit_id,check_name' })

      completedChecks.push({ score: result.score, dimension, status: result.status })
    } catch (err) {
      // Save error result so it still shows in UI
      await supabase.from('audit_checks').upsert({
        audit_id: auditId,
        check_name: checkDef.name,
        dimension,
        status: 'error',
        score: 0,
        findings: {
          title: checkDef.name,
          details: [`Check failed: ${err instanceof Error ? err.message : 'Unknown error'}`],
          recommendations: ['Retry the audit or check if the URL is accessible'],
        },
        completed_at: new Date().toISOString(),
      }, { onConflict: 'audit_id,check_name' })

      completedChecks.push({ score: 0, dimension, status: 'error' })
    }

    // Update progress after each check
    const progressPct = Math.round(((i + 1) / TOTAL_CHECKS) * 100)
    await supabase
      .from('web_audits')
      .update({ progress_pct: progressPct })
      .eq('id', auditId)
  }

  // Calculate final overall score from all completed checks
  const { data: allChecks } = await supabase
    .from('audit_checks')
    .select('*')
    .eq('audit_id', auditId)

  const overallScore = allChecks
    ? calculateOverallScore(allChecks as any)
    : 0

  // Mark completed
  await supabase
    .from('web_audits')
    .update({
      status: 'completed',
      overall_score: overallScore,
      progress_pct: 100,
      completed_at: new Date().toISOString(),
    })
    .eq('id', auditId)
}
