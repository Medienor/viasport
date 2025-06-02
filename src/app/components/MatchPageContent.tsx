'use client';

import { useState } from 'react';
import TopSectionTabs from './TopSectionTabs';
import MatchTabs from './MatchTabs';
import MatchStatsSnippet from './MatchStatsSnippet';
import FixtureNews from './FixtureNews';
import LiveMatchEvents from './LiveMatchEvents';
import HorizontalLineupComponent from './HorizontalLineupComponent';
import TeamForm from './TeamForm';

interface MatchPageContentProps {
  match: any;
  teamColors: any;
  isUpcoming: boolean;
  isLive: boolean;
  isFinished: boolean;
  fixtureId: number;
  homeTeamForm: any[];
  awayTeamForm: any[];
}

export default function MatchPageContent({
  match,
  teamColors,
  isUpcoming,
  isLive,
  isFinished,
  fixtureId,
  homeTeamForm,
  awayTeamForm
}: MatchPageContentProps) {
  const [activeTopTab, setActiveTopTab] = useState('fakta');

  return (
    <>
      {/* Add the TopSectionTabs component */}
      <TopSectionTabs 
        match={match} 
        activeTab={activeTopTab}
        onTabChange={setActiveTopTab}
      />

      {/* Conditionally render components based on activeTopTab */}
      {activeTopTab === 'fakta' && (
        <div className="space-y-6 mt-6">
          {/* Match details card with tabs */}
          <div className="bg-white dark:bg-[#222222] rounded-lg p-6">
            <MatchTabs 
              match={match}
              activeTab="facts"
              teamColors={teamColors}
            >
              {/* Your existing MatchTabs content goes here */}
            </MatchTabs>
          </div>
          
          {/* === Match Stats Snippet === */}
          {!isUpcoming && (match.fixture_statistics != null || match.ball_possession != null) && (
            <MatchStatsSnippet
              matchId={fixtureId}
              fixtureStatistics={match.fixture_statistics}
              teamColors={teamColors}
              initialEvents={match.event_data || []}
              matchStatusShort={match.status?.short}
              matchStartDate={match.date}
              lastUpdatedAt={match.details_last_updated_at}
              ballPossession={match.ball_possession ?? undefined}
            />
          )}

          {/* Show FixtureNews after MatchStatsSnippet for finished matches */}
          {isFinished && <FixtureNews leagueId={match.league.id} leagueName={match.league.name} isFinished={isFinished} />}

          {/* SEPARATE Live Match Events Card */}
          {(isLive || isFinished) && (
            <div className="bg-white dark:bg-[#222222] rounded-lg shadow p-4 md:p-6">
              <LiveMatchEvents
                matchId={fixtureId}
                initialEvents={match.event_data || []}
                homeTeamId={match.teams.home.id}
                awayTeamId={match.teams.away.id}
                isLive={!!isLive}
              />
            </div>
          )}

          {/* === Horizontal Lineup Component === */}
          {match.lineups && match.lineups.length > 0 && (
            <div>
              <HorizontalLineupComponent
                lineups={match.lineups}
                playerStats={match.player_statistics || []}
                eventData={match.event_data || []}
              />
            </div>
          )}

          {/* Show FixtureNews before TeamForm for upcoming matches only */}
          {isUpcoming && <FixtureNews leagueId={match.league.id} leagueName={match.league.name} isFinished={isFinished} />}

          {/* Conditionally render TeamForm if match is upcoming */}
          {isUpcoming && (
            <TeamForm
              homeForm={homeTeamForm}
              awayForm={awayTeamForm}
              homeTeamId={match.teams.home.id}
              awayTeamId={match.teams.away.id}
            />
          )}
        </div>
      )}

      {/* Other tabs */}
      {activeTopTab === 'referat' && (
        <div className="bg-white dark:bg-[#222222] rounded-lg p-6 mt-6">
          <p>Referat content will go here...</p>
        </div>
      )}

      {activeTopTab === 'lag' && (
        <div className="bg-white dark:bg-[#222222] rounded-lg p-6 mt-6">
          <p>Lag content will go here...</p>
        </div>
      )}

      {/* Add other tab conditions as needed */}
    </>
  );
} 