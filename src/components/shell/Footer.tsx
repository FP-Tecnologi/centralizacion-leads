/*
 * FPTecnologi-HUB · Dashboard — Footer.
 * Server component (no interactivity); uses next/link for nav.
 */
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="ax-footer">
      <div className="ax-footer__left">
        <span className="ax-footer__copy">© 2026 FPTecnologi</span>
        <span className="ax-footer__sep" aria-hidden="true">·</span>
        <span className="ax-footer__version ax-mono">v0.1.0</span>
      </div>
      <nav className="ax-footer__links" aria-label="Footer">
        <Link className="ax-footer__link" href="/pages/landing">Nosotros</Link>
        <Link className="ax-footer__link" href="/soporte">Soporte</Link>
        <Link className="ax-footer__link" href="/pages/terms">Términos</Link>
        <Link className="ax-footer__link" href="/pages/privacy">Privacidad</Link>
      </nav>
    </footer>
  );
}

export default Footer;
