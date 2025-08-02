import React from 'react';
import { 
  LayoutDashboard, 
  Zap, 
  Settings as SettingsIcon,
  Plus,
  Mail,
  Webhook,
  Clock,
  MessageSquare,
  Send,
  Database,
  LogOut,
  GitBranch,
  Timer,
  AlertTriangle,
  Shuffle
} from 'lucide-react';
import { ViewType } from '../App';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { user, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'settings' as ViewType, label: 'Settings', icon: SettingsIcon },
  ];

  const triggerNodes = [
    { id: 'gmail', label: 'Gmail', icon: Mail, color: 'bg-red-500' },
    { id: 'webhook', label: 'Webhook', icon: Webhook, color: 'bg-blue-500' },
    { id: 'schedule', label: 'Schedule', icon: Clock, color: 'bg-purple-500' },
  ];

  const actionNodes = [
    { id: 'slack', label: 'Slack', icon: MessageSquare, color: 'bg-green-500' },
    { id: 'http', label: 'HTTP Request', icon: Send, color: 'bg-orange-500' },
    { id: 'database', label: 'Database', icon: Database, color: 'bg-indigo-500' },
  ];

  const logicNodes = [
    { id: 'conditional', label: 'Conditional', icon: GitBranch, color: 'bg-yellow-500' },
    { id: 'delay', label: 'Delay', icon: Timer, color: 'bg-pink-500' },
    { id: 'error-handler', label: 'Error Handler', icon: AlertTriangle, color: 'bg-red-600' },
    { id: 'transform', label: 'Transform Data', icon: Shuffle, color: 'bg-teal-500' },
  ];

  const handleDragStart = (e: React.DragEvent, nodeType: string, nodeData: any) => {
    console.log('Drag started from sidebar:', { nodeType, nodeData });
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: nodeType,
      ...nodeData
    }));
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">AutoFlow</h1>
        </div>
        {user && (
          <div className="mt-3 text-sm text-gray-600">
            Welcome, {user.user_metadata?.full_name || user.email}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <button
          onClick={signOut}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* Node Library */}
      {currentView === 'workflow' && (
        <div className="flex-1 p-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Triggers
            </h3>
            <div className="space-y-2">
              {triggerNodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'trigger', node)}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className={`w-8 h-8 ${node.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{node.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              {actionNodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'action', node)}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className={`w-8 h-8 ${node.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{node.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Logic & Control</h3>
            <div className="space-y-2">
              {logicNodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'logic', node)}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className={`w-8 h-8 ${node.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{node.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};