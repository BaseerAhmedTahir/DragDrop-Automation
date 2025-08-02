import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// In-memory job queue
const jobQueue = [];
const executionResults = new Map();
const executingJobs = new Map();

// Import connectors
import { executeHttpRequest } from './connectors/httpConnector.js';
import { sendSlackMessage } from './connectors/slackConnector.js';
import { executeDatabaseOperation } from './connectors/databaseConnector.js';

// Execute delay node
async function executeDelay(config) {
  const { duration = 5, unit = 'seconds' } = config;
  
  let milliseconds = duration * 1000; // Default to seconds
  
  switch (unit) {
    case 'minutes':
      milliseconds = duration * 60 * 1000;
      break;
    case 'hours':
      milliseconds = duration * 60 * 60 * 1000;
      break;
  }
  
  console.log(`⏳ Delaying execution for ${duration} ${unit}`);
  
  await new Promise(resolve => setTimeout(resolve, milliseconds));
  
  return {
    success: true,
    message: `Delayed execution for ${duration} ${unit}`,
    duration: milliseconds
  };
}

// Execute conditional node
async function executeConditional(config) {
  const { conditionType, operand1, operator, operand2 } = config;
  
  console.log(`🔀 Evaluating condition: ${operand1} ${operator} ${operand2}`);
  
  let result = false;
  
  try {
    switch (operator) {
      case 'equals':
        result = operand1 === operand2;
        break;
      case 'not_equals':
        result = operand1 !== operand2;
        break;
      case 'greater_than':
        result = parseFloat(operand1) > parseFloat(operand2);
        break;
      case 'less_than':
        result = parseFloat(operand1) < parseFloat(operand2);
        break;
      case 'contains':
        result = String(operand1).includes(String(operand2));
        break;
      case 'starts_with':
        result = String(operand1).startsWith(String(operand2));
        break;
      case 'ends_with':
        result = String(operand1).endsWith(String(operand2));
        break;
      default:
        result = false;
    }
  } catch (error) {
    console.error('Error evaluating condition:', error);
    result = false;
  }
  
  console.log(`✅ Condition result: ${result}`);
  
  return {
    success: true,
    result,
    message: `Condition evaluated: ${result}`,
    condition: `${operand1} ${operator} ${operand2}`
  };
}

// Execute transform node
async function executeTransform(config) {
  const { transformationType, inputField, outputField, script } = config;
  
  console.log(`🔄 Transforming data: ${transformationType}`);
  
  // This is a simplified implementation
  // In a real scenario, you'd have access to the previous node's output
  let transformedData = {};
  
  try {
    switch (transformationType) {
      case 'JSON Parse':
        // Simulate JSON parsing
        transformedData[outputField || 'parsed_data'] = { example: 'parsed JSON' };
        break;
      case 'JSON Stringify':
        transformedData[outputField || 'stringified_data'] = '{"example":"stringified"}';
        break;
      case 'Extract Field':
        transformedData[outputField || 'extracted_value'] = 'extracted data';
        break;
      case 'Format String':
        transformedData[outputField || 'formatted_string'] = 'formatted data';
        break;
      case 'Custom Script':
        // In a real implementation, you'd safely execute the script
        transformedData[outputField || 'script_result'] = 'script executed';
        break;
      default:
        transformedData = { transformed: true };
    }
  } catch (error) {
    console.error('Error in data transformation:', error);
    throw new Error(`Data transformation failed: ${error.message}`);
  }
  
  return {
    success: true,
    data: transformedData,
    message: `Data transformed using ${transformationType}`,
    transformationType
  };
}

// Execute error handler node
async function executeErrorHandler(config) {
  const { action, message, retryCount } = config;
  
  console.log(`🚨 Error handler activated: ${action}`);
  
  try {
    switch (action) {
      case 'Log Error':
        console.log(`📝 Error logged: ${message}`);
        break;
      case 'Send Notification':
        console.log(`📧 Notification sent: ${message}`);
        break;
      case 'Retry':
        console.log(`🔄 Retry requested (count: ${retryCount})`);
        break;
      case 'Stop Workflow':
        console.log(`🛑 Workflow stopped: ${message}`);
        break;
      default:
        console.log(`❓ Unknown error action: ${action}`);
    }
    
    return {
      success: true,
      action,
      message,
      retryCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in error handler:', error);
    throw new Error(`Error handler failed: ${error.message}`);
  }
}
// Workflow execution endpoint
app.post('/api/workflows/:id/execute', async (req, res) => {
  const workflowId = req.params.id;
  const { authorization } = req.headers;
  
  try {
    // Fetch workflow from database
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Create workflow run record
    const { data: workflowRun, error: runError } = await supabase
      .from('workflow_runs')
      .insert([{
        workflow_id: workflowId,
        user_id: workflow.user_id,
        status: 'running',
        logs: []
      }])
      .select()
      .single();

    if (runError) {
      console.error('Error creating workflow run:', runError);
      return res.status(500).json({ error: 'Failed to create workflow run' });
    }

    // Add to job queue
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id: jobId,
      workflowId,
      workflow,
      runId: workflowRun.id,
      status: 'queued',
      queuedAt: new Date().toISOString(),
      position: jobQueue.length + 1
    };

    jobQueue.push(job);
    
    res.json({
      success: true,
      jobId,
      runId: workflowRun.id,
      message: 'Workflow queued for execution',
      queuePosition: job.position
    });

    // Process job queue
    processJobQueue();

  } catch (error) {
    console.error('Error queuing workflow:', error);
    res.status(500).json({ error: 'Failed to queue workflow' });
  }
});

