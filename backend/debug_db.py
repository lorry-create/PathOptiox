"""临时调试脚本：检查数据库表结构"""
import sqlite3

conn = sqlite3.connect('pathoptix.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables:', tables)
for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {t[0]}")
    print(f"{t[0]}: {cursor.fetchone()[0]} rows")
conn.close()
