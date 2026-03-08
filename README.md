# FreshMarket - AI-Powered Agricultural Trading Platform

A modern web application built with React, TypeScript, and Vite that connects farmers directly with buyers, featuring AI-powered price predictions and comprehensive marketplace functionality.

## Features

- 🛒 **Direct Marketplace** - Connect farmers with buyers, eliminating middlemen
- 🤖 **AI Price Prediction** - ML-powered predictions to help farmers choose the best time to sell
- 📊 **Sales Analytics** - Comprehensive reports and insights
- 👥 **Multi-User Platform** - Separate dashboards for farmers, buyers, and administrators

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **TanStack Query** - Data fetching and state management
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Sonner** - Toast notifications

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in terminal)

### Building for Production

Build the app for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Linting

Run ESLint to check for code issues:

```bash
npm run lint
```

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── pages/         # Page components (routes)
  ├── hooks/         # Custom React hooks
  ├── lib/           # Utility functions
  └── assets/        # Images and static assets
```

## Available Routes

- `/` - Home page
- `/login` - Login page
- `/register` - Registration page
- `/marketplace` - Product marketplace
- `/farmer-dashboard` - Farmer dashboard
- `/buyer-dashboard` - Buyer dashboard
- `/price-prediction` - AI price prediction tool
