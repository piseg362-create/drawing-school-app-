import sqlite3
import json

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

cursor.execute("SELECT id, variables FROM MessageQueue")
rows = cursor.fetchall()

for row in rows:
    id = row[0]
    try:
        variables = json.loads(row[1])
    except:
        variables = {}
        
    # We want to force it to have components with 6 elements
    new_params = [
        {"type": "text", "text": "Driving School"},
        {"type": "text", "text": variables.get("username", variables.get("studentName", "Student"))},
        {"type": "text", "text": variables.get("course_start_date", "Soon")},
        {"type": "text", "text": variables.get("instructor_name", "Assigned Instructor")},
        {"type": "text", "text": variables.get("paid_amount", "0")},
        {"type": "text", "text": variables.get("remaining_amount", "0")}
    ]
    
    new_vars = {
        "components": [
            {
                "type": "body",
                "parameters": new_params
            }
        ]
    }
    
    cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(new_vars), id))

conn.commit()
conn.close()
print("Fixed absolutely ALL messages to 6 params in DB Queue!")
