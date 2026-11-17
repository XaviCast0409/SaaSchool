import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatPeruDate, formatPeruTime, getPeruToday } from '@/lib/dateUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { apiErrorMessage } from '@/features/academic/api';
import {
  useArchiveConversation,
  useConversation,
  useConversations,
  useMarkConversationRead,
  useMessageContacts,
  useOpenConversation,
  useSendMessage,
  useTeamContacts,
  type ConversationKind,
  type ConversationSummary,
  type StaffGroup,
  fetchOlderMessages,
  type ChatMessage,
} from '../api/useMessages';

const MAX_LENGTH = 2000;
const STAFF_GROUP_ORDER: StaffGroup[] = ['Dirección', 'Secretaría', 'Docentes', 'Otros'];
const NO_CLASSROOM = 'Sin aula asignada';

type Filter = 'all' | 'unread' | 'archived';

function shortWhen(iso: string): string {
  const day = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return day === getPeruToday() ? formatPeruTime(iso) : formatPeruDate(iso, { day: '2-digit', month: 'short' });
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Texto con el que se busca una conversación: persona, alumno y aula. */
const searchableText = (c: ConversationSummary) =>
  normalize([c.counterpart.name, c.counterpart.roleLabel, c.student?.name, c.student?.classroom].filter(Boolean).join(' '));

interface ConversationGroup {
  key: string;
  label: string;
  items: ConversationSummary[];
  unread: number;
}

/** Familias: por aula (las aulas con mensajes sin leer primero). Equipo: por cargo. */
function groupConversations(items: ConversationSummary[], kind: ConversationKind): ConversationGroup[] {
  const map = new Map<string, ConversationSummary[]>();
  for (const c of items) {
    const key = kind === 'STAFF' ? c.counterpart.group : c.student?.classroom ?? NO_CLASSROOM;
    map.set(key, [...(map.get(key) ?? []), c]);
  }
  const groups = [...map.entries()].map(([key, list]) => ({
    key,
    label: key,
    items: list,
    unread: list.reduce((s, c) => s + c.unread, 0),
  }));
  if (kind === 'STAFF') {
    return groups.sort((a, b) => STAFF_GROUP_ORDER.indexOf(a.key as StaffGroup) - STAFF_GROUP_ORDER.indexOf(b.key as StaffGroup));
  }
  return groups.sort(
    (a, b) =>
      Number(b.unread > 0) - Number(a.unread > 0) ||
      Number(a.key === NO_CLASSROOM) - Number(b.key === NO_CLASSROOM) ||
      a.label.localeCompare(b.label, 'es', { numeric: true }),
  );
}

/** Selector para iniciar una conversación nueva: con una familia o con alguien del equipo. */
const NewConversationModal: React.FC<{
  open: boolean;
  isStaff: boolean;
  initialMode: ConversationKind;
  onClose: () => void;
  onOpened: (id: string, kind: ConversationKind) => void;
}> = ({ open, isStaff, initialMode, onClose, onOpened }) => {
  const [mode, setMode] = useState<ConversationKind>(initialMode);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    if (open) {
      setMode(isStaff ? initialMode : 'FAMILY');
      setSearch('');
    }
  }, [open, initialMode, isStaff]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading } = useMessageContacts(debounced, open && mode === 'FAMILY');
  const team = useTeamContacts(open && isStaff && mode === 'STAFF');
  const openConv = useOpenConversation();

  const start = (counterpartId: string, studentId?: string) =>
    openConv.mutate(
      { studentId, counterpartId },
      {
        onSuccess: (c) => {
          onOpened(c.id, studentId ? 'FAMILY' : 'STAFF');
          onClose();
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );

  const teamGroups = useMemo(() => {
    const q = normalize(search.trim());
    const list = (team.data ?? []).filter((p) => !q || normalize(`${p.name} ${p.roleLabel} ${p.detail ?? ''}`).includes(q));
    return STAFF_GROUP_ORDER.map((g) => ({ group: g, people: list.filter((p) => p.group === g) })).filter((g) => g.people.length);
  }, [team.data, search]);

  return (
    <Modal open={open} onClose={onClose} title="Nuevo mensaje" description="Elige con quién quieres conversar." size="md">
      {isStaff && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Tipo de conversación">
          {(['FAMILY', 'STAFF'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setSearch('');
              }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'FAMILY' ? 'Una familia' : 'Mi equipo'}
            </button>
          ))}
        </div>
      )}

      {isStaff && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode === 'FAMILY' ? 'Buscar alumno por nombre o DNI' : 'Buscar por nombre, cargo o aula'}
            className="pl-9"
            aria-label={mode === 'FAMILY' ? 'Buscar alumno' : 'Buscar persona del equipo'}
          />
        </div>
      )}

      {mode === 'STAFF' ? (
        team.isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : teamGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No encontramos a nadie del equipo con ese nombre.</p>
        ) : (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto">
            {teamGroups.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {g.people.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={openConv.isPending}
                        onClick={() => start(p.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 disabled:opacity-60"
                      >
                        <UserAvatar name={p.name} src={p.avatarUrl} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.detail ?? p.roleLabel}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : data?.kind === 'PARENT' ? (
        data.children.length === 0 ? (
          <p className="text-sm text-muted-foreground">No encontramos hijos vinculados a tu cuenta.</p>
        ) : (
          <div className="space-y-4">
            {data.children.map((child) => (
              <div key={child.student.id}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{child.student.name}</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {child.contacts.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={openConv.isPending}
                        onClick={() => start(c.id, child.student.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 disabled:opacity-60"
                      >
                        <UserAvatar name={c.name} src={c.avatarUrl} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.roleLabel}
                            {c.subjects && c.subjects.length > 0 ? ` · ${c.subjects.join(', ')}` : ''}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : data?.kind === 'STAFF' ? (
        data.students.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados. Solo aparecen alumnos de tus aulas.</p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {data.students.map((s) => (
              <li key={s.student.id} className="px-3 py-2.5">
                <p className="text-sm font-medium text-foreground">
                  {s.student.name} <span className="text-xs font-normal text-muted-foreground">· {s.student.classroom}</span>
                </p>
                {s.contacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin apoderados con cuenta activa.</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.contacts.map((c) => (
                      <Button
                        key={c.id}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={openConv.isPending}
                        onClick={() => start(c.id, s.student.id)}
                      >
                        {c.name} <span className="ml-1 text-muted-foreground">({c.roleLabel.toLowerCase()})</span>
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </Modal>
  );
};

const ConversationRow: React.FC<{ c: ConversationSummary; selected: boolean; showClassroom: boolean; onSelect: (id: string) => void }> = ({
  c,
  selected,
  showClassroom,
  onSelect,
}) => {
  const subtitle =
    c.kind === 'STAFF'
      ? c.counterpart.roleLabel
      : [c.counterpart.roleLabel, c.student?.name, showClassroom ? c.student?.classroom : null].filter(Boolean).join(' · ');
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(c.id)}
        className={cn('flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50', selected && 'bg-primary/5')}
        aria-current={selected}
      >
        <UserAvatar name={c.counterpart.name} src={c.counterpart.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn('truncate text-sm', c.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>{c.counterpart.name}</p>
            <span className="shrink-0 text-xs text-muted-foreground">{shortWhen(c.lastMessageAt)}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          <div className="flex items-center justify-between gap-2">
            <p className={cn('truncate text-xs', c.unread ? 'text-foreground' : 'text-muted-foreground')}>{c.lastMessageText ?? 'Sin mensajes todavía'}</p>
            {c.unread > 0 && (
              <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground" aria-label={`${c.unread} sin leer`}>
                {c.unread}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
};

const ConversationList: React.FC<{
  items: ConversationSummary[];
  kind: ConversationKind;
  grouped: boolean;
  loading: boolean;
  emptyText: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ items, kind, grouped, loading, emptyText, selectedId, onSelect }) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  if (loading) return <div className="space-y-2 p-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (items.length === 0) return <div className="p-6 text-center text-sm text-muted-foreground">{emptyText}</div>;

  if (!grouped) {
    return (
      <ul className="divide-y divide-border">
        {items.map((c) => (
          <ConversationRow key={c.id} c={c} selected={selectedId === c.id} showClassroom onSelect={onSelect} />
        ))}
      </ul>
    );
  }

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      {groupConversations(items, kind).map((g) => {
        const isCollapsed = collapsed.has(g.key);
        return (
          <section key={g.key} aria-label={g.label}>
            <button
              type="button"
              onClick={() => toggle(g.key)}
              aria-expanded={!isCollapsed}
              className="sticky top-0 z-10 flex w-full items-center justify-between gap-2 border-b border-border bg-muted/80 px-3 py-1.5 text-left backdrop-blur"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isCollapsed && '-rotate-90')} aria-hidden />
                <span className="truncate text-xs font-semibold text-foreground">{g.label}</span>
                <span className="text-xs text-muted-foreground">({g.items.length})</span>
              </span>
              {g.unread > 0 && (
                <span className="shrink-0 rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{g.unread}</span>
              )}
            </button>
            {!isCollapsed && (
              <ul className="divide-y divide-border">
                {g.items.map((c) => (
                  <ConversationRow key={c.id} c={c} selected={selectedId === c.id} showClassroom={false} onSelect={onSelect} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};

const ChatPanel: React.FC<{ conversationId: string; onBack: () => void }> = ({ conversationId, onBack }) => {
  const { data, isLoading } = useConversation(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkConversationRead();
  const archive = useArchiveConversation();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenId = useRef<string | null>(null);
  // Todo lo recibido en esta conversación. La consulta con sondeo trae solo los últimos 50: cuando llega
  // uno nuevo, el más antiguo de esa ventana sale de ella, pero aquí se conserva (antes desaparecía).
  const [received, setReceived] = useState<ChatMessage[]>([]);
  // Mensajes antiguos cargados a pedido con «Ver mensajes anteriores»
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const keepScrollFrom = useRef<number | null>(null);
  // Si la persona está leyendo más arriba, un mensaje nuevo no la hace saltar al final
  const nearBottom = useRef(true);
  const [newBelow, setNewBelow] = useState(false);
  // Bajar al final recién cuando los mensajes ya están pintados (llegan en un render posterior)
  const pendingScroll = useRef(false);

  useEffect(() => {
    if (!data?.messages.length) return;
    setReceived((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = data.messages.filter((m) => !known.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [data?.messages]);

  const allMessages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const m of [...older, ...received]) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [older, received]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
    setNewBelow(false);
  };

  // Marcar como leído al abrir y cada vez que llega un mensaje nuevo. Se detecta por el último mensaje,
  // no por la cantidad: con 50 o más, la ventana siempre trae 50 y la cantidad no cambia.
  const lastMessage = data?.messages[data.messages.length - 1];
  useEffect(() => {
    if (!data || lastMessage?.id === lastSeenId.current) return;
    const isFirstLoad = lastSeenId.current === null;
    lastSeenId.current = lastMessage?.id ?? '';
    if (isFirstLoad || nearBottom.current || lastMessage?.mine) pendingScroll.current = true;
    else setNewBelow(true);
    markRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage?.id, conversationId]);

  useLayoutEffect(() => {
    if (pendingScroll.current && allMessages.length > 0) {
      pendingScroll.current = false;
      scrollToBottom();
    }
  }, [allMessages]);

  // Tras cargar mensajes anteriores, mantener a la vista lo que se estaba leyendo
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && keepScrollFrom.current !== null) {
      el.scrollTop += el.scrollHeight - keepScrollFrom.current;
      keepScrollFrom.current = null;
    }
  }, [older]);

  const loadOlder = async () => {
    const first = allMessages[0];
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchOlderMessages(conversationId, first.createdAt);
      keepScrollFrom.current = scrollRef.current?.scrollHeight ?? null;
      setOlder((prev) => [...page.messages, ...prev]);
      setHasMoreOlder(page.hasMore);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoadingOlder(false);
    }
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom.current) setNewBelow(false);
  };

  const handleSend = () => {
    const body = text.trim();
    if (!body) return;
    send.mutate(body, {
      onSuccess: (res) => {
        setText('');
        if (res.outsideHours) toast.info('Mensaje enviado fuera del horario de atención: el docente lo verá en su próximo horario.');
      },
      onError: (e) => toast.error(apiErrorMessage(e)),
    });
  };

  const grouped = useMemo(() => {
    const groups: Array<{ day: string; items: NonNullable<typeof data>['messages'] }> = [];
    for (const m of allMessages) {
      const raw = formatPeruDate(m.createdAt, { weekday: 'long', day: 'numeric', month: 'long' });
      const day = raw.charAt(0).toUpperCase() + raw.slice(1);
      if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, items: [] });
      groups[groups.length - 1].items.push(m);
    }
    return groups;
  }, [allMessages]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Cargando" />
      </div>
    );
  }
  const { conversation } = data;
  const otherRead = conversation.otherLastReadAt ? new Date(conversation.otherLastReadAt) : null;
  const subtitle =
    conversation.kind === 'STAFF'
      ? `${conversation.counterpart.roleLabel} · chat interno del equipo`
      : `${conversation.counterpart.roleLabel}${conversation.student ? ` · sobre ${conversation.student.name}` : ''}`;

  const toggleArchive = () =>
    archive.mutate(
      { id: conversationId, archived: !conversation.archived },
      {
        onSuccess: () => {
          toast.success(conversation.archived ? 'Conversación devuelta a la bandeja.' : 'Conversación archivada. Volverá si recibes un mensaje nuevo.');
          if (!conversation.archived) onBack();
        },
        onError: (e) => toast.error(apiErrorMessage(e)),
      },
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Volver a la lista">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <UserAvatar name={conversation.counterpart.name} src={conversation.counterpart.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{conversation.counterpart.name}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={toggleArchive}
          disabled={archive.isPending}
          aria-label={conversation.archived ? 'Devolver a la bandeja' : 'Archivar conversación'}
          title={conversation.archived ? 'Devolver a la bandeja' : 'Archivar conversación'}
        >
          {conversation.archived ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{conversation.archived ? 'Desarchivar' : 'Archivar'}</span>
        </Button>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/20 px-3 py-4">
        {(hasMoreOlder ?? data.hasMore) && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-full text-xs" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />} Ver mensajes anteriores
            </Button>
          </div>
        )}
        {grouped.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Escribe el primer mensaje de esta conversación.</p>
        )}
        {grouped.map((g) => (
          <div key={g.day} className="space-y-1.5">
            <p className="text-center text-xs font-medium text-muted-foreground">{g.day}</p>
            {g.items.map((m) => (
              <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]',
                    m.mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border border-border bg-card text-foreground',
                  )}
                >
                  {m.body}
                  <span className={cn('mt-1 flex items-center justify-end gap-1 text-xs', m.mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                    {formatPeruTime(m.createdAt)}
                    {m.mine &&
                      (otherRead && otherRead >= new Date(m.createdAt) ? (
                        <CheckCheck className="h-3 w-3" aria-label="Leído" />
                      ) : (
                        <Check className="h-3 w-3" aria-label="Enviado" />
                      ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {newBelow && (
        <div className="relative">
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="absolute -top-12 left-1/2 h-8 -translate-x-1/2 gap-1.5 rounded-full text-xs shadow-md"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden /> Nuevos mensajes
          </Button>
        </div>
      )}

      {conversation.officeHours && (
        <p className="flex items-center gap-1.5 border-t border-border px-3 pt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden /> Horario de atención: lunes a viernes de {conversation.officeHours.start} a {conversation.officeHours.end}
        </p>
      )}
      <form
        className="flex items-end gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder={conversation.counterpart.isActive ? 'Escribe un mensaje…' : 'Esta persona ya no tiene cuenta activa'}
          disabled={!conversation.counterpart.isActive}
          aria-label="Mensaje"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {text.length > MAX_LENGTH * 0.8 && (
          <span className={cn('self-center text-xs tabular-nums', text.length >= MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground')} aria-live="polite">
            {text.length}/{MAX_LENGTH}
          </span>
        )}
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={!text.trim() || send.isPending} aria-label="Enviar">
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isStaff = user?.role !== 'PARENT';
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');
  const tab: ConversationKind = isStaff && params.get('tab') === 'equipo' ? 'STAFF' : 'FAMILY';
  const [filter, setFilter] = useState<Filter>('all');
  const [childId, setChildId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const { data, isLoading, error } = useConversations();

  const all = data ?? [];
  const unreadBy = (kind: ConversationKind) => all.filter((c) => c.kind === kind && !c.archived).reduce((s, c) => s + c.unread, 0);

  // Hijos con conversaciones (para el filtro de apoderados con varios hijos)
  const children = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of all) if (c.student) map.set(c.student.id, c.student.name);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [all]);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return all.filter(
      (c) =>
        c.kind === tab &&
        // Una conversación abierta sin mensajes solo se muestra mientras está seleccionada
        (c.lastMessageText !== null || c.id === selectedId) &&
        (filter === 'archived' ? c.archived : !c.archived) &&
        (filter !== 'unread' || c.unread > 0) &&
        (!childId || c.student?.id === childId) &&
        (!q || searchableText(c).includes(q)),
    );
  }, [all, tab, filter, childId, search, selectedId]);
  const archivedCount = all.filter((c) => c.kind === tab && c.archived).length;

  const update = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace });
  };
  const select = (id: string | null) => update({ c: id }, !id);
  const switchTab = (kind: ConversationKind) => {
    setFilter('all');
    update({ tab: kind === 'STAFF' ? 'equipo' : null, c: null }, true);
  };

  // Al abrir un enlace a una conversación (p. ej. desde una notificación), mostrar su pestaña
  useEffect(() => {
    if (!selectedId || !isStaff) return;
    const conv = all.find((c) => c.id === selectedId);
    if (conv && conv.kind !== tab) update({ tab: conv.kind === 'STAFF' ? 'equipo' : null }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, all.length]);

  if (error) {
    return <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="Mensajería no disponible" description={apiErrorMessage(error)} />;
  }

  const emptyText = search
    ? 'Ninguna conversación coincide con tu búsqueda.'
    : filter === 'unread'
      ? 'No tienes mensajes sin leer aquí. 🎉'
      : filter === 'archived'
        ? 'No tienes conversaciones archivadas.'
        : tab === 'STAFF'
          ? 'Aún no conversas con tu equipo. Pulsa Nuevo y elige «Mi equipo».'
          : 'Aún no tienes conversaciones. Pulsa Nuevo para empezar.';

  return (
    // En celular se descuenta también la barra inferior (3.5rem + área segura): antes tapaba el campo para escribir
    <div className="-m-4 flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] flex-col md:m-0 md:h-[calc(100dvh-8rem)]">
      <div className="flex min-h-0 flex-1 overflow-hidden border-border bg-card md:rounded-xl md:border">
        <aside className={cn('flex w-full flex-col border-r border-border md:w-80 lg:w-96', selectedId && 'hidden md:flex')}>
          <div className="space-y-2.5 border-b border-border px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-base font-semibold text-foreground">Mensajes</h1>
                <p className="text-xs text-muted-foreground">
                  {isStaff ? 'Familias y equipo del colegio, cada uno en su lugar' : 'Conversa con el tutor y los docentes de tus hijos'}
                </p>
              </div>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setNewOpen(true)}>
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden /> Nuevo
              </Button>
            </div>

            {isStaff && (
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Bandejas">
                {(['FAMILY', 'STAFF'] as const).map((k) => {
                  const n = unreadBy(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={tab === k}
                      onClick={() => switchTab(k)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
                        tab === k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {k === 'FAMILY' ? <MessagesSquare className="h-3.5 w-3.5" aria-hidden /> : <Users className="h-3.5 w-3.5" aria-hidden />}
                      {k === 'FAMILY' ? 'Familias' : 'Equipo'}
                      {n > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{n}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'STAFF' ? 'Buscar por nombre o cargo' : isStaff ? 'Buscar apoderado, alumno o aula' : 'Buscar docente'}
                className="h-9 pl-9 text-sm"
                aria-label="Buscar conversación"
              />
            </div>

            <div className="flex flex-wrap gap-1.5" aria-label="Filtros">
              {([
                ['all', 'Todas'],
                ['unread', 'Sin leer'],
                ['archived', `Archivadas${archivedCount ? ` (${archivedCount})` : ''}`],
              ] as const).map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    filter === f ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
              {!isStaff && children.length > 1 && (
                <select
                  value={childId ?? ''}
                  onChange={(e) => setChildId(e.target.value || null)}
                  className="h-6 rounded-full border border-border bg-background px-2 text-xs text-foreground"
                  aria-label="Filtrar por hijo"
                >
                  <option value="">Todos mis hijos</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConversationList
              items={visible}
              kind={tab}
              grouped={isStaff && !search}
              loading={isLoading}
              emptyText={emptyText}
              selectedId={selectedId}
              onSelect={select}
            />
          </div>
        </aside>
        <section className={cn('min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden md:flex')}>
          {selectedId ? (
            <ChatPanel key={selectedId} conversationId={selectedId} onBack={() => select(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <MessagesSquare className="h-10 w-10 opacity-40" aria-hidden />
              <p className="text-sm">Elige una conversación o inicia una nueva.</p>
              <p className="max-w-xs text-xs">Los mensajes quedan guardados en la plataforma del colegio. Nadie necesita compartir su número personal.</p>
            </div>
          )}
        </section>
      </div>
      <NewConversationModal
        open={newOpen}
        isStaff={isStaff}
        initialMode={tab}
        onClose={() => setNewOpen(false)}
        onOpened={(id, kind) => update({ c: id, tab: kind === 'STAFF' ? 'equipo' : null })}
      />
    </div>
  );
};
