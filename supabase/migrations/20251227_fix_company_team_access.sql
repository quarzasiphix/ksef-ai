-- Update company_members policies so that owners can still view/manage
-- members even though there is no FK relationship in the schema cache.
alter policy "Users can view members of their business profiles"
on public.company_members
using (
  business_profile_id in (
    select bp.id
    from public.business_profiles bp
    left join public.company_members cm_owner
      on cm_owner.business_profile_id = bp.id
     and cm_owner.user_id = auth.uid()
    where bp.user_id = auth.uid() or cm_owner.id is not null
  )
);

alter policy "Business owners can manage members"
on public.company_members
using (
  business_profile_id in (
    select bp.id
    from public.business_profiles bp
    where bp.user_id = auth.uid()
  )
);

-- Update invitation policies to avoid relying on auth.users join.
alter policy "Company owners can view invites"
on public.company_invitations
using (
  business_profile_id in (
    select bp.id
    from public.business_profiles bp
    where bp.user_id = auth.uid()
  )
);

alter policy "Company owners can manage invites"
on public.company_invitations
using (
  business_profile_id in (
    select bp.id
    from public.business_profiles bp
    where bp.user_id = auth.uid()
  )
);
