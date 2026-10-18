import prisma from "../../config/database.js";

export const upsertLocalWhatsAppToken = async (send) => {
  if (!send || !send.accessToken || !send.wabaId || !send.phoneNumberId) {
    throw new Error("Missing required WhatsApp token data");
  }

  const existingToken = await prisma.whatsAppToken.findFirst({
    where: send.schoolId ? { schoolId: send.schoolId } : undefined,
  });

  if (existingToken) {
    return await prisma.whatsAppToken.update({
      where: { id: existingToken.id },
      data: {
        wabaId: send.wabaId,
        accessToken: send.accessToken,
        phoneNumberId: send.phoneNumberId,
        status: send.status || "connected",
        displayPhoneNumber: send.displayPhoneNumber || null,
        verifiedName: send.verifiedName || null,
      },
    });
  } else {
    return await prisma.whatsAppToken.create({
      data: {
        wabaId: send.wabaId,
        accessToken: send.accessToken,
        phoneNumberId: send.phoneNumberId,
        status: send.status || "connected",
        schoolId: send.schoolId || "",
        displayPhoneNumber: send.displayPhoneNumber || null,
        verifiedName: send.verifiedName || null,
      },
    });
  }
};

export const registerPhoneNumberWithMeta = async (phoneNumberId, accessToken, pin = "123456") => {
  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/register`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: pin,
      }),
    });
    const data = await response.json();
    console.log("📲 Meta Phone Registration Response:", data);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    console.error("Error registering phone number with Meta:", error);
    return { ok: false, error: error.message };
  }
};

export const saveWhatsAppToken = async (req, res) => {
  try {
    const raw = req.body || {};
    const send = raw.send || raw.data?.send || raw.data || raw;
    const schoolId = send.schoolId || raw.schoolId || raw.userObj?.id || raw.userId || "";

    if (send && (send.wabaId || send.phoneNumberId || send.accessToken)) {
      const saved = await upsertLocalWhatsAppToken({
        ...send,
        schoolId,
      });

      // Auto-register phone number with Meta Cloud API
      if (saved?.phoneNumberId && saved?.accessToken) {
        registerPhoneNumberWithMeta(saved.phoneNumberId, saved.accessToken).catch(err => {
          console.warn("Auto-register notice:", err.message);
        });
      }

      return res.status(200).json({ status: true, data: saved });
    }
    return res.status(400).json({ status: false, message: "Invalid token payload" });
  } catch (error) {
    console.error("Error saving WhatsApp token:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const verifyAndSaveWhatsAppToken = async (req, res) => {
  try {
    const { id, userId, accessToken } = req.body;

    // 1. Fetch from Vercel Backend (Production URL: verify-setup, with fallback to embedded-signup/send)
    const primaryUrl = new URL(
      "https://backend-for-drawing-school.vercel.app/api/whatsapp/verify-setup",
    );
    if (id) primaryUrl.searchParams.append("id", id);
    if (userId) primaryUrl.searchParams.append("userId", userId);

    const headers = {
      "Content-Type": "application/json",
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
    };
    const bodyStr = JSON.stringify({ id, userId, accessToken });

    let vercelResponse = await fetch(primaryUrl.toString(), {
      method: "POST",
      headers,
      body: bodyStr,
    });

    // Fallback to legacy endpoint if verify-setup is 404 on Vercel
    if (vercelResponse.status === 404) {
      const fallbackUrl = new URL(
        "https://backend-for-drawing-school.vercel.app/api/whatsapp/embedded-signup/send",
      );
      if (id) fallbackUrl.searchParams.append("id", id);
      if (userId) fallbackUrl.searchParams.append("userId", userId);
      vercelResponse = await fetch(fallbackUrl.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify({ id, userId }),
      });
    }

    const data = await vercelResponse.json().catch(() => ({}));

    if (!vercelResponse.ok) {
      return res.status(vercelResponse.status).json({
        status: false,
        message:
          data.message || "Data is not set yet. Please complete the setup.",
      });
    }

    const send = data.send || data.data || data;
    if (!send || !send.accessToken || !send.wabaId || !send.phoneNumberId) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Missing required WhatsApp token data from Vercel payload",
        });
    }

    // 2. Save it locally
    const newToken = await upsertLocalWhatsAppToken(send);

    // Auto-register with Meta Cloud API
    if (newToken?.phoneNumberId && newToken?.accessToken) {
      registerPhoneNumberWithMeta(newToken.phoneNumberId, newToken.accessToken).catch(err => {
        console.warn("Auto-register notice:", err.message);
      });
    }

    return res.status(200).json({
      status: true,
      message: data.message || "WhatsApp token saved successfully",
      data: newToken,
    });
  } catch (error) {
    console.error("Error verifying and saving WhatsApp token:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

export const autoRegisterNumber = async (req, res) => {
  try {
    const tokenRecord = await prisma.whatsAppToken.findFirst();
    if (!tokenRecord) {
      return res
        .status(404)
        .json({ message: "No WhatsApp token found in DB." });
    }

    const result = await registerPhoneNumberWithMeta(
      tokenRecord.phoneNumberId,
      tokenRecord.accessToken,
      req.body?.pin || "123456"
    );

    return res.status(200).json({ status: result.status || 200, data: result.data });
  } catch (error) {
    console.error("Error auto-registering number:", error);
    return res.status(500).json({ error: error.message });
  }
};
