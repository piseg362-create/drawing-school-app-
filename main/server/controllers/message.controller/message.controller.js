import prisma from "../../config/database.js";
import { queueStatus } from "../../../worker/messageWorker.js";

export const getMessages = async (req, res) => {
  try {
    const messages = await prisma.messageQueue.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        template: true,
      },
      take: 100, // Limit to recent 100 for performance
    });
    
    return res.status(200).json({
      status: true,
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch messages",
    });
  }
};

export const getQueueStatus = (req, res) => {
  return res.status(200).json({
    status: true,
    data: queueStatus,
  });
};

// -----------------------------------------------------------------
// META WHATSAPP WEBHOOK HANDLERS
// -----------------------------------------------------------------

export const verifyWebhook = async (req, res) => {
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "my_secure_verify_token";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified by Meta!");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
};

export const handleWebhook = async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.statuses
    ) {
      const statusObj = body.entry[0].changes[0].value.statuses[0];
      const wamid = statusObj.id;
      const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

      console.log(`📥 Webhook Update: Message ${wamid} is now ${status}`);

      try {
        // Find the message in our database by its Meta ID
        const message = await prisma.messageQueue.findFirst({
          where: { messageId: wamid }
        });

        if (message) {
          // Meta sends lowercase statuses ('delivered', 'read', 'failed'). 
          // You can map these to your MessageQueueStatus enum if you want to track them!
          console.log(`✅ Database matched! Found message: ${message.id} for status update.`);
          
          /* 
          await prisma.messageQueue.update({
            where: { id: message.id },
            data: { status: status.toUpperCase() } // Only if your enum supports DELIVERED/READ
          });
          */
        }
      } catch (error) {
        console.error("❌ Error updating webhook status in DB:", error);
      }
    }
    return res.sendStatus(200);
  } else {
    return res.sendStatus(404);
  }
};

export const enqueueMessage = async (req, res) => {
  try {
    const { recipient, templateName, languageCode, variables } = req.body;

    if (!recipient || !templateName) {
      return res.status(400).json({ status: false, message: "Missing recipient or templateName" });
    }

    // Upsert template if it doesn't exist just to satisfy foreign key (or assume it exists)
    let template = await prisma.whatsAppTemplate.findFirst({ where: { name: templateName } });
    if (!template) {
      template = await prisma.whatsAppTemplate.create({
        data: {
          name: templateName,
          language: languageCode || "en",
          category: "UTILITY",
          status: "APPROVED"
        }
      });
    }

    const newMessage = await prisma.messageQueue.create({
      data: {
        recipient,
        templateId: template.id,
        variables: variables || {},
        status: "PENDING"
      }
    });

    return res.status(201).json({ status: true, message: "Message queued successfully", data: newMessage });
  } catch (error) {
    console.error("Error queuing message:", error);
    return res.status(500).json({ status: false, message: "Failed to queue message" });
  }
};

export const retryMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await prisma.messageQueue.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ status: false, message: "Message not found" });
    }

    const updated = await prisma.messageQueue.update({
      where: { id },
      data: {
        status: "PENDING",
        attempts: 0,
        scheduledAt: new Date(),
        processingAt: null,
        lastError: null,
      },
      include: {
        template: true,
      },
    });

    return res.status(200).json({
      status: true,
      message: "Message requeued successfully for immediate sending",
      data: updated,
    });
  } catch (error) {
    console.error("Error retrying message:", error);
    return res.status(500).json({ status: false, message: "Failed to retry message" });
  }
};
