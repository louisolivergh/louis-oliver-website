'use client';

import { useToast } from '@sanity/ui';
import { useClient, useDocumentOperation } from 'sanity';
import { tickEnquiry } from './shootData';
import { CheckIcon } from './DashIcons';

/* Booked shoots are never published (that keeps them private, they hold client details and money).
   In place of "Publish": "Save shoot" books a new shoot in, and after that the button just confirms it's saved. */
export function SavedAction(props) {
  const toast = useToast();
  const { patch } = useDocumentOperation(props.id, props.type);
  const client = useClient({ apiVersion: '2024-10-01' });
  const doc = (props && (props.draft || props.published)) || null;

  if (!doc) {
    // a brand-new shoot is stored the moment you type or pick anything
    return {
      label: 'Save shoot',
      icon: CheckIcon,
      disabled: true,
      title: 'Fill in a detail first, then save the shoot.',
    };
  }
  if (!doc.bookedAt) {
    return {
      label: 'Save shoot',
      icon: CheckIcon,
      tone: 'primary',
      title: 'Book this shoot in. You can keep changing it afterwards.',
      onHandle: () => {
        patch.execute([{ set: { bookedAt: new Date().toISOString() } }]);
        if (doc.client && doc.client.enquiry && doc.client.enquiry._ref) tickEnquiry(client, doc.client.enquiry._ref);
        toast.push({ status: 'success', title: 'Shoot saved', description: 'It’s booked in your calendar.' });
        if (typeof props.onComplete === 'function') props.onComplete();
      },
    };
  }
  return {
    label: 'Saved',
    icon: CheckIcon,
    tone: 'primary',
    title: 'Shoots save as you type and stay private, so there’s nothing to publish.',
    onHandle: () =>
      toast.push({
        status: 'success',
        title: 'All saved',
        description: 'Shoots save as you type and stay private. Only you can see them.',
      }),
  };
}
SavedAction.action = 'loSaved';
