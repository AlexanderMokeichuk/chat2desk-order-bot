import { DialogState } from './dialog.types';

/**
 * Message log entry
 */
export interface MessageLog {
  clientId: string;
  messageId: string;
  text: string;
  dialogState: DialogState;
  timestamp: number;
  success: boolean;
  errorReason?: string;
}

/**
 * Dialog outcome entry
 */
export interface DialogOutcome {
  clientId: string;
  completed: boolean;
  dropoffState?: DialogState;
  totalMessages: number;
  durationSeconds: number;
}
