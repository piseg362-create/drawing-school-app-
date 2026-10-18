import sqlite3
import json

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

# Get ALL failed or pending messages
cursor.execute("SELECT id, variables FROM MessageQueue WHERE status IN ('FAILED', 'PENDING', 'PROCESSING')")
rows = cursor.fetchall()

for row in rows:
    id = row[0]
    try:
        variables = json.loads(row[1])
    except:
        variables = {}
        
    if 'components' in variables:
        comp = variables['components'][0]
        if comp['type'] == 'body':
            params = comp['parameters']
            # We want exactly 6 parameters: School, Name, Date, Instructor, Paid, Remaining
            if len(params) == 7:
                # Drop the last one
                comp['parameters'] = params[:6]
                cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(variables), id))
            else:
                new_params = [
                    {"type": "text", "text": "Driving School"},
                    {"type": "text", "text": "Student"},
                    {"type": "text", "text": "Date"},
                    {"type": "text", "text": "Instructor"},
                    {"type": "text", "text": "0"},
                    {"type": "text", "text": "0"}
                ]
                variables['components'][0]['parameters'] = new_params
                cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(variables), id))

conn.commit()
conn.close()
print("Fixed ALL messages to 6 params in DB Queue!")
