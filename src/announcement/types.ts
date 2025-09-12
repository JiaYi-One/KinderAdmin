import { Timestamp } from 'firebase/firestore';

export interface FileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string; // ISO date string
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole?: string;
  authorAvatar: string;
  category: string;
  likes: number;
  comments: AnnouncementComment[];
  attachments?: FileAttachment[]; // Add file attachments
  isLiked: boolean;
  createdAt?: Timestamp | Date | string; // Firebase timestamp, Date, or ISO string
  updatedAt?: Timestamp | Date | string; // Firebase timestamp, Date, or ISO string
}

export interface AnnouncementComment {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  authorRole?: string;
  replies?: AnnouncementComment[]; // Make replies optional since replies are leaf nodes
  parentId?: string;
  createdAt?: Timestamp | Date | string; // Firebase timestamp, Date, or ISO string
  updatedAt?: Timestamp | Date | string; // Firebase timestamp, Date, or ISO string
}

export interface User {
  name: string;
  role: string;
  avatar?: string;
}

export interface FormData {
  title: string;
  content: string;
  category: string;
  attachments?: File[]; // Add files to form data
}

export interface NewComment {
  [key: string]: string;
} 