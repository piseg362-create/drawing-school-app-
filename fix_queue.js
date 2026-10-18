import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function fixQ() {
  const msgs = await prisma.messageQueue.findMany({ where: { status: "PENDING" } });
  for (const m of msgs) {
    if (!m.variables.components) {
      await prisma.messageQueue.update({
        where: { id: m.id },
        data: {
          variables: {
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "Maruti drawing school" },
                  { type: "text", text: m.variables.username || "Student" },
                  { type: "text", text: m.variables.course_start_date || "Unknown" },
                  { type: "text", text: m.variables.instructor_name || "Instructor" },
                  { type: "text", text: m.variables.paid_amount || "0" },
                  { type: "text", text: m.variables.remaining_amount || "0" },
                  { type: "text", text: "Maruti drawing school" },
                ]
              }
            ]
          }
        }
      });
    }
  }
  console.log("Fixed queue variables");
}
fixQ().catch(console.error).finally(() => prisma.$disconnect());
