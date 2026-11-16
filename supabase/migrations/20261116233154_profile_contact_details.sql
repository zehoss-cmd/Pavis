-- Optional personal details remain private under the existing owner-only profile policies.
alter table public.profiles
  add column phone text check (phone is null or (char_length(phone) <= 30 and phone = btrim(phone))),
  add column job_title text check (job_title is null or (char_length(job_title) <= 100 and job_title = btrim(job_title)));
grant insert (phone, job_title) on public.profiles to authenticated;
grant update (phone, job_title) on public.profiles to authenticated;
