/**
 * Webhook payload from Chat2Desk
 */
export interface Chat2DeskWebhook {
  client_id: string;
  message_id: string;
  text: string;
  timestamp?: number;
  channel?: string;

  [key: string]: unknown;
}

/**
 * Message to send via Chat2Desk API
 */
export interface Chat2DeskMessage {
  client_id: string;
  text: string;
}

/**
 * Chat2Desk API response
 */
export interface Chat2DeskResponse {
  status: string;
  data?: {
    message_id?: number;
    channel_id?: number;
    operator_id?: number;
    transport?: string;
    type?: string;
    client_id?: string;
    dialog_id?: number;
    request_id?: number;
  };
  message?: string;
}
