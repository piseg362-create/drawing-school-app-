import prisma from "../../config/database.js";

export const getTemplates = async (req, res) => {
  try {
    const tokenRecord = await prisma.whatsAppToken.findFirst();
    if (!tokenRecord) {
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
      const allLocal = await prisma.whatsAppTemplate.findMany();
      return res.status(200).json({ status: true, data: allLocal });
    }

    // Fallback: return templates from local DB
    const localTemplates = await prisma.whatsAppTemplate.findMany();
    return res.status(200).json({ status: true, data: localTemplates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    try {
      const localTemplates = await prisma.whatsAppTemplate.findMany();
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

    const tokenRecord = await prisma.whatsAppToken.findFirst();
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
