"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { fetchTeamStandings } from '@/lib/api';
import { createTeamSlug } from '@/lib/utils';
import ClientStandings from './ClientStandings';

interface TeamStandingsProps {
  teamId: number;
  leagueId: number;
}

export default function TeamStandings({ teamId, leagueId }: TeamStandingsProps) {
  return <ClientStandings teamId={teamId} leagueId={leagueId} />;
} 