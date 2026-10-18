import re

path = 'main/worker/messageWorker.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """    const data = await response.json();

    console.log("📡 Meta API Response Status:", response.status);
    if (!response.ok) {"""

new_block = """    const data = await response.json();

    console.log("📡 Meta API Response Status:", response.status);
    console.log("📥 Raw Meta Response:", JSON.stringify(data, null, 2));
    
    if (!response.ok) {"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated worker logging!")
else:
    print("Could not find the block to replace!")
