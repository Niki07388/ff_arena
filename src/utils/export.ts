import { Tournament, LeaderboardItem, PlayerStat } from '../types';

export const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

export const exportTeamLeaderboardCSV = (tournament: Tournament, leaderboard: LeaderboardItem[]) => {
  let csv = 'Rank,Team Name,Captain,Matches Played,WWCD (Booyah),Total Kills,Placement Points,Total Points\n';
  leaderboard.forEach((item, index) => {
    csv += `${index + 1},"${item.team.name}","${item.team.captain}",${item.matchesPlayed},${item.wwcd},${item.totalKills},${item.placementPoints},${item.totalPoints}\n`;
  });
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_team_standings.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

export const exportPlayerLeaderboardCSV = (tournament: Tournament, playerStats: PlayerStat[]) => {
  let csv = 'Rank,Player IGN,Team Name,Total Kills,Avg Kills Per Match,Highest Match Kills\n';
  playerStats.forEach((p, index) => {
    csv += `${index + 1},"${p.player.ign || p.player.name}","${p.teamName}",${p.totalKills},${p.avgKills},${p.highestKillMatch}\n`;
  });
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_player_standings.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

export const exportMatchScoreboardCSV = (tournament: Tournament, matchNumber: number, rows: Array<{ team: { name: string }; placement: number; kills: number; totalPoints: number }>) => {
  let csv = 'Rank,Team Name,Kills,Placement,Total Points\n';
  rows.forEach((row, index) => {
    const ordinal = row.placement ? `${row.placement}th` : '-';
    csv += `${index + 1},"${row.team.name}",${row.kills},"${ordinal}",${row.totalPoints}\n`;
  });
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_match_${matchNumber}_scoreboard.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

export const printPDFReport = () => {
  window.print();
};
