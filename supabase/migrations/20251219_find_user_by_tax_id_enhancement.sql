-- Enhance find_user_by_tax_id RPC to expose richer business profile metadata
-- Covers postal address, legal form, and owner profile context for pre-KSeF workflows

set check_function_bodies = off;

create or replace function public.find_user_by_tax_id(tax_id_param text)
returns table (
  business_profile_id uuid,
  business_name text,
  entity_type text,
  legal_form text,
  address text,
  postal_code text,
  city text,
  full_address text,
  owner_user_id uuid,
  owner_full_name text,
  owner_email text,
  owner_phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      bp.id as business_profile_id,
      bp.name as business_name,
      bp.entity_type,
      bp.legal_form,
      bp.address,
      bp.postal_code,
      bp.city,
      trim(
        coalesce(bp.address, '') ||
        case when bp.address is not null and (bp.postal_code is not null or bp.city is not null) then ', ' else '' end ||
        coalesce(bp.postal_code, '') ||
        case when bp.postal_code is not null and bp.city is not null then ' ' else '' end ||
        coalesce(bp.city, '')
      ) as full_address,
      bp.user_id as owner_user_id,
      prof.full_name as owner_full_name,
      prof.email as owner_email,
      prof.phone_number as owner_phone
    from business_profiles bp
      left join profiles prof on prof.user_id = bp.user_id
    where bp.tax_id = tax_id_param
    order by bp.created_at desc;
end;
$$;

comment on function public.find_user_by_tax_id is
  'Fetch business profile ownership data by tax id (NIP) for pre-KSeF onboarding flows. Includes address, legal form, and owner contact information.';

-- Ensure the authenticated role can execute the function
revoke all on function public.find_user_by_tax_id(text) from public;
grant execute on function public.find_user_by_tax_id(text) to authenticated;
