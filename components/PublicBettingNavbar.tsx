'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'
import { ChevronDown } from 'lucide-react'
import styles from './PublicBettingNavbar.module.css'

export default function PublicBettingNavbar() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  const [sportsOpen, setSportsOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const sportsRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sportsRef.current && !sportsRef.current.contains(event.target as Node)) {
        setSportsOpen(false)
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (path: string) => pathname === path

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logoLink}>
            <Image
              src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
              alt="The Betting Insider"
              width={200}
              height={32}
              priority
            />
          </Link>
        </div>

        {/* Nav Items */}
        <div className={styles.navItems}>
          <Link 
            href="/sports/picks" 
            className={isActive('/sports/picks') ? styles.navLinkActive : styles.navLink}
          >
            Today's Picks
          </Link>

          <Link 
            href="/public-betting" 
            className={isActive('/public-betting') ? styles.navLinkActive : styles.navLink}
          >
            Public Betting
          </Link>

          <Link 
            href="/sports/ai-scripts" 
            className={isActive('/sports/ai-scripts') ? styles.navLinkActive : styles.navLink}
          >
            Game Scripts
          </Link>

          <Link 
            href="/builder" 
            className={pathname?.startsWith('/builder') ? styles.navLinkActive : styles.navLink}
          >
            Builder 1.0
          </Link>

          {/* Sports Dropdown */}
          <div className={styles.dropdown} ref={sportsRef}>
            <button
              onClick={() => setSportsOpen(!sportsOpen)}
              className={styles.dropdownButton}
            >
              Sports
              <ChevronDown size={16} />
            </button>
            {sportsOpen && (
              <div className={styles.dropdownMenu}>
                <Link href="/sports/nfl" className={styles.dropdownItem}>NFL</Link>
                <Link href="/sports/nba" className={styles.dropdownItem}>NBA</Link>
                <Link href="/sports/ncaaf" className={styles.dropdownItem}>NCAAF</Link>
                <Link href="/sports/nhl" className={styles.dropdownItem}>NHL</Link>
              </div>
            )}
          </div>

          {/* Tools Dropdown */}
          <div className={styles.dropdown} ref={toolsRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={styles.dropdownButton}
            >
              Tools
              <ChevronDown size={16} />
            </button>
            {toolsOpen && (
              <div className={styles.dropdownMenu}>
                <Link href="/bankroll-calculator" className={styles.dropdownItem}>Bankroll Calculator</Link>
                <Link href="/parlay-calculator" className={styles.dropdownItem}>Parlay Calculator</Link>
                <Link href="/roi-calculator" className={styles.dropdownItem}>ROI Calculator</Link>
                <Link href="/simulator" className={styles.dropdownItem}>Fantasy Simulator</Link>
              </div>
            )}
          </div>
        </div>

        {/* Auth Section */}
        <div className={styles.authSection}>
          {isSignedIn ? (
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: styles.avatar
                }
              }}
            />
          ) : (
            <div className={styles.authButtons}>
              <Link href="/sign-in" className={styles.signInButton}>
                Sign In
              </Link>
              <Link href="/sign-up" className={styles.signUpButton}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

