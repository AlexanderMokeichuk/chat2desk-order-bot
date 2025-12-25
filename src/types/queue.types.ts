/**
 * Message job data for queue
 */
export interface MessageJob {
  clientId: string;
  messageText: string;
  messageId: string;
}

/**
 * Outbox job data for failed Chat2Desk sends
 */
export interface OutboxJob {
  clientId: string;
  text: string;
  createdAt: number;
  attempts: number;
}
