import os
import re

file_path = 'renderer/component/tabs/OverviewTab.jsx'
if not os.path.exists(file_path): exit()

with open(file_path, 'r', encoding='utf-8') as f:
    jsx = f.read()

# Inject useTranslation
if 'useTranslation' not in jsx:
    jsx = re.sub(r'(import React.*?;)', r'\1\nimport { useTranslation } from "react-i18next";', jsx, count=1)

if 'const { t } = useTranslation();' not in jsx:
    jsx = re.sub(r'(export function \w+\(\) {\n)', r'\1  const { t } = useTranslation();\n', jsx)

reps = [
    ('Good morning, Admin!', '{t("Good morning, Admin!")}'),
    ('Here is what is happening at Elite Driving School today.', '{t("Here is what is happening today.")}'),
    ('Weekly Classes Activity', '{t("Weekly Classes Activity")}'),
    ("Today's Schedule", '{t("Today\'s Schedule")}'),
    ('Quick Shortcuts', '{t("Quick Shortcuts")}'),
    ('Upcoming Schedule', '{t("Upcoming Schedule")}'),
    ('Needs Attention', '{t("Needs Attention")}'),
]

for old, new in reps:
    jsx = jsx.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(jsx)

# Update i18n
i18n_path = 'renderer/lib/i18n.js'
with open(i18n_path, 'r', encoding='utf-8') as f:
    i18n = f.read()

new_en = """
      "Good morning, Admin!": "Good morning, Admin!",
      "Here is what is happening today.": "Here is what is happening today.",
      "Weekly Classes Activity": "Weekly Classes Activity",
      "Today's Schedule": "Today's Schedule",
      "Quick Shortcuts": "Quick Shortcuts",
      "Upcoming Schedule": "Upcoming Schedule",
      "Needs Attention": "Needs Attention",
"""

new_hi = """
      "Good morning, Admin!": "सुप्रभात, व्यवस्थापक!",
      "Here is what is happening today.": "यहाँ आज क्या हो रहा है।",
      "Weekly Classes Activity": "साप्ताहिक कक्षा गतिविधि",
      "Today's Schedule": "आज की अनुसूची",
      "Quick Shortcuts": "त्वरित शॉर्टकट",
      "Upcoming Schedule": "आगामी अनुसूची",
      "Needs Attention": "ध्यान देने की आवश्यकता",
"""

new_mr = """
      "Good morning, Admin!": "शुभ प्रभात, प्रशासक!",
      "Here is what is happening today.": "आज काय होत आहे ते येथे आहे.",
      "Weekly Classes Activity": "साप्ताहिक वर्ग क्रियाकलाप",
      "Today's Schedule": "आजचे वेळापत्रक",
      "Quick Shortcuts": "क्विक शॉर्टकट",
      "Upcoming Schedule": "आगामी वेळापत्रक",
      "Needs Attention": "लक्ष देण्याची गरज",
"""

i18n = i18n.replace('"PENDING": "PENDING",', '"PENDING": "PENDING",' + new_en)
i18n = i18n.replace('"PENDING": "लंबित",', '"PENDING": "लंबित",' + new_hi)
i18n = i18n.replace('"PENDING": "प्रलंबित",', '"PENDING": "प्रलंबित",' + new_mr)

with open(i18n_path, 'w', encoding='utf-8') as f:
    f.write(i18n)

print("Overview updated!")
