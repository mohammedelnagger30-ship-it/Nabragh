import { useState } from 'react';
import { Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, Check } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface SocialShareProps {
  title: string;
  description?: string;
  url?: string;
  onShare?: (platform: string) => void;
}

export default function SocialShare({ title, description, url, onShare }: SocialShareProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = url || window.location.href;

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&t=${encodeURIComponent(title)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`,
  };

  const handleShare = (platform: string, shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=400');
    onShare?.(platform);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast('تم نسخ الرابط', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('فشل نسخ الرابط', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'undefined') {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        onShare?.('native');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast('فشل المشاركة', 'error');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {typeof navigator.share !== 'undefined' && (
        <button
          onClick={handleNativeShare}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          title="مشاركة"
        >
          <Share2 className="w-5 h-5" />
        </button>
      )}

      <button
        onClick={() => handleShare('facebook', shareUrls.facebook)}
        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        title="مشاركة على فيسبوك"
      >
        <Facebook className="w-5 h-5" />
      </button>

      <button
        onClick={() => handleShare('twitter', shareUrls.twitter)}
        className="p-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        title="مشاركة على تويتر"
      >
        <Twitter className="w-5 h-5" />
      </button>

      <button
        onClick={() => handleShare('linkedin', shareUrls.linkedin)}
        className="p-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
        title="مشاركة على لينكد إن"
      >
        <Linkedin className="w-5 h-5" />
      </button>

      <button
        onClick={() => handleShare('whatsapp', shareUrls.whatsapp)}
        className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
        title="مشاركة على واتساب"
      >
        <Share2 className="w-5 h-5" />
      </button>

      <button
        onClick={handleCopyLink}
        className={`p-2 rounded-lg transition-colors ${
          copied
            ? 'bg-green-600 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
        }`}
        title="نسخ الرابط"
      >
        {copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}
