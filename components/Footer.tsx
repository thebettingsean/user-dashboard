import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        {/* Logo and Taglines */}
        <div className={styles.logoSection}>
          <img
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
            alt="The Betting Insider"
            className={styles.logoImage}
          />
          <p className={styles.tagline}>
            © {new Date().getFullYear()} The Betting Insider. All rights reserved.
          </p>
          <p className={styles.tagline}>
            All data provided by Trendline Labs
          </p>
        </div>

        {/* Links Grid */}
        <div className={styles.linksGrid}>
          {/* Company Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.footerHeading}>Company</h4>
            <Link href="/company" className={styles.footerLink}>
              Company
            </Link>
            <Link href="/contact" className={styles.footerLink}>
              Contact
            </Link>
            <Link href="/faq" className={styles.footerLink}>
              FAQ
            </Link>
          </div>

          {/* Learn More Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.footerHeading}>Learn More</h4>
            <Link href="/sports" className={styles.footerLink}>
              Our Dashboard
            </Link>
            <Link href="/betting/about" className={styles.footerLink}>
              About Bets
            </Link>
            <Link href="/sports" className={styles.footerLink}>
              About Stats
            </Link>
            <Link href="/" className={styles.footerLink}>
              Home
            </Link>
          </div>

          {/* Tools Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.footerHeading}>Our Tools</h4>
            <Link href="/bankroll-calculator" className={styles.footerLink}>
              Bankroll Calculator
            </Link>
            <Link href="/parlay-calculator" className={styles.footerLink}>
              Parlay Calculator
            </Link>
            <Link href="/roi-calculator" className={styles.footerLink}>
              ROI Calculator
            </Link>
            <Link href="/betting-guide" className={styles.footerLink}>
              Betting Guide
            </Link>
          </div>

          {/* Legal Section */}
          <div className={styles.footerSection}>
            <h4 className={styles.footerHeading}>Legal</h4>
            <Link href="/privacy-policy" className={styles.footerLink}>
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className={styles.footerLink}>
              Terms of Service
            </Link>
            <Link href="/refund-policy" className={styles.footerLink}>
              Refund Policy
            </Link>
          </div>
        </div>

        {/* Gambling Addiction Notice */}
        <div className={styles.gamblingNotice}>
          <p className={styles.gamblingNoticeText}>
            <strong>Responsible Gambling:</strong> If you or someone you know has a gambling problem, 
            please seek help. Call <a href="tel:1-800-522-4700" className={styles.gamblingLink}>1-800-522-4700</a> or visit{' '}
            <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className={styles.gamblingLink}>
              ncpgambling.org
            </a>
            {' '}for support and resources.
          </p>
        </div>
      </div>
    </footer>
  )
}

