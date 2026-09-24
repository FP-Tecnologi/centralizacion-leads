/*
 * FPTecnologi-HUB — avatar real: la foto de Google si el usuario entró por
 * ahí, si no las iniciales sobre el color de marca. Nunca un avatar de
 * stock inventado (pravatar.cc mostraba la misma cara de mentira para
 * cualquier cuenta).
 */
function initials(nombre?: string | null, email?: string | null): string {
  const source = nombre?.trim() || email || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function Avatar({
  nombre, email, avatarUrl, size = 32, className,
}: {
  nombre?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={avatarUrl} alt={nombre || email || 'Cuenta'} width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        inlineSize: size, blockSize: size, borderRadius: '50%',
        background: 'var(--ax-accent-wash)', color: 'var(--ax-accent)',
        fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
      }}
    >
      {initials(nombre, email)}
    </span>
  );
}

export default Avatar;
