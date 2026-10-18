import re

path = 'main/server/controllers/student.controller/create.student.controller.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate where recipient: mobile is added
old_recipient = "recipient: mobile,"
# We will format the mobile number before creating the queue
format_mobile_logic = """
      // Ensure the mobile number has the country code for WhatsApp (default to 91 for India if exactly 10 digits)
      let formattedMobile = mobile;
      if (formattedMobile.length === 10) {
        formattedMobile = "91" + formattedMobile;
      }
      
      await tx.messageQueue.create({
        data: {
          templateId: template.id,
          recipient: formattedMobile,"""

old_queue_block = """      await tx.messageQueue.create({
        data: {
          templateId: template.id,
          recipient: mobile,"""

if old_queue_block in content:
    content = content.replace(old_queue_block, format_mobile_logic)
else:
    print("Could not find queue creation block!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated controller to format phone numbers!")
