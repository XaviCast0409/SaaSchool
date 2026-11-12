import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Check, CheckCheck, Clock, Loader2, MessageSquarePlus, MessagesSquare, Search, Send } from 'lucide-react';
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
  useConversation,
  useConversations,
  useMarkConversationRead,
  useMessageContacts,
  useOpenConversation,
  useSendMessage,
  type ConversationSummary,
} from '../api/useMessages';

const MAX_LENGTH = 2000;

function shortWhen(iso: string): string {
  const day = new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return day === getPeruToday() ? formatPeruTime(iso) : formatPeruDate(iso, { day: '2-digit', month: 'short' });
}

const Initials: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary', className)} aria-hidden>
    {name
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()}
  </div>
);

/** Selector para iniciar una conversación nueva. */
const NewConversationModal: React.FC<{ open: boolean; onClose: () => void; onOpened: (id: string) => void }> = ({ open, onClose, onOpened }) => {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading } = useMessageContacts(debounced, open);
  const openConv = useOpenConversation();

  const start = (studentId: string, counterpartId: string) =>
    openConv.mutate(
      { studentId, counterpartId },
      { onSuccess: (c) => { onOpened(c.id); onClose(); }, onError: (e) => toast.error(apiErrorMessage(e)) },
    );

  return (
    <Modal open={open} onClose={onClose} title="Nuevo mensaje" description="Elige con quién quieres conversar." size="md">
      {data?.kind === 'STAFF' && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumno por nombre o DNI"
            className="pl-9"
            aria-label="Buscar alumno"
          />
        </div>
      )}
      {isLoading ? (
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
                        onClick={() => start(child.student.id, c.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 disabled:opacity-60"
                      >
                        <Initials name={c.name} />
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
                        onClick={() => start(s.student.id, c.id)}
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

const ConversationList: React.FC<{
  items: ConversationSummary[] | undefined;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ items, loading, selectedId, onSelect }) => {
  if (loading) return <div className="space-y-2 p-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (!items || items.length === 0)
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Aún no tienes conversaciones. Pulsa <strong>Nuevo mensaje</strong> para empezar.
      </div>
    );
  return (
    <ul className="divide-y divide-border">
      {items.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn('flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50', selectedId === c.id && 'bg-primary/5')}
            aria-current={selectedId === c.id}
          >
            <Initials name={c.counterpart.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={cn('truncate text-sm', c.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>{c.counterpart.name}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{shortWhen(c.lastMessageAt)}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {c.counterpart.roleLabel} · {c.student.name}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className={cn('truncate text-xs', c.unread ? 'text-foreground' : 'text-muted-foreground')}>{c.lastMessageText ?? 'Sin mensajes todavía'}</p>
                {c.unread > 0 && (
                  <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground" aria-label={`${c.unread} sin leer`}>
                    {c.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
};

const ChatPanel: React.FC<{ conversationId: string; onBack: () => void }> = ({ conversationId, onBack }) => {
  const { data, isLoading } = useConversation(conversationId);
  const send = useSendMessage(conversationId);
  const markRead = useMarkConversationRead();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  // Marcar como leído al abrir y cada vez que llegan mensajes nuevos
  useEffect(() => {
    if (!data) return;
    if (data.messages.length !== lastCount.current) {
      lastCount.current = data.messages.length;
      bottomRef.current?.scrollIntoView({ block: 'end' });
      markRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.messages.length, conversationId]);

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
    for (const m of data?.messages ?? []) {
      const raw = formatPeruDate(m.createdAt, { weekday: 'long', day: 'numeric', month: 'long' });
      const day = raw.charAt(0).toUpperCase() + raw.slice(1);
      if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, items: [] });
      groups[groups.length - 1].items.push(m);
    }
    return groups;
  }, [data?.messages]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Cargando" />
      </div>
    );
  }
  const { conversation } = data;
  const otherRead = conversation.otherLastReadAt ? new Date(conversation.otherLastReadAt) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Volver a la lista">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Initials name={conversation.counterpart.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{conversation.counterpart.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.counterpart.roleLabel} · sobre {conversation.student.name}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/20 px-3 py-4">
        {grouped.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Escribe el primer mensaje de esta conversación.</p>
        )}
        {grouped.map((g) => (
          <div key={g.day} className="space-y-1.5">
            <p className="text-center text-[11px] font-medium text-muted-foreground">{g.day}</p>
            {g.items.map((m) => (
              <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%]',
                    m.mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border border-border bg-card text-foreground',
                  )}
                >
                  {m.body}
                  <span className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', m.mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
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

      {conversation.officeHours && (
        <p className="flex items-center gap-1.5 border-t border-border px-3 pt-2 text-[11px] text-muted-foreground">
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
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={!text.trim() || send.isPending} aria-label="Enviar">
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c');
  const [newOpen, setNewOpen] = useState(false);
  const { data, isLoading, error } = useConversations();

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('c', id);
    else next.delete('c');
    setParams(next, { replace: !id });
  };

  if (error) {
    return <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="Mensajería no disponible" description={apiErrorMessage(error)} />;
  }

  return (
    <div className="-m-4 flex h-[calc(100dvh-4rem)] flex-col md:m-0 md:h-[calc(100dvh-8rem)]">
      <div className="flex min-h-0 flex-1 overflow-hidden border-border bg-card md:rounded-xl md:border">
        <aside className={cn('flex w-full flex-col border-r border-border md:w-80 lg:w-96', selectedId && 'hidden md:flex')}>
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
            <div>
              <h1 className="text-base font-semibold text-foreground">Mensajes</h1>
              <p className="text-[11px] text-muted-foreground">
                {user?.role === 'PARENT' ? 'Conversa con el tutor y los docentes de tus hijos' : 'Conversaciones privadas con las familias'}
              </p>
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setNewOpen(true)}>
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden /> Nuevo
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConversationList items={data} loading={isLoading} selectedId={selectedId} onSelect={select} />
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
      <NewConversationModal open={newOpen} onClose={() => setNewOpen(false)} onOpened={(id) => select(id)} />
    </div>
  );
};
