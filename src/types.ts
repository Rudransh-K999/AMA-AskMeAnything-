import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  email: string;
  createdAt: Date | Timestamp;
  activeFormId: string | null;
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

export interface Question {
  id: string;
  text: string;
  createdAt: Date | Timestamp;
  ipHash: string;
}
