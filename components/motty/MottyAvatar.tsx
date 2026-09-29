'use client'

type MottyAvatarProps = {
  size: number
  className?: string
}

export function MottyAvatar({ size, className = '' }: MottyAvatarProps) {
  return (
    <picture>
      <source
        srcSet="/motty/motty-still.png"
        media="(prefers-reduced-motion: reduce)"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/motty/motty.gif"
        alt=""
        width={size}
        height={size}
        className={`pointer-events-none select-none object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    </picture>
  )
}
