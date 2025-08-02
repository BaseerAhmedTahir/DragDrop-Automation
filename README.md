# AutoFlow - No-Code Automation Platform

A modern no-code workflow automation platform built with React, TypeScript, Node.js, and Supabase.

## Features

- **Visual Workflow Builder**: Drag-and-drop interface for creating automation workflows
- **Real-time Execution**: Backend service for executing workflows with job queuing
- **User Authentication**: Secure user management with Supabase Auth
- **Persistent Storage**: Workflows stored in Supabase with real-time sync
- **Extensible Connectors**: Support for HTTP requests, Slack, databases, and more
- **Scheduling**: Built-in scheduler for recurring workflow execution

## Architecture

### Frontend (React + TypeScript)
- **Components**: Modular React components for UI
- **Context**: React Context for state management
- **Supabase Integration**: Real-time database operations
- **Tailwind CSS**: Modern, responsive styling

### Backend (Node.js + Express)
- **Workflow Engine**: Executes workflows with proper error handling
- **Job Queue**: In-memory queue for workflow execution
- **Scheduler**: Automatic execution of scheduled workflows
- **Connectors**: Modular system for external integrations

### Database (Supabase)
- **User Management**: Built-in authentication
- **Workflow Storage**: JSON-based workflow definitions
- **Row Level Security**: User-specific data access

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd autoflow
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Set up environment variables (see Configuration section)

5. **Run database migrations**
   - The migrations in `supabase/migrations/` will create the necessary tables
   - These run automatically when you connect to Supabase

### Configuration

#### Frontend Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:3001
```

#### Backend Environment Variables
Create a `.env` file in the `backend/` directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend development server**
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Usage

### Creating Workflows

1. **Sign up/Login**: Create an account or sign in
2. **Create Workflow**: Click "Create Workflow" on the dashboard
3. **Add Nodes**: Drag triggers and actions from the sidebar to the canvas
4. **Configure Nodes**: Click on nodes to configure their settings
5. **Save & Run**: Save your workflow and click "Run" to execute

### Available Node Types

#### Triggers
- **Gmail**: Monitor email inbox for new messages
- **Webhook**: Receive HTTP webhook calls
- **Schedule**: Run workflows on a schedule (every 5 minutes, hourly, daily, weekly)

#### Actions
- **HTTP Request**: Make HTTP calls to external APIs
- **Slack**: Send messages to Slack channels
- **Database**: Execute database operations

### Workflow Execution

Workflows are executed by the backend service with:
- **Job Queue**: Workflows are queued for execution
- **Real-time Status**: Live updates on execution progress
- **Error Handling**: Comprehensive error reporting
- **Logging**: Detailed execution logs

## Development

### Project Structure

```
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript type definitions
├── backend/               # Backend source code
│   ├── connectors/        # External service connectors
│   ├── index.js          # Main server file
│   └── scheduler.js      # Workflow scheduler
├── supabase/             # Database migrations
└── public/               # Static assets
```

### Adding New Connectors

1. Create a new file in `backend/connectors/`
2. Export an execution function
3. Add the connector to the workflow engine
4. Update the frontend node configuration

Example connector:
```javascript
export const executeMyConnector = async (config) => {
  // Implementation here
  return { success: true, data: result };
};
```

### Database Schema

The main `workflows` table structure:
- `id`: UUID primary key
- `user_id`: Foreign key to auth.users
- `name`: Workflow name
- `enabled`: Boolean for active/inactive
- `nodes`: JSONB array of workflow nodes
- `connections`: JSONB array of node connections
- `last_run_at`: Timestamp of last execution

## Deployment

### Frontend Deployment
The frontend can be deployed to any static hosting service:
```bash
npm run build
```

### Backend Deployment
The backend can be deployed to any Node.js hosting service. Make sure to:
- Set environment variables
- Configure CORS for your frontend domain
- Set up proper database connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.