import type { CheckResult } from './types'

// ─── HTML Helpers ────────────────────────────────────────────────────────────

function getTagContent(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? match[1].trim() : null
}

function getMetaContent(html: string, name: string): string | null {
  const nameFirst = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
  const contentFirst = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))
  return (nameFirst || contentFirst)?.[1] ?? null
}

function getMetaProperty(html: string, property: string): string | null {
  const propFirst = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
  const contentFirst = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'))
  return (propFirst || contentFirst)?.[1] ?? null
}

function countMatches(html: string, regex: RegExp): number {
  return (html.match(regex) || []).length
}

// ─── 1. Technical SEO — Meta Tags ────────────────────────────────────────────

export function checkMetaTags(html: string): CheckResult {
  const title = getTagContent(html, 'title')
  const description = getMetaContent(html, 'description')
  const keywords = getMetaContent(html, 'keywords')

  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  // Title checks
  if (!title) {
    issues.push('Missing <title> tag')
    recommendations.push('Add a descriptive <title> tag (50–60 characters)')
    score -= 40
  } else if (title.length < 30) {
    issues.push(`Title too short (${title.length} chars): "${title}"`)
    recommendations.push('Expand title to 50–60 characters for better click-through rates')
    score -= 20
  } else if (title.length > 65) {
    issues.push(`Title too long (${title.length} chars) — gets truncated in search results`)
    recommendations.push('Trim title to under 65 characters')
    score -= 15
  } else {
    issues.push(`Title OK (${title.length} chars): "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"`)
  }

  // Description checks
  if (!description) {
    issues.push('Missing meta description')
    recommendations.push('Add a meta description tag (120–158 characters) summarising the page')
    score -= 40
  } else if (description.length < 70) {
    issues.push(`Meta description too short (${description.length} chars)`)
    recommendations.push('Expand meta description to 120–158 characters')
    score -= 15
  } else if (description.length > 165) {
    issues.push(`Meta description too long (${description.length} chars) — will be truncated`)
    recommendations.push('Shorten meta description to under 160 characters')
    score -= 10
  } else {
    issues.push(`Meta description OK (${description.length} chars)`)
  }

  // Keywords (bonus check)
  if (!keywords) {
    recommendations.push('Consider adding a meta keywords tag (minor signal for some engines)')
  }

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail'

  return {
    status,
    score: Math.max(0, score),
    findings: {
      title: 'Meta Tags & Title',
      details: issues,
      recommendations,
    },
  }
}

// ─── 2. Performance — Image Optimisation ────────────────────────────────────

