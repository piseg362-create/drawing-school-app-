import re
import os

# 1. Update i18n.js
i18n_path = 'renderer/lib/i18n.js'
with open(i18n_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_en = """
      "Search instructors...": "Search instructors...",
      "Add Instructor": "Add Instructor",
      "Instructor Name": "Instructor Name",
      "Assigned Vehicle": "Assigned Vehicle",
      "Not Assigned": "Not Assigned",
      "Search vehicles...": "Search vehicles...",
      "Add Vehicle": "Add Vehicle",
      "Vehicle Name": "Vehicle Name",
      "Type / Transmission": "Type / Transmission",
      "Registration No.": "Registration No.",
      "Status": "Status",
      "Active Packages": "Active Packages",
      "Package Catalog": "Package Catalog",
      "Price": "Price",
      "Duration (Days)": "Duration (Days)",
      "Add Package": "Add Package",
      "Add New Package": "Add New Package",
      "Search schedule...": "Search schedule...",
      "Schedule Class": "Schedule Class",
      "Student": "Student",
      "Instructor": "Instructor",
      "Vehicle": "Vehicle",
      "Date & Time": "Date & Time",
      "No Active Packages": "No Active Packages",
      "Class Date": "Class Date"
"""

new_hi = """
      "Search instructors...": "प्रशिक्षकों को खोजें...",
      "Add Instructor": "प्रशिक्षक जोड़ें",
      "Instructor Name": "प्रशिक्षक का नाम",
      "Assigned Vehicle": "सौंपा गया वाहन",
      "Not Assigned": "सौंपा नहीं गया",
      "Search vehicles...": "वाहन खोजें...",
      "Add Vehicle": "वाहन जोड़ें",
      "Vehicle Name": "वाहन का नाम",
      "Type / Transmission": "प्रकार / ट्रांसमिशन",
      "Registration No.": "पंजीकरण संख्या",
      "Status": "स्थिति",
      "Active Packages": "सक्रिय पैकेज",
      "Package Catalog": "पैकेज कैटलॉग",
      "Price": "कीमत",
      "Duration (Days)": "अवधि (दिन)",
      "Add Package": "पैकेज जोड़ें",
      "Add New Package": "नया पैकेज जोड़ें",
      "Search schedule...": "अनुसूची खोजें...",
      "Schedule Class": "क्लास शेड्यूल करें",
      "Student": "छात्र",
      "Instructor": "प्रशिक्षक",
      "Vehicle": "वाहन",
      "Date & Time": "दिनांक और समय",
      "No Active Packages": "कोई सक्रिय पैकेज नहीं",
      "Class Date": "कक्षा की तिथि"
"""

new_mr = """
      "Search instructors...": "प्रशिक्षक शोधा...",
      "Add Instructor": "प्रशिक्षक जोडा",
      "Instructor Name": "प्रशिक्षकाचे नाव",
      "Assigned Vehicle": "नियुक्त केलेले वाहन",
      "Not Assigned": "नियुक्त केलेले नाही",
      "Search vehicles...": "वाहने शोधा...",
      "Add Vehicle": "वाहन जोडा",
      "Vehicle Name": "वाहनाचे नाव",
      "Type / Transmission": "प्रकार / ट्रान्समिशन",
      "Registration No.": "नोंदणी क्रमांक",
      "Status": "स्थिती",
      "Active Packages": "सक्रिय पॅकेजेस",
      "Package Catalog": "पॅकेज कॅटलॉग",
      "Price": "किंमत",
      "Duration (Days)": "कालावधी (दिवस)",
      "Add Package": "पॅकेज जोडा",
      "Add New Package": "नवीन पॅकेज जोडा",
      "Search schedule...": "वेळापत्रक शोधा...",
      "Schedule Class": "क्लास शेड्यूल करा",
      "Student": "विद्यार्थी",
      "Instructor": "प्रशिक्षक",
      "Vehicle": "वाहन",
      "Date & Time": "तारीख आणि वेळ",
      "No Active Packages": "कोणतेही सक्रिय पॅकेज नाही",
      "Class Date": "क्लासची तारीख"
"""

content = content.replace('"PENDING": "PENDING"', '"PENDING": "PENDING",' + new_en)
content = content.replace('"PENDING": "लंबित"', '"PENDING": "लंबित",' + new_hi)
content = content.replace('"PENDING": "प्रलंबित"', '"PENDING": "प्रलंबित",' + new_mr)

with open(i18n_path, 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Update JSX files
def update_jsx(file_path):
    if not os.path.exists(file_path): return
    with open(file_path, 'r', encoding='utf-8') as f:
        jsx = f.read()
    
    # Inject useTranslation if missing
    if 'useTranslation' not in jsx:
        jsx = re.sub(r'(import React.*?;)', r'\1\nimport { useTranslation } from "react-i18next";', jsx, count=1)
    
    if 'const { t } = useTranslation();' not in jsx:
        jsx = re.sub(r'(export function \w+\(\) {\n)', r'\1  const { t } = useTranslation();\n', jsx)
    
    # Common replacements
    replace_pairs = [
        (r'placeholder="Search (.*?)\.\.\."', r'placeholder={t("Search \1...")}'),
        (r'<span>\+ Add (.*?)</span>', r'<span>+ {t("Add \1")}</span>'),
        (r'<TableHead>Instructor Name</TableHead>', r'<TableHead>{t("Instructor Name")}</TableHead>'),
        (r'<TableHead>Assigned Vehicle</TableHead>', r'<TableHead>{t("Assigned Vehicle")}</TableHead>'),
        (r'<TableHead>Status</TableHead>', r'<TableHead>{t("Status")}</TableHead>'),
        (r'<TableHead>Actions</TableHead>', r'<TableHead>{t("Actions")}</TableHead>'),
        (r'<TableHead>Vehicle Name</TableHead>', r'<TableHead>{t("Vehicle Name")}</TableHead>'),
        (r'<TableHead>Type \/ Transmission</TableHead>', r'<TableHead>{t("Type / Transmission")}</TableHead>'),
        (r'<TableHead>Registration No\.</TableHead>', r'<TableHead>{t("Registration No.")}</TableHead>'),
        (r'<TableHead className="text-right">Actions</TableHead>', r'<TableHead className="text-right">{t("Actions")}</TableHead>'),
        (r'<TableHead>Package Name</TableHead>', r'<TableHead>{t("Package Info")}</TableHead>'),
        (r'<TableHead className="text-gray-500 dark:text-\[\#a8967b\] font-semibold">Package Name</TableHead>', r'<TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Package Info")}</TableHead>'),
        (r'<TableHead className="text-gray-500 dark:text-\[\#a8967b\] font-semibold">Price</TableHead>', r'<TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Price")}</TableHead>'),
        (r'<TableHead className="text-gray-500 dark:text-\[\#a8967b\] font-semibold">Duration \(Days\)</TableHead>', r'<TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Duration (Days)")}</TableHead>'),
        (r'<TableHead className="text-gray-500 dark:text-\[\#a8967b\] font-semibold">Status</TableHead>', r'<TableHead className="text-gray-500 dark:text-[#a8967b] font-semibold">{t("Status")}</TableHead>'),
        (r'<TableHead>Student</TableHead>', r'<TableHead>{t("Student")}</TableHead>'),
        (r'<TableHead>Instructor</TableHead>', r'<TableHead>{t("Instructor")}</TableHead>'),
        (r'<TableHead>Vehicle</TableHead>', r'<TableHead>{t("Vehicle")}</TableHead>'),
        (r'<TableHead>Date & Time</TableHead>', r'<TableHead>{t("Date & Time")}</TableHead>'),
        (r'<p className="text-sm font-medium text-gray-500 dark:text-\[\#8a8d96\] mb-1">Active Packages</p>', r'<p className="text-sm font-medium text-gray-500 dark:text-[#8a8d96] mb-1">{t("Active Packages")}</p>'),
        (r'<h2 className="text-lg font-bold text-gray-900 dark:text-\[\#f2e9de\]">Package Catalog</h2>', r'<h2 className="text-lg font-bold text-gray-900 dark:text-[#f2e9de]">{t("Package Catalog")}</h2>'),
        (r'>\+ Add Package<', r'>+ {t("Add Package")}<'),
        (r'<DialogTitle className="text-xl font-bold text-gray-900 dark:text-\[\#f2e9de\]">\s*Add New Package\s*</DialogTitle>', r'<DialogTitle className="text-xl font-bold text-gray-900 dark:text-[#f2e9de]">{t("Add New Package")}</DialogTitle>'),
        (r'>\+ Schedule Class<', r'>+ {t("Schedule Class")}<'),
    ]
    
    for old, new in replace_pairs:
        jsx = re.sub(old, new, jsx)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(jsx)

tabs = [
    'renderer/component/tabs/InstructorsTab.jsx',
    'renderer/component/tabs/VehiclesTab.jsx',
    'renderer/component/tabs/PackagesTab.jsx',
    'renderer/component/tabs/ScheduleTab.jsx',
]

for t in tabs:
    update_jsx(t)

print("Done updating tabs!")
