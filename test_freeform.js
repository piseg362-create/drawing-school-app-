import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function sendFreeForm() {
  const tokenRecord = await prisma.whatsAppToken.findFirst();
  const ACCESS_TOKEN = tokenRecord.accessToken;
  const PHONE_NUMBER_ID = tokenRecord.phoneNumberId;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "919130452737",
    type: "text",
    text: {
      preview_url: false,
      body: "Hello! This is a test free-form message from your backend system."
    }
  };

  const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("Free-form API Response:", data);
}

sendFreeForm().catch(console.error).finally(() => prisma.$disconnect());
