import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn(async (..._args: unknown[]) => ({}));
vi.mock('@/lib/axios', () => ({ api: { post: (...a: unknown[]) => post(...a) } }));
const clearOfflineData = vi.fn(async (..._args: unknown[]) => undefined);
const countPendingOffline = vi.fn(async (..._args: unknown[]) => 0);
vi.mock('../../lib/offlineData', () => ({
  clearOfflineData: (...a: unknown[]) => clearOfflineData(...a),
  countPendingOffline: (...a: unknown[]) => countPendingOffline(...a),
}));
vi.mock('../../lib/queryClient', () => ({ queryClient: { clear: vi.fn() } }));

const teacher = { id: 'u1', email: 'a@b.pe', role: 'TEACHER' as const, firstName: 'A', lastNamePaternal: 'B', schoolId: 's1' };

describe('sesión (useAuthStore)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    post.mockClear();
    clearOfflineData.mockClear();
  });

  it('un usuario guardado corrupto no rompe el arranque de la app', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', '{no es json');
    const { useAuthStore } = await import('../useAuthStore');
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('cerrar sesión revoca el token en el servidor y borra los datos del dispositivo', async () => {
    const { useAuthStore } = await import('../useAuthStore');
    useAuthStore.getState().setAuth('token-1', teacher);
    await useAuthStore.getState().signOut();
    expect(post).toHaveBeenCalledWith('/auth/logout', undefined, expect.objectContaining({ timeout: 5000 }));
    expect(clearOfflineData).toHaveBeenCalledWith({ includePending: true });
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('sin conexión igual cierra la sesión en el dispositivo', async () => {
    post.mockRejectedValueOnce(new Error('sin red'));
    const { useAuthStore } = await import('../useAuthStore');
    useAuthStore.getState().setAuth('token-2', teacher);
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('un cierre forzado (sesión vencida) conserva los pendientes del dueño y no llama al servidor', async () => {
    const { useAuthStore } = await import('../useAuthStore');
    useAuthStore.getState().setAuth('token-3', teacher);
    useAuthStore.getState().logout();
    expect(clearOfflineData).toHaveBeenCalledWith({ includePending: false });
    expect(post).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
