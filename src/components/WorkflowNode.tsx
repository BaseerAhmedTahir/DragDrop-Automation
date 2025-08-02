import React, { useState } from 'react';
import { 
  Mail, 
  Webhook, 
  Clock, 
  MessageSquare, 
  Send, 
  Database,
  Settings,
  Trash2,
  GripVertical,
  GitBranch,
  Timer,
  AlertTriangle,
  Shuffle
} from 'lucide-react';
import { WorkflowNode as WorkflowNodeType } from '../types/workflow';

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  isExecuting: boolean;
  onSelect: (node: WorkflowNodeType) => void;
  onMove: (nodeId: string, x: number, y: number) => void;
  onDelete: (nodeId: string) => void;
  onConnectionStart?: (nodeId: string) => void;
  onConnectionEnd?: (nodeId: string) => void;
  isConnecting?: boolean;
  connectingNodeId?: string;
  isSelected?: boolean;
}

const nodeIcons = {
  gmail: Mail,
  webhook: Webhook,
  schedule: Clock,
  slack: MessageSquare,
  http: Send,
  database: Database,
  conditional: GitBranch,
  delay: Timer,
  'error-handler': AlertTriangle,
  transform: Shuffle
};

const nodeColors = {
  gmail: 'bg-red-500',
  webhook: 'bg-blue-500',
  schedule: 'bg-purple-500',
  slack: 'bg-green-500',
  http: 'bg-orange-500',
  database: 'bg-indigo-500',
  conditional: 'bg-yellow-500',
  delay: 'bg-pink-500',
  'error-handler': 'bg-red-600',
  transform: 'bg-teal-500'
};

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected,
  isExecuting,
  onSelect,
  onMove,
  onDelete,
  onConnectionStart,
  onConnectionEnd,
  isConnecting = false,
  connectingNodeId
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const Icon = nodeIcons[node.subtype as keyof typeof nodeIcons] || Settings;
  const colorClass = nodeColors[node.subtype as keyof typeof nodeColors] || 'bg-gray-500';

  // Check if this is a conditional node with multiple outputs
  const isConditionalNode = node.subtype === 'conditional';

  const handleOutputMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConnectionStart) {
      onConnectionStart(node.id);
    }
  };

  const handleInputMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConnectionEnd && isConnecting && connectingNodeId !== node.id) {
      onConnectionEnd(node.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-action')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - node.x,
      y: e.clientY - node.y
    });
    onSelect(node);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    onMove(node.id, Math.max(0, newX), Math.max(0, newY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      className={`absolute bg-white rounded-lg border-2 shadow-lg cursor-move select-none transition-all ${
        isSelected ? 'border-blue-500 shadow-xl' : 'border-gray-200'
      } ${isDragging ? 'shadow-2xl scale-105' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: 240,
        zIndex: isSelected ? 10 : 1
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Execution Indicator */}
      {isExecuting && (
        <div className="execution-indicator" />
      )}

      {/* Node Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{node.label}</h3>
              <p className="text-xs text-gray-500 capitalize">{node.type}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              className="node-action p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(node);
              }}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              className="node-action p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="p-1 text-gray-400 cursor-move">
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Node Content */}
      <div className="p-4">
        <div className="text-sm text-gray-600">
          {Object.keys(node.config).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(node.config).slice(0, 2).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key}:</span>
                  <span className="font-medium truncate ml-2" title={String(value)}>
                    {String(value)}
                  </span>
                </div>
              ))}
              {Object.keys(node.config).length > 2 && (
                <div className="text-xs text-gray-400">
                  +{Object.keys(node.config).length - 2} more settings
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400 italic">Not configured</span>
          )}
        </div>
      </div>

      {/* Connection Handles */}
      <div 
        className={`node-handle input ${isConnecting && connectingNodeId !== node.id ? 'hover:bg-green-500 hover:scale-150' : ''}`}
        onMouseUp={handleInputMouseUp}
        title="Input connection point"
      />
      
      {/* Output handles - conditional nodes have multiple, others have one */}
      {isConditionalNode ? (
        <>
          <div 
            className={`node-handle output ${!isConnecting ? 'hover:bg-blue-700 hover:scale-125' : ''}`}
            style={{ right: -6, top: '30%' }}
            onMouseDown={handleOutputMouseDown}
            title="True path"
          />
          <div 
            className={`node-handle output ${!isConnecting ? 'hover:bg-blue-700 hover:scale-125' : ''}`}
            style={{ right: -6, top: '70%', backgroundColor: '#ef4444' }}
            onMouseDown={handleOutputMouseDown}
            title="False path"
          />
        </>
      ) : (
        <div 
          className={`node-handle output ${!isConnecting ? 'hover:bg-blue-700 hover:scale-125' : ''}`}
          onMouseDown={handleOutputMouseDown}
          title="Output connection point"
        />
      )}
    </div>
  );
};