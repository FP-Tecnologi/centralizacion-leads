'use client';
/*
 * Sistema de Leads — estado compartido de fuentes (landing/offline) para el
 * Sidebar: un único fetch por tipo, cacheado a nivel de módulo, con
 * refrescarFuentes() para invalidar tras crear/duplicar/renombrar una fuente
 * desde FuentesLista o GestionarFuente. ponytail: store módulo + listeners en
 * vez de un state manager — solo dos listas a mantener sincronizadas.
 */
import { useEffect, useState } from 'react';
import { listarFuentes, type Fuente } from '../lib/leads/datos';

type Tipo = 'landing' | 'offline';

const estado: Record<Tipo, Fuente[]> = { landing: [], offline: [] };
const cargado: Record<Tipo, boolean> = { landing: false, offline: false };
const listeners = new Set<() => void>();

function emitir() {
  listeners.forEach((l) => l());
}

async function cargar(tipo: Tipo) {
  try {
    estado[tipo] = await listarFuentes(tipo);
  } catch {
    estado[tipo] = [];
  }
  cargado[tipo] = true;
  emitir();
}

export function refrescarFuentes(tipo?: Tipo) {
  if (tipo) cargar(tipo);
  else {
    cargar('landing');
    cargar('offline');
  }
}

export function useFuentesMenu(tipo: Tipo): Fuente[] {
  const [, forzar] = useState(0);
  useEffect(() => {
    const l = () => forzar((n) => n + 1);
    listeners.add(l);
    if (!cargado[tipo]) cargar(tipo);
    return () => { listeners.delete(l); };
  }, [tipo]);
  return estado[tipo];
}
