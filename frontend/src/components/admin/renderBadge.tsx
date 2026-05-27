import React from 'react';
import {
  Clock, ArrowRight, XCircle, Ban, LogIn, LogOut,
  UserCheck, UserX, CheckCircle2, ShieldAlert,
} from 'lucide-react';

export const renderBadge = (status: string): React.ReactElement => {
  let s = status.toLowerCase().trim().replace(/[-\s]/g, '_');
  if (s === 'sent_for_approval') s = 'forwarded';
  if (s === 'in_meeting') s = 'meet_in';
  if (s === 'completed') s = 'gate_out';

  let label = status.replace(/_/g, ' ');
  let Icon = Clock;

  if (status === 'SENT_FOR_APPROVAL') { label = 'FORWARDED'; Icon = ArrowRight; }
  if (status === 'CANCEL_MEET') { label = 'CANCEL MEET'; Icon = XCircle; }
  if (status === 'DENIED_BLACKLIST') { label = 'BLACKLISTED'; Icon = Ban; }
  if (status === 'GATE_IN') { label = 'GATE IN'; Icon = LogIn; }
  if (status === 'GATE_OUT' || status === 'COMPLETED') { label = 'GATE OUT'; Icon = LogOut; }
  if (status === 'MEET_IN' || status === 'IN_MEETING') { label = 'MEET IN'; Icon = UserCheck; }
  if (status === 'MEET_OUT') { label = 'MEET OUT'; Icon = UserX; }
  if (status === 'APPROVED') { label = 'APPROVED'; Icon = CheckCircle2; }
  if (status === 'REJECTED') { label = 'REJECTED'; Icon = XCircle; }
  if (status === 'PENDING_GUARD') { label = 'PENDING GUARD'; Icon = ShieldAlert; }

  return (
    <span className={`v_status_badge_v2 chip_${s}`}>
      <Icon size={12} style={{ marginRight: '6px' }} />
      {label}
    </span>
  );
};
