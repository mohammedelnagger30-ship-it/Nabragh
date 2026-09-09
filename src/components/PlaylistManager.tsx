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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden p-4">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">قوائم التشغيل</h3>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            قائمة جديدة
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreatePlaylist} className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="space-y-3">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="اسم القائمة"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <textarea
              value={newPlaylistDescription}
              onChange={(e) => setNewPlaylistDescription(e.target.value)}
              placeholder="وصف القائمة (اختياري)"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating || !newPlaylistName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <ListPlus className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p>لا توجد قوائم تشغيل</p>
            <p className="text-sm mt-1">أنشئ قائمة جديدة لحفظ الفيديوهات المفضلة</p>
          </div>
        ) : (
          playlists.map((playlist) => (
            <div key={playlist.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">
                      {playlist.name}
                    </h4>
                    {playlist.is_public ? (
                      <Globe className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  {playlist.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {playlist.playlist_videos?.length || 0} فيديو
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {videoId && (
                    <button
                      onClick={() => addVideoToPlaylist(playlist.id)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="إضافة الفيديو"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletePlaylist(playlist.id)}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="حذف القائمة"
                  >
                    <Trash2 className="w-4 h-4" />
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
