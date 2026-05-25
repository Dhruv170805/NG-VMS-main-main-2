"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Settings, LogOut, Search, Activity, FileText, Menu, X, Target, Globe
} from 'lucide-react';

import { OverviewTab } from '../../components/admin/OverviewTab';
import { AnalyticsTab } from '../../components/admin/AnalyticsTab';
import { ReportsTab } from '../../components/admin/ReportsTab';
import { StaffTab } from '../../components/admin/StaffTab';
import { BlacklistTab } from '../../components/admin/BlacklistTab';
import { SettingsTab } from '../../components/admin/SettingsTab';
import { PhotoModal } from '../../components/admin/PhotoModal';
import { PassModal } from '../../components/ui/PassModal';
import { useAdminDashboard } from '../../src/hooks/useAdminDashboard';
import { useTenant } from '../TenantContext';
import styles from './admin.module.css';

const AdminDashboard: React.FC = () => {
  const { tenant, getTenantId } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    activeTab, setActiveTab,
    staffView, setStaffView,
    visitors, users, filteredBlacklist,
    employeeStats, analyticsData, analyticsTimeRange, setAnalyticsTimeRange,
    trafficChartType, setTrafficChartType,
    purposeChartType, setPurposeChartType,
    hostChartType, setHostChartType,
    previewScale, setPreviewScale,
    notificationSettings, smtpConfig, setSmtpConfig,
    purposesText, setPurposesText,
    passRulesText, setPassRulesText,
    guardConfig, setGuardConfig,
    licenseInfo, handleUpdateLicense,
    loading, exportConfig, setExportConfig,
    file, setFile,
    uploadStatus, searchQuery, setSearchQuery,
    matrixSearch, setMatrixSearch,
    blacklistSearch, setBlacklistSearch,
    emergencyContact, setEmergencyContact,
    statusFilter, setStatusFilter,
    selectedPhoto, setSelectedPhoto,
    passModalVisitor, setPassModalVisitor,
    tableTimeFilter, setTableTimeFilter,
    tableCustomFrom, setTableCustomFrom,
    tableCustomTo, setTableCustomTo,
    showAddStaff, setShowAddStaff,
    newStaff, setNewStaff,
    user, lastEvent,
    filteredVisitors,
    handleLogout, handleUpload, handleQuickExport, handleAdvancedExport, handleDownloadPurposeReport,
    saveSMTPConfig, savePurposes, savePassRules, saveEmergencyContact, saveSetting, toggleNotification, 
    handleAddStaff, handleBlacklist, fetchEncryptedId,
    removeEmployee, toggleHost, bulkToggleHost, fetchEmployeeStats,
    toggleBlacklist, deleteFromBlacklist,
    fetchVisitors, fetchBlacklist
  } = useAdminDashboard();

  return (
    <div className={styles.admin_layout}>
      <div className="bg-mesh" />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className={styles.mobile_overlay}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          x: windowWidth <= 768 
            ? (isMobileMenuOpen ? 0 : -320) 
            : 0,
          opacity: 1 
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`${styles.admin_sidebar} ${isMobileMenuOpen ? styles.mobile_open : ''}`}
      >
        <div className={styles.sidebar_top}>
          <div className={styles.admin_brand} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tenant?.logoUrl && (
              <img src={tenant.logoUrl} alt={tenant.name} width={28} height={28} style={{ objectFit: 'contain' }} />
            )}
            <span>{tenant?.name || 'NG-VMS'}</span>
          </div>
          <button className={styles.mobile_close} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className={styles.admin_nav}>
          <button 
            className={activeTab === 'overview' ? styles.active : ''} 
            onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
          >
            <Target size={20} /> System Overview
          </button>
          <button 
            className={activeTab === 'staff' ? styles.active : ''} 
            onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }}
          >
             <Users size={20} /> User Management
          </button>
          <button 
            className={activeTab === 'analytics' ? styles.active : ''} 
            onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }}
          >
            <Activity size={20} /> Traffic Analytics
          </button>

          <button 
            className={activeTab === 'reports' ? styles.active : ''} 
            onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
          >
            <FileText size={20} /> Audit Reports
          </button>
          <button 
            className={activeTab === 'blacklist' ? styles.active : ''} 
            onClick={() => { setActiveTab('blacklist'); setIsMobileMenuOpen(false); }}
          >
             <Settings size={20} /> Blocked Identities
          </button>
          <button 
            className={activeTab === 'settings' ? styles.active : ''} 
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
          >
            <Globe size={20} /> System Config
          </button>
        </nav>

        <div className={styles.admin_user_bottom}>
          <div className={styles.avatar}>{user?.name?.substring(0,2).toUpperCase() || 'AD'}</div>
          <div className={styles.user_info}>
            <p className={styles.name}>{user?.name || 'Super Admin'}</p>
            <p className={styles.role}>{user?.role || 'System Root'}</p>
          </div>
          <button className={styles.logout_trigger} onClick={handleLogout}>
            <LogOut size={16} />
          </button>
        </div>
      </motion.aside>

      <main className={styles.admin_main}>
        <header className={styles.admin_header}>
          <div className={styles.header_left}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button className={styles.hamburger_btn} onClick={() => setIsMobileMenuOpen(true)}>
                  <Menu size={24} />
                </button>
                <div className={styles.system_status_radar} style={{ marginBottom: 0 }}>
                   <div className={styles.radar_pulse} />
                   <span className={styles.status_text}>DASHBOARD</span>
                </div>
             </div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
              {activeTab === 'staff' ? 'USER MANAGEMENT' : activeTab.toUpperCase()}
            </motion.h1>

            <p>Real-time Biometric Oversight & System Governance</p>
            
            <AnimatePresence>
              {lastEvent && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={styles.live_event_pill}>
                  <Activity size={12} className={styles.live_icon} />
                  {lastEvent}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={styles.header_right}>
            {(activeTab === 'overview' || activeTab === 'blacklist') && (
              <div className={styles.search_wrapper}>
                <Search size={18} className={styles.search_icon} />
                <input 
                  type="text" 
                  className={`glass-input ${styles.search_input}`}
                  placeholder="Scan Registry..." 
                  value={activeTab === 'overview' ? searchQuery : blacklistSearch}
                  onChange={(e) => activeTab === 'overview' ? setSearchQuery(e.target.value) : setBlacklistSearch(e.target.value)}
                />
              </div>
            )}
            {activeTab === 'staff' && (
              <div style={{ background: 'rgba(0,0,0,0.05)', padding: '6px', borderRadius: '14px', display: 'flex', gap: '8px' }}>
                <button className="glass-btn" onClick={() => setStaffView('directory')} style={{ border: 'none', background: staffView === 'directory' ? 'white' : 'transparent', padding: '8px 16px' }}>
                  Create Users
                </button>
                <button className="glass-btn" onClick={() => setStaffView('config')} style={{ border: 'none', background: staffView === 'config' ? 'white' : 'transparent', padding: '8px 16px' }}>
                  Host PRIVILEGES
                </button>
              </div>
            )}
          </div>
        </header>

        <div className={styles.content_scroll}>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <OverviewTab
                key="overview"
                visitors={visitors}
                loading={loading.visitors}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                tableTimeFilter={tableTimeFilter}
                tableCustomFrom={tableCustomFrom}
                tableCustomTo={tableCustomTo}
                onSetStatusFilter={setStatusFilter}
                onSetTableTimeFilter={setTableTimeFilter}
                onSetTableCustomFrom={setTableCustomFrom}
                onSetTableCustomTo={setTableCustomTo}
                onRefresh={() => fetchVisitors(undefined, searchQuery)}
                onQuickExport={handleQuickExport}
                onGoToReports={() => setActiveTab('reports')}
                onViewPhoto={setSelectedPhoto}
                onViewPass={setPassModalVisitor}
                onBlacklist={handleBlacklist}
                onFetchEncryptedId={fetchEncryptedId}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsTab
                key="analytics"
                analyticsData={analyticsData}
                visitors={visitors}
                analyticsTimeRange={analyticsTimeRange}
                trafficChartType={trafficChartType}
                purposeChartType={purposeChartType}
                hostChartType={hostChartType}
                exportConfig={exportConfig}
                onSetAnalyticsTimeRange={setAnalyticsTimeRange}
                onSetTrafficChartType={setTrafficChartType}
                onSetPurposeChartType={setPurposeChartType}
                onSetHostChartType={setHostChartType}
                onDownloadPurposeReport={handleDownloadPurposeReport}
                onSetExportConfig={setExportConfig}
                onGoToReports={() => setActiveTab('reports')}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsTab
                key="reports"
                exportConfig={exportConfig}
                uploadStatus={uploadStatus}
                onSetExportConfig={setExportConfig}
                onAdvancedExport={handleAdvancedExport}
              />
            )}
            {activeTab === 'staff' && (
              <StaffTab
                key="staff"
                users={users}
                employeeStats={employeeStats}
                staffView={staffView}
                showAddStaff={showAddStaff}
                newStaff={newStaff}
                matrixSearch={matrixSearch}
                file={file}
                uploadStatus={uploadStatus}
                loading={loading.staff}
                onSetShowAddStaff={setShowAddStaff}
                onSetNewStaff={setNewStaff}
                onSetMatrixSearch={setMatrixSearch}
                onSetFile={setFile}
                onAddStaff={handleAddStaff}
                onRemoveEmployee={removeEmployee}
                onFetchEmployeeStats={fetchEmployeeStats}
                onToggleHost={toggleHost}
                onBulkToggleHost={bulkToggleHost}
                onUpload={handleUpload}
              />
            )}
            {activeTab === 'blacklist' && (
              <BlacklistTab
                key="blacklist"
                filteredBlacklist={filteredBlacklist}
                loading={loading.blacklist}
                blacklistSearch={blacklistSearch}
                onRefresh={() => fetchBlacklist()}
                onToggleBlacklist={toggleBlacklist}
                onDeleteFromBlacklist={deleteFromBlacklist}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab
                tenant={tenant}
                notificationSettings={notificationSettings}
                smtpConfig={smtpConfig}
                purposesText={purposesText}
                passRulesText={passRulesText}
                guardConfig={guardConfig}
                licenseInfo={licenseInfo}
                onUpdateLicense={handleUpdateLicense}
                uploadStatus={uploadStatus}
                onSetSmtpConfig={setSmtpConfig}
                onSetPurposesText={setPurposesText}
                onSetPassRulesText={setPassRulesText}
                onSetGuardConfig={setGuardConfig}
                onToggleNotification={toggleNotification}
                onSaveSMTPConfig={saveSMTPConfig}
                onSavePurposes={savePurposes}
                onSavePassRules={savePassRules}
                onSaveSetting={saveSetting}
                emergencyContact={emergencyContact}
                onSetEmergencyContact={setEmergencyContact}
                onSaveEmergencyContact={saveEmergencyContact}
                getTenantId={getTenantId}
              />
            )}
          </AnimatePresence>
        </div>

        <PhotoModal
          selectedPhoto={selectedPhoto}
          previewScale={previewScale}
          onClose={() => setSelectedPhoto(null)}
          onSetPreviewScale={setPreviewScale}
        />

        <PassModal
          isOpen={!!passModalVisitor}
          onClose={() => setPassModalVisitor(null)}
          visitor={passModalVisitor}
          tenant={tenant}
          adminRules={passRulesText.split('\n').filter(r => r.trim())}
        />
      </main>
    </div>
  );
};

export default AdminDashboard;
