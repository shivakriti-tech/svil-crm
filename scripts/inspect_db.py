import sqlite3

con = sqlite3.connect("dev.db")
cur = con.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'").fetchall()]
print("Tables in database:")
for t in tables:
    cnt = cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    print(f"  - {t}: {cnt} rows")

print("\nUsers in database:")
for u in cur.execute("SELECT id, email, name, role FROM User").fetchall():
    print("  ", u)
