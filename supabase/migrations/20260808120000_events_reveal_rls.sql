-- Falla di sicurezza: la tabella `events` era leggibile da OGNI membro dell'Hub.
-- La policy di SELECT era solo `is_hub_member(hub_id, auth.uid())`, senza alcuna condizione
-- di svelamento: un membro poteva aprire la console del browser, interrogare `events`, e
-- leggere titolo, luogo e destinatari di ogni sorpresa preparata per lui. La vista
-- `events_view` filtrava correttamente, ma una tabella non eredita la protezione della vista
-- che la interroga (la lezione di events_view, al contrario).
--
-- Correzione in due parti, che vanno INSIEME:
--
-- 1. Si restringe la SELECT su `events` alla stessa condizione della vista:
--    membro E can_see_event (svelato OPPURE nel pubblico OPPURE autore OPPURE owner).
--    Si riusa can_see_event: la stessa funzione autorevole della vista, col suo now() -
--    nessun confronto sul fuso reinventato.
--
-- 2. Con `security_invoker = on` la vista EREDITAVA la policy: la stretta avrebbe fatto
--    sparire le righe non svelate anche da `events_view`, cioe' le schede «DATI OSCURATI»
--    del calendario (il conto alla rovescia). Per proteggere la tabella E conservare i
--    segnaposto, `events_view` diventa `security_definer` e porta l'hub-scoping NEL CORPO
--    (`where is_hub_member`): prima quello scoping lo dava il security_invoker, ora lo da'
--    la clausola. Verificato in transazione: nessuna riga di altri Hub trapela.
--
-- Prove (impersonando i ruoli, in transazione con rollback):
--   destinatario escluso: events sorpresa 1 -> 0, titolo via vista = NULL, events_view 16 -> 16
--   autore / pubblico: invariati (vedono la sorpresa, con il titolo)
--   righe di altri Hub per un membro: 0

alter policy "events: membri leggono" on public.events using (
  public.is_hub_member(hub_id, auth.uid())
  and public.can_see_event(hub_id, reveal_at, created_by, reveal_visible_to, revealed_override, auth.uid())
);

create or replace view public.events_view with (security_invoker = off) as
  select
    e.id,
    e.hub_id,
    e.scheduled_at,
    e.reveal_at,
    e.revealed_override,
    case when public.can_see_event(e.hub_id, e.reveal_at, e.created_by, e.reveal_visible_to, e.revealed_override, auth.uid()) then e.title else null::text end as title,
    case when public.can_see_event(e.hub_id, e.reveal_at, e.created_by, e.reveal_visible_to, e.revealed_override, auth.uid()) then e.location else null::text end as location,
    case when public.can_see_event(e.hub_id, e.reveal_at, e.created_by, e.reveal_visible_to, e.revealed_override, auth.uid()) then e.created_by else null::uuid end as created_by,
    public.can_see_event(e.hub_id, e.reveal_at, e.created_by, e.reveal_visible_to, e.revealed_override, auth.uid()) as revealed,
    case when public.can_see_event(e.hub_id, e.reveal_at, e.created_by, e.reveal_visible_to, e.revealed_override, auth.uid()) then e.cover_url else null::text end as cover_url,
    case when public.can_see_event(e.hub_id, e.reveal_at, e.created_by, e.reveal_visible_to, e.revealed_override, auth.uid()) then e.categoria else null::text end as categoria
  from public.events e
  where public.is_hub_member(e.hub_id, auth.uid());
