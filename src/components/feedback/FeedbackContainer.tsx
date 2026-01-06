import { useState } from 'react';
import { FeedbackButton } from './FeedbackButton';
import { FeedbackModal } from './FeedbackModal';

export function FeedbackContainer() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <FeedbackButton onClick={() => setIsModalOpen(true)} />
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
