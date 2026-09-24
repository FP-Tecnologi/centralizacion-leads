/*
 * FPTecnologi-HUB · Dashboard — (shell) route-group layout.
 *
 * Every route in this group renders inside the Aurora app shell. The shell
 * (sidebar / header / footer / customizer / command palette / loader) is the
 * client <Layout> component; the routed page arrives as `children` where the
 * reference put its <Outlet/>. Pages add their own <PageHead> at the top.
 *
 * To make a page render WITHOUT the shell (e.g. auth / error / landing screens
 * when they are ported), put it in a different route group, NOT under (shell).
 */
import type { ReactNode } from 'react';
import { Layout } from '../../src/components/shell/Layout';

/* ponytail: RequireAuth (apps/web) importa el AuthContext viejo que no
   copiamos — pass-through temporal. Task 8 escribe el RequireAuth real
   (Supabase + aal2) y lo vuelve a envolver aquí. */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}
