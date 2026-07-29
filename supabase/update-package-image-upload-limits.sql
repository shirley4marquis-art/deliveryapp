-- Apply this migration to existing projects to allow every image MIME type
-- while keeping non-image validation in the authenticated application route.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = null
where id = 'package-images';
