export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "The Betting Insider",
    "url": "https://thebettinginsider.com",
    "logo": "https://thebettinginsider.com/logo.png",
    "description": "Premium sports betting analytics and AI-powered insights for NFL, NBA, CFB, and NHL.",
    "sameAs": [
      "https://twitter.com/BettingInsider",
      // Add other social media profiles
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "url": "https://thebettinginsider.com/contact"
    }
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "The Betting Insider",
    "url": "https://thebettinginsider.com",
    "description": "Expert sports betting picks and analytics",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://thebettinginsider.com/sports?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}

