import { groq } from 'next-sanity'

export const latestReportQuery = groq`
  *[_type == "weeklyReport" && featured == true] | order(publishDate desc)[0] {
    _id,
    title,
    slug,
    weekNumber,
    publishDate,
    summary
  }
`
