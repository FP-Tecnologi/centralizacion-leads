-- Eliminar un lead es ahora una acción explícita de usuario (solo admin, RLS
-- `leads_del` ya lo exige). Al borrar un principal, sus duplicados (mismo
-- email en la misma fuente) son la misma persona: se borran con él en vez de
-- quedar huérfanos con un FK violado.
alter table public.leads drop constraint leads_duplicado_de_fkey;
alter table public.leads add constraint leads_duplicado_de_fkey
  foreign key (duplicado_de) references public.leads (id) on delete cascade;
