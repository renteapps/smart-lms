export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetAudience: 'all' | 'course' | 'user' | 'inactive_7d' | 'inactive_30d' | 'new_users' | 'course_completed' | 'course_abandoned';
  targetId?: string; // ID do curso ou do usuário, se aplicável
  channels: ('platform' | 'push' | 'email')[];
  stats?: {
    views: number;
    opens: number;
    clicks: number;
  };
}
