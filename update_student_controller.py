import re

path = 'main/server/controllers/student.controller/create.student.controller.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to fetch the instructor name.
# Before:
#     // Course end date
#     const Course_End_Date = new Date(Course_Start_date);
#     Course_End_Date.setDate(
#       Course_End_Date.getDate() + Number(findPackage.duration)
#     );
#
#     // Create everything in ONE transaction
# Let's insert instructor fetching here.

instructor_fetch = """
    // Course end date
    const Course_End_Date = new Date(Course_Start_date);
    Course_End_Date.setDate(
      Course_End_Date.getDate() + Number(findPackage.duration)
    );

    // Fetch Instructor to get the name for the WhatsApp template
    let instructorName = "Assigned Instructor";
    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({
        where: { id: instructorId }
      });
      if (instructor && instructor.name) {
        instructorName = instructor.name;
      }
    }

"""
content = content.replace("""    // Course end date
    const Course_End_Date = new Date(Course_Start_date);
    Course_End_Date.setDate(
      Course_End_Date.getDate() + Number(findPackage.duration)
    );
""", instructor_fetch)


# Now update the template section inside the transaction
old_template_logic = """      // 3. Find WhatsApp template
      let template = await tx.whatsAppTemplate.findFirst({
        where: {
          name: "student_welcome",
        },
      });

      // 4. If template doesn't exist, create it
      if (!template) {
        template = await tx.whatsAppTemplate.create({
          data: {
            name: "student_welcome",
            templateId: "DEV_STUDENT_WELCOME",
            language: "en",
            category: "UTILITY",
            status: "APPROVED",
            body: "Hello {{studentName}}, welcome to Drawing School. Your package is {{packageName}}.",
            variables: ["studentName", "packageName"],
          },
        });
      }

      // 5. Add WhatsApp message to queue
      await tx.messageQueue.create({
        data: {
          templateId: template.id,
          recipient: mobile,
          variables: {
            studentName: name,
            packageName: package_name,
          },
          status: "PENDING",
          scheduledAt: new Date(),
        },
      });"""

new_template_logic = """      // 3. Find WhatsApp template (Approved Onboarding)
      let template = await tx.whatsAppTemplate.findFirst({
        where: {
          name: "onboarding_successful_v2",
        },
      });

      // 4. If template doesn't exist, create it locally for DB reference
      if (!template) {
        template = await tx.whatsAppTemplate.create({
          data: {
            name: "onboarding_successful_v2",
            templateId: "onboarding_successful_v2",
            language: "en",
            category: "UTILITY",
            status: "APPROVED",
            body: "Hello {{username}}, welcome to the course starting on {{course_start_date}} with {{instructor_name}}. You paid {{paid_amount}} and have a remaining balance of {{remaining_amount}}.",
            variables: ["username", "course_start_date", "instructor_name", "paid_amount", "remaining_amount"],
          },
        });
      }

      // 5. Add WhatsApp message to queue with the 5 required variables
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

content = content.replace(old_template_logic, new_template_logic)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated create.student.controller.js with new template logic!")
