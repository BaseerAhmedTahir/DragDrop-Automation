import React from 'react';
import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  MoreHorizontal,
  Trash2,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  History,
  Eye,
  X,
  Download,
  Upload
} from 'lucide-react';
import { ViewType } from '../App';
import { useWorkflowContext } from '../context/WorkflowContext';
import { supabase } from '../lib/supabaseClient';

interface DashboardProps {
  onViewChange: (view: ViewType, workflowId?: string) => void;
}

interface WorkflowRun {
  id: string;
  workflow_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  workflows: {
    name: string;
  };
}
export const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { workflows, loading, error, createWorkflow, toggleWorkflow, deleteWorkflow, importWorkflow } = useWorkflowContext();
  const [isCreating, setIsCreating] = useState(false);
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch recent workflow runs
  useEffect(() => {
    const fetchRecentRuns = async () => {
      try {
        setRunsLoading(true);
        const { data: runs, error } = await supabase
          .from('workflow_runs')
          .select(`
            *,
            workflows (
              name
            )
          `)
          .order('started_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setRecentRuns(runs || []);
      } catch (error) {
        console.error('Error fetching recent runs:', error);
      } finally {
        setRunsLoading(false);
      }
    };

    fetchRecentRuns();
  }, []);

  const handleViewRunDetails = async (runId: string) => {
    try {
      const { data: run, error } = await supabase
        .from('workflow_runs')
        .select(`
          *,
          workflows (
            name,
            nodes
          )
        `)
        .eq('id', runId)
        .single();

      if (error) throw error;
      setSelectedRun(run);
      setShowRunDetails(true);
    } catch (error) {
      console.error('Error fetching run details:', error);
    }
  };
  const handleCreateWorkflow = async () => {
    try {
      setIsCreating(true);
      const newWorkflow = await createWorkflow('Untitled Workflow');
      onViewChange('workflow', newWorkflow.id);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      // Error is already handled in context and displayed via error state
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportWorkflow = (workflow: any) => {
    const exportData = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    successMessage.textContent = 'Workflow exported successfully!';
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 3000);
  };

  const handleImportWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsImporting(true);
        const text = await file.text();
        const workflowData = JSON.parse(text);
        
        // Validate basic structure
        if (!workflowData.name && !workflowData.nodes) {
          throw new Error('Invalid workflow file format');
        }

        await importWorkflow(workflowData);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMessage.textContent = 'Workflow imported successfully!';
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage);
          }
        }, 3000);
      } catch (error) {
        console.error('Failed to import workflow:', error);
        alert(`Failed to import workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  const stats = [
    {
      label: 'Total Workflows',
      value: workflows.length,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Active Workflows',
      value: workflows.filter(w => w.enabled).length,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Failed Runs',
      value: recentRuns.filter(r => r.status === 'failed').length,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Pending Runs',
      value: recentRuns.filter(r => r.status === 'running').length,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (startedAt: string, completedAt: string | null) => {
    if (!completedAt) return 'Running...';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const duration = end.getTime() - start.getTime();
    return `${Math.round(duration / 1000)}s`;
  };
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your automation workflows</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleImportWorkflow}
              disabled={isImporting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>{isImporting ? 'Importing...' : 'Import Workflow'}</span>
            </button>
            <button
              onClick={handleCreateWorkflow}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{isCreating ? 'Creating...' : 'Create Workflow'}</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Workflow Runs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <History className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Recent Runs</h2>
              </div>
            </div>
          </div>
          
          {runsLoading ? (
            <div className="p-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Loading recent runs...</span>
              </div>
            </div>
          ) : recentRuns.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No workflow runs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentRuns.slice(0, 5).map((run) => (
                <div key={run.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        run.status === 'completed' ? 'bg-green-500' :
                        run.status === 'failed' ? 'bg-red-500' :
                        'bg-yellow-500 animate-pulse'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{run.workflows.name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(run.started_at).toLocaleString()} • {formatDuration(run.started_at, run.completed_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                      <button
                        onClick={() => handleViewRunDetails(run.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Workflows List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Loading workflows...</span>
              </div>
            </div>
          )}
          
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Workflows</h2>
          </div>
          
          {workflows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
              <p className="text-gray-600 mb-6">Create your first automation to get started</p>
              <button
                onClick={handleCreateWorkflow}
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Your First Workflow'}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        workflow.enabled ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Activity className={`w-6 h-6 ${
                          workflow.enabled ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{workflow.name}</h3>
                        <p className="text-sm text-gray-600">
                          {workflow.nodes.length} nodes • Created {new Date(workflow.createdAt).toLocaleDateString()}
                          {workflow.lastRunAt && (
                            <span> • Last run {new Date(workflow.lastRunAt).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        workflow.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.enabled ? 'Active' : 'Inactive'}
                      </span>
                      
                      <button
                        onClick={async () => {
                          try {
                            await toggleWorkflow(workflow.id);
                          } catch (error) {
                            console.error('Failed to toggle workflow:', error);
                            // Error is already handled in context and displayed via error state
                          }
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          workflow.enabled
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={workflow.enabled ? 'Pause workflow' : 'Start workflow'}
                      >
                        {workflow.enabled ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      
                      <button
                        onClick={() => onViewChange('workflow', workflow.id)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleExportWorkflow(workflow)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Export workflow"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={async () => {
                          const confirmDelete = window.confirm(
                            `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`
                          );
                          
                          if (confirmDelete) {
                            try {
                              await deleteWorkflow(workflow.id);
                              // Show success message
                              const successMessage = document.createElement('div');
                              successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                              successMessage.textContent = 'Workflow deleted successfully!';
                              document.body.appendChild(successMessage);
                              
                              setTimeout(() => {
                                if (document.body.contains(successMessage)) {
                                  document.body.removeChild(successMessage);
                                }
                              }, 3000);
                            } catch (error) {
                              console.error('Failed to delete workflow:', error);
                              // Error is already handled in context and displayed via error state
                            }
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run Details Modal */}
        {showRunDetails && selectedRun && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Workflow Run Details</h2>
                    <p className="text-gray-600">{selectedRun.workflows.name}</p>
                  </div>
                  <button
                    onClick={() => setShowRunDetails(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full mt-1 ${getStatusColor(selectedRun.status)}`}>
                      {selectedRun.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Duration</p>
                    <p className="text-sm text-gray-900 mt-1">{formatDuration(selectedRun.started_at, selectedRun.completed_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Started At</p>
                    <p className="text-sm text-gray-900 mt-1">{new Date(selectedRun.started_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed At</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedRun.completed_at ? new Date(selectedRun.completed_at).toLocaleString() : 'Still running'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Execution Logs</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                    {selectedRun.logs && selectedRun.logs.length > 0 ? (
                      <div className="space-y-2">
                        {selectedRun.logs.map((log: any, index: number) => (
                          <div key={index} className="flex items-start space-x-3 text-sm">
                            <span className="text-gray-500 font-mono text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              log.level === 'error' ? 'bg-red-100 text-red-800' :
                              log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-gray-900 flex-1">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center">No logs available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};