// Get execution status
app.get('/api/workflows/:id/status', (req, res) => {
  const { jobId } = req.params;
  
  // Check if job is still in queue
  const queuedJob = jobQueue.find(job => job.id === jobId);
  if (queuedJob) {
    return res.json({
      status: queuedJob.status,
      queuePosition: jobQueue.indexOf(queuedJob) + 1,
      queueLength: jobQueue.length
    });
  }

  // Check execution results
  const result = executionResults.get(jobId);
  if (result) {
    return res.json(result);
  }

  res.status(404).json({ error: 'Job not found' });
});

// Get execution status by job ID
app.get('/api/jobs/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  
  // Check if job is still in queue
  const queuedJob = jobQueue.find(job => job.id === jobId);
  if (queuedJob) {
    return res.json({
      status: queuedJob.status,
      queuePosition: jobQueue.indexOf(queuedJob) + 1,
      queueLength: jobQueue.length
    });
  }

  // Check if job is currently executing
  const executingJob = executingJobs.get(jobId);
  if (executingJob) {
    return res.json({
      status: executingJob.status,
      message: 'Workflow is currently executing'
    });
  }

  // Check execution results
  const result = executionResults.get(jobId);
  if (result) {
    return res.json(result);
  }

  res.status(404).json({ error: 'Job not found' });
});

// Process job queue
async function processJobQueue() {
  if (jobQueue.length === 0) return;

  const job = jobQueue.shift();
  job.status = 'executing';
  job.startedAt = new Date().toISOString();
  
  // Add to executing jobs map for status tracking
  executingJobs.set(job.id, job);

  console.log(`\n🚀 Executing workflow: ${job.workflow.name} (ID: ${job.workflowId})`);
  console.log(`📋 Job ID: ${job.id}`);
  console.log(`📊 Run ID: ${job.runId}`);

  // Helper function to add log entry
  const addLog = async (level, message, nodeId = null, data = null) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId,
      data
    };

    try {
      // Fetch current logs
      const { data: currentRun } = await supabase
        .from('workflow_runs')
        .select('logs')
        .eq('id', job.runId)
        .single();

      const currentLogs = currentRun?.logs || [];
      const updatedLogs = [...currentLogs, logEntry];

      // Update logs in database
      await supabase
        .from('workflow_runs')
        .update({ logs: updatedLogs })
        .eq('id', job.runId);

      console.log(`📝 [${level.toUpperCase()}] ${message}`);
    } catch (error) {
      console.error('Error adding log entry:', error);
    }
  };
  try {
    await addLog('info', `Started workflow execution: ${job.workflow.name}`);
    const executionResult = await executeWorkflow(job.workflow, job.runId);
    
    // Update workflow run status to completed
    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.runId);

    await addLog('info', 'Workflow execution completed successfully');

    // Remove from executing jobs
    executingJobs.delete(job.id);
    
    const result = {
      jobId: job.id,
      runId: job.runId,
      workflowId: job.workflowId,
      status: 'completed',
      startedAt: job.startedAt,
      completedAt: new Date().toISOString(),
      duration: Date.now() - new Date(job.startedAt).getTime(),
      results: executionResult,
      success: true
    };

    executionResults.set(job.id, result);
    console.log(`✅ Workflow execution completed successfully`);


  } catch (error) {
    // Update workflow run status to failed
    await supabase
      .from('workflow_runs')
      .update({ 
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.runId);

    await addLog('error', `Workflow execution failed: ${error.message}`);

    // Remove from executing jobs
    executingJobs.delete(job.id);
    
    const result = {
      jobId: job.id,
      runId: job.runId,
      workflowId: job.workflowId,
      status: 'failed',
      startedAt: job.startedAt,
      completedAt: new Date().toISOString(),
      duration: Date.now() - new Date(job.startedAt).getTime(),
      error: error.message,
      success: false
    };

    executionResults.set(job.id, result);
    console.error(`❌ Workflow execution failed:`, error.message);
  }

  // Continue processing queue
  if (jobQueue.length > 0) {
    setTimeout(processJobQueue, 1000);
  }
}

