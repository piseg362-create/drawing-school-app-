import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function fixLang() {
  await prisma.whatsAppTemplate.updateMany({
    where: { name: "onboarding_successful_v2" },
    data: { language: "en_US" }
  });
  
  // also update the pending queue item so it uses the right one when retrying
  await prisma.messageQueue.updateMany({
    where: { status: "PENDING" },
    data: { status: "PENDING" } // just triggering a touch or leaving it, but wait, the queue fetches the template relation which is now en_US!
  });
  console.log("Updated template language to en_US in DB");
}
fixLang().catch(console.error).finally(() => prisma.$disconnect());
