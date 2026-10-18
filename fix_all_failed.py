import sqlite3
import json

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

# Get ALL failed or pending messages
cursor.execute("SELECT id, variables FROM MessageQueue WHERE status IN ('FAILED', 'PENDING')")
rows = cursor.fetchall()

for row in rows:
    id = row[0]
    try:
        variables = json.loads(row[1])
    except:
        variables = {}
        
    if 'components' not in variables:
        new_vars = {
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Driving School"},
                        {"type": "text", "text": variables.get("username", "Student")},
                        {"type": "text", "text": variables.get("course_start_date", "Soon")},
                        {"type": "text", "text": variables.get("instructor_name", "Assigned Instructor")},
                        {"type": "text", "text": variables.get("paid_amount", "0")},
                        {"type": "text", "text": variables.get("remaining_amount", "0")},
                        {"type": "text", "text": "Driving School"}
                    ]
                }
            ]
        }
        cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(new_vars), id))
    else:
        cursor.execute("UPDATE MessageQueue SET status = 'PENDING', attempts = 0 WHERE id = ?", (id,))

conn.commit()
conn.close()
print("Fixed ALL failed messages in DB Queue!")
