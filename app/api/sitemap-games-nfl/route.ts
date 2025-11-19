import { createClient } from '@supabase/supabase-js'

const siteUrl = 'https://thebettinginsider.com'
const SPORT = 'NFL'

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SNAPSHOTS_SUPABASE_URL
  const supabaseKey = process.env.SNAPSHOTS_SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials for game snapshots')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Generate slug from game data
function generateGameSlug(homeTeam: string, awayTeam: string, gameDate: string): string {
  const date = new Date(gameDate)
  const month = date.toLocaleString('en-US', { month: 'long' }).toLowerCase()
  const day = date.getDate()
  
  const normalize = (team: string) => team.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  return `${normalize(awayTeam)}-at-${normalize(homeTeam)}-${month}-${day}`
}

// Determine priority based on game date
function getPriority(gameDate: string): number {
  const now = new Date()
  const game = new Date(gameDate)
  const daysDiff = Math.floor((now.getTime() - game.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff <= 7) return 0.9      // Last 7 days - high priority
  if (daysDiff <= 30) return 0.7     // Last 30 days - medium priority
  return 0.5                          // Older games - lower priority
}

// Determine change frequency based on game date
function getChangeFrequency(gameDate: string): string {
  const now = new Date()
  const game = new Date(gameDate)
  const daysDiff = Math.floor((now.getTime() - game.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff <= 7) return 'daily'      // Recent games update frequently
  if (daysDiff <= 30) return 'weekly'    // Last month updates weekly
  return 'monthly'                        // Older games rarely change
}

export async function GET(): Promise<Response> {
  try {
    console.log(`🗺️  Generating ${SPORT} games sitemap...`)
    
    const supabase = getSupabaseClient()
    
    // Query game_snapshots for this sport (limit 10,000 for safety)
    const { data: games, error } = await supabase
      .from('game_snapshots')
      .select('id, sport, home_team, away_team, game_date, updated_at')
      .eq('sport', SPORT)
      .order('game_date', { ascending: false })
      .limit(10000)
    
    if (error) {
      console.error(`❌ Error fetching ${SPORT} games:`, error)
      // Return empty sitemap on error (don't break the site)
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
        {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
          },
        }
      )
    }
    
    if (!games || games.length === 0) {
      console.log(`⏭️  No ${SPORT} games found`)
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
        {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
          },
        }
      )
    }
    
    console.log(`✅ Found ${games.length} ${SPORT} games`)
    
    // Generate sitemap entries
    const urls: string[] = []
    
    for (const game of games) {
      const slug = generateGameSlug(game.home_team, game.away_team, game.game_date)
      const priority = getPriority(game.game_date)
      const changefreq = getChangeFrequency(game.game_date)
      const lastmod = game.updated_at || game.game_date
      const sport = game.sport.toLowerCase()
      
      // Generate URLs for all game sub-pages
      const subPages = [
        { path: '', priority: priority }, // Main game page
        { path: '/picks', priority: priority },
        { path: '/public-betting', priority: priority },
        { path: '/script', priority: priority + 0.05 }, // AI scripts are blog content - slightly higher priority!
        { path: '/data', priority: priority - 0.1 },
      ]
      
      for (const page of subPages) {
        urls.push(`
    <url>
      <loc>${siteUrl}/sports/${sport}/games/${slug}${page.path}</loc>
      <lastmod>${new Date(lastmod).toISOString()}</lastmod>
      <changefreq>${changefreq}</changefreq>
      <priority>${Math.min(1, Math.max(0, page.priority)).toFixed(1)}</priority>
    </url>`)
      }
    }
    
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('')}
</urlset>`
    
    console.log(`✅ Generated ${SPORT} sitemap with ${urls.length} URLs`)
    
    return new Response(sitemapXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate', // Cache for 1 hour
      },
    })
    
  } catch (error) {
    console.error(`❌ Fatal error generating ${SPORT} games sitemap:`, error)
    
    // Return empty sitemap on fatal error
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate', // Short cache on error
        },
      }
    )
  }
}

