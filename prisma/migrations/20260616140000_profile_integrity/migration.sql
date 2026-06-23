-- Backfill profiles for completed users missing a profiles row
INSERT INTO profiles (
  id,
  "userId",
  nombre,
  apellido,
  telefono,
  "fechaNacimiento",
  ciudad,
  pais,
  language,
  "createdAt",
  "updatedAt"
)
SELECT
  'profile_backfill_' || u.id,
  u.id,
  COALESCE(split_part(u.email, '@', 1), 'Usuario'),
  CASE WHEN u.role = 'admin' THEN 'Admin' ELSE 'MotusDAO' END,
  '+0000000000',
  '1990-01-01'::timestamp,
  'Por completar',
  'mexico',
  'es',
  NOW(),
  NOW()
FROM users u
WHERE u."registrationCompleted" = true
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p."userId" = u.id);

-- Enforce profile requirement for usuario/psm when registration is completed.
-- DEFERRABLE so onboarding can create user + profile in one transaction.
CREATE OR REPLACE FUNCTION check_user_profile_on_registration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."registrationCompleted" = true
     AND NEW.role IN ('usuario', 'psm')
     AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p."userId" = NEW.id)
  THEN
    RAISE EXCEPTION 'registrationCompleted requires a profiles row for role %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_require_profile_on_registration ON users;

CREATE CONSTRAINT TRIGGER users_require_profile_on_registration
  AFTER INSERT OR UPDATE OF "registrationCompleted", role ON users
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION check_user_profile_on_registration();
