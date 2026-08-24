import { EmailTemplateType } from "./resend";

export interface NotificationEmailDetails {
  template?: EmailTemplateType;
  subject?: string;
  previewText?: string;
  emailTitle?: string;
  emailBody?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetAudience: 'all' | 'course' | 'user' | 'inactive_7d' | 'inactive_30d' | 'new_users' | 'course_completed' | 'course_abandoned' | 'profile_test_category' | 'profile_test_completed' | 'profile_test_not_completed';
  targetId?: string; // ID do curso ou do usuário, se aplicável
  channels: ('platform' | 'push' | 'email')[];
  emailDetails?: NotificationEmailDetails;
  stats?: {
    views: number;
    opens: number;
    clicks: number;
  };
}
