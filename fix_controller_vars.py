import re

path = 'main/server/controllers/student.controller/create.student.controller.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to add fetching SchoolSetUp
# After we fetch the instructor, we can fetch the school setup.
instructor_block = """    // Fetch Instructor to get the name for the WhatsApp template
    let instructorName = "Assigned Instructor";
    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId }
      });
      if (instructor && instructor.name) {
        instructorName = instructor.name;
      }
    }"""

school_setup_block = """    // Fetch Instructor to get the name for the WhatsApp template
    let instructorName = "Assigned Instructor";
    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId }
      });
      if (instructor && instructor.name) {
        instructorName = instructor.name;
      }
    }
    
    // Fetch School SetUp to get the school name
    let schoolName = "Driving School";
    const schoolSetup = await prisma.schoolSetUp.findFirst();
    if (schoolSetup && schoolSetup.school_name) {
      schoolName = schoolSetup.school_name;
    }"""

content = content.replace(instructor_block, school_setup_block)

# Now fix the messageQueue part
old_queue_block = """      // 5. Add WhatsApp message to queue with the 5 required variables
      const formattedDate = Course_Start_date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // e.g., 12 Oct 2026
      
      await tx.messageQueue.create({
        data: {
          templateId: template.id,
          recipient: mobile,
          variables: {
            username: name,
            course_start_date: formattedDate,
            instructor_name: instructorName,
            paid_amount: amountPaid.toString(),
            remaining_amount: payment_remaining.toString(),
          },
          status: "PENDING",
          scheduledAt: new Date(),
        },
      });"""

new_queue_block = """      // 5. Add WhatsApp message to queue with exact positional variables
      const formattedDate = Course_Start_date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // e.g., 12 Oct 2026
      
      await tx.messageQueue.create({
        data: {
          templateId: template.id,
          recipient: mobile,
          variables: {
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: schoolName },
                  { type: "text", text: name },
                  { type: "text", text: formattedDate },
                  { type: "text", text: instructorName },
                  { type: "text", text: amountPaid.toString() },
                  { type: "text", text: payment_remaining.toString() },
                  { type: "text", text: schoolName },
                ]
              }
            ]
          },
          status: "PENDING",
          scheduledAt: new Date(),
        },
      });"""

content = content.replace(old_queue_block, new_queue_block)

# Let's also make sure we fix the template creation block, just for neatness
# even though it's already en_US in the DB, it's good to keep the codebase clean.
old_template_creation = """            name: "onboarding_successful_v2",
            templateId: "onboarding_successful_v2",
            language: "en_US",
            category: "UTILITY",
            status: "APPROVED",
            body: "Hello {{username}}, welcome to the course starting on {{course_start_date}} with {{instructor_name}}. You paid {{paid_amount}} and have a remaining balance of {{remaining_amount}}.",
            variables: ["username", "course_start_date", "instructor_name", "paid_amount", "remaining_amount"],"""

new_template_creation = """            name: "onboarding_successful_v2",
            templateId: "onboarding_successful_v2",
            language: "en_US",
            category: "UTILITY",
            status: "APPROVED",
            body: "🎉 Welcome to {{1}}!\\n\\nHello {{2}}, your driving course enrollment has been successfully completed. 🚗\\n\\n📅 Course Start Date: {{3}}\\n👨🏫 Instructor: {{4}}\\n💰 Amount Paid: ₹{{5}}\\n💳 Remaining Amount: ₹{{6}}\\n\\nWe’re happy to have you with us. Please be ready for your first driving session on the scheduled date.\\n\\nIf you have any questions, feel free to contact us.\\n\\nThank you for choosing {{7}}! 🙏",
            variables: [],"""

content = content.replace(old_template_creation, new_template_creation)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated create.student.controller.js with positional parameters!")
