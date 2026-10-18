import sqlite3

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

# Get the most recently sent message
cursor.execute("SELECT id FROM MessageQueue WHERE status = 'SENT' ORDER BY createdAt DESC LIMIT 1")
row = cursor.fetchone()

if row:
    id = row[0]
    cursor.execute("UPDATE MessageQueue SET status = 'PENDING', attempts = 0 WHERE id = ?", (id,))
    conn.commit()
    print("Re-queued the most recent test message!")
else:
    print("No recent message found.")

conn.close()
