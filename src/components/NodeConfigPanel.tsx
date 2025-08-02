import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { WorkflowNode } from '../types/workflow';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onConfigChange: (config: Record<string, any>) => void;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onConfigChange,
  onClose
}) => {
  const [config, setConfig] = useState(node.config || {});

  const getConfigFields = () => {
    switch (node.subtype) {
      case 'gmail':
        return [
          { key: 'folder', label: 'Folder', type: 'select', options: ['Inbox', 'Sent', 'Drafts', 'Spam'] },
          { key: 'subject_filter', label: 'Subject Filter', type: 'text' },
          { key: 'sender_filter', label: 'Sender Filter', type: 'text' }
        ];
      case 'webhook':
        return [
          { key: 'url', label: 'Webhook URL', type: 'url' },
          { key: 'method', label: 'HTTP Method', type: 'select', options: ['POST', 'GET', 'PUT', 'DELETE'] },
          { key: 'headers', label: 'Headers (JSON)', type: 'textarea' }
        ];
      case 'schedule':
        return [
          { key: 'interval', label: 'Interval', type: 'select', options: ['Every 5 minutes', 'Every hour', 'Daily', 'Weekly'] },
          { key: 'timezone', label: 'Timezone', type: 'select', options: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'] }
        ];
      case 'slack':
        return [
          { key: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
          { key: 'message', label: 'Message Template', type: 'textarea', placeholder: 'Hello {{name}}!' },
          { key: 'username', label: 'Bot Username', type: 'text' }
        ];
      case 'http':
        return [
          { key: 'url', label: 'URL', type: 'url', required: true },
          { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
          { key: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
          { key: 'body', label: 'Request Body', type: 'textarea', placeholder: '{"key": "value"}' }
        ];
      case 'database':
        return [
          { key: 'operation', label: 'Operation', type: 'select', options: ['Insert', 'Update', 'Delete', 'Select'] },
          { key: 'table', label: 'Table Name', type: 'text' },
          { key: 'query', label: 'SQL Query', type: 'textarea', placeholder: 'SELECT * FROM table_name WHERE condition' }
        ];
      case 'conditional':
        return [
          { key: 'conditionType', label: 'Condition Type', type: 'select', options: ['Value Comparison', 'Exists Check', 'Custom Expression'] },
          { key: 'operand1', label: 'Left Value', type: 'text', placeholder: '{{previous_node.result}}' },
          { key: 'operator', label: 'Operator', type: 'select', options: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'starts_with', 'ends_with'] },
          { key: 'operand2', label: 'Right Value', type: 'text', placeholder: 'expected_value' }
        ];
      case 'delay':
        return [
          { key: 'duration', label: 'Duration', type: 'number', placeholder: '5' },
          { key: 'unit', label: 'Time Unit', type: 'select', options: ['seconds', 'minutes', 'hours'] }
        ];
      case 'error-handler':
        return [
          { key: 'action', label: 'Error Action', type: 'select', options: ['Log Error', 'Send Notification', 'Retry', 'Stop Workflow'] },
          { key: 'message', label: 'Error Message Template', type: 'textarea', placeholder: 'Error occurred: {{error.message}}' },
          { key: 'retryCount', label: 'Retry Count', type: 'number', placeholder: '3' }
        ];
      case 'transform':
        return [
          { key: 'transformationType', label: 'Transformation Type', type: 'select', options: ['JSON Parse', 'JSON Stringify', 'Extract Field', 'Format String', 'Custom Script'] },
          { key: 'inputField', label: 'Input Field Path', type: 'text', placeholder: 'data.result.value' },
          { key: 'outputField', label: 'Output Field Name', type: 'text', placeholder: 'transformed_value' },
          { key: 'script', label: 'Transformation Script', type: 'textarea', placeholder: 'return input.toUpperCase();' }
        ];
      default:
        return [];
    }
  };

  const fields = getConfigFields();

  const handleFieldChange = (key: string, value: any) => {
    // Basic validation
    if (key === 'url' && value && !isValidUrl(value)) {
      // Don't update if URL is invalid
      return;
    }
    
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const validateConfig = () => {
    const errors: string[] = [];
    
    fields.forEach(field => {
      if (field.required && !config[field.key]) {
        errors.push(`${field.label} is required`);
      }
      
      if (field.type === 'url' && config[field.key] && !isValidUrl(config[field.key])) {
        errors.push(`${field.label} must be a valid URL`);
      }
    });
    
    return errors;
  };
  const handleSave = () => {
    const errors = validateConfig();
    
    if (errors.length > 0) {
      alert(`Please fix the following errors:\n${errors.join('\n')}`);
      return;
    }
    
    onConfigChange(config);
    
    // Show a temporary success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    successMessage.textContent = 'Node configuration saved!';
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 2000);
  };

  const renderField = (field: any) => {
    const value = config[field.key] || '';
    const hasError = field.required && !value || (field.type === 'url' && value && !isValidUrl(value));

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          >
            <option value="">Select {field.label}</option>
            {field.options.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            rows={3}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
              hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        );
      default:
        return (
          <input
            type={field.type || 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Configure {node.label}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderField(field)}
              {field.required && !config[field.key] && (
                <p className="text-red-500 text-xs mt-1">This field is required</p>
              )}
              {field.type === 'url' && config[field.key] && !isValidUrl(config[field.key]) && (
                <p className="text-red-500 text-xs mt-1">Please enter a valid URL</p>
              )}
            </div>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No configuration options available for this node.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
};