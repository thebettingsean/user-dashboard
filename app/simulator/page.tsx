'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';
import { useSubscription } from '@/lib/hooks/useSubscription';
import {
  getSessionId,
  getGenerationCount,
  incrementGenerationCount,
  hasReachedGenerationLimit,
  getRemainingGenerations,
} from '@/utils/simulator-cookies';
import styles from './simulator.module.css';

// Dynamically import Spline to avoid SSR issues
const Spline = dynamic(
  () => import('@splinetool/react-spline'),
  { ssr: false }
);

type Sport = 'nfl' | 'nba' | 'college-football' | 'college-basketball';

interface Team {
  id: string;
  name: string;
  abbreviation?: string;
}

interface SimulationResult {
  away_score: number;
  home_score: number;
  spread: number;
  total: number;
  away_win_probability: number;
  home_win_probability: number;
}

// Helper function to round scores based on sport (from Versus logic)
const roundScore = (score: number, sport: string): number => {
  if (sport === 'cfb' || sport === 'nfl' || sport === 'college-football') {
    if (score <= 2) {
      return 0;
    } else if (score > 2 && score < 4.5) {
      return 3;
    } else if (score >= 4.5 && score < 6) {
      return 6;
    } else {
      return Math.round(score);
    }
  } else {
    return Math.round(score);
  }
};

