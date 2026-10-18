const fs = require('fs');

const path = 'renderer/lib/i18n.js';
let content = fs.readFileSync(path, 'utf8');

const newEn = `
      // Additional Tabs
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
      "Add New Package": "Add New Package",
      "Search schedule...": "Search schedule...",
      "Schedule Class": "Schedule Class",
      "Student": "Student",
      "Instructor": "Instructor",
      "Vehicle": "Vehicle",
      "Date & Time": "Date & Time",
`;

const newHi = `
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
      "Add New Package": "नया पैकेज जोड़ें",
      "Search schedule...": "अनुसूची खोजें...",
      "Schedule Class": "क्लास शेड्यूल करें",
      "Student": "छात्र",
      "Instructor": "प्रशिक्षक",
      "Vehicle": "वाहन",
      "Date & Time": "दिनांक और समय",
`;

const newMr = `
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
      "Add New Package": "नवीन पॅकेज जोडा",
      "Search schedule...": "वेळापत्रक शोधा...",
      "Schedule Class": "क्लास शेड्यूल करा",
      "Student": "विद्यार्थी",
      "Instructor": "प्रशिक्षक",
      "Vehicle": "वाहन",
      "Date & Time": "तारीख आणि वेळ",
`;

content = content.replace(/"PENDING": "PENDING"/, '"PENDING": "PENDING",' + newEn);
content = content.replace(/"PENDING": "लंबित"/, '"PENDING": "लंबित",' + newHi);
content = content.replace(/"PENDING": "प्रलंबित"/, '"PENDING": "प्रलंबित",' + newMr);

fs.writeFileSync(path, content);
console.log("Updated i18n.js with all terms.");
