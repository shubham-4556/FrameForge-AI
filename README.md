# FrameForge AI

A production-oriented AI-native video creation and editing SaaS platform. Built as a modern monorepo with Next.js, NestJS, BullMQ, FFmpeg, and Prisma.

## Features

- **Timeline Editor** - Professional multi-track timeline with clips, transitions, captions, and real-time preview
- **AI Studio** - Generate images, videos, and audio with AI (mock mode by default, OpenAI integration available)
- **Media Library** - Upload, manage, and organize media assets with signed URL uploads
- **Real-time Rendering** - FFmpeg-based video rendering with progress tracking and queue management
- **Authentication** - Custom session-based auth with CSRF protection
- **Exports** - Optimized presets for YouTube, TikTok, Instagram Reels, YouTube Shorts, and more
- **Billing** - Stripe integration for subscription management
- **Multi-workspace** - Support for teams and workspaces

## Tech Stack

### Frontend (apps/web)
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS, Radix UI, Lucide Icons
- **State**: TanStack Query
- **Forms**: React Hook Form + Zod

### Backend (apps/api)
- **Framework**: NestJS 11 with Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ + Redis
- **Auth**: Custom session-based authentication
- **API Docs**: Swagger/OpenAPI

### Worker (apps/worker)
- **Queue Processing**: BullMQ workers
- **Video Processing**: FFmpeg/FFprobe
- **AI Processing**: Mock provider with OpenAI support

### Shared Packages
- **@frameforge/shared**: Common types, schemas, constants, utilities
- **@frameforge/db**: Prisma schema and client

## Project Structure

```
FrameForge-AI/
├── apps/
│   ├── api/        # NestJS API server
│   ├── web/        # Next.js web application
│   └── worker/     # BullMQ background workers
├── packages/
│   ├── db/         # Prisma schema & client
│   └── shared/     # Shared types, schemas, utilities
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16
- Redis 7+
- FFmpeg/FFprobe

### Installation

1. Clone the repository:
```bash
git clone https://github.com/shubham-4556/FrameForge-AI.git
cd FrameForge-AI
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```bash
pnpm --filter @frameforge/db migrate:deploy
pnpm --filter @frameforge/db generate
```

5. Build packages:
```bash
pnpm build:packages
```

6. Start development servers:
```bash
pnpm dev
```

The app will be available at:
- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- API Docs: http://localhost:4000/api/docs

## Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `SESSION_SECRET` | Session encryption secret | - |
| `FFMPEG_PATH` | Path to ffmpeg binary | - |
| `FFPROBE_PATH` | Path to ffprobe binary | - |
| `AI_PROVIDER` | AI provider (`mock` or `openai`) | `mock` |
| `STORAGE_DRIVER` | Storage driver (`local` or `s3`) | `local` |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm build:packages` | Build shared packages only |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint all packages |

## Architecture

### API Architecture
- NestJS with Fastify adapter
- Global guards for auth and CSRF protection
- Response interceptor for consistent API responses
- Prisma for database access
- BullMQ for job queues

### Worker Architecture
- Separate worker process for heavy tasks
- Render jobs processed by FFmpeg
- Media probing with FFprobe
- AI generation jobs

### Storage
- Local filesystem storage with signed URLs (development)
- S3-compatible storage support (production)

## Security

- Session-based authentication with HTTP-only cookies
- CSRF protection on mutations
- Rate limiting
- Input validation with Zod
- Secure signed URLs for file uploads/downloads

## License

This project is private and proprietary.

## Author

Built by [Shubham Kumar Deo](https://github.com/shubham-4556)
