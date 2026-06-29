'use client'

import { videoEmbedUrl } from '@/lib/academy/markdown'

export function VideoEmbed({ url, title = 'Video' }: { url: string; title?: string }) {
  const embed = videoEmbedUrl(url)
  if (!embed) {
    return (
      <div className="overflow-hidden rounded-lg border border-white/10">
        <video src={url} controls className="w-full" preload="metadata">
          <track kind="captions" />
        </video>
      </div>
    )
  }

  if (embed.type === 'iframe') {
    return (
      <div className="aspect-video overflow-hidden rounded-lg border border-white/10">
        <iframe
          src={embed.src}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <video src={embed.src} controls className="w-full" preload="metadata">
        <track kind="captions" />
      </video>
    </div>
  )
}
