/*
 * FPTecnologi-HUB · Dashboard — per-route <title> resolved from the nav manifest.
 *
 * The manifest is the single source of truth for page names, so acronym casing
 * ("CRM", "NFT Marketplace", "HR & Payroll") always matches the sidebar and
 * breadcrumb and can never drift. Because these are real Next `metadata`
 * exports, the title is rendered SERVER-SIDE — crawlers, link unfurls and the
 * initial paint all get the correct page name (a client-only document.title
 * would not do that).
 *
 * The root layout owns the "%s · FPTecnologi" template, so each page supplies only
 * the bare page name.
 */
import type { Metadata } from 'next';
import { manifest } from './manifest';

/** Bare page name for a manifest slug, alias-resolved, or null if unknown. */
export function titleForSlug(slug: string): string | null {
  const node = manifest.resolve(manifest.bySlug.get(slug));
  return node ? node.title : null;
}

/**
 * Metadata for a route. Returns an empty object for an unknown slug so the
 * root layout's default title is inherited rather than showing "undefined".
 */
export function metadataForSlug(slug: string): Metadata {
  const title = titleForSlug(slug);
  return title ? { title } : {};
}
