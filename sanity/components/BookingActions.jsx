'use client';

import { useToast } from '@sanity/ui';
import { useClient, useDocumentOperation } from 'sanity';
import { tickEnquiry } from './shootData';
import { saveCompanyOf } from './clientRecords';
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

/* Clients and companies hold contact details, so like shoots they're never published. A new one
   only counts once you press Save (until then it's a draft no list shows); after that the button
   just confirms it's saved, as it saves as you type. */
function useSaveAction({ props, what, ready, needs, onSave }) {
  const toast = useToast();
  const { patch } = useDocumentOperation(props.id, props.type);
  const client = useClient({ apiVersion: '2024-10-01' });
  const doc = (props && (props.draft || props.published)) || null;
  const label = `Save ${what}`;
  if (!doc || !ready(doc)) return { label, icon: CheckIcon, disabled: true, title: needs };
  if (!doc.savedAt) {
    return {
      label,
      icon: CheckIcon,
      tone: 'primary',
      title: `Add this ${what} to your clients. You can keep changing it afterwards.`,
      onHandle: async () => {
        patch.execute([{ set: { savedAt: new Date().toISOString() } }]);
        try {
          if (onSave) await onSave(client, doc);
        } catch {
          // the company can still be saved from its own page
        }
        toast.push({ status: 'success', title: what === 'client' ? 'Client saved' : 'Company saved', description: 'It’s on your Clients page now.' });
        if (typeof props.onComplete === 'function') props.onComplete();
      },
    };
  }
  return {
    label: 'Saved',
    icon: CheckIcon,
    tone: 'primary',
    title: `${what === 'client' ? 'Clients' : 'Companies'} save as you type and stay private, so there’s nothing to publish.`,
    onHandle: () => toast.push({ status: 'success', title: 'All saved', description: 'It saves as you type and stays private. Only you can see it.' }),
  };
}
const named = (d) => typeof d.name === 'string' && d.name.trim().length > 0;

export function ClientSaveAction(props) {
  return useSaveAction({
    props,
    what: 'client',
    ready: named,
    needs: 'Add their name first.',
    // the company they work for counts from now on too
    onSave: (client, doc) => (doc.company && doc.company._ref ? saveCompanyOf(client, doc.company) : null),
  });
}
ClientSaveAction.action = 'loClientSave';

export function CompanySaveAction(props) {
  return useSaveAction({ props, what: 'company', ready: named, needs: 'Add the company’s name first.' });
}
CompanySaveAction.action = 'loCompanySave';
