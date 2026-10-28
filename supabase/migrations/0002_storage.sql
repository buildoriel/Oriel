-- Private bucket for published versions of user sites. Served through the /site-host route with the service role.
insert into storage.buckets (id, name, public, file_size_limit)
values ('sites', 'sites', false, 5242880)
on conflict (id) do nothing;
