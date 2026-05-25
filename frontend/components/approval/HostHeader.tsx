import React from 'react';
import { Users, Clock, Activity, History, Search, Share2, Bell, LogOut, AlertCircle, Menu } from 'lucide-react';
import styles from '../../app/approval/approval.module.css';
import { useTenant } from '../../app/TenantContext';

interface HostHeaderProps {
  user: any;
  stats: any;
  statusFilter: string;
  setStatusFilter: (filter: any) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onInvite: () => void;
  onLogout: () => void;
  notificationPermission: string;
  onRequestNotifications: () => void;
  isConnected: boolean;
  onMenuToggle?: () => void;
}

export const HostHeader: React.FC<HostHeaderProps> = ({
  user, stats, statusFilter, setStatusFilter, 
  searchQuery, setSearchQuery, onInvite, onLogout,
  notificationPermission, onRequestNotifications, isConnected,
  onMenuToggle
}) => {
  const { tenant } = useTenant();

  return (
    <header className={`${styles.host_header} glass-card`}>
      <div className={styles.host_profile}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className={styles.hamburger_btn} onClick={onMenuToggle}>
            <Menu size={24} />
          </button>
          {tenant?.logoUrl && (
            <img src={tenant.logoUrl} alt={tenant.name} width={36} height={36} style={{ objectFit: 'contain' }} />
          )}
          <div className={styles.host_avatar}>{user?.name?.substring(0,2).toUpperCase() || '??'}</div>
        </div>
        <div className={styles.host_meta}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{user?.name || 'Loading...'}</span>
            {tenant?.name && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--apple-blue)', background: 'rgba(0,122,255,0.1)', padding: '2px 8px', borderRadius: '8px' }}>{tenant.name}</span>}
          </h2>
          <p>💼 {user?.role || 'Staff'}</p>
          <p>🏢 {user?.department || 'Department'}</p>
        </div>
      </div>

      <div className={styles.filter_stats_hub}>
         <div className={`${styles.hub_pill} ${statusFilter === 'ALL' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('ALL')}>
            <div className={styles.hub_icon}><Users size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.all}</strong><span>ALL</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.pending_hub} ${statusFilter === 'SENT_FOR_APPROVAL' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('SENT_FOR_APPROVAL')}>
            <div className={styles.hub_icon}><Clock size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.sent_for_approval}</strong><span>PENDING</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.gate_in_hub} ${statusFilter === 'GATE_IN' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('GATE_IN')}>
            <div className={styles.hub_icon}><Activity size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.gate_in}</strong><span>GATE IN</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.overdue_hub} ${statusFilter === 'OVERSTAY' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('OVERSTAY')}>
            <div className={styles.hub_icon}><AlertCircle size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.overstay}</strong><span>OVER STAY</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.history_hub} ${statusFilter === 'GATE_OUT' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('GATE_OUT')}>
            <div className={styles.hub_icon}><LogOut size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.gate_out}</strong><span>GATE OUT</span></div>
         </div>
      </div>
      
      <div className={styles.header_controls}>
        <div className={styles.search_mini_wrap}>
          <Search size={14} />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className={styles.system_badge}>
         <button className={styles.notification_trigger} onClick={onInvite} style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--apple-blue)', padding: '8px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={16} /> Invite
         </button>
         <div className={`${styles.pulse_dot} ${isConnected ? styles.online : styles.offline}`} style={{ marginLeft: '8px' }} />
         <button className={`${styles.notification_trigger} ${notificationPermission === 'granted' ? styles.granted : ''}`} onClick={onRequestNotifications}>
            <Bell size={16} />
         </button>
         <button className={styles.logout_trigger} onClick={onLogout}><LogOut size={16} /></button>
      </div>
    </header>
  );
};
