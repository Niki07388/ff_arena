import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Group, ChatMessage } from '../types';
import { AppUser, ChatEngine } from '../utils/supabase';
import { Send, MessageSquare, Trash2, RefreshCw, WifiOff } from 'lucide-react';

interface GroupChatProps {
  group: Group;
  currentUser: AppUser | null;
  /** Organizers may delete anyone's message; captains only their own. */
  isOrganizer: boolean;
  onError: (message: string) => void;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDay = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return isToday ? 'Today' : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export const GroupChat: React.FC<GroupChatProps> = ({
  group,
  currentUser,
  isOrganizer,
  onError
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottom = useRef(true);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Only auto-scroll when the reader is already at the bottom, so reading
  // history is not yanked away by an incoming message.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldStickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    ChatEngine.listMessages(group.id)
      .then(loaded => {
        if (cancelled) return;
        setMessages(loaded);
        shouldStickToBottom.current = true;
      })
      .catch(err => {
        if (!cancelled) onError(err instanceof Error ? err.message : 'Could not load chat.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const unsubscribe = ChatEngine.subscribe(
      group.id,
      incoming => {
        setMessages(prev => (prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]));
        setIsLive(true);
      },
      removedId => setMessages(prev => prev.filter(m => m.id !== removedId))
    );

    // Realtime may be disabled on the project; surface that instead of silently
    // looking broken.
    const liveCheck = window.setTimeout(() => setIsLive(true), 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(liveCheck);
      unsubscribe();
    };
  }, [group.id, onError]);

  useEffect(() => {
    if (shouldStickToBottom.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !currentUser || isSending) return;

    setIsSending(true);
    setDraft('');
    shouldStickToBottom.current = true;

    try {
      await ChatEngine.sendMessage(group.id, currentUser.id, currentUser.displayName, body);
    } catch (err) {
      setDraft(body); // put the text back so nothing is lost
      onError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (message: ChatMessage) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await ChatEngine.deleteMessage(message.id);
      setMessages(prev => prev.filter(m => m.id !== message.id));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not delete message.');
    }
  };

  const refresh = async () => {
    try {
      setMessages(await ChatEngine.listMessages(group.id));
      shouldStickToBottom.current = true;
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not refresh chat.');
    }
  };

  let lastDay = '';

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-title">
          <MessageSquare size={16} />
          <span>{group.name} — Room Chat</span>
        </div>
        <div className="chat-header-actions">
          <span className={`chat-live ${isLive ? 'on' : 'off'}`} title={isLive ? 'Live updates on' : 'Connecting…'}>
            {isLive ? <span className="pulse-dot" /> : <WifiOff size={12} />}
            {isLive ? 'Live' : 'Connecting'}
          </span>
          <button type="button" className="chat-icon-btn" onClick={refresh} title="Refresh messages">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
        {isLoading ? (
          <div className="chat-empty">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            No messages yet. Say hello to your squads — room ID, start time, rules.
          </div>
        ) : (
          messages.map(m => {
            const isMine = Boolean(currentUser && m.senderId === currentUser.id);
            const canDelete = isMine || isOrganizer;
            const day = formatDay(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;

            return (
              <React.Fragment key={m.id}>
                {showDay && <div className="chat-day-divider"><span>{day}</span></div>}

                <div className={`chat-bubble-row ${isMine ? 'mine' : ''}`}>
                  <div className="chat-bubble">
                    {!isMine && <div className="chat-sender">{m.senderName}</div>}
                    <div className="chat-body">{m.body}</div>
                    <div className="chat-meta">
                      <span>{formatTime(m.createdAt)}</span>
                      {canDelete && (
                        <button
                          type="button"
                          className="chat-delete"
                          onClick={() => handleDelete(m)}
                          title="Delete message"
                          aria-label="Delete message"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {currentUser ? (
        <form className="chat-composer" onSubmit={handleSend}>
          <input
            type="text"
            className="form-control"
            placeholder={`Message ${group.name}…`}
            value={draft}
            maxLength={2000}
            onChange={e => setDraft(e.target.value)}
            aria-label="Chat message"
          />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim() || isSending}>
            <Send size={15} />
          </button>
        </form>
      ) : (
        <div className="chat-empty" style={{ padding: '0.85rem' }}>
          Sign in to join this room's chat.
        </div>
      )}
    </div>
  );
};
