import os
import re

tabs = {
    'renderer/component/tabs/SettingsTab.jsx': [
        ('Settings', '{t("Settings")}'),
        ('General configuration', '{t("General configuration")}'),
        ('Save Changes', '{t("Save Changes")}'),
        ('placeholder="Enter school name"', 'placeholder={t("Enter school name")}'),
    ],
    'renderer/component/tabs/MessagesTab.jsx': [
        ('Messages', '{t("Messages")}'),
        ('placeholder="Search messages..."', 'placeholder={t("Search messages...")}'),
    ],
    'renderer/component/tabs/WhatsAppTab.jsx': [
        ('WhatsApp Setup', '{t("WhatsApp Setup")}'),
        ('Connect your WhatsApp Business API', '{t("Connect your WhatsApp Business API")}'),
        ('Connect WhatsApp', '{t("Connect WhatsApp")}'),
    ]
}

for file_path, replacements in tabs.items():
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Inject useTranslation
    if 'useTranslation' not in content:
        content = re.sub(r'(import React.*?;)', r'\1\nimport { useTranslation } from "react-i18next";', content, count=1)

    if 'const { t } = useTranslation();' not in content:
        content = re.sub(r'(export function \w+\(\) {\n)', r'\1  const { t } = useTranslation();\n', content)
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Update i18n
i18n_path = 'renderer/lib/i18n.js'
with open(i18n_path, 'r', encoding='utf-8') as f:
    i18n = f.read()

new_en = """
      "General configuration": "General configuration",
      "Save Changes": "Save Changes",
      "Enter school name": "Enter school name",
      "Search messages...": "Search messages...",
      "Connect your WhatsApp Business API": "Connect your WhatsApp Business API",
      "Connect WhatsApp": "Connect WhatsApp",
"""

new_hi = """
      "General configuration": "सामान्य विन्यास",
      "Save Changes": "परिवर्तन सहेजें",
      "Enter school name": "स्कूल का नाम दर्ज करें",
      "Search messages...": "संदेश खोजें...",
      "Connect your WhatsApp Business API": "अपना व्हाट्सएप बिजनेस एपीआई कनेक्ट करें",
      "Connect WhatsApp": "व्हाट्सएप कनेक्ट करें",
"""

new_mr = """
      "General configuration": "सामान्य कॉन्फिगरेशन",
      "Save Changes": "बदल जतन करा",
      "Enter school name": "शाळेचे नाव प्रविष्ट करा",
      "Search messages...": "संदेश शोधा...",
      "Connect your WhatsApp Business API": "तुमचा व्हॉट्सॲप बिझनेस एपीआय कनेक्ट करा",
      "Connect WhatsApp": "व्हॉट्सॲप कनेक्ट करा",
"""

i18n = i18n.replace('"PENDING": "PENDING",', '"PENDING": "PENDING",' + new_en)
i18n = i18n.replace('"PENDING": "लंबित",', '"PENDING": "लंबित",' + new_hi)
i18n = i18n.replace('"PENDING": "प्रलंबित",', '"PENDING": "प्रलंबित",' + new_mr)

with open(i18n_path, 'w', encoding='utf-8') as f:
    f.write(i18n)

print("Rest of tabs updated!")
