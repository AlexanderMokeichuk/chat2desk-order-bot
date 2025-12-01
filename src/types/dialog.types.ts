/**
 * Dialog state machine states
 */
export enum DialogState {
  INITIAL = 'INITIAL',
  WAITING_ADDRESS = 'WAITING_ADDRESS',
  WAITING_PHONE = 'WAITING_PHONE',
  WAITING_QUANTITY = 'WAITING_QUANTITY',
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
    quantity?: number;
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
  quantity?: number;
}
