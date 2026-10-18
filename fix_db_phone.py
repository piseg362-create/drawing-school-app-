import sqlite3

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

cursor.execute("SELECT id, recipient FROM MessageQueue WHERE recipient = '9130452737' ORDER BY createdAt DESC LIMIT 1")
row = cursor.fetchone()

if row:
    id = row[0]
    # Update to 919130452737 and reset status
    cursor.execute("UPDATE MessageQueue SET recipient = '919130452737', status = 'PENDING', attempts = 0 WHERE id = ?", (id,))
    conn.commit()
    print("Fixed queue item phone number!")
else:
    print("Not found")

conn.close()
