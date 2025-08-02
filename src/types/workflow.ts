export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action';
  subtype: string; // gmail, slack, webhook, conditional, delay, error-handler, transform, etc.
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
  // For conditional nodes - support multiple outputs
  outputHandles?: Array<{
    id: string;
    label: string;
    condition?: string; // 'true' | 'false' for conditional nodes
  }>;
}

export interface WorkflowConnection {
  source: string;
  target: string;
  sourceHandle?: string; // For nodes with multiple outputs
  targetHandle?: string; // For nodes with multiple inputs
}

export interface Workflow {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string | null;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  logs: WorkflowExecutionLog[];
}

export interface WorkflowExecutionLog {
  nodeId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}