import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  photoURL?: string;
  createdAt: Date | Timestamp;
}

export interface Question {
  id: string;
  text: string;
  createdAt: Date | Timestamp;
  reply?: string;
  repliedAt?: Date | Timestamp;
  isPublic?: boolean;
}

export interface AskDropForm {
  id: string;
  userId: string;
  slug: string;
  createdAt: Date | Timestamp;
  expiresAt: Date | Timestamp;
  questionCount: number;
  isExpired?: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
