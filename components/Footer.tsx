import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerContent}>
        {/* Logo and Taglines */}
        <div style={styles.logoSection}>
          <img
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
            alt="The Betting Insider"
            style={styles.logoImage}
          />
          <p style={styles.tagline}>
            © {new Date().getFullYear()} The Betting Insider. All rights reserved.
          </p>
          <p style={styles.tagline}>
            All data provided by Trendline Labs
          </p>
        </div>

        {/* Links Grid */}
        <div style={styles.linksGrid}>
          {/* Company Section */}
          <div style={styles.footerSection}>
            <h4 style={styles.footerHeading}>Company</h4>
            <Link href="/company" style={styles.footerLink}>
              Company
            </Link>
            <Link href="/contact" style={styles.footerLink}>
              Contact
            </Link>
            <Link href="/faq" style={styles.footerLink}>
              FAQ
            </Link>
          </div>

          {/* Legal Section */}
          <div style={styles.footerSection}>
            <h4 style={styles.footerHeading}>Legal</h4>
            <Link href="/privacy-policy" style={styles.footerLink}>
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" style={styles.footerLink}>
              Terms of Service
            </Link>
            <Link href="/refund-policy" style={styles.footerLink}>
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

const styles = {
  footer: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '48px 24px 24px',
    marginTop: '80px'
  },

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '40px'
  },

  logoSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center' as const
  },

  logoImage: {
    height: '48px',
    width: 'auto',
    marginBottom: '8px'
  },

  tagline: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.875rem',
    margin: '0',
    lineHeight: '1.5'
  },

  linksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '60px',
    width: '100%',
    maxWidth: '600px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '32px'
    }
  },

  footerSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    alignItems: 'flex-start'
  },

  footerHeading: {
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '4px'
  },

  footerLink: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.875rem',
    textDecoration: 'none',
    transition: 'color 0.2s ease'
  }
}

