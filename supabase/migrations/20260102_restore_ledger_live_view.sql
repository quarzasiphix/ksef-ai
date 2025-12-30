-- Restore compatibility view for unified ledger queries
-- Ensures frontend hooks (useAggregatedLedger) keep working while
-- the developer ledger system evolves.

create or replace view public.ledger_live as
select
  e.id,
  e.business_profile_id,
  e.event_type,
  e.event_number,
  e.occurred_at,
  e.recorded_at,
  e.amount,
  e.currency,
  e.direction,
  e.cash_channel,
  e.posted,
  e.needs_action,
  e.status,
  e.decision_id,
  e.decision_reference,
  e.blocked_by,
  e.blocked_reason,
  e.source,
  e.classification,
  e.category,
  e.vat_rate,
  e.actor_id,
  e.actor_name,
  e.actor_role,
  e.entity_type,
  e.entity_id,
  e.entity_reference,
  e.document_type,
  e.document_id,
  e.document_number,
  e.counterparty,
  e.linked_documents,
  e.action_summary,
  e.changes,
  e.metadata,
  e.parent_event_id,
  e.is_material,
  e.created_at,
  e.updated_at,
  d.decision_number,
  d.title as decision_title,
  bp.name as business_name
from public.events e
left join public.decisions d on d.id = e.decision_id
left join public.business_profiles bp on bp.id = e.business_profile_id
where e.posted = true
order by e.occurred_at desc, e.recorded_at desc;
