import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface ConversationSummary {
  id: string;
  student: { id: string; name: string };
  counterpart: { id: string; name: string; roleLabel: string };
  lastMessageAt: string;
  lastMessageText: string | null;
  unread: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface ConversationDetail {
  conversation: {
    id: string;
    student: { id: string; name: string };
    counterpart: { id: string; name: string; roleLabel: string; isActive: boolean };
    otherLastReadAt: string | null;
    officeHours: { start: string; end: string } | null;
  };
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface StaffContact {
  id: string;
  name: string;
  roleLabel: string;
  subjects?: string[];
  isTutor?: boolean;
}

export type ContactsResponse =
  | { kind: 'PARENT'; children: Array<{ student: { id: string; name: string }; contacts: StaffContact[] }> }
  | { kind: 'STAFF'; students: Array<{ student: { id: string; name: string; classroom: string }; contacts: StaffContact[] }> };

const KEY = ['messages'];

export const useConversations = () =>
  useQuery({
    queryKey: [...KEY, 'conversations'],
    queryFn: async () => (await api.get<{ data: ConversationSummary[] }>('/messages/conversations')).data.data,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

export const useUnreadMessages = (enabled = true) =>
  useQuery({
    queryKey: [...KEY, 'unread'],
    enabled,
    queryFn: async () => (await api.get<{ data: { count: number } }>('/messages/unread-count')).data.data.count,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

export const useConversation = (id: string | null) =>
  useQuery({
    queryKey: [...KEY, 'conversation', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<{ data: ConversationDetail }>(`/messages/conversations/${id}/messages`)).data.data,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

export const useMessageContacts = (search: string, enabled: boolean) =>
  useQuery({
    queryKey: [...KEY, 'contacts', search],
    enabled,
    queryFn: async () =>
      (await api.get<{ data: ContactsResponse }>('/messages/contacts', { params: search ? { search } : {} })).data.data,
  });

export const useOpenConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: string; counterpartId: string }) =>
      (await api.post<{ data: { id: string } }>('/messages/conversations', input)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'conversations'] }),
  });
};

export const useSendMessage = (conversationId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      (
        await api.post<{ data: { message: ChatMessage; outsideHours: boolean } }>(
          `/messages/conversations/${conversationId}/messages`,
          { body },
        )
      ).data.data,
    onSuccess: (res) => {
      qc.setQueryData<ConversationDetail>([...KEY, 'conversation', conversationId], (old) =>
        old ? { ...old, messages: [...old.messages, res.message] } : old,
      );
      qc.invalidateQueries({ queryKey: [...KEY, 'conversations'] });
    },
  });
};

export const useMarkConversationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => (await api.post(`/messages/conversations/${conversationId}/read`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'conversations'] });
      qc.invalidateQueries({ queryKey: [...KEY, 'unread'] });
    },
  });
};
