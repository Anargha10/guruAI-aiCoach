check it out on:- https://guru-ai-ai-coach.vercel.app/

**guru-ai**
guru-ai is a cutting-edge AI-powered career coaching and resume building application designed to empower professionals in achieving their career goals. Leveraging advanced generative AI, scheduled workflows, and a sleek, responsive interface, guru-ai provides personalized industry insights and helps users create standout resumes.

**Features**
AI-Powered Industry Insights

Generate detailed industry data including salary ranges, growth rates, demand levels, top skills, market outlook, trends, and recommended skills using Google Generative AI (Gemini).
Scheduled background updates via Inngest (runs every Sunday at midnight).
***Resume Builder***

Build and edit your resume with an intuitive form interface and live Markdown preview.
Seamless PDF generation from your resume content with a user-friendly alert prompting to save before downloading.
User Authentication & Personalization

**Secure authentication and user management powered by Clerk.**
Personalized profiles linked with industry insights and career recommendations.
Modern UI & Robust Backend

Built with Next.js, React, and Tailwind CSS for a fast, responsive experience.
Managed with Prisma and PostgreSQL (hosted on Neon) for scalable data handling.
Tech Stack
Frontend: Next.js (with Turbopack), React, Tailwind CSS
Backend: Next.js API Routes / App Router, Prisma ORM
Database: PostgreSQL (Neon)
Authentication: Clerk
AI Integration: Google Generative AI (Gemini)
Event-Driven Workflows: Inngest
PDF Generation: html2pdf.js, jsPDF
**Getting Started**
Prerequisites:-
Node.js (v14 or higher)
npm or yarn
A PostgreSQL database (Neon recommended)
A Vercel account for deployment (optional)
Installation
Clone the Repository:


git clone https://github.com/yourusername/guru-ai.git
cd guru-ai
Install Dependencies:


npm install
# or
yarn install

Set Up Environment Variables:

Create a .env file in the root directory and add:

DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
GEMINI_API_KEY=your-gemini-api-key
INNGEST_SIGNING_KEY=your-inngest-signing-key
NEXT_PUBLIC_INNGEST_BASE_URL=https://guru-ai.vercel.app/api/ingest
# Additional variables for Clerk and others as needed
Generate Prisma Client and Run Migrations:


npx prisma generate
npx prisma migrate dev --name init
Run the Development Server:


npm run dev
# or
yarn dev

**Usage**
Industry Insights:
guru-ai uses Inngest to run a scheduled function every Sunday that fetches and updates industry insights using Google Generative AI. Monitor the Inngest dev server logs during local development for insights updates.

Resume Builder:
Build your resume using the form, preview your Markdown, and download a PDF version. An alert will prompt users to save their resume before downloading to ensure the latest content is captured.

Deployment
Vercel:
Deploy your Next.js app on Vercel. Ensure that your API route (e.g. /api/ingest) is correctly set up and that your environment variables are configured in the Vercel dashboard.
Inngest Sync:
Once deployed, sync your app with Inngest by providing the URL of your serve endpoint (e.g., https://guru-ai.vercel.app/api/ingest) and setting the signing key.
Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

Fork the repository.
Create your feature branch:
git checkout -b feature/your-feature
Commit your changes:
git commit -am 'Add some feature'
Push to the branch:
git push origin feature/your-feature
Open a pull request.
License
This project is licensed under the MIT License. See the LICENSE file for details.

Contact
Project: guru-ai on GitHub
Author: Anargha Bhattacharjee – anarghabhatta369@gmail.com
