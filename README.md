# 🐠 Fishmart

Fishmart is a premium e-commerce platform dedicated to guppy breeders and aquatic enthusiasts in the Philippines.

## 🏗️ Project Structure

- **`apps/mobile`**: React Native (Expo) application for buyers and sellers.
- **`apps/backend`**: NestJS REST API with Prisma ORM and PostgreSQL.
- **`docs`**: Technical documentation, database schemas, and architectural designs.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Docker (for PostgreSQL) or a Supabase account

### Quick Start

1. **Install Dependencies**:
   ```bash
   npm run install:all
   ```

2. **Run Backend**:
   ```bash
   npm run backend:dev
   ```

3. **Run Mobile App**:
   ```bash
   npm run mobile:start
   ```

## 📖 Documentation

- [Project Overview](docs/PROJECT.md)
- [Database Schema](docs/DB.md)

## 🛠️ Tech Stack

- **Mobile**: React Native, Expo, React Native Paper, Zustand, TanStack Query.
- **Backend**: NestJS, Prisma, PostgreSQL, Supabase Auth.
- **Services**: PayMongo (Payments), Cloudinary (Images), Semaphore (SMS).

---
Built with ❤️ for the aquatic community.
