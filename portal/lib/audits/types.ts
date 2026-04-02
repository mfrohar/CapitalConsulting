export type CheckStatus = 'pass' | 'fail' | 'warning' | 'error'
export type AuditStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
export type TargetStatus = 'pending' | 'auditing' | 'completed' | 'failed' | 'skipped'

export interface CheckFindings {
  title: string
  details: string[]
  recommendations: string[]
}

export interface CheckResult {
  status: CheckStatus
  score: number        // 0-100
  findings: CheckFindings
}

export interface AuditCheck {
  id: string
  audit_id: string
  check_name: string
  dimension: string
  status: CheckStatus | 'pending'
  score: number
  findings: CheckFindings
  completed_at: string | null
}

export interface WebAudit {
  id: string
  target_id: string | null
  url: string
  business_name: string | null
  status: AuditStatus
  overall_score: number | null
  progress_pct: number
  created_at: string
  completed_at: string | null
  audit_checks?: AuditCheck[]
}

export interface AuditTarget {
  id: string
  url: string
  business_name: string | null
  business_type: string | null
  location: string | null
  status: TargetStatus
  discovered_at: string
  audited_at: string | null
  audit_id: string | null
}

// The 8 audit dimensions
export const DIMENSIONS = {
  technical_seo: 'Technical SEO',
  performance: 'Performance',
  security: 'Security',
  mobile: 'Mobile',
  accessibility: 'Accessibility',
  ux_design: 'UX & Design',
  digital_footprint: 'Digital Footprint',
  backlinks: 'Backlinks & Canonicalization',
} as const

export type DimensionKey = keyof typeof DIMENSIONS

// Check definitions: check_name → dimension
export const CHECK_DIMENSIONS: Record<string, DimensionKey> = {
  meta_tags: 'technical_seo',
  image_optimization: 'performance',
  ssl_certificate: 'security',
  mobile_viewport: 'mobile',
  image_alt_text: 'accessibility',
  heading_structure: 'ux_design',
  open_graph: 'digital_footprint',
  canonical_url: 'backlinks',
}

export const TOTAL_CHECKS = Object.keys(CHECK_DIMENSIONS).length

export const BUSINESS_TYPES = [
  'Restaurant',
  'Retail Store',
  'Law Firm',
  'Medical Practice',
  'Dental Office',
  'Real Estate Agency',
  'Accounting Firm',
  'Auto Dealer',
  'Hotel / Hospitality',
  'Gym / Fitness',
  'Beauty Salon / Spa',
  'Construction / Contractor',
  'Plumbing / HVAC',
  'Marketing Agency',
  'Financial Advisor',
  'Insurance Agency',
  'Other',
]
