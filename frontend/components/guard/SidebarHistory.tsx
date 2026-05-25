import React from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, MapPin, User, ShieldCheck } from 'lucide-react';
import { SkeletonCard } from '../ui/Skeleton';
import { Visitor, STATUS_CONFIG } from './types';

interface SidebarHistoryProps {
  auditHistory: Visitor[];
  isLoading: boolean;
  visitor: Visitor | null;
  searchQuery: string;
  historyFilter: string;
  setSearchQuery: (q: string) => void;
  setVisitor: (v: Visitor) => void;
  setScanStatus: (s: 'idle' | 'scanning' | 'verifying' | 'success' | 'error') => void;
  handleGrantAccess: (action: 'checkin' | 'completed' | 'forward') => void;
  handleSendAlert: (id: string, type: 'OVERSTAY' | 'POST_MEETING') => void;
  setSelectedPhoto: (photo: { url: string; title: string; isAadhaar?: boolean; id?: string }) => void;
  isAadhaarLicensed?: boolean;
}

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  auditHistory,
  isLoading,
  visitor,
  searchQuery,
  historyFilter,
  setSearchQuery,
  setVisitor,
  setScanStatus,
  handleGrantAccess,
  handleSendAlert,
  setSelectedPhoto,
  isAadhaarLicensed = false
}) => {

  const filteredHistory = auditHistory.filter(v => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(q) || 
                         v.phone.includes(q) ||
                         v.company?.toLowerCase().includes(q) ||
                         v.hostName?.toLowerCase().includes(q) ||
                         v.hostId?.name?.toLowerCase().includes(q) ||
                         v._id.toLowerCase().includes(q);
    
    if (historyFilter === 'ALL') return matchesSearch;
    if (historyFilter === 'PENDING') return v.status === 'PENDING_GUARD' && matchesSearch;
    if (historyFilter === 'OVERSTAY') {
      const isOverstay = ['GATE_IN', 'MEET_IN', 'MEET_OUT'].includes(v.status) && v.expectedCheckout && new Date(v.expectedCheckout) < new Date();
      return isOverstay && matchesSearch;
    }
    return v.status === historyFilter && matchesSearch;
  });

  return (
    <aside className="audit_sidebar_kiosk glass_panel">
      <div className="sidebar_header">
        <h3>LOGS</h3>
        <div className="search_mini_wrap">
          <Search size={14} />
          <input 
            placeholder="Search Visitor..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="live_tag">LIVE HUB</div>
      </div>

      <div className="audit_feed">
        {isLoading ? (
          [1,2,3,4].map(i => <SkeletonCard key={i} />)
        ) : (
          filteredHistory.map((entry) => (
            <motion.div 
              key={entry._id} 
              className={`feed_card_pro ${visitor?._id === entry._id ? 'selected_dossier' : ''}`}
              onClick={() => { setVisitor(entry); setScanStatus('success'); }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="feed_header">
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div className="v_photo_mini">
                    <img src={entry.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=random&color=fff`} alt={entry.name} />

                  </div>
                  <div className="visitor_meta">
                    <div className="v_codename">V-{entry._id.slice(-6).toUpperCase()}</div>
                    <div className="v_fullname">{entry.name}</div>
                    <div className="v_company_mini">{entry.company || 'Private Visit'}</div>
                  </div>
                </div>
                <div className={`v_status_badge ${STATUS_CONFIG[entry.status]?.class || 'chip_pending'}`}>
                  {STATUS_CONFIG[entry.status]?.label || entry.status.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="feed_details">
                <div className="detail_box">
                  <label><UserCheck size={10} /> Host</label>
                  <span>{entry.hostName}</span>
                </div>
                <div className="detail_box">
                  <label><MapPin size={10} /> Purpose</label>
                  <span>{entry.purpose}</span>
                </div>
              </div>

              <div className="timestamp_grid_v3">
                <div className="ts_node"><span>Applied</span><strong>{new Date(entry.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</strong></div>
                <div className={`ts_node ${entry.approvedAt ? 'active' : ''}`}><span>Approved</span><strong>{entry.approvedAt ? new Date(entry.approvedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</strong></div>
                <div className={`ts_node ${entry.checkInTime ? 'active' : ''}`}><span>GATE IN</span><strong>{entry.checkInTime ? new Date(entry.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</strong></div>
                <div className={`ts_node ${entry.meetInTime ? 'active' : ''}`}><span>MEET IN</span><strong>{entry.meetInTime ? new Date(entry.meetInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</strong></div>
                <div className={`ts_node ${entry.meetOutTime ? 'active' : ''}`}><span>MEET OUT</span><strong>{entry.meetOutTime ? new Date(entry.meetOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</strong></div>
                <div className={`ts_node ${entry.checkOutTime ? 'active' : ''}`}><span>GATE OUT</span><strong>{entry.checkOutTime ? new Date(entry.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</strong></div>
              </div>

              <div className="card_actions_area">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {entry.photoUrl && (
                    <button 
                      className="glass-btn secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.6rem', background: 'rgba(0,0,0,0.05)' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto({ url: entry.photoUrl!, title: `Visitor: ${entry.name}` }); }}
                    >
                      <User size={10} /> Photo
                    </button>
                  )}
                  {entry.idProofPhotoUrl && (
                    <button 
                      className="glass-btn secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.6rem', background: 'var(--apple-blue)', color: 'white' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto({ url: entry.idProofPhotoUrl!, title: `ID Proof: ${entry.name}` }); }}
                    >
                      <ShieldCheck size={10} /> ID Proof
                    </button>
                  )}
                  {entry.aadhaarImageUrl && (
                    <button 
                      className="glass-btn secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.6rem', background: 'var(--apple-orange)', color: 'white' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedPhoto({ url: entry.aadhaarImageUrl!, title: `Aadhaar: ${entry.name}`, isAadhaar: true, id: entry._id }); }}
                    >
                      <ShieldCheck size={10} /> Aadhaar
                    </button>
                  )}
                </div>

                {entry.status === 'PENDING_GUARD' && (
                  <button 
                    className="glass-btn primary" 
                    style={{ 
                      background: (entry.aadhaarVerified || !isAadhaarLicensed) ? 'var(--apple-blue)' : 'var(--apple-blue)', 
                      padding: '8px', 
                      fontSize: '0.65rem', 
                      opacity: (entry.aadhaarVerified || !isAadhaarLicensed) ? 1 : 0.5 
                    }} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setVisitor(entry); 
                      if (entry.aadhaarVerified || !isAadhaarLicensed) {
                        handleGrantAccess('forward');
                      } else {
                        alert('Please open details and verify Aadhaar first.');
                      }
                    }}
                  >
                    {entry.aadhaarVerified ? 'FORWARDED' : (isAadhaarLicensed ? 'REQUIRE AADHAAR' : 'FORWARD TO HOST')}
                  </button>
                )}
                {entry.status === 'APPROVED' && (
                  <button className="glass-btn primary" style={{ background: 'var(--apple-green)', padding: '8px', fontSize: '0.65rem' }} onClick={(e) => { e.stopPropagation(); setVisitor(entry); handleGrantAccess('checkin'); }}>
                    GRANT PHYSICAL ENTRY
                  </button>
                )}
                {['GATE_IN', 'MEET_IN', 'MEET_OUT', 'CHECKED_IN', 'IN_MEETING'].includes(entry.status) && (
                  <div className="action_row_inline">
                    <button className="glass-btn primary" style={{ background: 'var(--apple-red)', flex: 1, padding: '8px', fontSize: '0.65rem' }} onClick={(e) => { e.stopPropagation(); setVisitor(entry); handleGrantAccess('completed'); }}>
                      GATE OUT
                    </button>
                    {entry.expectedCheckout && new Date(entry.expectedCheckout) < new Date() && (
                      <button className="glass-btn primary" style={{ background: 'var(--apple-red)', flex: 1, padding: '8px', fontSize: '0.65rem' }} onClick={(e) => { e.stopPropagation(); handleSendAlert(entry._id, 'OVERSTAY'); }}>
                        🚨 ALERT
                      </button>
                    )}
                    {entry.status === 'MEET_OUT' && !(entry.expectedCheckout && new Date(entry.expectedCheckout) < new Date()) && (
                      <button className="glass-btn primary" style={{ background: 'var(--apple-orange)', flex: 1, padding: '8px', fontSize: '0.65rem' }} onClick={(e) => { e.stopPropagation(); handleSendAlert(entry._id, 'POST_MEETING'); }}>
                        🔔 REMIND
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </aside>
  );
};
