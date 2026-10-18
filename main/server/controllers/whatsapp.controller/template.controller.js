import prisma, { als } from "../../config/database.js";

export const getTemplates = async (req, res) => {
  try {
    let tokenRecord = await prisma.whatsAppToken.findFirst();
    if (!tokenRecord) {
      tokenRecord = await als.run('__BYPASS_TENANT__', () => prisma.whatsAppToken.findFirst());
    }
    if (!tokenRecord) {
      const localTemplates = await prisma.whatsAppTemplate.findMany();
      if (localTemplates && localTemplates.length > 0) {
        return res.status(200).json({ status: true, data: localTemplates });
      }
      return res.status(404).json({ status: false, message: "WhatsApp not configured" });
    }

    const { wabaId, accessToken } = tokenRecord;
    const API_VERSION = process.env.META_API_VERSION || "v20.0";
    
    // Fetch from Meta
    let metaTemplates = null;
    try {
      const url = `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      if (response.ok && data.data) {
        metaTemplates = data.data;
      }
    } catch (metaErr) {
      console.warn("Could not reach Meta API for templates, falling back to local database:", metaErr.message);
    }

    if (metaTemplates) {
      // Sync with local DB
      for (const t of metaTemplates) {
        try {
          const existing = await prisma.whatsAppTemplate.findFirst({
            where: { name: t.name, language: t.language }
          });
          if (existing) {
            await prisma.whatsAppTemplate.update({
              where: { id: existing.id },
              data: { status: t.status, category: t.category, templateId: t.id }
            });
          } else {
            await prisma.whatsAppTemplate.create({
              data: {
                name: t.name,
                language: t.language,
                category: t.category,
                status: t.status,
                templateId: t.id,
                body: t.components?.find(c => c.type === 'BODY')?.text || ""
              }
            });
          }
        } catch (syncErr) {
          console.warn(`Sync notice for template ${t.name} (${t.language}):`, syncErr.message);
        }
      }
const DEFAULT_TEMPLATES = [
  {
    name: "onboarding",
    templateId: "onboarding",
    language: "en",
    category: "UTILITY",
    status: "APPROVED",
    body: "🎉 Welcome to {{1}}!\n\nHello {{2}}, your driving course enrollment has been successfully completed. 🚗\n\n📅 Course Start Date: {{3}}\n👨🏫 Instructor: {{4}}\n💰 Amount Paid: ₹{{5}}\n💳 Remaining Amount: ₹{{6}}\n\nWe’re happy to have you with us. Please be ready for your first driving session on the scheduled date.\n\nIf you have any questions, feel free to contact us.\n\nThank you for choosing {{7}}! 🙏"
  },
  {
    name: "onboarding",
    templateId: "onboarding",
    language: "mr",
    category: "UTILITY",
    status: "APPROVED",
    body: "🎉 {{1}} मध्ये आपले सहर्ष स्वागत आहे!\n\nनमस्कार {{2}}, आपला ड्रायव्हिंग कोर्स प्रवेश यशस्वीरित्या पूर्ण झाला आहे. 🚗\n\n📅 कोर्स सुरू होण्याची तारीख: {{3}}\n👨🏫 प्रशिक्षक: {{4}}\n💰 भरलेली रक्कम: ₹{{5}}\n💳 उर्वरित रक्कम: ₹{{6}}\n\nआपले आमच्यासोबत स्वागत आहे. कृपया ठरलेल्या तारखेला पहिल्या ड्रायव्हिंग सत्रासाठी तयार रहा.\n\nकाही शंका असल्यास आमच्याशी संपर्क साधा.\n\n{{7}} ची निवड केल्याबद्दल धन्यवाद! 🙏"
  },
  {
    name: "reminder",
    templateId: "reminder",
    language: "en",
    category: "UTILITY",
    status: "APPROVED",
    body: "Hello {{1}},\n\nThis is a friendly reminder from {{2}} regarding your pending payment.\n\n💰 Total Amount: ₹{{3}}\n✅ Amount Paid: ₹{{4}}\n⏳ Pending Amount: ₹{{5}}\n📅 Payment Due Date: {{6}}\n\nPlease complete the pending payment by the due date to continue your driving course without interruption.\n\nIf you have already made the payment, please ignore this message.\n\nThank you,\nThe {{2}} Team."
  },
  {
    name: "reminder",
    templateId: "reminder",
    language: "mr",
    category: "UTILITY",
    status: "APPROVED",
    body: "नमस्कार {{1}},\n\nहा {{2}} कडून आपल्या उर्वरित फी संदर्भातील आठवण संदेश आहे.\n\n💰 एकूण फी: ₹{{3}}\n✅ भरलेली रक्कम: ₹{{4}}\n⏳ उर्वरित रक्कम: ₹{{5}}\n📅 देय तारीख: {{6}}\n\nड्रायव्हिंग कोर्स अखंडित सुरू ठेवण्यासाठी कृपया देय तारखेपूर्वी उर्वरित रक्कम भरावी.\n\nआपण आधीच फी भरली असल्यास या संदेशाकडे दुर्लक्ष करावे.\n\nधन्यवाद,\n{{2}} टीम."
  },
  {
    name: "completion",
    templateId: "completion",
    language: "en",
    category: "UTILITY",
    status: "APPROVED",
    body: "Hello {{1}},\n\n🎉 Congratulations on completing your driving course with {{2}}!\n\nThis is a reminder that your course has been completed, but an outstanding payment of ₹{{3}} is still pending.\n\nPlease clear the remaining amount at your earliest convenience.\n\nThank you for choosing {{2}}. We wish you safe and confident driving! 🚗\n\nThe {{2}} Team."
  },
  {
    name: "completion",
    templateId: "completion",
    language: "mr",
    category: "UTILITY",
    status: "APPROVED",
    body: "नमस्कार {{1}},\n\n🎉 {{2}} सोबत आपला ड्रायव्हिंग कोर्स यशस्वीरित्या पूर्ण केल्याबद्दल मनःपूर्वक अभिनंदन!\n\nआपला कोर्स पूर्ण झाला आहे, परंतु ₹{{3}} ची उर्वरित रक्कम अजूनही बाकी आहे.\n\nकृपया लवकरात लवकर उर्वरित रक्कम भरून सहकार्य करावे.\n\n{{2}} ची निवड केल्याबद्दल धन्यवाद. आम्ही तुम्हाला सुरक्षित ड्रायव्हिंगसाठी शुभेच्छा देतो! 🚗\n\n{{2}} टीम."
  }
];

async function ensureDefaultTemplates() {
  try {
    const count = await prisma.whatsAppTemplate.count();
    if (count === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        await prisma.whatsAppTemplate.create({ data: t }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("Could not ensure default templates:", e.message);
  }
}

      const allLocal = await prisma.whatsAppTemplate.findMany();
      if (allLocal.length === 0) {
        await ensureDefaultTemplates();
        return res.status(200).json({ status: true, data: await prisma.whatsAppTemplate.findMany() });
      }
      return res.status(200).json({ status: true, data: allLocal });
    }

    // Fallback: return templates from local DB
    let localTemplates = await prisma.whatsAppTemplate.findMany();
    if (localTemplates.length === 0) {
      await ensureDefaultTemplates();
      localTemplates = await prisma.whatsAppTemplate.findMany();
    }
    return res.status(200).json({ status: true, data: localTemplates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    try {
      let localTemplates = await prisma.whatsAppTemplate.findMany();
      if (localTemplates.length === 0) {
        await ensureDefaultTemplates();
        localTemplates = await prisma.whatsAppTemplate.findMany();
      }
      return res.status(200).json({ status: true, data: localTemplates });
    } catch (fallbackErr) {
      return res.status(500).json({ status: false, message: "Internal server error" });
    }
  }
};

export const createTemplate = async (req, res) => {
  try {
    const { name, category, language, bodyText, headerText, footerText, buttons } = req.body;
    
    if (!name || !category || !language || !bodyText) {
      return res.status(400).json({ status: false, message: "Missing required fields" });
    }

    let tokenRecord = await prisma.whatsAppToken.findFirst();
    if (!tokenRecord) {
      tokenRecord = await als.run('__BYPASS_TENANT__', () => prisma.whatsAppToken.findFirst());
    }
    if (!tokenRecord) {
      return res.status(404).json({ status: false, message: "WhatsApp not configured" });
    }

    const { wabaId, accessToken } = tokenRecord;
    const API_VERSION = process.env.META_API_VERSION || "v20.0";
    
    const url = `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates`;
    
    // Auto-generate realistic examples for variables to prevent Meta from auto-rejecting
    const variableMatches = bodyText.match(/\{\{\d+\}\}/g);
    let exampleData = null;
    if (variableMatches && variableMatches.length > 0) {
      const maxVar = Math.max(...variableMatches.map(v => parseInt(v.replace(/[^0-9]/g, ''))));
      // Meta's NLP sometimes rejects "Sample 1", so we use realistic placeholder words
      const realisticWords = ["John Doe", "Monday", "ABC", "123", "Information"];
      const exampleArray = Array.from({ length: maxVar }, (_, i) => realisticWords[i % realisticWords.length]);
      exampleData = {
        body_text: [exampleArray]
      };
    }
    
    const components = [];
    if (headerText) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: headerText,
      });
    }
    components.push({
      type: "BODY",
      text: bodyText,
      ...(exampleData && { example: exampleData })
    });
    if (footerText) {
      components.push({
        type: "FOOTER",
        text: footerText,
      });
    }
    if (buttons && Array.isArray(buttons) && buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: buttons,
      });
    }

    const payload = {
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      language,
      category,
      components,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log("===============================");
    console.log("META TEMPLATE CREATION RESPONSE");
    console.log("===============================");
    console.dir(data, { depth: null });
    
    if (!response.ok) {
      const errorMsg = data.error?.message || "";
      const errorUserMsg = data.error?.error_user_msg || "";
      const errorCode = data.error?.code;
      const errorSubcode = data.error?.error_subcode;

      const isDuplicate =
        (errorCode === 100 && (errorMsg.toLowerCase().includes("already") || errorUserMsg.toLowerCase().includes("already") || errorMsg.toLowerCase().includes("duplicate") || errorSubcode === 2388043)) ||
        errorMsg.toLowerCase().includes("already") ||
        errorUserMsg.toLowerCase().includes("already") ||
        errorMsg.toLowerCase().includes("duplicate");

      if (isDuplicate) {
        console.log(`Template "${payload.name}" already exists on Meta. Fetching details and syncing...`);

        let metaTemplate = null;
        try {
          const fetchUrl = `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(payload.name)}`;
          const fetchRes = await fetch(fetchUrl, {
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          });
          const fetchData = await fetchRes.json();
          if (fetchRes.ok && fetchData.data && fetchData.data.length > 0) {
            metaTemplate = fetchData.data.find(
              t => t.name.toLowerCase() === payload.name.toLowerCase() && t.language === payload.language
            ) || fetchData.data.find(
              t => t.name.toLowerCase() === payload.name.toLowerCase()
            ) || fetchData.data[0];
          }
        } catch (fetchErr) {
          console.warn("Could not fetch template details from Meta:", fetchErr.message);
        }

        const templateStatus = metaTemplate?.status || "APPROVED";
        const templateId = metaTemplate?.id || payload.name;
        const templateComponents = metaTemplate?.components || payload.components;
        const templateBody = templateComponents?.find(c => c.type === 'BODY')?.text || bodyText;
        const templateLanguage = metaTemplate?.language || payload.language;
        const templateCategory = metaTemplate?.category || payload.category;

        const synced = await prisma.whatsAppTemplate.upsert({
          where: {
            name_language: {
              name: payload.name,
              language: templateLanguage
            }
          },
          update: {
            category: templateCategory,
            status: templateStatus,
            templateId: templateId,
            body: templateBody,
            variables: templateComponents
          },
          create: {
            name: payload.name,
            language: templateLanguage,
            category: templateCategory,
            status: templateStatus,
            templateId: templateId,
            body: templateBody,
            variables: templateComponents
          }
        });

        return res.status(200).json({
          status: true,
          message: `Template "${payload.name}" (${templateLanguage}) is already registered on Meta and has been synced successfully! (Status: ${templateStatus})`,
          data: synced,
          alreadyExists: true
        });
      }

      return res.status(response.status).json({
        status: false,
        message: data.error?.error_user_msg || data.error?.message || "Failed to create template",
        raw_meta_response: data
      });
    }

    const payloadBody = payload.components.find(c => c.type === 'BODY')?.text || bodyText;

    // Save to local DB as well (upsert to avoid unique constraint violation if it already exists)
    const saved = await prisma.whatsAppTemplate.upsert({
      where: {
        name_language: {
          name: payload.name,
          language: payload.language
        }
      },
      update: {
        category: payload.category,
        status: "PENDING",
        templateId: data.id,
        body: payloadBody,
        variables: payload.components
      },
      create: {
        name: payload.name,
        language: payload.language,
        category: payload.category,
        status: "PENDING",
        templateId: data.id,
        body: payloadBody,
        variables: payload.components
      }
    });

    return res.status(201).json({ status: true, message: "Template created successfully", data: saved });
  } catch (error) {
    console.error("Error creating template:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
