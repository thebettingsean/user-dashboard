'use client'

import { useState, useEffect } from 'react'
import styles from './teamStats.module.css'

interface TeamRankingsData {
  gameId: string
  homeTeam: string
  awayTeam: string
  gameTime: string
  teamRankings: {
    home_team: TeamData
    away_team: TeamData
    fetched_at: string
  } | null
  hasData: boolean
}

interface TeamData {
  team: string
  sport: string
  offense: Record<string, { rank: number; value: number }>
  defense: Record<string, { rank: number; value: number }>
  rawData: {
    offense: Record<string, string>
    defense: Record<string, string>
  }
}

interface StatComparison {
  category: string
  label: string
  awayValue: string
  awayRank: number
  homeValue: string
  homeRank: number
  edge: 'away' | 'home' | 'neutral'
  edgeStrength: 'strong' | 'moderate' | 'none'
}

export default function TeamStatsTestPage() {
  const [data, setData] = useState<TeamRankingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'matchups' | 'stats' | 'trends'>('matchups')
  const [gameId, setGameId] = useState('NFL-20241229-NYG-NE-401671802') // Default: Giants @ Patriots

  useEffect(() => {
    fetchData()
  }, [gameId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/team-rankings?gameId=${gameId}`)
      if (!response.ok) throw new Error('Failed to fetch')
      
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getKeyMatchups = (): StatComparison[] => {
    if (!data?.teamRankings) return []

    const { home_team, away_team } = data.teamRankings
    const matchups: StatComparison[] = []

    // Helper to calculate edge
    const calculateEdge = (awayRank: number, homeRank: number): { edge: 'away' | 'home' | 'neutral', strength: 'strong' | 'moderate' | 'none' } => {
      const diff = Math.abs(awayRank - homeRank)
      if (diff >= 10) {
        return { edge: awayRank < homeRank ? 'away' : 'home', strength: 'strong' }
      } else if (diff >= 5) {
        return { edge: awayRank < homeRank ? 'away' : 'home', strength: 'moderate' }
      }
      return { edge: 'neutral', strength: 'none' }
    }

    // 1. Scoring Efficiency
    const awayPpg = away_team.offense.points_game
    const homePpg = home_team.offense.points_game
    const scoreEdge = calculateEdge(awayPpg.rank, homePpg.rank)
    matchups.push({
      category: 'Scoring',
      label: 'Points Per Game',
      awayValue: `${awayPpg.value} ppg`,
      awayRank: awayPpg.rank,
      homeValue: `${homePpg.value} ppg`,
      homeRank: homePpg.rank,
      edge: scoreEdge.edge,
      edgeStrength: scoreEdge.strength
    })

    // 2. Passing Game
    const awayPassYds = away_team.offense.pass_yards_game
    const homePassYds = home_team.offense.pass_yards_game
    const passEdge = calculateEdge(awayPassYds.rank, homePassYds.rank)
    matchups.push({
      category: 'Passing',
      label: 'Pass Yards Per Game',
      awayValue: `${awayPassYds.value} yds`,
      awayRank: awayPassYds.rank,
      homeValue: `${homePassYds.value} yds`,
      homeRank: homePassYds.rank,
      edge: passEdge.edge,
      edgeStrength: passEdge.strength
    })

    // 3. Rushing Game
    const awayRushYds = away_team.offense.rush_yards_game
    const homeRushYds = home_team.offense.rush_yards_game
    const rushEdge = calculateEdge(awayRushYds.rank, homeRushYds.rank)
    matchups.push({
      category: 'Rushing',
      label: 'Rush Yards Per Game',
      awayValue: `${awayRushYds.value} yds`,
      awayRank: awayRushYds.rank,
      homeValue: `${homeRushYds.value} yds`,
      homeRank: homeRushYds.rank,
      edge: rushEdge.edge,
      edgeStrength: rushEdge.strength
    })

    // 4. Offensive Efficiency
    const awayYpp = away_team.offense.yards_play
    const homeYpp = home_team.offense.yards_play
    const yppEdge = calculateEdge(awayYpp.rank, homeYpp.rank)
    matchups.push({
      category: 'Efficiency',
      label: 'Yards Per Play',
      awayValue: `${awayYpp.value} ypp`,
      awayRank: awayYpp.rank,
      homeValue: `${homeYpp.value} ypp`,
      homeRank: homeYpp.rank,
      edge: yppEdge.edge,
      edgeStrength: yppEdge.strength
    })

    // 5. Defensive matchup (Away Offense vs Home Defense)
    const awayOffenseYpg = away_team.offense.yards_game
    const homeDefenseYpg = home_team.defense.opp_yards_game
    const defMatchup = calculateEdge(awayOffenseYpg.rank, homeDefenseYpg.rank)
    matchups.push({
      category: 'Matchup',
      label: `${data.awayTeam} Off vs ${data.homeTeam} Def`,
      awayValue: `${awayOffenseYpg.value} yds`,
      awayRank: awayOffenseYpg.rank,
      homeValue: `${homeDefenseYpg.value} allowed`,
      homeRank: homeDefenseYpg.rank,
      edge: defMatchup.edge,
      edgeStrength: defMatchup.strength
    })

    return matchups.filter(m => m.edgeStrength !== 'none').slice(0, 5)
  }

  const getRankColor = (rank: number) => {
    if (rank <= 10) return '#34d399' // green
    if (rank <= 20) return '#fbbf24' // yellow
    return '#f87171' // red
  }

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading team rankings...</div></div>
  }

  if (error || !data?.hasData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {error || 'No team rankings data available for this game'}
          <div className={styles.inputGroup}>
            <input 
              type="text" 
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter gameId (e.g., NFL-20241229-NYG-NE-401671802)"
              className={styles.input}
            />
            <button onClick={fetchData} className={styles.button}>Try Again</button>
          </div>
        </div>
      </div>
    )
  }

  const keyMatchups = getKeyMatchups()
  const { home_team, away_team } = data.teamRankings!

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Team Stats & Rankings Test</h1>
        <p className={styles.subtitle}>{data.awayTeam} @ {data.homeTeam}</p>
        
        <div className={styles.inputGroup}>
          <input 
            type="text" 
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="Enter gameId"
            className={styles.input}
          />
          <button onClick={fetchData} className={styles.button}>Load Game</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button 
          className={activeTab === 'matchups' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('matchups')}
        >
          🎯 Key Matchups
        </button>
        <button 
          className={activeTab === 'stats' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('stats')}
        >
          📊 Full Stats
        </button>
        <button 
          className={activeTab === 'trends' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('trends')}
        >
          📈 Trends (Coming Soon)
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'matchups' && (
        <div className={styles.tabContent}>
          <h2 className={styles.sectionTitle}>🎯 Key Matchup Edges</h2>
          
          {keyMatchups.length === 0 ? (
            <p className={styles.noData}>No significant edges detected</p>
          ) : (
            <div className={styles.matchupsGrid}>
              {keyMatchups.map((matchup, idx) => (
                <div key={idx} className={styles.matchupCard}>
                  <div className={styles.matchupHeader}>
                    <span className={styles.matchupCategory}>{matchup.category}</span>
                    <span className={matchup.edgeStrength === 'strong' ? styles.edgeStrong : styles.edgeModerate}>
                      {matchup.edgeStrength === 'strong' ? '🔥 STRONG' : '✓ MODERATE'} EDGE
                    </span>
                  </div>
                  
                  <h3 className={styles.matchupLabel}>{matchup.label}</h3>
                  
                  <div className={styles.matchupComparison}>
                    <div className={styles.matchupTeam}>
                      <div className={styles.teamName}>{data.awayTeam}</div>
                      <div className={styles.statValue} style={{ color: getRankColor(matchup.awayRank) }}>
                        {matchup.awayValue}
                      </div>
                      <div className={styles.statRank}>#{matchup.awayRank}</div>
                    </div>
                    
                    <div className={styles.matchupVs}>VS</div>
                    
                    <div className={styles.matchupTeam}>
                      <div className={styles.teamName}>{data.homeTeam}</div>
                      <div className={styles.statValue} style={{ color: getRankColor(matchup.homeRank) }}>
                        {matchup.homeValue}
                      </div>
                      <div className={styles.statRank}>#{matchup.homeRank}</div>
                    </div>
                  </div>
                  
                  {matchup.edge !== 'neutral' && (
                    <div className={styles.edgeBar}>
                      <div 
                        className={styles.edgeBarFill}
                        style={{
                          width: matchup.edge === 'away' ? '100%' : '0%',
                          background: matchup.edgeStrength === 'strong' 
                            ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
                            : 'linear-gradient(90deg, #60a5fa, #3b82f6)'
                        }}
                      />
                      <span className={styles.edgeLabel}>
                        {matchup.edge === 'away' ? `${data.awayTeam} Advantage` : `${data.homeTeam} Advantage`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className={styles.tabContent}>
          <h2 className={styles.sectionTitle}>📊 Full Team Comparison</h2>
          
          {/* Offense Section */}
          <div className={styles.statSection}>
            <h3 className={styles.statSectionTitle}>⚔️ OFFENSE</h3>
            <div className={styles.statsTable}>
              <div className={styles.statsHeader}>
                <div className={styles.statCategory}>Stat</div>
                <div className={styles.statTeam}>{data.awayTeam}</div>
                <div className={styles.statTeam}>{data.homeTeam}</div>
                <div className={styles.statEdge}>Edge</div>
              </div>
              
              {Object.keys(away_team.offense).slice(0, 10).map((key) => {
                const awayStat = away_team.offense[key]
                const homeStat = home_team.offense[key]
                const edge = awayStat.rank < homeStat.rank ? 'away' : homeStat.rank < awayStat.rank ? 'home' : 'neutral'
                
                return (
                  <div key={key} className={styles.statsRow}>
                    <div className={styles.statCategory}>{key.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className={styles.statTeam}>
                      <span style={{ color: getRankColor(awayStat.rank) }}>{awayStat.value}</span>
                      <span className={styles.statRank}>#{awayStat.rank}</span>
                    </div>
                    <div className={styles.statTeam}>
                      <span style={{ color: getRankColor(homeStat.rank) }}>{homeStat.value}</span>
                      <span className={styles.statRank}>#{homeStat.rank}</span>
                    </div>
                    <div className={styles.statEdge}>
                      {edge === 'away' && '← AWAY'}
                      {edge === 'home' && 'HOME →'}
                      {edge === 'neutral' && '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Defense Section */}
          <div className={styles.statSection}>
            <h3 className={styles.statSectionTitle}>🛡️ DEFENSE</h3>
            <div className={styles.statsTable}>
              <div className={styles.statsHeader}>
                <div className={styles.statCategory}>Stat</div>
                <div className={styles.statTeam}>{data.awayTeam}</div>
                <div className={styles.statTeam}>{data.homeTeam}</div>
                <div className={styles.statEdge}>Edge</div>
              </div>
              
              {Object.keys(away_team.defense).slice(0, 10).map((key) => {
                const awayStat = away_team.defense[key]
                const homeStat = home_team.defense[key]
                const edge = awayStat.rank < homeStat.rank ? 'away' : homeStat.rank < awayStat.rank ? 'home' : 'neutral'
                
                return (
                  <div key={key} className={styles.statsRow}>
                    <div className={styles.statCategory}>{key.replace(/opp_/g, '').replace(/_/g, ' ').toUpperCase()}</div>
                    <div className={styles.statTeam}>
                      <span style={{ color: getRankColor(awayStat.rank) }}>{awayStat.value}</span>
                      <span className={styles.statRank}>#{awayStat.rank}</span>
                    </div>
                    <div className={styles.statTeam}>
                      <span style={{ color: getRankColor(homeStat.rank) }}>{homeStat.value}</span>
                      <span className={styles.statRank}>#{homeStat.rank}</span>
                    </div>
                    <div className={styles.statEdge}>
                      {edge === 'away' && '← AWAY'}
                      {edge === 'home' && 'HOME →'}
                      {edge === 'neutral' && '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className={styles.tabContent}>
          <h2 className={styles.sectionTitle}>📈 AI-Powered Insights</h2>
          <div className={styles.comingSoon}>
            <p>🔮 Coming Soon: AI-generated betting insights based on team rankings</p>
            <ul className={styles.featureList}>
              <li>"Patriots #6 pass offense faces #23 pass defense → Favor passing props"</li>
              <li>"Giants allow 2nd-most rush yards but face #9 rush offense → Potential rushing game"</li>
              <li>"Home team favored in red zone efficiency → Consider TD props"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

