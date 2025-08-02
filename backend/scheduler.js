/**
 * Basic Scheduler for handling scheduled workflows
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// In-memory storage for last run times (in production, this should be in database)
const lastRunTimes = new Map();

// Parse schedule interval to milliseconds
const parseInterval = (interval) => {
  switch (interval) {
    case 'Every 5 minutes':
      return 5 * 60 * 1000;
    case 'Every hour':
      return 60 * 60 * 1000;
    case 'Daily':
      return 24 * 60 * 60 * 1000;
    case 'Weekly':
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000; // Default to 1 hour
  }
};

// Check if workflow should run based on schedule
const shouldRunWorkflow = (workflow) => {
  const scheduleNode = workflow.nodes.find(
    node => (node.type === 'trigger' && node.subtype === 'schedule') ||
            (node.data && node.data.type === 'trigger' && node.data.subtype === 'schedule')
  );
  
  const config = scheduleNode?.config || scheduleNode?.data?.config;
  if (!scheduleNode || !config?.interval) {
    return false;
  }

  const interval = parseInterval(config.interval);
  const lastRun = workflow.last_run_at ? new Date(workflow.last_run_at).getTime() : 0;
  const now = Date.now();
  
  return (now - lastRun) >= interval;
};

// Add workflow to execution queue
const queueWorkflowExecution = (workflowId, jobQueue) => {
  const job = {
    id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workflowId,
    status: 'queued',
    queuedAt: new Date().toISOString(),
    source: 'scheduler',
    position: jobQueue.length + 1
  };
  
  jobQueue.push(job);
  
  console.log(`⏰ Scheduled workflow ${workflowId} for execution`);
};

// Main scheduler function
export const startScheduler = (jobQueue) => {
  console.log('🕐 Starting workflow scheduler...');
  
  const checkScheduledWorkflows = async () => {
    try {
      // Fetch all enabled workflows
      const { data: workflows, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('enabled', true);
      
      if (error) {
        console.error('❌ Error fetching workflows for scheduling:', error);
        return;
      }
      
      if (!workflows || workflows.length === 0) {
        return;
      }
      
      // Check each workflow for schedule triggers
      for (const workflow of workflows) {
        const hasScheduleTrigger = workflow.nodes.some(
          node => (node.type === 'trigger' && node.subtype === 'schedule') ||
                  (node.data && node.data.type === 'trigger' && node.data.subtype === 'schedule')
        );
        
        if (hasScheduleTrigger && shouldRunWorkflow(workflow)) {
          queueWorkflowExecution(workflow.id, jobQueue);
        }
      }
      
      if (workflows.length > 0) {
        console.log(`🔍 Checked ${workflows.length} workflows for scheduled execution`);
      }
    } catch (error) {
      console.error('💥 Scheduler error:', error);
    }
  };
  
  // Check for scheduled workflows every minute
  const schedulerInterval = setInterval(checkScheduledWorkflows, 60 * 1000);
  
  // Initial check
  checkScheduledWorkflows();
  
  console.log('✅ Scheduler started - checking every minute for scheduled workflows');
  
  return () => {
    clearInterval(schedulerInterval);
    console.log('🛑 Scheduler stopped');
  };
};