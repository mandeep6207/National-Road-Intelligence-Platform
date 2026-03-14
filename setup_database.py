"""
NRIP Database Setup Script
Creates PostgreSQL database, user, and applies schema.
Run: python setup_database.py
"""
import subprocess
import sys
import os

COLORS = {
    "green": "\033[92m", "red": "\033[91m",
    "yellow": "\033[93m", "blue": "\033[94m",
    "bold": "\033[1m", "reset": "\033[0m",
}

def ok(msg):   print(f"  \033[92m✅ {msg}\033[0m")
def err(msg):  print(f"  \033[91m❌ {msg}\033[0m")
def info(msg): print(f"  \033[94mℹ️  {msg}\033[0m")

print("\n\033[1m\033[94m" + "="*60)
print("  NRIP Database Setup")
print("="*60 + "\033[0m\n")

# Check psql availability
try:
    result = subprocess.run(["psql", "--version"], capture_output=True, text=True, timeout=5)
    ok(f"PostgreSQL client: {result.stdout.strip()}")
except FileNotFoundError:
    err("psql not found. Install PostgreSQL from https://www.postgresql.org")
    sys.exit(1)
except Exception as e:
    err(f"psql error: {e}")

# Check asyncpg/psycopg2 availability
try:
    import asyncpg
    ok("asyncpg driver available")
except ImportError:
    info("asyncpg not installed — run: pip install asyncpg")

try:
    import psycopg2
    ok("psycopg2 driver available")
except ImportError:
    info("psycopg2 not installed — run: pip install psycopg2-binary")

# Run SQL commands using psql
print("\n  Creating database and user...")

# Step 1: Create user and database
setup_sql = """
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'nrip_user') THEN
    CREATE USER nrip_user WITH PASSWORD 'nrip_password';
  END IF;
END
$$;

CREATE DATABASE nrip_db OWNER nrip_user;
GRANT ALL PRIVILEGES ON DATABASE nrip_db TO nrip_user;
"""

# Write temp SQL file
with open("_setup_temp.sql", "w") as f:
    f.write(setup_sql)

try:
    # Try connecting as postgres superuser
    result = subprocess.run(
        ["psql", "-U", "postgres", "-f", "_setup_temp.sql"],
        capture_output=True, text=True, timeout=15
    )
    if result.returncode == 0:
        ok("Database 'nrip_db' and user 'nrip_user' created")
    else:
        info(f"Note: {result.stderr.strip()[:200]}")
        info("You may need to create the DB manually (see below)")
except Exception as e:
    info(f"Auto-setup: {e}")
finally:
    if os.path.exists("_setup_temp.sql"):
        os.remove("_setup_temp.sql")

# Step 2: Apply schema
schema_path = os.path.join(os.path.dirname(__file__), "database", "migrations", "001_initial_schema.sql")
if os.path.exists(schema_path):
    print("\n  Applying database schema...")
    try:
        result = subprocess.run(
            ["psql", "-U", "nrip_user", "-d", "nrip_db", "-f", schema_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            ok("Schema applied successfully — all tables, enums, indexes created")
            ok("Demo seed data inserted (admin, government, citizen users)")
        else:
            err(f"Schema error: {result.stderr[:300]}")
    except Exception as e:
        err(f"Schema apply failed: {e}")
else:
    err(f"Schema file not found: {schema_path}")

print(f"""
  {'='*58}
  Manual setup (if auto-setup failed):

  1. Open pgAdmin or psql as postgres superuser:

     CREATE USER nrip_user WITH PASSWORD 'nrip_password';
     CREATE DATABASE nrip_db OWNER nrip_user;
     GRANT ALL ON DATABASE nrip_db TO nrip_user;

  2. Apply schema:

     \\c nrip_db
     \\i database/migrations/001_initial_schema.sql

  3. Demo login credentials after seeding:
     admin@nrip.gov.in     / Admin@1234  (super_admin)
     authority@nh.gov.in   / Admin@1234  (government)
     contractor@roads.com  / Admin@1234  (contractor)
     citizen@example.com   / Admin@1234  (citizen)
     auditor@nrip.gov.in   / Admin@1234  (auditor)
  {'='*58}
""")
