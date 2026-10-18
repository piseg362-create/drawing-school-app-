import re

path = 'main/server/controllers/student.controller/create.student.controller.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_components = """            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: schoolName },
                  { type: "text", text: name },
                  { type: "text", text: formattedDate },
                  { type: "text", text: instructorName },
                  { type: "text", text: amountPaid.toString() },
                  { type: "text", text: payment_remaining.toString() },
                  { type: "text", text: schoolName },
                ]
              }
            ]"""

new_components = """            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: schoolName },
                  { type: "text", text: name },
                  { type: "text", text: formattedDate },
                  { type: "text", text: instructorName },
                  { type: "text", text: amountPaid.toString() },
                  { type: "text", text: payment_remaining.toString() },
                ]
              }
            ]"""

if old_components in content:
    content = content.replace(old_components, new_components)
else:
    print("Could not find 7-param component block!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated controller to use 6 parameters!")
