import React from 'react';
import { Users, Clock, Activity, LogOut, AlertCircle, Menu, UserPlus, Share2, Bell, Search } from 'lucide-react';
import styles from '@/app/approval/approval.module.css';
import { useTenant } from '@/context/TenantContext';

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
    <header className={`${styles.host_header} glass-card`} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
      
      {/* Left Area: Branding & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '0' }}>
        <button className={styles.hamburger_btn} onClick={onMenuToggle} style={{ background: 'var(--apple-blue)', color: 'white', border: 'none' }}>
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.6)', padding: '6px 16px 6px 6px', borderRadius: '24px', boxShadow: 'inset 0 1px 3px rgba(255,255,255,1), 0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant?.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
            ) : (
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--apple-blue)' }}>{tenant?.name?.substring(0,1) || 'V'}</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.1' }}>{tenant?.name || 'VMS Enterprise'}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--apple-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>Approval Portal</span>
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', background: 'rgba(0,0,0,0.05)', margin: '0 8px' }}></div>

        <div className={styles.host_profile} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.host_avatar} style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--apple-blue), #005bb5)' }}>
            {user?.name?.substring(0,2).toUpperCase() || '??'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.1' }}>{user?.name || 'Loading...'}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{user?.department || 'Department'}</span>
          </div>
        </div>
      </div>

      {/* Middle Area: Stats Hub */}
      <div className={styles.filter_stats_hub} style={{ flex: '1', display: 'flex', justifyContent: 'center', maxWidth: '600px' }}>
         <div className={`${styles.hub_pill} ${statusFilter === 'ALL' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('ALL')} style={{ padding: '6px 12px' }}>
            <div className={styles.hub_icon}><Users size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.all}</strong><span>ALL</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.pending_hub} ${statusFilter === 'SENT_FOR_APPROVAL' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('SENT_FOR_APPROVAL')} style={{ padding: '6px 12px' }}>
            <div className={styles.hub_icon}><Clock size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.sent_for_approval}</strong><span>PENDING</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.gate_in_hub} ${statusFilter === 'GATE_IN' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('GATE_IN')} style={{ padding: '6px 12px' }}>
            <div className={styles.hub_icon}><Activity size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.gate_in}</strong><span>GATE IN</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.overdue_hub} ${statusFilter === 'OVERSTAY' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('OVERSTAY')} style={{ padding: '6px 12px' }}>
            <div className={styles.hub_icon}><AlertCircle size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.overstay}</strong><span>OVER STAY</span></div>
         </div>
         <div className={`${styles.hub_pill} ${styles.history_hub} ${statusFilter === 'GATE_OUT' ? styles.active_hub : ''}`} onClick={() => setStatusFilter('GATE_OUT')} style={{ padding: '6px 12px' }}>
            <div className={styles.hub_icon}><LogOut size={14} /></div>
            <div className={styles.hub_data}><strong>{stats.gate_out}</strong><span>GATE OUT</span></div>
         </div>
      </div>
      
      {/* Right Area: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: '14px' }}>
          <Search size={14} color="var(--text-tertiary)" style={{ marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', width: '120px' }}
          />
        </div>

        <button 
          onClick={onInvite} 
          style={{ background: 'var(--apple-blue)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,122,255,0.3)', transition: 'all 0.3s' }}
        >
          <UserPlus size={16} /> <span className={styles.invite_text}>Invite</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? 'var(--apple-green)' : 'var(--apple-red)', boxShadow: isConnected ? '0 0 10px var(--apple-green)' : '0 0 10px var(--apple-red)', margin: '0 4px' }} />
          
          <button 
            className={`${styles.notification_trigger} ${notificationPermission === 'granted' ? styles.granted : ''}`} 
            onClick={onRequestNotifications}
            style={{ padding: '8px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <Bell size={16} />
          </button>
          
          <button 
            className={styles.logout_trigger} 
            onClick={onLogout}
            style={{ padding: '8px', background: 'rgba(255,59,48,0.1)', color: 'var(--apple-red)', borderRadius: '10px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

    </header>
  );
};
