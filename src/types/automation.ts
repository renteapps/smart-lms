import { NotificationEmailDetails } from "./notification";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    type: 'account_created' | 'inactive' | 'course_enrolled' | 'course_abandoned' | 'course_completed';
    days: number;
    courseId?: string;
  };
  action: {
    title: string;
    message: string;
    channels: ('platform' | 'push' | 'email')[];
    emailDetails?: NotificationEmailDetails;
  };
  status: 'active' | 'paused';
  stats: {
    triggeredCount: number;
    views: number;
    opens: number;
    clicks: number;
  };
  createdAt: string;
}
