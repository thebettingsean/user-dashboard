import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerContent}>
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

        {/* Policies Section */}
        <div style={styles.footerSection}>
          <h4 style={styles.footerHeading}>Legal</h4>
          <Link href="/privacy-policy" style={styles.footerLink}>
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" style={styles.footerLink}>
            Terms of Service
          </Link>
          <Link href="/cookie-policy" style={styles.footerLink}>
            Cookie Policy
          </Link>
        </div>

        {/* Logo Section */}
        <div style={styles.footerLogo}>
          <img
            src="https://cdn.prod.website-files.com/670bfa1fd9c3c20a149fa6a7/68e2e0cb7ce335565e485fe4_BETTING%20INSIDER%20SVG.svg"
            alt="The Betting Insider"
            style={styles.logoImage}
          />
          <p style={styles.copyright}>
            © {new Date().getFullYear()} The Betting Insider. All rights reserved.
          </p>
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
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '40px'
  },

  footerSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },

  footerHeading: {
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '8px'
  },

  footerLink: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.875rem',
    textDecoration: 'none',
    transition: 'color 0.2s ease'
  },

  footerLogo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px'
  },

  logoImage: {
    height: '48px',
    width: 'auto'
  },

  copyright: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.75rem',
    textAlign: 'center' as const,
    margin: 0
  }
}

