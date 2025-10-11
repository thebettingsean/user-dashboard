import { groq } from 'next-sanity'

export const latestReportQuery = groq`
  *[_type == "weeklyReport" && featured == true] | order(publishDate desc)[0] {
    _id,
    title,
    slug,
    author,
    publishDate,
    summary
  }
`

export const reportBySlugQuery = groq`
  *[_type == "weeklyReport" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    author,
    publishDate,
    summary,
    content
  }
`
