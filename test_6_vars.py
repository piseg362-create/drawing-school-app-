import sqlite3
import json

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

cursor.execute("SELECT id, variables FROM MessageQueue WHERE status IN ('PENDING', 'PROCESSING') OR lastError LIKE '%132000%'")
rows = cursor.fetchall()

for row in rows:
    id = row[0]
    try:
        variables = json.loads(row[1])
    except:
        continue
        
    if 'components' in variables:
        # Check if it has 7 params in body
        for comp in variables['components']:
            if comp['type'] == 'body' and len(comp['parameters']) == 7:
                # Remove the 7th parameter (assume it was a duplicate school name)
                comp['parameters'] = comp['parameters'][:6]
                
        cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(variables), id))

conn.commit()
conn.close()
print("Fixed variables to 6 parameters!")
