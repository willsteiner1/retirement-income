export type FeedbackCategory = 'suggestion' | 'bug' | 'question' | 'other';

export interface FeedbackFormData {
  name: string;
  email: string;
  category: FeedbackCategory;
  message: string;
}

export interface FeedbackSubmission extends FeedbackFormData {
  page_context?: string;
}

export type FeedbackStatus = 'idle' | 'submitting' | 'success' | 'error';
