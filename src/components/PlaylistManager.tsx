import { useState, useEffect, useCallback } from 'react';
import { ListPlus, Plus, Trash2, Lock, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Playlist } from '@/types';

interface PlaylistManagerProps {
  videoId?: string;
  onAddToPlaylist?: (playlistId: string) => void;
}

export default function PlaylistManager({ videoId, onAddToPlaylist }: PlaylistManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('playlists')
        .select('*, playlist_videos(*)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      setPlaylists((data as Playlist[]) ?? []);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim() || null,
          student_id: user?.id,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      setPlaylists(prev => [data as Playlist, ...prev]);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateForm(false);
      toast('تم إنشاء قائمة التشغيل بنجاح', 'success');

      // If videoId is provided, add video to the new playlist
      if (videoId) {
        await addVideoToPlaylist(data.id);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast('حدث خطأ أثناء إنشاء قائمة التشغيل', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const addVideoToPlaylist = async (playlistId: string) => {
    if (!videoId) return;

    try {
      // Check if video is already in playlist
      const { data: existing } = await supabase
        .from('playlist_videos')
        .select('*')
        .eq('playlist_id', playlistId)
        .eq('video_id', videoId)
        .single();

      if (existing) {
        toast('الفيديو موجود بالفعل في هذه القائمة', 'info');
        return;
      }

      // Get current max order
      const { data: maxOrder } = await supabase
        .from('playlist_videos')
        .select('sort_order')
        .eq('playlist_id', playlistId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const newOrder = (maxOrder?.sort_order ?? 0) + 1;

      const { error } = await supabase
        .from('playlist_videos')
        .insert({
          playlist_id: playlistId,
          video_id: videoId,
          sort_order: newOrder,
        });

      if (error) throw error;

      toast('تمت إضافة الفيديو إلى قائمة التشغيل', 'success');
      onAddToPlaylist?.(playlistId);
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      toast('حدث خطأ أثناء إضافة الفيديو', 'error');
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القائمة؟')) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      toast('تم حذف قائمة التشغيل', 'success');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast('حدث خطأ أثناء حذف القائمة', 'error');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <ListPlus className="h-5 w-5 text-blue-400" />
          <h3 className="font-bold text-white">قوائم التشغيل</h3>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          قائمة جديدة
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreatePlaylist} className="space-y-3 border-b border-slate-800 bg-slate-950/60 px-5 py-4">
          <input
            type="text"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="اسم القائمة"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
            autoFocus
          />
          <textarea
            value={newPlaylistDescription}
            onChange={(e) => setNewPlaylistDescription(e.target.value)}
            placeholder="وصف القائمة (اختياري)"
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isCreating || !newPlaylistName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="max-h-96 divide-y divide-slate-800 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <ListPlus className="mx-auto mb-3 h-12 w-12 text-slate-700" />
            <p className="font-medium text-slate-400">لا توجد قوائم تشغيل</p>
            <p className="mt-1 text-sm">أنشئ قائمة جديدة لحفظ الفيديوهات المفضلة</p>
          </div>
        ) : (
          playlists.map((playlist) => (
            <div key={playlist.id} className="px-5 py-4 transition hover:bg-slate-800/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="truncate font-medium text-white">
                      {playlist.name}
                    </h4>
                    {playlist.is_public ? (
                      <Globe className="h-4 w-4 shrink-0 text-slate-500" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                  </div>
                  {playlist.description && (
                    <p className="line-clamp-2 text-sm text-slate-400">
                      {playlist.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {playlist.playlist_videos?.length || 0} فيديو
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {videoId && (
                    <button
                      onClick={() => addVideoToPlaylist(playlist.id)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-600/20 hover:text-blue-300"
                      title="إضافة الفيديو"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletePlaylist(playlist.id)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-600/20 hover:text-red-400"
                    title="حذف القائمة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}