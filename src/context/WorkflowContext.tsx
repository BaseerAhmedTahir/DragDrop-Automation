import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Workflow, WorkflowNode } from '../types/workflow';

interface WorkflowHistory {
  [workflowId: string]: {
    past: Workflow[];
    present: Workflow;
    future: Workflow[];
  };
}

interface WorkflowContextType {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  createWorkflow: (name: string) => Promise<Workflow>;
  updateWorkflow: (id: string, workflow: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  toggleWorkflow: (id: string) => Promise<void>;
  refreshWorkflows: () => Promise<void>;
  importWorkflow: (workflowData: Partial<Workflow>) => Promise<Workflow>;
  undoWorkflow: (id: string) => Promise<void>;
  redoWorkflow: (id: string) => Promise<void>;
  canUndo: (id: string) => boolean;
  canRedo: (id: string) => boolean;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

interface WorkflowProviderProps {
  children: ReactNode;
}

export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistory>({});

  // Fetch workflows from Supabase
  const fetchWorkflows = async () => {
    if (!user) {
      setWorkflows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform database records to frontend format
      const transformedWorkflows: Workflow[] = (data || []).map(record => ({
        id: record.id,
        name: record.name,
        enabled: record.enabled,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        lastRunAt: record.last_run_at,
        nodes: Array.isArray(record.nodes) ? record.nodes : [],
        connections: Array.isArray(record.connections) ? record.connections : []
      }));

      setWorkflows(transformedWorkflows);

      // Initialize history for each workflow
      const newHistory: WorkflowHistory = {};
      transformedWorkflows.forEach(workflow => {
        newHistory[workflow.id] = {
          past: [],
          present: workflow,
          future: []
        };
      });
      setWorkflowHistory(newHistory);
    } catch (err: any) {
      console.error('Error fetching workflows:', err);
      setError(err.message || 'Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to add workflow to history
  const addToHistory = (workflowId: string, workflow: Workflow) => {
    setWorkflowHistory(prev => {
      const current = prev[workflowId];
      if (!current) {
        return {
          ...prev,
          [workflowId]: {
            past: [],
            present: workflow,
            future: []
          }
        };
      }

      return {
        ...prev,
        [workflowId]: {
          past: [...current.past, current.present].slice(-10), // Keep only last 10 states
          present: workflow,
          future: [] // Clear future when new action is performed
        }
      };
    });
  };

  // Create a new workflow
  const createWorkflow = async (name: string): Promise<Workflow> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      const newWorkflowData = {
        user_id: user.id,
        name,
        enabled: false,
        nodes: [],
        connections: []
      };

      const { data, error: createError } = await supabase
        .from('workflows')
        .insert([newWorkflowData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      const newWorkflow: Workflow = {
        id: data.id,
        name: data.name,
        enabled: data.enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastRunAt: data.last_run_at,
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        connections: Array.isArray(data.connections) ? data.connections : []
      };

      setWorkflows(prev => [newWorkflow, ...prev]);
      addToHistory(newWorkflow.id, newWorkflow);
      return newWorkflow;
    } catch (err: any) {
      console.error('Error creating workflow:', err);
      const errorMessage = err.message || 'Failed to create workflow';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update an existing workflow
  const updateWorkflow = async (id: string, updates: Partial<Workflow>): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      // Get current workflow for history
      const currentWorkflow = workflows.find(w => w.id === id);
      if (currentWorkflow) {
        addToHistory(id, currentWorkflow);
      }

      // Prepare update data for database
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.nodes !== undefined) updateData.nodes = updates.nodes;
      if (updates.connections !== undefined) updateData.connections = updates.connections;

      const { error: updateError } = await supabase
        .from('workflows')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setWorkflows(prev => prev.map(workflow => 
        workflow.id === id 
          ? { 
              ...workflow, 
              ...updates,
              updatedAt: new Date().toISOString()
            }
          : workflow
      ));
    } catch (err: any) {
      console.error('Error updating workflow:', err);
      const errorMessage = err.message || 'Failed to update workflow';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Delete a workflow
  const deleteWorkflow = async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      setWorkflows(prev => prev.filter(workflow => workflow.id !== id));
      setWorkflowHistory(prev => {
        const newHistory = { ...prev };
        delete newHistory[id];
        return newHistory;
      });
    } catch (err: any) {
      console.error('Error deleting workflow:', err);
      const errorMessage = err.message || 'Failed to delete workflow';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Toggle workflow enabled status
  const toggleWorkflow = async (id: string): Promise<void> => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await updateWorkflow(id, { enabled: !workflow.enabled });
  };

  // Import a workflow from JSON data
  const importWorkflow = async (workflowData: Partial<Workflow>): Promise<Workflow> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      const importedWorkflowData = {
        user_id: user.id,
        name: workflowData.name || 'Imported Workflow',
        enabled: false, // Always import as disabled for safety
        nodes: Array.isArray(workflowData.nodes) ? workflowData.nodes : [],
        connections: Array.isArray(workflowData.connections) ? workflowData.connections : []
      };

      const { data, error: importError } = await supabase
        .from('workflows')
        .insert([importedWorkflowData])
        .select()
        .single();

      if (importError) {
        throw importError;
      }

      const newWorkflow: Workflow = {
        id: data.id,
        name: data.name,
        enabled: data.enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastRunAt: data.last_run_at,
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        connections: Array.isArray(data.connections) ? data.connections : []
      };

      setWorkflows(prev => [newWorkflow, ...prev]);
      addToHistory(newWorkflow.id, newWorkflow);
      return newWorkflow;
    } catch (err: any) {
      console.error('Error importing workflow:', err);
      const errorMessage = err.message || 'Failed to import workflow';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Undo workflow changes
  const undoWorkflow = async (id: string): Promise<void> => {
    const history = workflowHistory[id];
    if (!history || history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    try {
      // Update database
      await supabase
        .from('workflows')
        .update({
          nodes: previous.nodes,
          connections: previous.connections
        })
        .eq('id', id)
        .eq('user_id', user?.id);

      // Update local state
      setWorkflows(prev => prev.map(workflow => 
        workflow.id === id ? previous : workflow
      ));

      // Update history
      setWorkflowHistory(prev => ({
        ...prev,
        [id]: {
          past: newPast,
          present: previous,
          future: [history.present, ...history.future]
        }
      }));
    } catch (error) {
      console.error('Failed to undo workflow:', error);
    }
  };

  // Redo workflow changes
  const redoWorkflow = async (id: string): Promise<void> => {
    const history = workflowHistory[id];
    if (!history || history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    try {
      // Update database
      await supabase
        .from('workflows')
        .update({
          nodes: next.nodes,
          connections: next.connections
        })
        .eq('id', id)
        .eq('user_id', user?.id);

      // Update local state
      setWorkflows(prev => prev.map(workflow => 
        workflow.id === id ? next : workflow
      ));

      // Update history
      setWorkflowHistory(prev => ({
        ...prev,
        [id]: {
          past: [...history.past, history.present],
          present: next,
          future: newFuture
        }
      }));
    } catch (error) {
      console.error('Failed to redo workflow:', error);
    }
  };

  // Check if undo is available
  const canUndo = (id: string): boolean => {
    const history = workflowHistory[id];
    return history ? history.past.length > 0 : false;
  };

  // Check if redo is available
  const canRedo = (id: string): boolean => {
    const history = workflowHistory[id];
    return history ? history.future.length > 0 : false;
  };

  // Refresh workflows (public method)
  const refreshWorkflows = async (): Promise<void> => {
    await fetchWorkflows();
  };

  // Fetch workflows when user changes or component mounts
  useEffect(() => {
    fetchWorkflows();
  }, [user]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const value: WorkflowContextType = {
    workflows,
    loading,
    error,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    refreshWorkflows,
    importWorkflow,
    undoWorkflow,
    redoWorkflow,
    canUndo,
    canRedo
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflowContext = (): WorkflowContextType => {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflowContext must be used within a WorkflowProvider');
  }
  return context;
};