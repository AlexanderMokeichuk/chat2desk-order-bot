/**
 * Dialog state machine states
 */
export enum DialogState {
  INITIAL = 'INITIAL',
  WAITING_ADDRESS = 'WAITING_ADDRESS',
  WAITING_PHONE = 'WAITING_PHONE',
  WAITING_BOTTLES = 'WAITING_BOTTLES',
  WAITING_CONFIRMATION = 'WAITING_CONFIRMATION',
  COMPLETED = 'COMPLETED',
}

/**
 * Dialog context stored in Redis
 */
export interface DialogContext {
  clientId: string;
  state: DialogState;
  data: {
    address?: string;
    phone?: string;
    bottlesCount?: number;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Dialog step data
 */
export interface DialogData {
  address?: string;
  phone?: string;
  bottlesCount?: number;
}
