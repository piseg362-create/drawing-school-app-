import sqlite3
import json

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

cursor.execute("SELECT id, variables FROM MessageQueue WHERE status = 'PENDING'")
rows = cursor.fetchall()

for row in rows:
    id = row[0]
    variables = json.loads(row[1])
    if 'components' not in variables:
        new_vars = {
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Maruti drawing school"},
                        {"type": "text", "text": variables.get("username", "Student")},
                        {"type": "text", "text": variables.get("course_start_date", "Unknown")},
                        {"type": "text", "text": variables.get("instructor_name", "Instructor")},
                        {"type": "text", "text": variables.get("paid_amount", "0")},
                        {"type": "text", "text": variables.get("remaining_amount", "0")},
                        {"type": "text", "text": "Maruti drawing school"}
                    ]
                }
            ]
        }
        cursor.execute("UPDATE MessageQueue SET variables = ? WHERE id = ?", (json.dumps(new_vars), id))

conn.commit()
conn.close()
print("Fixed DB Queue items!")
