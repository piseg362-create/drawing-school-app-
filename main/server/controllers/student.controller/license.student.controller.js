import prisma from "../../config/database.js";

const TEMPLATE_BODIES = {
  en: "Driving License Test Schedule Notification\n\nHello {{1}},\n\nYour RTO Driving License Test has been scheduled by {{2}}.\n\nTest Date: {{3}}\nReporting Time: {{4}}\nLocation / Track: {{5}}\nDocuments Required: {{6}}\n\nPlease reach 15 minutes before your scheduled time. Drive safely and all the best!\n\nRegards,\n{{2}} Team.",
  mr: "ड्रायव्हिंग लायसन्स चाचणी सूचना\n\nनमस्कार {{1}},\n\nआपली आरटीओ ड्रायव्हिंग लायसन्स चाचणी {{2}} द्वारे निश्चित करण्यात आली आहे.\n\nचाचणी तारीख: {{3}}\nउपस्थित राहण्याची वेळ: {{4}}\nठिकाण / आरटीओ ग्राउंड: {{5}}\nआवश्यक कागदपत्रे: {{6}}\n\nकृपया दिलेल्या वेळेच्या १५ मिनिटे आधी उपस्थित राहावे. परीक्षेसाठी मनःपूर्वक शुभेच्छा!\n\nआपली,\n{{2}} टीम.",
  hi: "ड्राइविंग लाइसेंस टेस्ट सूचना\n\nनमस्ते {{1}},\n\nआपका आरटीओ ड्राइविंग लाइसेंस टेस्ट {{2}} द्वारा निर्धारित किया गया है।\n\nटेस्ट की तारीख: {{3}}\nउपस्थिति का समय: {{4}}\nस्थान / आरटीओ ग्राउंड: {{5}}\nआवश्यक दस्तावेज: {{6}}\n\nकृपया निर्धारित समय से १५ मिनट पहले पहुंचे। शुभकामनाएं!\n\nधन्यवाद,\n{{2}} टीम।",
  kn: "ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್ ಪರೀಕ್ಷೆಯ ಮಾಹಿತಿ\n\nನಮಸ್ಕಾರ {{1}},\n\nನಿಮ್ಮ ಆರ್‌ಟಿಒ ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್ ಪರೀಕ್ಷೆಯನ್ನು {{2}} ವತಿಯಿಂದ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ.\n\nಪರೀಕ್ಷಾ ದಿನಾಂಕ: {{3}}\nಹಾಜರಾತಿ ಸಮಯ: {{4}}\nಸ್ಥಳ: {{5}}\nದಾಖಲೆಗಳು: {{6}}\n\nದಯವಿಟ್ಟು ನಿಗದಿತ ಸಮಯಕ್ಕಿಂತ ೧೫ ನಿಮಿಷ ಮುಂಚಿತವಾಗಿ ಹಾಜರಾಗಿ. ಶುಭ ಹಾರೈಕೆಗಳು!\n\nಧನ್ಯವಾದಗಳು,\n{{2}} ತಂಡ.",
  te: "డ్రైవింగ్ లైసెన్స్ టెస్ట్ షెడ్యూల్ సమాచారం\n\nనమస్కారం {{1}},\n\nమీ ఆర్టీఓ డ్రైవింగ్ లైసెన్స్ టెస్ట్ {{2}} ద్వారా షెడ్యూల్ చేయబడింది.\n\nటెస్ట్ తేదీ: {{3}}\nహాజరు కావాల్సిన సమయం: {{4}}\nపరీక్షా కేంద్రం / ఆర్టీఓ: {{5}}\nఅవసరమైన పత్రాలు: {{6}}\n\nదయచేసి నిర్ణీత సమయానికి 15 నిమిషాల ముందుగా చేరుకోండి. ఆల్ ది బెస్ట్!\n\nధన్యవాదాలు,\n{{2}} బృందం.",
  ta: "ஓட்டுநர் உரிமத் தேர்வு அறிவிப்பு\n\nவணக்கம் {{1}},\n\nஉங்கள் ஆர்டிஓ ஓட்டுநர் உரிமத் தேர்வு {{2}} மூலம் திட்டமிடப்பட்டுள்ளது.\n\nதேர்வு தேதி: {{3}}\nவருகை நேரம்: {{4}}\nஇடம்: {{5}}\nதேவையான ஆவணங்கள்: {{6}}\n\nதயவுசெய்து குறிப்பிட்ட நேரத்திற்கு 15 நிமிடங்களுக்கு முன்பே வரவும். வாழ்த்துக்கள்!\n\nநன்றி,\n{{2}} குழு.",
};

