# 🚗 Driving School Management System

A comprehensive, production-ready desktop application built to manage driving school operations, students, instructors, vehicles, and schedules. This application is packaged as a native desktop app using Nextron (Next.js + Electron) and features automated WhatsApp onboarding, multi-language support, and integrated payment processing.

## ✨ Key Features

* **🖥️ Native Desktop App:** Built with Electron and Next.js for a seamless desktop experience.
* **🌍 Multi-Language Support:** Full UI translation for English, Hindi, Marathi, Kannada, Telugu, and Tamil (sticky selection via `localStorage`).
* **💬 Automated WhatsApp Onboarding:** Background message queue worker that automatically sends customized, approved Meta WhatsApp templates to new students.
* **💳 Payment Gateway:** Razorpay integration for SaaS licensing and payment verification.
* **📦 Local Database:** Fast and reliable local data storage using SQLite and Prisma ORM.
* **⚡ Reactive UI:** State management powered by TanStack React Query for instant UI updates across Students, Instructors, and Schedules.

---

## 🛠️ Tech Stack

* **Frontend:** React, Next.js (App Router), Tailwind CSS, Shadcn UI
* **Desktop Wrapper:** Nextron (Electron)
* **Backend:** Node.js, Express (Custom Controllers)
* **Database:** SQLite
* **ORM:** Prisma
* **State Management:** TanStack Query (React Query)
* **Localization:** `react-i18next`
* **Integrations:** Meta WhatsApp Cloud API, Razorpay

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **yarn**
* A **Meta Developer Account** (for WhatsApp API)
* A **Razorpay Account** (for payments)

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Database Setup
Initialize the local SQLite database and push the Prisma schema:
```bash
npx prisma generate
npx prisma db push
```

### 3. Environment Variables
Create a `.env` file in the root directory and configure your keys:
```env
# Meta WhatsApp API
META_WEBHOOK_VERIFY_TOKEN="your_secure_verify_token"
META_API_VERSION="v20.0"

# Razorpay (If applicable on backend)
RAZORPAY_KEY_ID="your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"
```
*(Note: WhatsApp tokens and Phone Number IDs are stored directly in the `WhatsAppToken` database table via the frontend Setup UI).*

### 4. Running in Development
Start the Nextron development server:
```bash
npm run dev
```

---

## 📦 Building for Production

To package the application into an executable for macOS, Windows, or Linux, run:
```bash
npm run build
```
This will compile the Next.js frontend, bundle the Electron backend, and generate the installer files in the `dist/` folder.

---

## 💬 WhatsApp Integration Guide

The application uses a reliable background worker to process WhatsApp messages without blocking the UI.

### Worker Architecture
* **Queueing:** When a student is created, a message payload is stored in the `MessageQueue` SQLite table with a `PENDING` status.
* **Processing:** The worker (`main/worker/messageWorker.js`) polls the database, formats the message according to Meta's strict positional parameter rules, and dispatches it via the Meta Cloud API.

### Important Meta Requirements for Production
If you are deploying this for a live business, ensure the following are completed on the [Meta Business Suite](https://business.facebook.com/):
1. **Business Verification:** The business must be verified with legal documents.
2. **Payment Configuration:** A valid credit card **must** be attached to the WhatsApp Business Account. Meta will silently drop business-initiated template messages if billing is not configured.
3. **Template Formatting:** Ensure your approved Meta template matches the positional parameter payload in `create.student.controller.js` exactly (e.g., exactly 6 parameters if your template expects 6 variables).

---

## 📂 Project Structure

* `/renderer` - Next.js frontend code (Pages, Components, Tabs, i18n logic)
* `/main` - Electron main process and Node.js backend controllers
* `/main/server/controllers` - API logic (Students, Messages, Packages)
* `/main/worker` - Background scripts (WhatsApp message queue processor)
* `/prisma` - Database schema (`schema.prisma`) and local SQLite DB file

---

## 🤝 Maintenance & Support
* **Database Viewing:** To view the local data visually, run `npx prisma studio`.
* **Adding New Languages:** Add translation JSON blocks to `renderer/lib/i18n.js` and add the language option to `renderer/component/LanguageSwitcher.jsx`.
