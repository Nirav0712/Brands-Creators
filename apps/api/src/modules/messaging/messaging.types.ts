export interface SocketUser {
  userId: string;
  email: string;
  role: string;
  socketId: string;
}

export interface TypingEventPayload {
  conversationId: string;
  userId: string;
  userName?: string;
  isTyping: boolean;
}

export interface MessageReadEventPayload {
  conversationId: string;
  userId: string;
  readAt: string | Date;
}