export async function sendLicenseTestSchedule(req, res) {
  try {
    const { id } = req.params;
    const {
      testDate,
      testTime = "10:00 AM",
      location = "RTO Driving Track",
      documents = "Original Learning License (LL), Aadhaar Card",
      language,
      notes,
    } = req.body;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        instructor: true,
        car: true,
      },
    });

    if (!student) {
      return res.status(404).json({ status: false, message: "Student not found" });
    }

    // 1. Fetch School Information
    const schoolSetup = await prisma.schoolSetUp.findFirst();
    const schoolName = schoolSetup?.school_name || "Driving School";

    // 2. Format Test Date
    let parsedDate = testDate ? new Date(testDate) : new Date();
    if (isNaN(parsedDate.getTime())) parsedDate = new Date();
    const formattedDate = parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }); // e.g. "25 Oct 2026"

    // 3. Update Student record with License Test Details
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        licenseTestDate: parsedDate,
        licenseTestTime: testTime,
        licenseTestLocation: location,
        licenseTestStatus: "SCHEDULED",
      },
    });

    // 4. Resolve Preferred Language
    const tokenRecord = await prisma.whatsAppToken.findFirst();
    const preferredLang = language || tokenRecord?.defaultLanguage || "mr";

    // 5. Ensure Template exists in database
    let template = await prisma.whatsAppTemplate.findFirst({
      where: {
        name: "license_test",
        language: preferredLang,
      },
    });

    if (!template) {
      template = await prisma.whatsAppTemplate.findFirst({
        where: { name: "license_test" },
      });
    }

    const templateBody = TEMPLATE_BODIES[preferredLang] || TEMPLATE_BODIES.en;

    if (!template) {
      template = await prisma.whatsAppTemplate.create({
        data: {
          name: "license_test",
          templateId: "license_test",
          language: preferredLang,
          category: "UTILITY",
          status: "APPROVED",
          body: templateBody,
          variables: [],
        },
      });
    }

    // 6. Format recipient mobile with 91 if 10 digits
    let formattedMobile = String(student.mobile || "").replace(/\D/g, "");
    if (formattedMobile.length === 10) {
      formattedMobile = "91" + formattedMobile;
    }

    // 7. Prepare Meta Positional Parameters (6 parameters)
    const parameters = [
      { type: "text", text: String(student.name || "Student") },
      { type: "text", text: String(schoolName) },
      { type: "text", text: String(formattedDate) },
      { type: "text", text: String(testTime || "10:00 AM") },
      { type: "text", text: String(location || "RTO Driving Track") },
      { type: "text", text: String(documents || "Original Learning License, Aadhaar Card") },
    ];

    // 8. Queue Message
    const queuedMessage = await prisma.messageQueue.create({
      data: {
        templateId: template.id,
        recipient: formattedMobile,
        status: "PENDING",
        variables: {
          components: [
            {
              type: "body",
              parameters,
            },
          ],
        },
      },
    });

    // 9. Generate direct WhatsApp Web/App fallback URL
    let plainTextMessage = templateBody
      .replace("{{1}}", student.name)
      .replace(/\{\{2\}\}/g, schoolName)
      .replace("{{3}}", formattedDate)
      .replace("{{4}}", testTime)
      .replace("{{5}}", location)
      .replace("{{6}}", documents);

    if (notes) {
      plainTextMessage += `\n\n*Note:* ${notes}`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedMobile}&text=${encodeURIComponent(
      plainTextMessage
    )}`;

    return res.status(200).json({
      status: true,
      message: "License test schedule notification queued successfully",
      data: {
        student: updatedStudent,
        messageId: queuedMessage.id,
        formattedDate,
        testTime,
        location,
        recipient: formattedMobile,
        whatsappUrl,
        plainTextMessage,
      },
    });
  } catch (error) {
    console.error("Error sending license test schedule:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to send license test schedule notification",
    });
  }
}

export async function updateLicenseTestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, testDate, testTime, location } = req.body;

    const dataToUpdate = {};
    if (status) dataToUpdate.licenseTestStatus = status;
    if (testDate) dataToUpdate.licenseTestDate = new Date(testDate);
    if (testTime) dataToUpdate.licenseTestTime = testTime;
    if (location) dataToUpdate.licenseTestLocation = location;

    const updated = await prisma.student.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.status(200).json({
      status: true,
      message: "License test status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating license test status:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to update license test status",
    });
  }
}
