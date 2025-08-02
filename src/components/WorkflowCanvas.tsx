import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Save, 
  Settings as SettingsIcon,
  Trash2,
  ExternalLink,
  LayoutGrid,
  Undo,
  Redo
} from 'lucide-react';
import { useWorkflowContext } from '../context/WorkflowContext';
import { WorkflowNode } from './WorkflowNode';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowNode as WorkflowNodeType } from '../types/workflow';

interface WorkflowCanvasProps {
  workflowId: string | null;
  onBack: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ workflowId, onBack }) => {
  const { workflows, loading, error, updateWorkflow, undoWorkflow, redoWorkflow, canUndo, canRedo } = useWorkflowContext();
  const [selectedNode, setSelectedNode] = useState<WorkflowNodeType | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [copiedNodes, setCopiedNodes] = useState<WorkflowNodeType[]>([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);

  // Grid snapping configuration
  const GRID_SIZE = 20;

  const workflow = workflows.find(w => w.id === workflowId);

  if (!workflow) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Workflow not found</h2>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate position relative to the canvas, accounting for scroll
    const x = e.clientX - rect.left + (canvasRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (canvasRef.current?.scrollTop || 0);

    // Check for NaN values to prevent issues with invalid drop positions
    if (isNaN(x) || isNaN(y)) {
      console.error('Invalid drop position: x or y is NaN');
      return;
    }

    try {
      const rawData = e.dataTransfer.getData('application/json');
      console.log('📦 Raw drag data:', rawData);
      
      const nodeData = JSON.parse(rawData);
      console.log('Drop nodeData:', nodeData);

      // Retrieve the latest version of the current workflow
      const latestWorkflow = workflows.find(w => w.id === workflowId);
      if (!latestWorkflow) {
        console.error('Latest workflow not found');
        return;
      }
      console.log('📋 Current workflow found:', latestWorkflow.name, 'with', latestWorkflow.nodes.length, 'nodes');

      // Apply grid snapping to drop position
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
      const newNode: WorkflowNodeType = {
        id: `node_${Date.now()}`,
        type: nodeData.type,
        subtype: nodeData.id,
        label: nodeData.label,
        x: snappedX,
        y: snappedY,
        config: {}
      };

      console.log('✨ New node created:', newNode);

      // Implement deep copy to ensure immutability
      const workflowCopy = JSON.parse(JSON.stringify(latestWorkflow));
      workflowCopy.nodes = [...workflowCopy.nodes, newNode];

      console.log('📝 Updated workflow copy - nodes count:', workflowCopy.nodes.length);
      console.log('📝 All nodes in workflow copy:', workflowCopy.nodes);

      try {
        console.log('💾 Calling updateWorkflow with workflowId:', workflowId);
        await updateWorkflow(workflowId!, workflowCopy);
        console.log('✅ updateWorkflow completed successfully');
      } catch (error) {
        console.error('❌ Failed to add node:', error);
        // Error is already handled in context and displayed via error state
      }
    } catch (error) {
      console.error('❌ Error parsing dropped node data:', error);
    }
  }, [workflows, workflowId, updateWorkflow]);

  const handleConnectionStart = useCallback((nodeId: string) => {
    setIsConnecting(true);
    setConnectingNodeId(nodeId);
  }, []);

  const handleConnectionEnd = useCallback(async (targetNodeId: string) => {
    if (!isConnecting || !connectingNodeId || connectingNodeId === targetNodeId) {
      setIsConnecting(false);
      setConnectingNodeId(null);
      return;
    }

    // Check if connection already exists
    const existingConnection = workflow.connections?.find(
      conn => conn.source === connectingNodeId && conn.target === targetNodeId
    );

    if (existingConnection) {
      setIsConnecting(false);
      setConnectingNodeId(null);
      return;
    }

    // Create new connection
    const newConnection = {
      source: connectingNodeId,
      target: targetNodeId
    };

    const updatedConnections = [...(workflow.connections || []), newConnection];

    try {
      await updateWorkflow(workflow.id, {
        ...workflow,
        connections: updatedConnections
      });
    } catch (error) {
      console.error('Failed to create connection:', error);
    }

    setIsConnecting(false);
    setConnectingNodeId(null);
  }, [isConnecting, connectingNodeId, workflow, updateWorkflow]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isConnecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left + (canvasRef.current.scrollLeft || 0),
        y: e.clientY - rect.top + (canvasRef.current.scrollTop || 0)
      });
    }
  }, [isConnecting]);

  const handleCanvasMouseUp = useCallback(() => {
    if (isConnecting) {
      setIsConnecting(false);
      setConnectingNodeId(null);
    }
  }, [isConnecting]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set dragOver to false if we're actually leaving the canvas
    // and not just entering a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    // Apply grid snapping
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the update to avoid too many database calls during dragging
    debounceTimeoutRef.current = setTimeout(async () => {
      // Retrieve the latest version of the current workflow
      const latestWorkflow = workflows.find(w => w.id === workflowId);
      if (!latestWorkflow) {
        console.error('Latest workflow not found during node move');
        return;
      }

      // If multiple nodes are selected, move them all relative to the dragged node
      const updatedNodes = latestWorkflow.nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, x: snappedX, y: snappedY };
        } else if (selectedNodes.includes(node.id) && selectedNodes.includes(nodeId)) {
          // Calculate relative offset and apply to other selected nodes
          const originalNode = latestWorkflow.nodes.find(n => n.id === nodeId);
          if (originalNode) {
            const deltaX = snappedX - originalNode.x;
            const deltaY = snappedY - originalNode.y;
            return { 
              ...node, 
              x: Math.round((node.x + deltaX) / GRID_SIZE) * GRID_SIZE, 
              y: Math.round((node.y + deltaY) / GRID_SIZE) * GRID_SIZE 
            };
          }
        }
        return node;
      });

      try {
        await updateWorkflow(workflowId!, {
          ...latestWorkflow,
          nodes: updatedNodes
        });
      } catch (error) {
        console.error('Failed to update workflow:', error);
        // Error is already handled in context and displayed via error state
      }
    }, 300);
  }, [workflows, workflowId, updateWorkflow, selectedNodes, GRID_SIZE]);

  // Debug: Log workflow nodes whenever workflow changes
  useEffect(() => {
    console.log('🔍 Workflow nodes updated:', workflow.nodes);
    console.log('📊 Total nodes:', workflow.nodes.length);
    if (workflow.nodes.length > 0) {
      console.log('📍 Node positions:', workflow.nodes.map(node => ({
        id: node.id,
        label: node.label,
        x: node.x,
        y: node.y
      })));
    }
  }, [workflow]);

  // Cleanup effect for debounce timeout
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyNodes = useCallback(() => {
    if (selectedNodes.length > 0) {
      const nodesToCopy = workflow.nodes.filter(node => selectedNodes.includes(node.id));
      setCopiedNodes(nodesToCopy);
    }
  }, [selectedNodes, workflow.nodes]);

  const handlePasteNodes = useCallback(async () => {
    if (copiedNodes.length === 0) return;

    const newNodes = copiedNodes.map(node => ({
      ...node,
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: node.x + 50,
      y: node.y + 50
    }));

    try {
      await updateWorkflow(workflow.id, {
        ...workflow,
        nodes: [...workflow.nodes, ...newNodes]
      });
    } catch (error) {
      console.error('Failed to paste nodes:', error);
    }
  }, [copiedNodes, workflow, updateWorkflow]);

  const handleDeleteSelectedNodes = useCallback(async () => {
    if (selectedNodes.length === 0) return;

    const updatedNodes = workflow.nodes.filter(node => !selectedNodes.includes(node.id));
    const updatedConnections = workflow.connections?.filter(
      conn => !selectedNodes.includes(conn.source) && !selectedNodes.includes(conn.target)
    ) || [];

    try {
      await updateWorkflow(workflow.id, {
        ...workflow,
        nodes: updatedNodes,
        connections: updatedConnections
      });
      setSelectedNodes([]);
      if (selectedNode && selectedNodes.includes(selectedNode.id)) {
        setSelectedNode(null);
      }
    } catch (error) {
      console.error('Failed to delete nodes:', error);
    }
  }, [selectedNodes, workflow, updateWorkflow, selectedNode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault();
            handleCopyNodes();
            break;
          case 'v':
            e.preventDefault();
            handlePasteNodes();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redoWorkflow(workflow.id);
            } else {
              undoWorkflow(workflow.id);
            }
            break;
          case 'y':
            e.preventDefault();
            redoWorkflow(workflow.id);
            break;
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelectedNodes();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyNodes, handlePasteNodes, handleDeleteSelectedNodes, undoWorkflow, redoWorkflow, workflow.id]);

  const handleNodeDelete = async (nodeId: string) => {
    const updatedNodes = workflow.nodes.filter(node => node.id !== nodeId);
    const updatedConnections = workflow.connections?.filter(
      conn => conn.source !== nodeId && conn.target !== nodeId
    ) || [];
    
    try {
      await updateWorkflow(workflow.id, {
        ...workflow,
        nodes: updatedNodes,
        connections: updatedConnections
      });
    } catch (error) {
      console.error('Failed to update workflow:', error);
      // Error is already handled in context and displayed via error state
    }

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleAutoLayout = useCallback(async () => {
    if (workflow.nodes.length === 0) return;

    const GRID_SIZE = 300;
    const PADDING = 50;
    const nodesPerRow = Math.ceil(Math.sqrt(workflow.nodes.length));

    const updatedNodes = workflow.nodes.map((node, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      
      return {
        ...node,
        x: PADDING + col * GRID_SIZE,
        y: PADDING + row * GRID_SIZE
      };
    });

    try {
      await updateWorkflow(workflow.id, {
        ...workflow,
        nodes: updatedNodes
      });
    } catch (error) {
      console.error('Failed to auto-layout nodes:', error);
    }
  }, [workflow, updateWorkflow]);

  const handleExecuteWorkflow = async () => {
    if (workflow.nodes.length === 0) return;

    setIsExecuting(true);
    setExecutionStatus('Queuing workflow for execution...');
    setExecutionResult(null);

    try {
      // Get backend URL from environment or use default
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      // Call backend API to execute workflow
      const response = await fetch(`${backendUrl}/api/workflows/${workflow.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setExecutionStatus(`Workflow queued successfully (Position: ${result.queuePosition})`);
        
        // Poll for execution status
        const pollStatus = async (jobId: string) => {
          try {
            const statusResponse = await fetch(`${backendUrl}/api/jobs/${jobId}/status`);
            
            if (statusResponse.ok) {
              const statusResult = await statusResponse.json();
              
              if (statusResult.status === 'queued') {
                setExecutionStatus(`Queued (Position: ${statusResult.queuePosition})`);
                setTimeout(() => pollStatus(jobId), 2000); // Poll every 2 seconds
              } else if (statusResult.status === 'executing') {
                setExecutionStatus('Executing workflow...');
                setTimeout(() => pollStatus(jobId), 1000); // Poll more frequently during execution
              } else if (statusResult.status === 'completed') {
                setExecutionStatus('Execution completed successfully!');
                setExecutionResult(statusResult);
                setIsExecuting(false);
              } else if (statusResult.status === 'failed') {
                setExecutionStatus(`Execution failed: ${statusResult.error || 'Unknown error'}`);
                setExecutionResult(statusResult);
                setIsExecuting(false);
              }
            } else {
              console.error(`Status check failed: ${statusResponse.status}`);
              setExecutionStatus('Error checking execution status');
              setIsExecuting(false);
            }
          } catch (error) {
            console.error('Error polling status:', error);
            setExecutionStatus('Error checking execution status');
            setIsExecuting(false);
          }
        };
        
        // Start polling after a short delay
        setTimeout(() => pollStatus(result.jobId), 1000);
      } else {
        setExecutionStatus('Failed to queue workflow');
        setIsExecuting(false);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      setExecutionStatus(`Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsExecuting(false);
    }
  };

  const handleSaveWorkflow = () => {
    // Workflows are auto-saved through context when changes are made
    if (error) {
      // Error is already displayed in the UI via error state
      console.error('Workflow has errors:', error);
    } else {
      // Show a temporary success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      successMessage.textContent = 'Workflow saved successfully!';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{workflow.name}</h1>
              <p className="text-sm text-gray-600">{workflow.nodes.length} nodes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => undoWorkflow(workflow.id)}
              disabled={!canUndo(workflow.id)}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Undo className="w-4 h-4" />
              <span>Undo</span>
            </button>
            <button
              onClick={() => redoWorkflow(workflow.id)}
              disabled={!canRedo(workflow.id)}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Redo className="w-4 h-4" />
              <span>Redo</span>
            </button>
            <button
              onClick={handleAutoLayout}
              disabled={workflow.nodes.length === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Auto-layout</span>
            </button>
            <button
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || workflow.nodes.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>{isExecuting ? 'Running...' : 'Run'}</span>
            </button>
            {executionStatus && (
              <div className={`text-sm px-3 py-1 rounded-lg ${
                executionStatus.includes('failed') || executionStatus.includes('Error') 
                  ? 'text-red-600 bg-red-50' 
                  : executionStatus.includes('completed successfully')
                  ? 'text-green-600 bg-green-50'
                  : 'text-blue-600 bg-blue-50'
              }`}>
                {executionStatus}
              </div>
            )}
            {executionResult && (
              <button
                onClick={() => {
                  // Show execution details in a modal or expand view
                  console.log('Execution Result:', executionResult);
                  alert(`Execution Details:\n${JSON.stringify(executionResult, null, 2)}`);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>View Details</span>
              </button>
            )}
            <button
              onClick={handleSaveWorkflow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex bg-gray-50">
        {/* Canvas */}
        <div
          ref={canvasRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className={`workflow-canvas relative overflow-auto z-10 min-h-screen ${isDragOver ? 'bg-blue-50' : 'bg-white'} border-gray-200 border w-full flex-1 transition-colors duration-200`}
          style={{ cursor: isDragOver ? 'copy' : isConnecting ? 'crosshair' : 'default' }}
        >
          {/* Debug: Node count display */}
          <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium z-50">
            Nodes: {workflow.nodes.length}
          </div>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#3b82f6"
                />
              </marker>
            </defs>
            
            {workflow.connections?.map((connection, index) => {
              const sourceNode = workflow.nodes.find(n => n.id === connection.source);
              const targetNode = workflow.nodes.find(n => n.id === connection.target);
              
              if (!sourceNode || !targetNode) return null;

              const sourceX = sourceNode.x + 120;
              const sourceY = sourceNode.y + 40;
              const targetX = targetNode.x;
              const targetY = targetNode.y + 40;

              return (
                <path
                  key={index}
                  d={`M ${sourceX} ${sourceY} C ${sourceX + 50} ${sourceY}, ${targetX - 50} ${targetY}, ${targetX} ${targetY}`}
                  className="workflow-connection"
                />
              );
            }) || []}
            
            {/* Temporary connection line while dragging */}
            {isConnecting && connectingNodeId && (
              (() => {
                const sourceNode = workflow.nodes.find(n => n.id === connectingNodeId);
                if (!sourceNode) return null;
                
                const sourceX = sourceNode.x + 240; // Node width + handle offset
                const sourceY = sourceNode.y + 60; // Node height / 2
                
                return (
                  <path
                    d={`M ${sourceX} ${sourceY} C ${sourceX + 50} ${sourceY}, ${mousePosition.x - 50} ${mousePosition.y}, ${mousePosition.x} ${mousePosition.y}`}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                    className="pointer-events-none"
                  />
                );
              })()
            )}
          </svg>

          {workflow.nodes.map((node) => (
            <WorkflowNode
              key={node.id}
              node={node}
              isSelected={selectedNode?.id === node.id}
              isExecuting={false}
              isConnecting={isConnecting}
              connectingNodeId={connectingNodeId}
              onSelect={setSelectedNode}
              onMove={handleNodeMove}
              onDelete={handleNodeDelete}
              onConnectionStart={handleConnectionStart}
              onConnectionEnd={handleConnectionEnd}
            />
          ))}

          {workflow.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <SettingsIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start building your workflow</h3>
                <p className="text-gray-600">Drag nodes from the sidebar to create your automation</p>
              </div>
            </div>
          )}
        </div>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onConfigChange={(config) => {
              try {
                const updatedNodes = workflow.nodes.map(node =>
                  node.id === selectedNode.id ? { ...node, config } : node
                );
                
                updateWorkflow(workflow.id, {
                  ...workflow,
                  nodes: updatedNodes
                });
                
                setSelectedNode({ ...selectedNode, config });
              } catch (error) {
                console.error('Failed to update node config:', error);
              }
            }}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};