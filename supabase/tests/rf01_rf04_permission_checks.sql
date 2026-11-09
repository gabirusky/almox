-- ALMOX T036 / RNF01 baseline permission checks (run as privileged SQL in test env)
-- These are reviewable assertions/snippets; automate with pgTAP or CI SQL harness when wired.

-- 1) Anonymous should have no table privileges beyond what PostgREST role mapping allows (RLS still applies).
-- Expect: selects/inserts fail or return no protected rows depending on role; direct table writes denied.

-- 2) Employee (authenticated, active profile, role=employee) can SELECT catalog, cannot mutate catalog.
-- set local role authenticated; set local request.jwt.claim.sub = '<employee-user-uuid>';
-- select count(*) from public.products; -- ok (subject to policy)
-- insert into public.categories(name) values ('X'); -- expect permission denied / RLS violation
-- select public.almox_create_product('S1','N',null,(select id from public.categories limit 1),'UN',0,null); -- expect FORBIDDEN

-- 3) Admin (active) can mutate catalog and execute admin RPC.
-- select public.almox_is_admin(); -- true
-- select public.almox_create_product('S1','N',null,(select id from public.categories where active limit 1),'UN',0,null); -- ok

-- 4) Inactive profile blocks protected access (policies check active profile).
-- update public.profiles set active=false where id='<uuid>'; then authenticated requests should see no/denied data.

-- 5) Audit immutability (T035)
-- update public.audit_events set action='X' where false; -- expect permission denied for authenticated
-- delete from public.audit_events where false; -- expect permission denied

-- 6) RNF04 smoke: after catalog mutation, audit_events row exists with actor/action/before/after.
-- select action, entity_type, actor_id, before_data is not null, after_data is not null, recorded_at
-- from public.audit_events order by recorded_at desc limit 10;
