import React from 'react';
import { Tournament } from '../types';
import { Shield, ExternalLink, Users, Trophy } from 'lucide-react';

interface EventSwitcherProps {
  myTournaments: Tournament[];
  activeTournamentId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Quick switcher across the events THIS organizer created.
 *
 * Two ways to run several events at once:
 *  - click a chip to switch instantly (no page reload, no "load" step)
 *  - click the ↗ to open that event in a new browser tab
 *
 * The second one only works because the selected event now lives in the URL
 * (`?event=<id>`), so each tab keeps its own event instead of sharing one
 * global selection.
 */
export const EventSwitcher: React.FC<EventSwitcherProps> = ({
  myTournaments,
  activeTournamentId,
  onSelect
}) => {
  if (myTournaments.length === 0) return null;

  const openInNewTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.set('event', id);
    window.open(url.toString(), '_blank', 'noopener');
  };

  return (
    <div className="event-switcher">
      <div className="event-switcher-label">
        <Shield size={14} /> My Events
        <span className="event-switcher-count">{myTournaments.length}</span>
      </div>

      <div className="event-switcher-track">
        {myTournaments.map(t => {
          const isActive = t.id === activeTournamentId;

          return (
            <button
              key={t.id}
              type="button"
              className={`event-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(t.id)}
              title={`Switch to ${t.name}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="event-chip-name">{t.name}</span>

              <span className="event-chip-meta">
                <Users size={11} /> {t.teams.length}
                <Trophy size={11} /> {t.matches.length}/{t.totalMatches}
              </span>

              <span
                role="button"
                tabIndex={0}
                className="event-chip-open"
                title="Open this event in a new tab"
                aria-label={`Open ${t.name} in a new tab`}
                onClick={e => openInNewTab(t.id, e)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    openInNewTab(t.id, e as unknown as React.MouseEvent);
                  }
                }}
              >
                <ExternalLink size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
