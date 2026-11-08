-- Optional descriptive fields; existing records remain unchanged.
alter table public.patent_assets
  add column publication_number text check (publication_number is null or (char_length(btrim(publication_number)) between 1 and 100 and publication_number = btrim(publication_number))),
  add column registration_number text check (registration_number is null or (char_length(btrim(registration_number)) between 1 and 100 and registration_number = btrim(registration_number))),
  add column rights_holder text check (rights_holder is null or (char_length(btrim(rights_holder)) between 1 and 500 and rights_holder = btrim(rights_holder))),
  add column inventors text check (inventors is null or (char_length(btrim(inventors)) between 1 and 500 and inventors = btrim(inventors)));
grant insert (publication_number, registration_number, rights_holder, inventors) on public.patent_assets to authenticated;
grant update (publication_number, registration_number, rights_holder, inventors) on public.patent_assets to authenticated;
