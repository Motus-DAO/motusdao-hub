-- Revoke direct PostgREST/GraphQL access from anon and authenticated roles.
-- App uses Prisma with the postgres service role; catalog tables stay readable.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

GRANT SELECT ON TABLE public.courses TO anon, authenticated;
GRANT SELECT ON TABLE public.lessons TO anon, authenticated;
GRANT SELECT ON TABLE public.modules TO anon, authenticated;
