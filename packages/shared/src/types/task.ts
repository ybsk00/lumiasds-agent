import type { Platform } from './strategy';

export interface TaskLog {
  id: string;
  tenant_id: string;
  task_type: TaskType;
  platform: Platform | null;
  action: TaskAction;
  status: TaskStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  screenshot_url: string | null;
  approval_status: ApprovalStatus | null;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type TaskType = 'analysis' | 'strategy' | 'creative' | 'campaign' | 'report' | 'browser' | 'optimization';
export type TaskAction = 'create' | 'update' | 'delete' | 'fetch' | 'approve' | 'reject' | 'analyze';
export type TaskStatus = 'pending' | 'running' | 'waiting_approval' | 'approved' | 'rejected' | 'completed' | 'failed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revised';
