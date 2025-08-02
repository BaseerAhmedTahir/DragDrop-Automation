import React, { useState } from 'react';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { WorkflowProvider } from './context/WorkflowContext';
import { useAuth } from './hooks/useAuth';
import './App.css';

export type ViewType = 'dashboard' | 'workflow' | 'settings';

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  const handleViewChange = (view: ViewType, workflowId?: string) => {
    setCurrentView(view);
    if (workflowId) {
      setSelectedWorkflowId(workflowId);
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth screen if user is not authenticated
  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  const renderMainContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={handleViewChange} />;
      case 'workflow':
        return (
          <WorkflowCanvas 
            workflowId={selectedWorkflowId}
            onBack={() => handleViewChange('dashboard')}
          />
        );
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onViewChange={handleViewChange} />;
    }
  };

  return (
    <WorkflowProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar 
          currentView={currentView} 
          onViewChange={handleViewChange}
        />
        <main className="flex-1 overflow-auto bg-gray-50">
          {renderMainContent()}
        </main>
      </div>
    </WorkflowProvider>
  );
}

export default App;