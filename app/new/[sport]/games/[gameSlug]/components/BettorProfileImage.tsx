interface BettorProfileImageProps {
  imageUrl: string | null
  initials: string | null
  size?: number
}

export function BettorProfileImage({ imageUrl, initials, size = 32 }: BettorProfileImageProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Bettor"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(71, 85, 105, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        color: 'rgba(255, 255, 255, 0.8)',
        flexShrink: 0
      }}
    >
      {initials || '?'}
    </div>
  )
}

