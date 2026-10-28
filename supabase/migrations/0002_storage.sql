-- Bucket privat untuk versi publikasi situs user. Disajikan lewat route /site-host dengan service role.
insert into storage.buckets (id, name, public, file_size_limit)
values ('sites', 'sites', false, 5242880)
on conflict (id) do nothing;
