import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { FeedbackFormData, FeedbackStatus, FeedbackSubmission } from '../types/feedback';

export function useFeedback() {
  const [status, setStatus] = useState<FeedbackStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(async (formData: FeedbackFormData) => {
    setStatus('submitting');
    setError(null);

    const submission: FeedbackSubmission = {
      ...formData,
      page_context: window.location.pathname,
    };

    if (!supabase) {
      console.log('Feedback (dev mode):', submission);
      setStatus('success');
      return { success: true };
    }

    try {
      const { error: dbError } = await supabase
        .from('feedback')
        .insert([submission]);

      if (dbError) throw dbError;

      setStatus('success');
      return { success: true };
    } catch (err) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { submitFeedback, status, error, reset };
}
