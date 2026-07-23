export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetAudience: 'all' | 'course' | 'user';
  targetId?: string; // ID do curso ou do usuário, se aplicável
}