export default function SimulatorPage() {
  const { user, isSignedIn } = useUser();
  const { hasAccess } = useSubscription();
  
  const [sport, setSport] = useState<Sport>('nfl');
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [showAwayDropdown, setShowAwayDropdown] = useState(false);
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [awaySearch, setAwaySearch] = useState('');
  const [homeSearch, setHomeSearch] = useState('');
  const [splineInstance, setSplineInstance] = useState<any>(null);
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [splineError, setSplineError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [generationCount, setGenerationCount] = useState<number>(0);

  // Ratings - will be loaded from simulation API
  const [awayOffensiveNumericGrade, setAwayOffensiveNumericGrade] = useState(75);
  const [awayDefensiveNumericGrade, setAwayDefensiveNumericGrade] = useState(75);
  const [homeOffensiveNumericGrade, setHomeOffensiveNumericGrade] = useState(75);
  const [homeDefensiveNumericGrade, setHomeDefensiveNumericGrade] = useState(75);

  // Track current ratings using refs
  const currentAwayOffensiveRatingRef = useRef<number | null>(null);
  const currentAwayDefensiveRatingRef = useRef<number | null>(null);
  const currentHomeOffensiveRatingRef = useRef<number | null>(null);
  const currentHomeDefensiveRatingRef = useRef<number | null>(null);
  
  const originalAwayScoreRef = useRef<number | null>(null);
  const originalHomeScoreRef = useRef<number | null>(null);
  
  const [originalRatings, setOriginalRatings] = useState<{
    awayOffensiveNumericGrade: number;
    awayOffensiveRating: number;
    awayDefensiveNumericGrade: number;
    awayDefensiveRating: number;
    homeOffensiveNumericGrade: number;
    homeOffensiveRating: number;
    homeDefensiveNumericGrade: number;
    homeDefensiveRating: number;
    offensiveRange: number;
    defensiveRange: number;
    homeFieldAdvantage: number;
  } | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);
    setGenerationCount(getGenerationCount());
    
    // Track page view
    trackEvent('page_view', null, null);
  }, []);

  // Fetch teams when sport changes
  useEffect(() => {
    fetchTeams();
  }, [sport]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[data-dropdown-container]') &&
        !target.closest('[data-team-button]')
      ) {
        if (showAwayDropdown || showHomeDropdown || showSportDropdown) {
          setShowAwayDropdown(false);
          setShowHomeDropdown(false);
          setShowSportDropdown(false);
        }
      }
    };

    if (showAwayDropdown || showHomeDropdown || showSportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAwayDropdown, showHomeDropdown, showSportDropdown]);

  // Reset ratings when teams change
  useEffect(() => {
    if (!awayTeam || !homeTeam) {
      setOriginalRatings(null);
      setSimulationResult(null);
      setAwayOffensiveNumericGrade(75);
      setAwayDefensiveNumericGrade(75);
      setHomeOffensiveNumericGrade(75);
      setHomeDefensiveNumericGrade(75);
    } else {
      setOriginalRatings(null);
      setSimulationResult(null);
    }
  }, [awayTeam, homeTeam]);

  // Recalculate scores when sliders change - EXACT Versus logic
  useEffect(() => {
    if (!originalRatings || !simulationResult || !awayTeam || !homeTeam || !sport) return;

    const newRange = 99 - 60;
    const hfa = originalRatings.homeFieldAdvantage || 1.25;

    const awayOffChanged = awayOffensiveNumericGrade !== originalRatings.awayOffensiveNumericGrade;
    const awayDefChanged = awayDefensiveNumericGrade !== originalRatings.awayDefensiveNumericGrade;
    const homeOffChanged = homeOffensiveNumericGrade !== originalRatings.homeOffensiveNumericGrade;
    const homeDefChanged = homeDefensiveNumericGrade !== originalRatings.homeDefensiveNumericGrade;

    const originalAwayScore = originalAwayScoreRef.current ?? simulationResult.away_score;
    const originalHomeScore = originalHomeScoreRef.current ?? simulationResult.home_score;

    if (!awayOffChanged && !awayDefChanged && !homeOffChanged && !homeDefChanged) {
      if (simulationResult.away_score !== originalAwayScore || simulationResult.home_score !== originalHomeScore) {
        setSimulationResult({
          away_score: originalAwayScore,
          home_score: originalHomeScore,
          spread: originalHomeScore - originalAwayScore,
          total: originalAwayScore + originalHomeScore,
          away_win_probability: simulationResult.away_win_probability,
          home_win_probability: simulationResult.home_win_probability,
        });
      }
      return;
    }

    const currentAwayOff = (awayOffensiveNumericGrade - originalRatings.awayOffensiveNumericGrade) * originalRatings.offensiveRange / newRange + originalRatings.awayOffensiveRating;
    const currentAwayDef = (awayDefensiveNumericGrade - originalRatings.awayDefensiveNumericGrade) * originalRatings.defensiveRange / newRange + originalRatings.awayDefensiveRating;
    const currentHomeOff = (homeOffensiveNumericGrade - originalRatings.homeOffensiveNumericGrade) * originalRatings.offensiveRange / newRange + originalRatings.homeOffensiveRating;
    const currentHomeDef = (homeDefensiveNumericGrade - originalRatings.homeDefensiveNumericGrade) * originalRatings.defensiveRange / newRange + originalRatings.homeDefensiveRating;

    const roundedAwayOff = Math.round(currentAwayOff * 100) / 100;
    const roundedAwayDef = Math.round(currentAwayDef * 100) / 100;
    const roundedHomeOff = Math.round(currentHomeOff * 100) / 100;
    const roundedHomeDef = Math.round(currentHomeDef * 100) / 100;

    currentAwayOffensiveRatingRef.current = roundedAwayOff;
    currentAwayDefensiveRatingRef.current = roundedAwayDef;
    currentHomeOffensiveRatingRef.current = roundedHomeOff;
    currentHomeDefensiveRatingRef.current = roundedHomeDef;

    const calculatedOriginalAway = originalRatings.awayOffensiveRating - originalRatings.homeDefensiveRating + hfa;
    const calculatedOriginalHome = originalRatings.homeOffensiveRating - originalRatings.awayDefensiveRating + hfa;
    
    let awayScore = originalAwayScore;
    let homeScore = originalHomeScore;

    if (awayOffChanged) {
      if (awayOffensiveNumericGrade === originalRatings.awayOffensiveNumericGrade) {
        awayScore = originalAwayScore;
      } else {
        const newCalculatedAway = roundedAwayOff - roundedHomeDef + hfa;
        const delta = newCalculatedAway - calculatedOriginalAway;
        awayScore = Math.max(0, roundScore(originalAwayScore + delta, sport));
      }
    }

    if (homeOffChanged) {
      if (homeOffensiveNumericGrade === originalRatings.homeOffensiveNumericGrade) {
        homeScore = originalHomeScore;
      } else {
        const newCalculatedHome = roundedHomeOff - roundedAwayDef + hfa;
        const delta = newCalculatedHome - calculatedOriginalHome;
        homeScore = Math.max(0, roundScore(originalHomeScore + delta, sport));
      }
    }

    if (awayDefChanged) {
      if (awayDefensiveNumericGrade === originalRatings.awayDefensiveNumericGrade) {
        homeScore = originalHomeScore;
      } else {
        const newCalculatedHome = roundedHomeOff - roundedAwayDef + hfa;
        const delta = newCalculatedHome - calculatedOriginalHome;
        homeScore = Math.max(0, roundScore(originalHomeScore + delta, sport));
      }
    }

    if (homeDefChanged) {
      if (homeDefensiveNumericGrade === originalRatings.homeDefensiveNumericGrade) {
        awayScore = originalAwayScore;
      } else {
        const newCalculatedAway = roundedAwayOff - roundedHomeDef + hfa;
        const delta = newCalculatedAway - calculatedOriginalAway;
        awayScore = Math.max(0, roundScore(originalAwayScore + delta, sport));
      }
    }

    const spread = homeScore - awayScore;
    const total = awayScore + homeScore;

    let k = 0.13;
    if (sport === 'nba' || sport === 'college-basketball') {
      k = 0.13;
    } else if (sport === 'nfl' || sport === 'college-football') {
      k = 0.15;
    }
    const homeWinProb = 1 / (1 + Math.exp(-k * spread));
    const home = Math.max(0.001, Math.min(0.999, homeWinProb));
    const away = 1 - home;

    if (awayScore !== simulationResult.away_score || homeScore !== simulationResult.home_score) {
      setSimulationResult({
        away_score: awayScore,
        home_score: homeScore,
        spread: spread,
        total: total,
        away_win_probability: away,
        home_win_probability: home,
      });
    }
  }, [awayOffensiveNumericGrade, awayDefensiveNumericGrade, homeOffensiveNumericGrade, homeDefensiveNumericGrade, originalRatings, awayTeam, homeTeam, sport]);

  // ============================================================================
  // Tracking Functions
  // ============================================================================

  const trackEvent = async (
    eventType: string,
    sportParam: string | null,
    metadata: any = null
  ) => {
    try {
      const userType = hasAccess ? 'paid' : 'free';
      const userId = isSignedIn && user?.id ? user.id : null;

      await fetch('/api/simulator/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          userType,
          eventType,
          sport: sportParam,
          metadata,
        }),
      });
    } catch (error) {
      console.error('[Simulator] Failed to track event:', error);
    }
  };

  const handleVersusLinkClick = () => {
    trackEvent('versus_link_clicked', null, null);
  };

  // ============================================================================
  // API Functions
  // ============================================================================

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await fetch(`/api/simulator/teams?sport=${sport}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch teams: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const teamsList = Array.isArray(data) ? data : [];
      
      setTeams(teamsList);
      setAwayTeam(null);
      setHomeTeam(null);
      setSimulationResult(null);
    } catch (error) {
      console.error('Error fetching teams:', error);
      alert(`Error loading teams: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingTeams(false);
    }
  };

  const runSimulation = async () => {
    if (!awayTeam || !homeTeam) {
      alert('Please select both away and home teams');
      return;
    }

    // Check if already have originalRatings (slider adjustment mode)
    if (originalRatings) {
      return;
    }

    // Check generation limit for free users
    if (!hasAccess) {
      if (hasReachedGenerationLimit()) {
        setShowLimitModal(true);
        trackEvent('popup_shown', null, null);
        return;
      }
    }

    // First time simulation - call the API
    setLoading(true);
    try {
      const response = await fetch('/api/simulator/simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sport,
          awayTeamId: awayTeam.id,
          homeTeamId: homeTeam.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || `Simulation failed: ${response.status}`);
      }

      const data = await response.json();
      
      const teams = data.team || [];
      
      const awayTeamData = teams.find((t: any) => 
        t.name === awayTeam.name || 
        t.name?.toLowerCase() === awayTeam.name?.toLowerCase() ||
        t.abbreviation === awayTeam.abbreviation ||
        t.abbreviation?.toLowerCase() === awayTeam.abbreviation?.toLowerCase()
      ) || teams.find((t: any) => t.venue === 'Away') || teams[0];
      
      const homeTeamData = teams.find((t: any) => 
        t.name === homeTeam.name || 
        t.name?.toLowerCase() === homeTeam.name?.toLowerCase() ||
        t.abbreviation === homeTeam.abbreviation ||
        t.abbreviation?.toLowerCase() === homeTeam.abbreviation?.toLowerCase()
      ) || teams.find((t: any) => t.venue === 'Home') || teams[1];
      
      const outcome = data.outcome || {};
      
      const transformed = {
        away_score: awayTeamData?.score || 0,
        home_score: homeTeamData?.score || 0,
        spread: outcome.pointSpread || 0,
        total: outcome.totalPoints || 0,
        away_win_probability: (awayTeamData?.winProbability || 0) / 100,
        home_win_probability: (homeTeamData?.winProbability || 0) / 100,
      };
      
      setSimulationResult(transformed);
      
      originalAwayScoreRef.current = transformed.away_score;
      originalHomeScoreRef.current = transformed.home_score;
      
      // Update original ratings
      if (data.team && Array.isArray(data.team) && data.team.length >= 2) {
        const apiAwayOffGrade = awayTeamData.offensiveNumericGrade || 75;
        const apiAwayDefGrade = awayTeamData.defensiveNumericGrade || 75;
        const apiHomeOffGrade = homeTeamData.offensiveNumericGrade || 75;
        const apiHomeDefGrade = homeTeamData.defensiveNumericGrade || 75;

        const isNewTeamSelection = !originalRatings;

        const ratings = {
          awayOffensiveNumericGrade: apiAwayOffGrade,
          awayOffensiveRating: awayTeamData.offensiveRating || 0,
          awayDefensiveNumericGrade: apiAwayDefGrade,
          awayDefensiveRating: awayTeamData.defensiveRating || 0,
          homeOffensiveNumericGrade: apiHomeOffGrade,
          homeOffensiveRating: homeTeamData.offensiveRating || 0,
          homeDefensiveNumericGrade: apiHomeDefGrade,
          homeDefensiveRating: homeTeamData.defensiveRating || 0,
          offensiveRange: data.offensiveRange || 20,
          defensiveRange: data.defensiveRange || 20,
          homeFieldAdvantage: homeTeamData.homeFieldAdvantage || 1.25,
        };
        setOriginalRatings(ratings);
        
        currentAwayOffensiveRatingRef.current = awayTeamData.offensiveRating || 0;
        currentAwayDefensiveRatingRef.current = awayTeamData.defensiveRating || 0;
        currentHomeOffensiveRatingRef.current = homeTeamData.offensiveRating || 0;
        currentHomeDefensiveRatingRef.current = homeTeamData.defensiveRating || 0;
        
        if (isNewTeamSelection) {
          setAwayOffensiveNumericGrade(apiAwayOffGrade);
          setAwayDefensiveNumericGrade(apiAwayDefGrade);
          setHomeOffensiveNumericGrade(apiHomeOffGrade);
          setHomeDefensiveNumericGrade(apiHomeDefGrade);
        } else {
          if (awayOffensiveNumericGrade === 75) {
            setAwayOffensiveNumericGrade(apiAwayOffGrade);
          }
          if (awayDefensiveNumericGrade === 75) {
            setAwayDefensiveNumericGrade(apiAwayDefGrade);
          }
          if (homeOffensiveNumericGrade === 75) {
            setHomeOffensiveNumericGrade(apiHomeOffGrade);
          }
          if (homeDefensiveNumericGrade === 75) {
            setHomeDefensiveNumericGrade(apiHomeDefGrade);
          }
        }
      }

      // Track simulation and increment count for free users
      if (!hasAccess) {
        const newCount = incrementGenerationCount();
        setGenerationCount(newCount);
      }
      
      trackEvent('simulation_ran', sport, {
        awayTeam: awayTeam.name,
        homeTeam: homeTeam.name,
        away_score: transformed.away_score,
        home_score: transformed.home_score,
      });

    } catch (error) {
      console.error('Simulation error:', error);
      alert(error instanceof Error ? error.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredAwayTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(awaySearch.toLowerCase()) ||
    team.abbreviation?.toLowerCase().includes(awaySearch.toLowerCase())
  );

  const filteredHomeTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(homeSearch.toLowerCase()) ||
    team.abbreviation?.toLowerCase().includes(homeSearch.toLowerCase())
  );

  const sportLabels: Record<Sport, string> = {
    nfl: 'NFL',
    nba: 'NBA',
    'college-football': 'College Football',
    'college-basketball': 'College Basketball',
  };

  const remainingGens = getRemainingGenerations();

  return (
    <div className={styles.container}>
      {/* Spline Background */}
      <div className={styles.splineBackground}>
        <Spline 
          scene="https://prod.spline.design/I9cBnG1M2TY0k9XG/scene.splinecode"
          onLoad={(spline: any) => {
            setSplineLoaded(true);
            setSplineInstance(spline);
          }}
          onError={(error: any) => {
            console.error('Spline loading error:', error);
            setSplineError(true);
          }}
        />
      </div>

      {/* Content Overlay */}
      <div className={styles.contentOverlay}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Game Simulations</h1>
          <div className={styles.subtitle}>
            Powered by{' '}
            <a
              href="https://www.versussportssimulator.com/NFL/simulations"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.versusLink}
              onClick={handleVersusLinkClick}
            >
              Versus Sports Simulator
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Generation Counter for Free Users */}
          {!hasAccess && (
            <div className={styles.generationCounter}>
              {remainingGens > 0 ? (
                <span>{remainingGens} free simulation{remainingGens !== 1 ? 's' : ''} remaining</span>
              ) : (
                <span>No free simulations remaining</span>
              )}
            </div>
          )}

          {/* Sport, Away, Home Selection */}
          <div className={styles.selectionRow}>
            {/* Sport Selection */}
            <div className={styles.dropdownWrapper} data-dropdown-container>
              <button
                type="button"
                data-team-button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSportDropdown(!showSportDropdown);
                  setShowAwayDropdown(false);
                  setShowHomeDropdown(false);
                }}
                className={styles.selectionButton}
              >
                {sportLabels[sport]}
              </button>

              {showSportDropdown && (
                <div className={styles.dropdown} data-dropdown-container>
                  {(['nfl', 'nba', 'college-football', 'college-basketball'] as Sport[]).map((sportOption) => (
                    <div
                      key={sportOption}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSport(sportOption);
                        setShowSportDropdown(false);
                      }}
                      className={`${styles.dropdownItem} ${sport === sportOption ? styles.dropdownItemActive : ''}`}
                    >
                      {sportLabels[sportOption]}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Away Team Selection */}
            <div className={styles.dropdownWrapper} data-dropdown-container>
              <button
                type="button"
                data-team-button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAwayDropdown(!showAwayDropdown);
                  setShowHomeDropdown(false);
                }}
                className={`${styles.selectionButton} ${awayTeam ? styles.selectionButtonActive : ''}`}
              >
                {awayTeam ? awayTeam.name : 'Away Team'}
              </button>

              {showAwayDropdown && (
                <div className={styles.dropdownLarge} data-dropdown-container>
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={awaySearch}
                    onChange={(e) => setAwaySearch(e.target.value)}
                    className={styles.dropdownSearch}
                    autoFocus
                  />
                  {loadingTeams ? (
                    <div className={styles.dropdownLoading}>Loading...</div>
                  ) : filteredAwayTeams.length === 0 ? (
                    <div className={styles.dropdownEmpty}>
                      {teams.length === 0 ? 'No teams found' : 'No teams match your search'}
                    </div>
                  ) : (
                    filteredAwayTeams.map((team) => (
                      <div
                        key={team.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAwayTeam(team);
                          setShowAwayDropdown(false);
                          setAwaySearch('');
                        }}
                        className={`${styles.dropdownItem} ${awayTeam?.id === team.id ? styles.dropdownItemActive : ''}`}
                      >
                        {team.name} {team.abbreviation && `(${team.abbreviation})`}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Home Team Selection */}
            <div className={styles.dropdownWrapper} data-dropdown-container>
              <button
                type="button"
                data-team-button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHomeDropdown(!showHomeDropdown);
                  setShowAwayDropdown(false);
                }}
                className={`${styles.selectionButton} ${homeTeam ? styles.selectionButtonActive : ''}`}
              >
                {homeTeam ? homeTeam.name : 'Home Team'}
              </button>

              {showHomeDropdown && (
                <div className={styles.dropdownLarge} data-dropdown-container>
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={homeSearch}
                    onChange={(e) => setHomeSearch(e.target.value)}
                    className={styles.dropdownSearch}
                    autoFocus
                  />
                  {loadingTeams ? (
                    <div className={styles.dropdownLoading}>Loading...</div>
                  ) : filteredHomeTeams.length === 0 ? (
                    <div className={styles.dropdownEmpty}>
                      {teams.length === 0 ? 'No teams found' : 'No teams match your search'}
                    </div>
                  ) : (
                    filteredHomeTeams.map((team) => (
                      <div
                        key={team.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHomeTeam(team);
                          setShowHomeDropdown(false);
                          setHomeSearch('');
                        }}
                        className={`${styles.dropdownItem} ${homeTeam?.id === team.id ? styles.dropdownItemActive : ''}`}
                      >
                        {team.name} {team.abbreviation && `(${team.abbreviation})`}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Simulation Results */}
          {simulationResult && (
            <div className={styles.resultsWrapper}>
              <div className={styles.scoreCard}>
                <div className={styles.scoreRow}>
                  <div className={styles.teamLabel}>
                    <div className={styles.teamAbbr}>{awayTeam?.abbreviation || 'AWAY'}</div>
                    <div className={styles.teamVenue}>Away</div>
                  </div>
                  <div className={styles.score}>
                    {simulationResult.away_score} - {simulationResult.home_score}
                  </div>
                  <div className={styles.teamLabel}>
                    <div className={styles.teamAbbr}>{homeTeam?.abbreviation || 'HOME'}</div>
                    <div className={styles.teamVenue}>Home</div>
                  </div>
                </div>
              </div>

              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Spread</div>
                  <div className={styles.statValue}>
                    {simulationResult.spread > 0 ? '+' : ''}{simulationResult.spread.toFixed(1)}
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total</div>
                  <div className={styles.statValue}>
                    {simulationResult.total.toFixed(1)}
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Home Win %</div>
                  <div className={styles.statValue}>
                    {(simulationResult.home_win_probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Run Simulation Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              runSimulation();
            }}
            disabled={loading || !awayTeam || !homeTeam}
            className={styles.simulateButton}
          >
            {loading ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>

        {/* Sliders - Only show after first simulation */}
        {(awayTeam && homeTeam && originalRatings) && (
          <div className={styles.slidersWrapper}>
            {/* Away Team Ratings */}
            {awayTeam && (
              <div className={styles.sliderSection}>
                <div className={styles.sliderTeamName}>{awayTeam.name}</div>
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderItem}>
                    <div className={styles.sliderHeader}>
                      <span>Off</span>
                      <span>{Math.round(awayOffensiveNumericGrade)}</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="99"
                      value={awayOffensiveNumericGrade}
                      onChange={(e) => {
                        const newGrade = Number(e.target.value);
                        setAwayOffensiveNumericGrade(newGrade);
                      }}
                      className={styles.slider}
                    />
                  </div>
                  <div className={styles.sliderItem}>
                    <div className={styles.sliderHeader}>
                      <span>Def</span>
                      <span>{Math.round(awayDefensiveNumericGrade)}</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="99"
                      value={awayDefensiveNumericGrade}
                      onChange={(e) => {
                        const newGrade = Number(e.target.value);
                        setAwayDefensiveNumericGrade(newGrade);
                      }}
                      className={styles.slider}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Home Team Ratings */}
            {homeTeam && (
              <div className={styles.sliderSection}>
                <div className={styles.sliderTeamName}>{homeTeam.name}</div>
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderItem}>
                    <div className={styles.sliderHeader}>
                      <span>Off</span>
                      <span>{Math.round(homeOffensiveNumericGrade)}</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="99"
                      value={homeOffensiveNumericGrade}
                      onChange={(e) => {
                        const newGrade = Number(e.target.value);
                        setHomeOffensiveNumericGrade(newGrade);
                      }}
                      className={styles.slider}
                    />
                  </div>
                  <div className={styles.sliderItem}>
                    <div className={styles.sliderHeader}>
                      <span>Def</span>
                      <span>{Math.round(homeDefensiveNumericGrade)}</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="99"
                      value={homeDefensiveNumericGrade}
                      onChange={(e) => {
                        const newGrade = Number(e.target.value);
                        setHomeDefensiveNumericGrade(newGrade);
                      }}
                      className={styles.slider}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generation Limit Modal */}
      {showLimitModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLimitModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Free Simulation Limit Reached</h2>
            <p className={styles.modalText}>
              You've used all 3 free simulations. Upgrade to get unlimited access to the simulator, plus:
            </p>
            <ul className={styles.modalList}>
              <li>Unlimited game simulations</li>
              <li>Expert betting picks & AI analysis</li>
              <li>Advanced game intelligence</li>
              <li>Public betting data & trends</li>
            </ul>
            <button
              className={styles.modalButton}
              onClick={() => {
                trackEvent('popup_clicked', null, null);
                window.location.href = '/pricing';
              }}
            >
              Start $1 Trial
            </button>
            <button
              className={styles.modalButtonSecondary}
              onClick={() => setShowLimitModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

