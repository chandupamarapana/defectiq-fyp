# backend/database.py
import psycopg2
import psycopg2.extras
import json
from datetime import datetime
from config import DATABASE_URL


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def get_cursor(conn):
    # RealDictCursor lets you access columns by name: row['username']
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


# ── Users ─────────────────────────────────────

def find_user_by_username(username):
    conn = get_db()
    cur = get_cursor(conn)
    cur.execute('SELECT * FROM users WHERE username = %s', (username,))
    user = cur.fetchone()
    conn.close()
    return user


def create_user(username, password_hash, full_name, profession, factory_name):
    conn = get_db()
    cur = get_cursor(conn)
    # Check duplicate
    cur.execute('SELECT id FROM users WHERE username = %s', (username,))
    if cur.fetchone():
        conn.close()
        return None, 'Username already taken'
    # Insert
    cur.execute('''
        INSERT INTO users (username, password, full_name, profession, factory_name, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    ''', (username, password_hash, full_name, profession, factory_name,
          datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
    new_id = cur.fetchone()['id']
    conn.commit()
    conn.close()
    return new_id, None


# ── Inspections ───────────────────────────────

def log_inspection(user_id, verdict, defects, confidences,
                   co_occurrence, top_filename=None, side_filename=None):
    conn = get_db()
    cur = get_cursor(conn)
    cur.execute('''
        INSERT INTO inspections
        (user_id, timestamp, verdict, defects, confidences,
         co_occurrence, top_view_filename, side_view_filename)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        user_id,
        datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        verdict,
        json.dumps(defects),
        json.dumps(confidences),
        json.dumps(co_occurrence),
        top_filename,
        side_filename,
    ))
    conn.commit()
    conn.close()


def get_history(user_id, limit=50, date_from=None, date_to=None):
    conn = get_db()
    cur = get_cursor(conn)
    query = '''SELECT id, timestamp, verdict, defects, confidences, co_occurrence
                FROM inspections WHERE user_id = %s'''
    params = [user_id]
    if date_from:
        query += ' AND DATE(timestamp) >= %s'
        params.append(date_from)
    if date_to:
        query += ' AND DATE(timestamp) <= %s'
        params.append(date_to)
    query += ' ORDER BY id DESC LIMIT %s'
    params.append(limit)
    cur.execute(query, params)
    rows = cur.fetchall()
    print(f"[get_history] user_id={user_id} rows={len(rows)}")  # debug
    conn.close()
    return [{
        'id':            row['id'],
        'timestamp':     row['timestamp'],
        'verdict':       row['verdict'],
        'defects':       json.loads(row['defects']),
        'confidences':   json.loads(row['confidences']),
        'co_occurrence': json.loads(row['co_occurrence']),
    } for row in rows]


def get_stats(user_id, date_from=None, date_to=None):
    conn = get_db()
    cur = get_cursor(conn)
    params = [user_id]
    where = 'WHERE user_id = %s'
    if date_from:
        where += ' AND DATE(timestamp) >= %s'
        params.append(date_from)
    if date_to:
        where += ' AND DATE(timestamp) <= %s'
        params.append(date_to)

    cur.execute(f'SELECT COUNT(*) as c FROM inspections {where}', params)
    total = cur.fetchone()['c']

    cur.execute(
        f"SELECT COUNT(*) as c FROM inspections {where} AND verdict='PASS'", params)
    passed = cur.fetchone()['c']

    cur.execute(
        f"SELECT COUNT(*) as c FROM inspections {where} AND verdict='REVIEW'", params)
    review = cur.fetchone()['c']

    cur.execute(f'SELECT defects FROM inspections {where}', params)
    freq = {}
    for row in cur.fetchall():
        for d in json.loads(row['defects']):
            freq[d] = freq.get(d, 0) + 1

    # Daily trend — last 30 days
    trend_params = params + []
    cur.execute(f'''
        SELECT DATE(timestamp) as day, verdict, COUNT(*) as cnt
        FROM inspections {where}
        GROUP BY DATE(timestamp), verdict
        ORDER BY DATE(timestamp)
    ''', trend_params)
    daily = {}
    for row in cur.fetchall():
        d = str(row['day'])
        if d not in daily:
            daily[d] = {'PASS': 0, 'REVIEW': 0}
        daily[d][row['verdict']] = row['cnt']

    conn.close()
    return {
        'total':    total,
        'passed':   passed,
        'failed':   0,
        'review':   review,
        'pass_rate': round(passed / total * 100, 1) if total > 0 else 0,
        'defect_frequency': freq,
        'daily_trend': [{'date': d, **v} for d, v in sorted(daily.items())],
    }