export function checkImageOptimization(html: string): CheckResult {
  const imgTags = html.match(/<img[^>]+>/gi) || []
  const total = imgTags.length

  if (total === 0) {
    return {
      status: 'pass',
      score: 100,
      findings: {
        title: 'Image Optimisation',
        details: ['No images found on the page'],
        recommendations: [],
      },
    }
  }

  let missingLazy = 0
  let missingDimensions = 0
  let largePng = 0

  for (const tag of imgTags) {
    if (!tag.match(/loading=["']lazy["']/i)) missingLazy++
    if (!tag.match(/width=/i) || !tag.match(/height=/i)) missingDimensions++
    if (tag.match(/src=["'][^"']*\.png["']/i) && !tag.match(/src=["'][^"']*\.webp["']/i)) largePng++
  }

  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  issues.push(`Found ${total} image(s) on the page`)

  if (missingLazy > 0) {
    issues.push(`${missingLazy}/${total} images missing lazy loading`)
    recommendations.push('Add loading="lazy" to below-the-fold images to improve page load speed')
    score -= Math.min(30, Math.round((missingLazy / total) * 30))
  }

  if (missingDimensions > 0) {
    issues.push(`${missingDimensions}/${total} images missing width/height attributes`)
    recommendations.push('Add explicit width and height to all <img> tags to prevent layout shift (CLS)')
    score -= Math.min(30, Math.round((missingDimensions / total) * 30))
  }

  if (largePng > 0) {
    issues.push(`${largePng} PNG image(s) detected — consider converting to WebP`)
    recommendations.push('Convert PNG/JPG images to WebP format for 25–35% smaller file sizes')
    score -= Math.min(20, largePng * 5)
  }

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail'

  return {
    status,
    score: Math.max(0, score),
    findings: {
      title: 'Image Optimisation',
      details: issues,
      recommendations,
    },
  }
}

// ─── 3. Security — SSL Certificate ───────────────────────────────────────────

export async function checkSSLCertificate(url: string): Promise<CheckResult> {
  const isHttps = url.startsWith('https://')
  const issues: string[] = []
  const recommendations: string[] = []

  if (!isHttps) {
    // Try to see if http redirects to https
    try {
      const httpUrl = url.replace(/^https?:\/\//, 'http://')
      const response = await fetch(httpUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) })
      const finalUrl = response.url

      if (finalUrl.startsWith('https://')) {
        issues.push('Site redirects HTTP → HTTPS (good), but direct URL is HTTP')
        recommendations.push('Update all internal links and canonical URL to use HTTPS')
        return {
          status: 'warning',
          score: 60,
          findings: { title: 'SSL / HTTPS Security', details: issues, recommendations },
        }
      } else {
        issues.push('Site does NOT use HTTPS — data sent in plain text')
        recommendations.push('Install an SSL certificate (free via Let\'s Encrypt) and force HTTPS redirects')
        return {
          status: 'fail',
          score: 0,
          findings: { title: 'SSL / HTTPS Security', details: issues, recommendations },
        }
      }
    } catch {
      issues.push('Could not verify SSL — site may not be reachable via HTTP')
      return {
        status: 'fail',
        score: 0,
        findings: { title: 'SSL / HTTPS Security', details: issues, recommendations },
      }
    }
  }

  // Check HTTPS headers
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    const hsts = response.headers.get('strict-transport-security')

    issues.push('Site uses HTTPS — connection is encrypted')

    if (!hsts) {
      issues.push('Missing HSTS header (Strict-Transport-Security)')
      recommendations.push('Add HSTS header to prevent SSL stripping attacks: Strict-Transport-Security: max-age=31536000; includeSubDomains')
      return {
        status: 'warning',
        score: 75,
        findings: { title: 'SSL / HTTPS Security', details: issues, recommendations },
      }
    }

    issues.push('HSTS header present — strong transport security')
    return {
      status: 'pass',
      score: 100,
      findings: { title: 'SSL / HTTPS Security', details: issues, recommendations },
    }
  } catch {
    issues.push('HTTPS in use but could not verify security headers')
    return {
      status: 'warning',
      score: 70,
      findings: { title: 'SSL / HTTPS Security', details: issues, recommendations },
    }
  }
}

// ─── 4. Mobile — Viewport ────────────────────────────────────────────────────

export function checkMobileViewport(html: string): CheckResult {
  const viewport = getMetaContent(html, 'viewport')
  const issues: string[] = []
  const recommendations: string[] = []

  if (!viewport) {
    return {
      status: 'fail',
      score: 0,
      findings: {
        title: 'Mobile Viewport',
        details: ['Missing <meta name="viewport"> tag — page will not scale on mobile devices'],
        recommendations: ['Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your <head>'],
      },
    }
  }

  let score = 100
  issues.push(`Viewport tag found: ${viewport}`)

  if (!viewport.includes('width=device-width')) {
    issues.push('Viewport does not include "width=device-width"')
    recommendations.push('Set viewport to: width=device-width, initial-scale=1')
    score -= 40
  }

  if (!viewport.includes('initial-scale=1')) {
    issues.push('Viewport does not set "initial-scale=1"')
    recommendations.push('Ensure initial-scale=1 is set to prevent zoom issues on load')
    score -= 20
  }

  if (viewport.includes('user-scalable=no') || viewport.includes('maximum-scale=1')) {
    issues.push('Viewport disables user zoom — accessibility concern')
    recommendations.push('Remove user-scalable=no / maximum-scale=1 to allow pinch-to-zoom for accessibility')
    score -= 20
  }

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail'

  return {
    status,
    score: Math.max(0, score),
    findings: { title: 'Mobile Viewport', details: issues, recommendations },
  }
}

// ─── 5. Accessibility — Image Alt Text ───────────────────────────────────────

export function checkImageAltText(html: string): CheckResult {
  const imgTags = html.match(/<img[^>]+>/gi) || []
  const total = imgTags.length

  if (total === 0) {
    return {
      status: 'pass',
      score: 100,
      findings: {
        title: 'Image Alt Text (Accessibility)',
        details: ['No images found on the page'],
        recommendations: [],
      },
    }
  }

  let missingAlt = 0
  let emptyAlt = 0

  for (const tag of imgTags) {
    const altMatch = tag.match(/alt=["']([^"']*)["']/i)
    if (!altMatch) {
      missingAlt++
    } else if (altMatch[1].trim() === '') {
      emptyAlt++
    }
  }

  const issues: string[] = []
  const recommendations: string[] = []
  const withAlt = total - missingAlt - emptyAlt
  const score = Math.round((withAlt / total) * 100)

  issues.push(`${withAlt}/${total} images have descriptive alt text`)

  if (missingAlt > 0) {
    issues.push(`${missingAlt} image(s) are missing the alt attribute entirely`)
    recommendations.push('Add alt attributes to all images — required for screen readers and WCAG 2.1 compliance')
  }

  if (emptyAlt > 0) {
    issues.push(`${emptyAlt} image(s) have empty alt="" (acceptable only for purely decorative images)`)
    recommendations.push('Replace empty alt text with descriptive alternatives for meaningful images')
  }

  const status = score >= 90 ? 'pass' : score >= 60 ? 'warning' : 'fail'

  return {
    status,
    score: Math.max(0, score),
    findings: { title: 'Image Alt Text (Accessibility)', details: issues, recommendations },
  }
}

// ─── 6. UX & Design — Heading Structure ──────────────────────────────────────

export function checkHeadingStructure(html: string): CheckResult {
  const h1Tags = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || []
  const h2Tags = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || []
  const h3Tags = html.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || []

  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  // H1 checks
  if (h1Tags.length === 0) {
    issues.push('No <h1> tag found — every page should have exactly one H1')
    recommendations.push('Add a single <h1> tag with the main keyword/topic of the page')
    score -= 40
  } else if (h1Tags.length > 1) {
    issues.push(`Multiple <h1> tags found (${h1Tags.length}) — search engines expect only one`)
    recommendations.push('Consolidate to a single <h1> that describes the page\'s primary topic')
    score -= 25
  } else {
    const h1Text = (h1Tags[0] ?? '').replace(/<[^>]+>/g, '').trim()
    issues.push(`H1: "${h1Text.substring(0, 80)}${h1Text.length > 80 ? '...' : ''}"`)
  }

  // H2/H3 checks
  if (h2Tags.length === 0 && h3Tags.length > 0) {
    issues.push('H3 tags used without H2 — broken heading hierarchy')
    recommendations.push('Use headings in order: H1 → H2 → H3. Do not skip levels.')
    score -= 20
  } else if (h2Tags.length > 0) {
    issues.push(`${h2Tags.length} H2 heading(s) and ${h3Tags.length} H3 heading(s) found`)
  } else {
    issues.push('No subheadings (H2/H3) found — consider adding sections for readability')
    recommendations.push('Break content into sections using H2/H3 headings for better UX and SEO')
    score -= 15
  }

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail'

  return {
    status,
    score: Math.max(0, score),
    findings: { title: 'Heading Structure (UX)', details: issues, recommendations },
  }
}

// ─── 7. Digital Footprint — Open Graph ───────────────────────────────────────

export function checkOpenGraph(html: string): CheckResult {
  const ogTitle = getMetaProperty(html, 'og:title')
  const ogDescription = getMetaProperty(html, 'og:description')
  const ogImage = getMetaProperty(html, 'og:image')
  const ogUrl = getMetaProperty(html, 'og:url')
  const twitterCard = getMetaContent(html, 'twitter:card')

  const issues: string[] = []
  const recommendations: string[] = []
  let score = 0
  const maxScore = 100

  if (ogTitle) {
    issues.push(`OG Title: "${ogTitle.substring(0, 60)}"`)
    score += 25
  } else {
    issues.push('Missing og:title — links shared on social media will show no title')
    recommendations.push('Add <meta property="og:title" content="Your Page Title">')
  }

  if (ogDescription) {
    issues.push(`OG Description present (${ogDescription.length} chars)`)
    score += 25
  } else {
    issues.push('Missing og:description — social shares will have no description')
    recommendations.push('Add <meta property="og:description" content="Brief page summary">')
  }

  if (ogImage) {
    issues.push('OG Image present — links will show a preview image when shared')
    score += 30
  } else {
    issues.push('Missing og:image — social posts will appear as plain text links')
    recommendations.push('Add <meta property="og:image" content="https://yoursite.com/social-image.jpg"> (1200×630px recommended)')
  }

  if (ogUrl) {
    issues.push('OG URL present')
    score += 10
  } else {
    recommendations.push('Add <meta property="og:url" content="https://yoursite.com/page">')
  }

  if (twitterCard) {
    issues.push(`Twitter Card type: ${twitterCard}`)
    score += 10
  } else {
    recommendations.push('Add Twitter Card meta tags for better Twitter/X sharing appearance')
  }

  score = Math.min(maxScore, score)
  const status = score >= 80 ? 'pass' : score >= 40 ? 'warning' : 'fail'

  return {
    status,
    score,
    findings: { title: 'Open Graph & Social Sharing', details: issues, recommendations },
  }
}

// ─── 8. Backlinks & Canonicalisation ─────────────────────────────────────────

export function checkCanonicalUrl(html: string): CheckResult {
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
  const robots = getMetaContent(html, 'robots')
  const noindex = robots?.includes('noindex')

  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  if (!canonicalMatch) {
    issues.push('No canonical URL tag found')
    recommendations.push('Add <link rel="canonical" href="https://yoursite.com/page"> to prevent duplicate content penalties')
    score -= 40
  } else {
    issues.push(`Canonical URL: ${canonicalMatch[1]}`)
  }

  if (noindex) {
    issues.push('Page has robots "noindex" — will NOT appear in search engines')
    recommendations.push('Remove "noindex" from robots meta tag unless you intentionally want to block this page from search')
    score -= 50
  } else if (robots) {
    issues.push(`Robots directive: ${robots}`)
  } else {
    issues.push('No robots meta tag — defaults to indexing (normal)')
  }

  const status = score >= 80 ? 'pass' : score >= 40 ? 'warning' : 'fail'

  return {
    status,
    score: Math.max(0, score),
    findings: { title: 'Canonical URL & Crawlability', details: issues, recommendations },
  }
}
