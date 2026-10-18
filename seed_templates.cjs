const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: "onboarding",
      templateId: "onboarding",
      language: "en",
      category: "UTILITY",
      status: "APPROVED",
      body: "🎉 Welcome to {{1}}!\n\nHello {{2}}, your driving course enrollment has been successfully completed. 🚗\n\n📅 Course Start Date: {{3}}\n👨🏫 Instructor: {{4}}\n💰 Amount Paid: ₹{{5}}\n💳 Remaining Amount: ₹{{6}}\n\nWe’re happy to have you with us. Please be ready for your first driving session on the scheduled date.\n\nIf you have any questions, feel free to contact us.\n\nThank you for choosing {{7}}! 🙏",
      variables: []
    },
    {
      name: "reminder",
      templateId: "reminder",
      language: "en",
      category: "UTILITY",
      status: "APPROVED",
      body: "Hello {{1}}, this is a friendly reminder from {{2}} regarding your driving course. Please contact us for more details.",
      variables: []
    },
    {
      name: "completion",
      templateId: "completion",
      language: "en",
      category: "UTILITY",
      status: "APPROVED",
      body: "🎓 Congratulations {{1}}!\n\nYou have successfully completed your driving course with {{2}}. 🚗💨\nWe hope you enjoyed learning with us.\nDrive safely!",
      variables: []
    }
  ];

  for (const t of templates) {
    const exists = await prisma.whatsAppTemplate.findFirst({ where: { name: t.name } });
    if (!exists) {
      await prisma.whatsAppTemplate.create({ data: t });
      console.log("Created template:", t.name);
    } else {
      console.log("Template already exists:", t.name);
    }
  }
}
main().then(() => process.exit(0));
