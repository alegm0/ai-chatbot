# 🌅 Sunsets Rooftop AI Chatbot

An intelligent restaurant assistant built with **Next.js 15**, **OpenAI GPT-4**, and a custom **RAG (Retrieval-Augmented Generation)** system.

## ✨ Features
- Understands and routes user intents deterministically (`hours`, `menu`, `events`, `payments`, etc.)
- Uses AI polishing for natural replies (`aiPolish()` integration)
- Multilingual (English & Spanish)
- Reads structured JSON knowledge bases (`menu.json`, `events.json`, etc.)
- Fast local dev with Turbopack

## 🧠 Tech Stack
- Next.js 15 (App Router)
- OpenAI API (GPT-4 Turbo)
- Node.js runtime
- TailwindCSS (UI widget)
- Custom RAG layer with JSON data

## ⚙️ Setup
```bash
git clone https://github.com/<your-username>/sunsets-ai-chatbot.git
cd sunsets-ai-chatbot
npm install

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
