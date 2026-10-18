import prisma, { als } from "../server/config/database.js";

// ---------------------------------------------------------
// CONFIG
// ---------------------------------------------------------

const POLL_INTERVAL = 3000; // Check queue every 3 seconds
const BATCH_WAIT = 1000; // Wait after processing a batch
const RETRY_DELAY = 30000; // Retry after 30 seconds

export const queueStatus = {
  isRunning: false,
  isProcessing: false,
  pendingCount: 0,
  activeWorkers: 0,
};

// ---------------------------------------------------------
// TEMPLATE VARIABLE REPLACEMENT
// ---------------------------------------------------------

function formatMessageBody(templateBody, variables) {
  let formattedBody = templateBody;

  if (variables && typeof variables === "object") {
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      formattedBody = formattedBody.replace(
        regex,
        value == null ? "" : String(value),
      );
    }
  }

  return formattedBody;
}

// ---------------------------------------------------------
// REAL WHATSAPP CLOUD API SENDER
// ---------------------------------------------------------

async function sendWhatsAppMessage(
  recipient,
  templateName,
  languageCode,
  variables,
  systemId
) {
  // Fetch credentials dynamically from the database for this specific tenant
  const tokenRecord = await prisma.whatsAppToken.findFirst({
    where: systemId ? { systemID: systemId } : undefined,
  });

  if (!tokenRecord || !tokenRecord.accessToken || !tokenRecord.phoneNumberId) {
    throw new Error("Missing WhatsApp API credentials in database. Please complete WhatsApp Setup.");
  }

  // 🛑 KILL-SWITCH: Check if Switch Off Mode is active
  if (tokenRecord.switchOffMode) {
    throw new Error("WhatsApp Switch Off Mode is active. Message sending is paused to prevent exceeding budget.");
  }

  const ACCESS_TOKEN = tokenRecord.accessToken;
  const PHONE_NUMBER_ID = tokenRecord.phoneNumberId;
  const API_VERSION = process.env.META_API_VERSION || "v20.0";

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  // -------------------------
  // DEBUG LOGS FOR TESTING
  // -------------------------
  console.log("\n=============================================");
  console.log("🔍 WHATSAPP CREDENTIALS DEBUG");
  console.log("=============================================");
  console.log(`Phone Number ID : ${PHONE_NUMBER_ID}`);
  console.log(`WABA ID         : ${tokenRecord.wabaId}`);
  console.log(`Recipient       : ${recipient}`);
  console.log(`Template Name   : ${templateName}`);
  console.log(`Token (masked)  : ${ACCESS_TOKEN.substring(0, 15)}...${ACCESS_TOKEN.substring(ACCESS_TOKEN.length - 5)}`);
  console.log("=============================================\n");

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode || "en",
      },
    },
  };

  // Map variables if they exist
  if (variables && typeof variables === "object") {
    if (Array.isArray(variables)) {
      // If it's already an array of components, pass directly
      payload.template.components = variables;
    } else if (variables.components) {
      // If components is nested
      payload.template.components = variables.components;
    } else {
      // Flatten key-value object into named parameters for the body component
      const parameters = Object.keys(variables).map((key) => ({
        type: "text",
        parameter_name: key,
        text: String(variables[key]),
      }));

      if (parameters.length > 0) {
        payload.template.components = [
          {
            type: "body",
            parameters,
          },
        ];
      }
    }
  }

  // Ensure onboarding template always has all 7 expected parameters
  if (templateName === "onboarding" && payload.template?.components) {
    const bodyComp = payload.template.components.find((c) => c.type === "body");
    if (bodyComp && Array.isArray(bodyComp.parameters) && bodyComp.parameters.length === 6) {
      const schoolNameParam = bodyComp.parameters[0] || { type: "text", text: "School" };
      bodyComp.parameters.push({
        type: "text",
        text: schoolNameParam.text || "School",
      });
      console.log("ℹ️ Auto-appended 7th parameter (schoolName) to onboarding template payload.");
    }
  }

  console.log("📤 Dynamic WhatsApp Payload:");
  console.dir(payload, { depth: null });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("📡 Meta API Response Status:", response.status);
    console.log("📥 Raw Meta Response:", JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.dir(data, { depth: null });

      const isUnregistered = 
        data.error?.code === 133010 || 
        data.error?.message?.includes("133010") || 
        data.error?.message?.toLowerCase().includes("not registered");

      if (isUnregistered) {
        console.warn("⚠️ Phone number not registered with WhatsApp Cloud API (#133010). Attempting automatic registration with Meta...");
        try {
          const regUrl = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/register`;
          const regRes = await fetch(regUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              pin: "123456",
            }),
          });
          const regData = await regRes.json();
          console.log("📲 Meta Auto-Registration Response:", regData);

          if (regRes.ok || regData.success) {
            console.log("✅ Auto-registration successful! Retrying message send...");
            const retryResponse = await fetch(url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
            const retryData = await retryResponse.json();
            if (retryResponse.ok) {
              return {
                messageId: retryData.messages?.[0]?.id,
                status: retryData.messages?.[0]?.message_status,
              };
            }
          }
        } catch (regErr) {
          console.error("Failed auto-registering phone number with Meta:", regErr);
        }
      }

      const metaErrorObj = {
        message: data.error?.message || "Unknown Meta API Error",
        code: data.error?.code,
        subcode: data.error?.error_subcode,
        type: data.error?.type,
        details: data.error?.error_data?.details,
        fbtrace_id: data.error?.fbtrace_id,
        status: response.status,
      };
      const formattedMsg = data.error?.error_data?.details
        ? `${data.error.message} (${data.error.error_data.details})`
        : (data.error?.message || "Unknown Meta API Error");
      const err = new Error(formattedMsg);
      err.metaError = metaErrorObj;
      throw err;
    }

    return {
      messageId: data.messages?.[0]?.id,
      status: data.messages?.[0]?.message_status,
    };
  } catch (error) {
    console.error("❌ WhatsApp API Error:", error);
    throw error;
  }
}
// ---------------------------------------------------------
// PROCESS ONE MESSAGE
// ---------------------------------------------------------

async function processSingleMessage(message) {
  try {
    console.log(`📤 Processing message ${message.id.substring(0, 8)}...`);

    const response = await sendWhatsAppMessage(
      message.recipient,
      message.template.name,
      message.template.language,
      message.variables,
      message.systemID
    );

    // SUCCESS
    await prisma.messageQueue.update({
      where: {
        id: message.id,
      },

      data: {
        status: "SENT",
        sentAt: new Date(),
        messageId: response.messageId,
        lastError: null,
        attempts: message.attempts + 1,
      },
    });

    console.log(
      `✅ Message ${message.id.substring(0, 8)} sent successfully to ${message.recipient}`,
    );
  } catch (error) {
    const attemptsMade = message.attempts + 1;

    const isRetriable = attemptsMade < message.maxAttempts;

    await prisma.messageQueue.update({
      where: {
        id: message.id,
      },

      data: {
        status: isRetriable ? "PENDING" : "FAILED",

        lastError: error.metaError
          ? JSON.stringify(error.metaError)
          : (error.message || String(error)),

        attempts: attemptsMade,

        scheduledAt: isRetriable
          ? new Date(Date.now() + RETRY_DELAY)
          : message.scheduledAt,

        processingAt: null,
      },
    });

    console.error(`❌ Message ${message.id.substring(0, 8)} failed`);

    console.error(`   Attempt: ${attemptsMade}/${message.maxAttempts}`);

    console.error(
      `   Retry: ${isRetriable ? "YES" : "NO"} | Reason: ${error.message}`,
    );
  }
}

// ---------------------------------------------------------
// RECOVER STUCK PROCESSING MESSAGES
// ---------------------------------------------------------

async function recoverStuckMessages() {
  try {
    const timeout = new Date(Date.now() - 5 * 60 * 1000);

    const result = await prisma.messageQueue.updateMany({
      where: {
        status: "PROCESSING",
        processingAt: {
          lt: timeout,
        },
      },

      data: {
        status: "PENDING",
        processingAt: null,
        scheduledAt: new Date(),
      },
    });

    if (result.count > 0) {
      console.log(`♻️ Recovered ${result.count} stuck message(s)`);
    }
  } catch (error) {
    console.error("❌ Failed to recover stuck messages:", error);
  }
}

// ---------------------------------------------------------
// DETERMINE WORKER COUNT
// ---------------------------------------------------------

function calculateWorkerCount(pendingCount) {
  if (pendingCount > 100) {
    return 4;
  }

  if (pendingCount > 10) {
    return 2;
  }

  return 1;
}

// ---------------------------------------------------------
// QUEUE MANAGER
// ---------------------------------------------------------

async function runQueueManager() {
  als.run('__BYPASS_TENANT__', async () => {
    try {
      // 1. Recover old PROCESSING messages
      await recoverStuckMessages();

      // 2. Count pending messages
      const now = new Date();

    const pendingCount = await prisma.messageQueue.count({
      where: {
        status: "PENDING",

        scheduledAt: {
          lte: now,
        },
      },
    });

    queueStatus.isRunning = true;

    // 3. Nothing to process
    if (pendingCount === 0) {
      queueStatus.isProcessing = false;
      queueStatus.pendingCount = 0;
      queueStatus.activeWorkers = 0;

      setTimeout(runQueueManager, POLL_INTERVAL);

      return;
    }

    // 3.4 🛑 SWITCH OFF MODE: Master Kill-Switch / Do Not Send Messages Mode
    const token = await prisma.whatsAppToken.findFirst();
    if (token && token.switchOffMode) {
      console.log("🛑 Switch Off Mode is ON! Master kill-switch active. Queue paused - no messages will be dispatched.");
      queueStatus.isProcessing = false;
      queueStatus.activeWorkers = 0;
      setTimeout(runQueueManager, POLL_INTERVAL * 5); // Poll slower when switch off is active
      return;
    }

    // 3.5 🛡️ SAFE MODE: Monthly Budget Limit (e.g. ₹150, ₹300, etc.)
    if (token && token.safeMode) {
      const budget = Number(token.monthlyBudget) || 150.0;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const monthMessages = await prisma.messageQueue.findMany({
        where: {
          status: "SENT",
          sentAt: { gte: startOfMonth }
        },
        select: {
          template: {
            select: { category: true }
          }
        }
      });

      const utilityRate = token.utilityRate != null ? Number(token.utilityRate) : 0.15;
      const MARKETING_RATE = 0.80;
      let monthSpend = 0;
      for (const msg of monthMessages) {
        if (msg.template?.category === "MARKETING") monthSpend += MARKETING_RATE;
        else monthSpend += utilityRate;
      }

      if (monthSpend >= budget) {
        console.log(`🛑 Safe Mode active! Monthly budget of ₹${budget} reached (Current Spend: ₹${monthSpend.toFixed(2)}). Queue paused.`);
        queueStatus.isProcessing = false;
        queueStatus.activeWorkers = 0;
        setTimeout(runQueueManager, POLL_INTERVAL * 10); // Poll slower when budget reached
        return;
      }
    }

    // 4. Calculate workers
    const workerCount = calculateWorkerCount(pendingCount);

    queueStatus.isProcessing = true;
    queueStatus.pendingCount = pendingCount;
    queueStatus.activeWorkers = workerCount;

    console.log(`\n⚙️ Queue: ${pendingCount} message(s)`);

    console.log(`👷 Workers: ${workerCount}`);

    // 5. Get messages (LIFO MODE: newest first)
    const messages = await prisma.messageQueue.findMany({
      where: {
        status: "PENDING",

        scheduledAt: {
          lte: new Date(),
        },
      },

      orderBy: {
        scheduledAt: "asc", // FIFO: process oldest first
      },

      take: workerCount,

      include: {
        template: true,
      },
    });

    // 6. Lock messages
    const messageIds = messages.map((message) => message.id);

    if (messageIds.length === 0) {
      setTimeout(runQueueManager, POLL_INTERVAL);

      return;
    }

    await prisma.messageQueue.updateMany({
      where: {
        id: {
          in: messageIds,
        },

        status: "PENDING",
      },

      data: {
        status: "PROCESSING",
        processingAt: new Date(),
      },
    });

    // 7. Process concurrently
    await Promise.all(messages.map((message) => processSingleMessage(message)));

    // 8. Continue queue
    setTimeout(runQueueManager, BATCH_WAIT);
    } catch (error) {
      console.error("🚨 Queue Manager Error:", error);

      setTimeout(runQueueManager, 5000);
    }
  });
}

// ---------------------------------------------------------
// START WORKER
// ---------------------------------------------------------

export async function initMessageWorker() {
  als.run('__BYPASS_TENANT__', async () => {
    console.log("\n======================================");

    console.log("🚀 WhatsApp Node Worker Starting...");

    console.log("======================================\n");

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      console.log("✅ Database connection successful");

      // Check pending messages
      const pendingCount = await prisma.messageQueue.count({
        where: {
          status: "PENDING",

          scheduledAt: {
            lte: new Date(),
          },
        },
      });

      console.log(`📦 Pending messages: ${pendingCount}`);

      // Start Queue Manager immediately
      console.log("\n🚀 Queue Manager Started\n");
      runQueueManager();
    } catch (error) {
      console.error("❌ Worker startup failed:", error);

      // Try again after 10 seconds
      setTimeout(initMessageWorker, 10000);
    }
  });
}

// ---------------------------------------------------------
// GRACEFUL SHUTDOWN
// ---------------------------------------------------------

async function shutdown(signal) {
  console.log(`\n🛑 ${signal} received`);

  console.log("Closing worker...");

  try {
    await prisma.$disconnect();

    console.log("✅ Database disconnected");

    process.exit(0);
  } catch (error) {
    console.error("❌ Shutdown error:", error);

    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));

process.on("SIGTERM", () => shutdown("SIGTERM"));



// const payload = {
//   messaging_product: "whatsapp",
//   recipient_type: "individual",
//   to: "9130452737",
//   type: "template",

//   template: {
//     name: "onboarding_successful_v2",

//     language: {
//       code: "en",
//     },

//     components: [
//       {
//         type: "body",
//         parameters: [
//           {
//             type: "text",
//             parameter_name: "username",
//             text: "Chaitanya",
//           },
//           {
//             type: "text",
//             parameter_name: "course_start_date",
//             text: "12 Oct 2026",
//           },
//           {
//             type: "text",
//             parameter_name: "instructor_name",
//             text: "Mr. Smith",
//           },
//           {
//             type: "text",
//             parameter_name: "paid_amount",
//             text: "5000",
//           },
//           {
//             type: "text",
//             parameter_name: "remaining_amount",
//             text: "2000",
//           },
//         ],
//       },
//     ],
//   },
// };