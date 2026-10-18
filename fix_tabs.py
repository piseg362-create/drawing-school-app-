import os

tabs = {
    'renderer/component/tabs/VehiclesTab.jsx': [
        ('<span>Vehicle Model</span>', '<span>{t("Vehicle Model")}</span>'),
        ('<TableHead>License Plate</TableHead>', '<TableHead>{t("License Plate")}</TableHead>'),
        ('<TableHead>Transmission</TableHead>', '<TableHead>{t("Transmission")}</TableHead>'),
        ('<TableHead>Current Mileage</TableHead>', '<TableHead>{t("Current Mileage")}</TableHead>'),
        ('<TableHead>Assigned To</TableHead>', '<TableHead>{t("Assigned To")}</TableHead>'),
        ('placeholder="Search vehicles..."', 'placeholder={t("Search vehicles...")}'),
    ],
    'renderer/component/tabs/InstructorsTab.jsx': [
        ('<span>Instructor</span>', '<span>{t("Instructor")}</span>'),
        ('<TableHead>Contact</TableHead>', '<TableHead>{t("Contact")}</TableHead>'),
        ('<TableHead>Students</TableHead>', '<TableHead>{t("Students")}</TableHead>'),
        ('<TableHead>Payment</TableHead>', '<TableHead>{t("Payment")}</TableHead>'),
        ('<TableHead>Joined At</TableHead>', '<TableHead>{t("Joined At")}</TableHead>'),
        ('placeholder="Search instructors..."', 'placeholder={t("Search instructors...")}'),
        ('<span>+ Add Instructor</span>', '<span>+ {t("Add Instructor")}</span>'),
    ],
    'renderer/component/tabs/PackagesTab.jsx': [
        ('Active Packages', '{t("Active Packages")}'),
        ('Package Catalog', '{t("Package Catalog")}'),
    ],
    'renderer/component/tabs/ScheduleTab.jsx': [
        ('placeholder="Search schedule..."', 'placeholder={t("Search schedule...")}'),
        ('<span>+ Schedule Class</span>', '<span>+ {t("Schedule Class")}</span>'),
    ]
}

for file_path, replacements in tabs.items():
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Update i18n
i18n_path = 'renderer/lib/i18n.js'
with open(i18n_path, 'r', encoding='utf-8') as f:
    i18n = f.read()

new_en = """
      "Vehicle Model": "Vehicle Model",
      "License Plate": "License Plate",
      "Transmission": "Transmission",
      "Current Mileage": "Current Mileage",
      "Assigned To": "Assigned To",
      "Contact": "Contact",
      "Students": "Students",
      "Payment": "Payment",
      "Joined At": "Joined At",
"""

new_hi = """
      "Vehicle Model": "वाहन मॉडल",
      "License Plate": "लाइसेंस प्लेट",
      "Transmission": "ट्रांसमिशन",
      "Current Mileage": "वर्तमान माइलेज",
      "Assigned To": "को सौंपा गया",
      "Contact": "संपर्क",
      "Students": "छात्र",
      "Payment": "भुगतान",
      "Joined At": "को शामिल हुए",
"""

new_mr = """
      "Vehicle Model": "वाहन मॉडेल",
      "License Plate": "लायसन्स प्लेट",
      "Transmission": "ट्रान्समिशन",
      "Current Mileage": "सध्याचे मायलेज",
      "Assigned To": "ला नियुक्त केले",
      "Contact": "संपर्क",
      "Students": "विद्यार्थी",
      "Payment": "पेमेंट",
      "Joined At": "रोजी सामील झाले",
"""

i18n = i18n.replace('"PENDING": "PENDING",', '"PENDING": "PENDING",' + new_en)
i18n = i18n.replace('"PENDING": "लंबित",', '"PENDING": "लंबित",' + new_hi)
i18n = i18n.replace('"PENDING": "प्रलंबित",', '"PENDING": "प्रलंबित",' + new_mr)

with open(i18n_path, 'w', encoding='utf-8') as f:
    f.write(i18n)

print("Done fixing tabs and i18n!")
