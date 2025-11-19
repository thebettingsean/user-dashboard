import Script from 'next/script'
import { renderStructuredData } from '@/lib/seo/structured-data'

/**
 * Generic Structured Data Component
 * Renders JSON-LD script tag for any schema
 */
export function StructuredData({ schema, id }: { schema: any; id: string }) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={renderStructuredData(schema)}
      strategy="beforeInteractive"
    />
  )
}

/**
 * Multiple Structured Data Component
 * Renders multiple schemas in a single script tag
 */
export function MultipleStructuredData({ schemas, id }: { schemas: any[]; id: string }) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={renderStructuredData(schemas)}
      strategy="beforeInteractive"
    />
  )
}

