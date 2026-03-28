'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface NavLink {
  href: string
  label: string
}

interface NavbarProps {
  links: NavLink[]
  adminMode?: boolean
}

export default function Navbar({ links, adminMode = false }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-primary border-b border-blue-900 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <span className="text-primary font-bold text-xs">CC</span>
            </div>
            <span className="text-white font-semibold text-sm">
              Capital Consulting
              {adminMode && (
                <span className="ml-2 bg-accent text-primary text-xs font-bold px-1.5 py-0.5 rounded">
                  ADMIN
                </span>
              )}
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}

            <button
              onClick={handleSignOut}
              className="ml-4 px-4 py-2 rounded-lg text-sm font-medium text-blue-200 hover:text-white hover:bg-white/10 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
