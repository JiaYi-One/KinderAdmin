export interface AnnouncementComment {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  authorRole?: 'admin' | 'teacher' | 'parent';
  replies?: AnnouncementComment[];
  parentId?: string; // For replies to identify which comment they belong to
  createdAt?: any; // Firebase timestamp
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorRole: 'admin' | 'teacher' | 'parent';
  authorAvatar?: string;
  category: string;
  likes: number;
  comments: AnnouncementComment[];
  isLiked: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface User {
  name: string;
  role: 'admin' | 'teacher' | 'parent';
  avatar?: string;
}

export interface FormData {
  title: string;
  content: string;
  category: string;
}

export interface NewComment {
  [key: string]: string;
} 