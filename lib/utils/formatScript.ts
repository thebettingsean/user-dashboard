/**
 * Formats a raw script string into properly structured HTML with paragraphs and bold text
 */
export function formatScript(rawScript: string): string {
  if (!rawScript) return ''
  
  // Remove any existing HTML tags (in case script has some)
  let text = rawScript.replace(/<[^>]*>/g, '')
  
  // Split into paragraphs based on multiple newlines or sentence endings followed by caps
  // Look for patterns like:  ". The " or ". With " or ". This " etc. to identify paragraph breaks
  const paragraphBreaks = text.split(/(?<=[.!?])\s+(?=[A-Z][a-z]+\s)/g)
  
  // Process each paragraph
  const formattedParagraphs = paragraphBreaks.map(paragraph => {
    // Trim whitespace
    let p = paragraph.trim()
    if (!p) return ''
    
    // Convert **bold** markdown to <strong> tags
    p = p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    
    // Wrap in paragraph tag
    return `<p>${p}</p>`
  }).filter(p => p !== '')
  
  return formattedParagraphs.join('\n')
}