// Execute workflow logic
async function executeWorkflow(workflow, runId) {
  const nodes = workflow.nodes || [];
  const results = [];

  console.log(`📊 Processing ${nodes.length} nodes...`);

  // Helper function to add log entry for this workflow run
  const addLog = async (level, message, nodeId = null, data = null) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId,
      data
    };

    try {
      // Fetch current logs
      const { data: currentRun } = await supabase
        .from('workflow_runs')
        .select('logs')
        .eq('id', runId)
        .single();

      const currentLogs = currentRun?.logs || [];
      const updatedLogs = [...currentLogs, logEntry];

      // Update logs in database
      await supabase
        .from('workflow_runs')
        .update({ logs: updatedLogs })
        .eq('id', runId);

    } catch (error) {
      console.error('Error adding log entry:', error);
    }
  };
  for (const node of nodes) {
    const startTime = Date.now();
    console.log(`\n🔄 Executing node: ${node.label} (${node.type})`);
    await addLog('info', `Starting execution of node: ${node.label}`, node.id);

    try {
      let result;

      switch (node.type) {
        case 'action':
          result = await executeAction(node, addLog);
          break;
        case 'trigger':
          result = await executeTrigger(node, addLog);
          break;
        case 'logic':
          result = await executeLogicNode(node, addLog);
          break;
        default:
          result = { success: true, message: `Processed ${node.type} node` };
      }

      const duration = Date.now() - startTime;
      const nodeResult = {
        nodeId: node.id,
        label: node.label,
        type: node.type,
        subtype: node.subtype,
        duration,
        success: true,
        result
      };

      results.push(nodeResult);
      console.log(`✅ Node completed in ${duration}ms`);
      await addLog('info', `Node completed successfully in ${duration}ms`, node.id, { result, duration });

    } catch (error) {
      const duration = Date.now() - startTime;
      const nodeResult = {
        nodeId: node.id,
        label: node.label,
        type: node.type,
        subtype: node.subtype,
        duration,
        success: false,
        error: error.message
      };

      results.push(nodeResult);
      console.error(`❌ Node failed in ${duration}ms:`, error.message);
      await addLog('error', `Node failed in ${duration}ms: ${error.message}`, node.id, { error: error.message, duration });
    }
  }

  return results;
}

// Execute logic nodes (conditional, delay, error-handler, transform)
async function executeLogicNode(node, addLog) {
  const { subtype, config } = node;

  await addLog('info', `Executing ${subtype} logic node`, node.id, { config });
  
  switch (subtype) {
    case 'conditional':
      return await executeConditional(config);
    case 'delay':
      return await executeDelay(config);
    case 'error-handler':
      return await executeErrorHandler(config);
    case 'transform':
      return await executeTransform(config);
    default:
      return { success: true, message: `Simulated ${subtype} logic node` };
  }
}
// Execute action nodes
async function executeAction(node, addLog) {
  const { subtype, config } = node;

  await addLog('info', `Executing ${subtype} action`, node.id, { config });
  switch (subtype) {
    case 'http':
      return await executeHttpRequest(config);
    case 'slack':
      return await sendSlackMessage(config);
    case 'database':
      return await executeDatabaseOperation(config);
    default:
      return { success: true, message: `Simulated ${subtype} action` };
  }
}

// Execute trigger nodes
async function executeTrigger(node, addLog) {
  const { subtype, config } = node;
  
  await addLog('info', `Processing ${subtype} trigger`, node.id, { config });

  switch (subtype) {
    case 'schedule':
      return { success: true, message: `Schedule trigger processed: ${config.interval}` };
    case 'webhook':
      return { success: true, message: `Webhook trigger processed` };
    default:
      return { success: true, message: `Simulated ${subtype} trigger` };
  }
}

// Get workflow runs for a user
app.get('/api/workflows/runs', async (req, res) => {
  const { authorization } = req.headers;
  
  if (!authorization) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  try {
    // Create a temporary supabase client with the user's token
    const userSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authorization
          }
        }
      }
    );

    const { data: runs, error } = await userSupabase
      .from('workflow_runs')
      .select(`
        *,
        workflows (
          name
        )
      `)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    res.json({ success: true, runs });
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    res.status(500).json({ error: 'Failed to fetch workflow runs' });
  }
});

// Get specific workflow run with logs
app.get('/api/workflows/runs/:runId', async (req, res) => {
  const { runId } = req.params;
  const { authorization } = req.headers;
  
  if (!authorization) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  try {
    // Create a temporary supabase client with the user's token
    const userSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authorization
          }
        }
      }
    );

    const { data: run, error } = await userSupabase
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

    if (error || !run) {
      return res.status(404).json({ error: 'Workflow run not found' });
    }

    res.json({ success: true, run });
  } catch (error) {
    console.error('Error fetching workflow run:', error);
    res.status(500).json({ error: 'Failed to fetch workflow run' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    queueLength: jobQueue.length,
    executingJobs: executingJobs.size,
    activeResults: executionResults.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AutoFlow Backend Server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  
  // Start scheduler
  import('./scheduler.js').then(({ startScheduler }) => {
    startScheduler(jobQueue);
  });
});