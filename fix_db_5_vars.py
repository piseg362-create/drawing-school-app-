import sqlite3
import json

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

# Get all pending/failed/processing
cursor.execute("SELECT id, variables FROM MessageQueue")
rows = cursor.fetchall()

for row in rows:
    id = row[0]
    try:
        variables = json.loads(row[1])
    except:
        continue
        
    if 'components' in variables:
        for comp in variables['components']:
            if comp['type'] == 'body':
                # The old 7-var or 6-var has School Name first, we want the middle 5.
                # Let's just grab the 5 from whatever is there.
                # The 7 params were: School, Name, Date, Instructor, Paid, Remaining, School
                if len(comp['parameters']) >= 5:
                    if comp['parameters'][0]['text'] == 'Driving School' or comp['parameters'][0]['text'] == 'Maruti drawing school':
                        # It's a 7 or 6 param array starting with school. Take 1 through 5.
                        comp['parameters'] = comp['parameters'][1:6]
                    elif len(comp['parameters']) > 5:
                        comp['parameters'] = comp['parameters'][:5]
                
        cursor.execute("UPDATE MessageQueue SET variables = ?, status = 'PENDING', attempts = 0 WHERE id = ?", (json.dumps(variables), id))

conn.commit()
conn.close()
print("Fixed DB Queue items to 5 params!")
