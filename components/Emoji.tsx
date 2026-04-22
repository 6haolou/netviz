export interface EmojiProps {
  label: string;
  className?: string;
}

export default function Emoji({ label, className = '' }: EmojiProps) {
  return (
    <span 
      className={`inline-block text-center ${className}`}
      style={{ 
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
        fontVariantEmoji: 'emoji'
      }}
    >
      {label}
    </span>
  );
}
