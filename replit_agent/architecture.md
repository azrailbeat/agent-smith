# Architecture Overview

## 1. Overview

This repository contains a full-stack web application built with a modern JavaScript/TypeScript stack. The system appears to be a government/enterprise application for managing AI agents, citizen requests, documents, meetings, tasks, and blockchain records. The application integrates AI capabilities (including OpenAI API), blockchain functionality, and organizational structures.

The application follows a client-server architecture, with a clear separation between frontend (client) and backend (server) components. It uses a PostgreSQL database with Drizzle ORM for data persistence, and implements various external service integrations.

## 2. System Architecture

### 2.1 Frontend Architecture

The frontend is built using React with TypeScript. Key architectural aspects include:

- **Component-Based Structure**: Organized into reusable UI components under `client/src/components`
- **Page-Based Routing**: Implemented with Wouter for lightweight routing
- **State Management**: Uses React Query for server state management and data fetching
- **UI Framework**: Leverages Shadcn UI components with Tailwind CSS for styling
- **Theming**: Supports dynamic theming with a theme.json configuration

### 2.2 Backend Architecture

The backend is implemented as a Node.js application using ESM modules with TypeScript. Key architectural aspects include:

- **Express API Server**: Handles HTTP requests and API routes
- **Service-Based Organization**: Core functionality is separated into service modules
- **Database Abstraction**: Storage interface with implementation for database operations
- **API Routes**: Organized by domain (system, database, planka, LLM monitoring)
- **Agent Service**: Central service for coordinating AI agent operations

### 2.3 Database Architecture

The application uses a PostgreSQL database with Drizzle ORM for data modeling and access:

- **Schema Definition**: Tables defined in `shared/schema.ts`
- **ORM**: Uses Drizzle for type-safe database operations
- **Migrations**: Handles schema changes with Drizzle Kit
- **Database Connector**: Supports multiple database providers (PostgreSQL, Supabase)

### 2.4 Data Flow

1. Client makes API requests to server endpoints
2. Server processes requests through appropriate routes
3. Service layer handles business logic
4. Database layer persists and retrieves data
5. Server returns responses to client
6. Client updates UI based on response data

## 3. Key Components

### 3.1 Frontend Components

#### 3.1.1 Pages

The application includes several key pages:

- `Dashboard`: Overview of system activities and statistics
- `AIAgents`: Management of AI agents and their configurations
- `CitizenRequests`: Handling citizen requests and inquiries
- `Meetings`: Managing meeting protocols and their analysis
- `Documents`: Document management and processing
- `Tasks`: Task tracking and management
- `Settings`: System configuration and integration settings
- `Analytics`: System analytics and reporting

#### 3.1.2 UI Components

The application includes reusable components for:

- Agent interaction (`AgentActionButtons`, `AgentResultCard`)
- Layout components (`Header`, `Sidebar`, `Footer`)
- Domain-specific components (`CitizenRequestAgentSection`, `MeetingProtocolAgentSection`)

### 3.2 Backend Components

#### 3.2.1 Core Services

- `agent-service.ts`: Central service for AI agent management and operations
- `openai.ts`: Integration with OpenAI API for AI capabilities
- `blockchain.ts`: Handles blockchain record creation and verification
- `storage.ts`: Interface and implementation for data persistence
- `activity-logger.ts`: Logging system activities for audit trails
- `system-settings.ts`: Managing system configuration

#### 3.2.2 API Routes

- `routes.ts`: Main API route definitions
- `system-api.ts`: System settings and configuration endpoints
- `database-api.ts`: Database management endpoints
- `planka-api.ts`: Integration with Planka project management
- `llm-monitoring.ts`: Monitoring LLM (Language Model) usage and performance

### 3.3 Database Schema

Key database entities include:

- `users`: User accounts and profiles
- `departments`: Organizational structure departments
- `positions`: Roles within departments
- `tasks`: Work items to be completed
- `documents`: Document metadata and content
- `agents`: AI agent configurations
- `citizen_requests`: Requests from citizens
- `blockchainRecords`: Immutable blockchain records
- `activities`: System activity logs

## 4. External Dependencies

### 4.1 Third-Party Integrations

- **OpenAI API**: Used for AI agent capabilities (text processing, summarization)
- **Moralis/Blockchain**: Integration for immutable record-keeping
- **Supabase**: Alternative database provider
- **Planka**: Project management integration

### 4.2 Key Libraries

- **Frontend**:
  - React: UI framework
  - Tailwind CSS: Styling
  - Radix UI / Shadcn: UI component library
  - React Query: Data fetching and caching
  - React Hook Form: Form handling
  - Recharts: Data visualization

- **Backend**:
  - Express: Web server framework
  - Drizzle ORM: Database access layer
  - Zod: Schema validation
  - Neon Serverless: PostgreSQL client

## 5. Deployment Strategy

The application is configured for deployment on Replit, as evidenced by the `.replit` configuration file. Key deployment aspects include:

- **Build Process**: Vite for frontend bundling, esbuild for backend transpilation
- **Environment**: Node.js with PostgreSQL database
- **Production Build**: Combined frontend/backend deployment package
- **Environment Variables**: Configuration through environment variables for API keys and database connections
- **Static Assets**: Frontend builds to dist/public folder served by Express

### 5.1 Development Environment

- **Development Server**: Combined dev server with HMR for frontend
- **Database**: PostgreSQL database (likely provisioned by Replit)
- **Tooling**: TypeScript, ESLint, and other development tools

## 6. Security Considerations

- **API Key Management**: Storage of sensitive API keys in environment variables
- **Password Handling**: Secure password storage (implied by user schema)
- **Data Validation**: Input validation using Zod schemas
- **Blockchain Integration**: Immutable record-keeping for audit purposes

## 7. Future Considerations and Improvements

The codebase suggests several areas for potential enhancements:

- Further modularization of services
- Enhanced testing coverage
- Potential for microservice architecture
- Enhanced monitoring and observability
- Scaling strategies for increased load
- Multi-language support expansion