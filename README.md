# Doctrust MedCert Premium

Doctrust MedCert Premium is a production-ready, subscription-based platform designed for healthcare professionals to streamline the creation and management of medical documentation, including Medical Certificates and Discharge Summaries.

## 🚀 Features

- **Document Generation:** Create professional Medical Certificates and Discharge Summaries with live previews.
- **Patient Management:** Track and manage patient records efficiently.
- **Document History:** Maintain a secure history of all generated documents.
- **Subscription System:** Integrated with Razorpay for monthly/yearly subscription management.
- **Onboarding Experience:** Interactive walkthrough for new users to get started quickly.
- **Responsive Design:** Built with React and Tailwind CSS for a seamless experience across devices.

## 🛠️ Tech Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide React (Icons), Framer Motion.
- **Backend:** Node.js (Express) for the server, Supabase for Database, Authentication, and Edge Functions.
- **Payments:** Razorpay Subscription API.
- **Deployment:** Nginx, PM2 on Oracle VPS, Cloudflare.

## 📋 Prerequisites

- Node.js (v18+)
- Supabase Account and CLI
- Razorpay Account (API Keys)

## 🔧 Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd premium
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root and add your configuration:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```

4. **Supabase Edge Functions:**
   Set up your Razorpay secrets in Supabase:
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=your_id RAZORPAY_KEY_SECRET=your_secret RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```
   Deploy the functions:
   ```bash
   supabase functions deploy create-razorpay-subscription
   supabase functions deploy verify-razorpay-subscription
   supabase functions deploy razorpay-webhook
   ```

5. **Database Setup:**
   Run the SQL migrations found in the `supabase_migration.sql`, `walkthrough_setup.sql`, and `promo_setup.sql` files in your Supabase SQL Editor.

6. **Run Locally:**
   ```bash
   npm run dev
   ```

## 🚢 Deployment

Detailed deployment instructions can be found in `DEPLOY_GUIDE.md`. The project uses a custom `deploy.sh` script to sync changes to an Oracle VPS and manages the process using PM2 via `ecosystem.config.cjs`.

## 💳 Razorpay Integration

For detailed information on the subscription implementation, refer to `RAZORPAY_GUIDE.md`.

## 📄 License

This project is proprietary and confidential. All rights reserved.
