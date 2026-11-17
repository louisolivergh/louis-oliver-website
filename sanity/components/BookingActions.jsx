'use client';

import { useToast } from '@sanity/ui';
import { CheckIcon } from './DashIcons';

/* Booked shoots are never published (that keeps them private — they hold client details and money).
   In place of "Publish", the main button just confirms everything is saved. */
export function SavedAction(props) {
  const toast = useToast();
  const exists = Boolean(props && (props.draft || props.published));
  if (!exists) {
    // a brand-new shoot is stored the moment you type or pick anything
    return {
      label: 'Not saved yet',
      icon: CheckIcon,
      disabled: true,
      title: 'Type or pick anything and the shoot saves itself.',
    };
  }
  return {
    label: 'Saved',
    icon: CheckIcon,
    tone: 'primary',
    title: 'Shoots save as you type and stay private — there’s nothing to publish.',
    onHandle: () =>
      toast.push({
        status: 'success',
        title: 'All saved',
        description: 'Shoots save as you type and stay private — only you can see them.',
      }),
  };
}
SavedAction.action = 'loSaved';
