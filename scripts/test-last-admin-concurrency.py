#!/usr/bin/env python3
"""Exercise simultaneous administrator changes against disposable local Postgres only."""
import concurrent.futures
import os
import subprocess
import uuid

DB_COMMAND = ['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres']
env = {**os.environ, 'PGPASSWORD': 'postgres'}
org, admin_a, admin_b = (str(uuid.uuid4()) for _ in range(3))

def run(sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(DB_COMMAND, input=sql, capture_output=True, text=True, env=env, timeout=30, check=False)

setup = f"""
begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
('{admin_a}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','{admin_a}@example.invalid','',now(),now()),
('{admin_b}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','{admin_b}@example.invalid','',now(),now());
insert into public.organizations(id,name) values ('{org}','Concurrency test');
insert into public.organization_members(organization_id,user_id,role) values ('{org}','{admin_a}','admin'),('{org}','{admin_b}','admin');
commit;
"""
cleanup = f"""
begin;
delete from public.audit_logs where organization_id='{org}';
delete from public.organization_members where organization_id='{org}' and user_id in ('{admin_a}','{admin_b}');
delete from public.organizations where id='{org}' and name='Concurrency test';
delete from auth.users where id in ('{admin_a}','{admin_b}') and email in ('{admin_a}@example.invalid','{admin_b}@example.invalid');
commit;
"""

def demote(actor: str) -> subprocess.CompletedProcess[str]:
    return run(f"""begin;
set local statement_timeout='10s';
set local role authenticated;
select set_config('request.jwt.claim.sub','{actor}',true);
select public.set_organization_member('{org}','{actor}','viewer','active');
select pg_sleep(1);
commit;""")

try:
    created = run(setup)
    if created.returncode:
        raise RuntimeError(f'fixture creation failed: {created.stderr}')
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(demote, (admin_a, admin_b)))
    failures = [result for result in results if result.returncode]
    if len(failures) != 1 or 'at least one active admin required' not in failures[0].stderr:
        raise RuntimeError(f'expected one last-admin rejection: {[(r.returncode, r.stderr) for r in results]}')
    check = run(f"select count(*) from public.organization_members where organization_id='{org}' and role='admin' and status='active';")
    if check.returncode or check.stdout.strip() != '1':
        raise RuntimeError(f'last administrator invariant failed: {check.stdout} {check.stderr}')
    print('Concurrent administrator changes: one succeeds, one rejected, one active admin remains.')
finally:
    cleaned = run(cleanup)
    if cleaned.returncode:
        raise RuntimeError(f'test fixture cleanup failed: {cleaned.stderr}')
