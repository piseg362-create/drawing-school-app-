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
            # If it's 5 parameters, it's missing the two school names
            if len(params) == 5:
                new_params = [
                    {"type": "text", "text": "Driving School"},
                    params[0],
                    params[1],
                    params[2],
                    params[3],
                    params[4],
                    {"type": "text", "text": "Driving School"}
                ]
                variables['components'][0]['parameters'] = new_params
                cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(variables), id))
            elif len(params) != 7:
                # Just force it to 7
                new_params = [
                    {"type": "text", "text": "Driving School"},
                    {"type": "text", "text": "Student"},
                    {"type": "text", "text": "Date"},
                    {"type": "text", "text": "Instructor"},
                    {"type": "text", "text": "0"},
                    {"type": "text", "text": "0"},
                    {"type": "text", "text": "Driving School"}
                ]
                variables['components'][0]['parameters'] = new_params
                cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(variables), id))
            else:
                cursor.execute("UPDATE MessageQueue SET status = 'PENDING', attempts = 0 WHERE id = ?", (id,))
                
conn.commit()
conn.close()
print("Fixed ALL messages to 7 params in DB Queue!")
