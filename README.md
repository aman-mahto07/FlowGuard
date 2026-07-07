# FlowGuard

FlowGuard is an AI-powered project risk analysis platform that predicts delivery risks, identifies scope creep, analyzes team workload, and generates actionable recommendations using LLMs. It combines deterministic project metrics with AI-generated insights to help teams make informed decisions.

## Features

- Project health analysis
- Delay risk prediction
- Scope drift detection
- Budget analysis
- Team workload assessment
- AI-powered task prioritization
- LLM-generated project insights

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Groq API (Llama 3)
- Recharts

## Getting Started

Clone the repository:

```bash
git clone https://github.com/aman-mahto07/FlowGuard.git
cd FlowGuard
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
GROQ_API_KEY=your_api_key
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Project Structure

```
app/            # App routes and API endpoints
components/     # Reusable UI components
lib/            # Risk analysis and AI logic
Synthetic/      # Sample datasets
```
