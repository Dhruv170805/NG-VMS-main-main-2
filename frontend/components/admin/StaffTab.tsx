"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Download, FileText, Search, Info,
  ShieldCheck, Ban, UploadCloud,
} from 'lucide-react';
import { Employee } from './types';
import styles from '../../app/admin/admin.module.css';

interface Props {
  users: Employee[];
  employeeStats: Record<string, any>;
  staffView: 'directory' | 'config';
  showAddStaff: boolean;
  newStaff: { name: string; email: string; password: string; department: string; role: string };
  matrixSearch: string;
  file: File | null;
  uploadStatus: { message: string; type: string };
  loading: boolean;
  onSetShowAddStaff: (v: boolean) => void;
  onSetNewStaff: (s: any) => void;
  onSetMatrixSearch: (q: string) => void;
  onSetFile: (f: File | null) => void;
  onAddStaff: (e: React.FormEvent) => void;
  onRemoveEmployee: (id: string) => void;
  onFetchEmployeeStats: (id: string) => void;
  onToggleHost: (id: string) => void;
  onBulkToggleHost: (isHost: boolean) => void;
  onUpload: () => void;
}

export const StaffTab: React.FC<Props> = ({
  users,
  employeeStats,
  staffView,
  showAddStaff,
  newStaff,
  matrixSearch,
  file,
  uploadStatus,
  loading,
  onSetShowAddStaff,
  onSetNewStaff,
  onSetMatrixSearch,
  onSetFile,
  onAddStaff,
  onRemoveEmployee,
  onFetchEmployeeStats,
  onToggleHost,
  onBulkToggleHost,
  onUpload,
}) => (
  <motion.div
    key="staff"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={styles.staff_view}
  >
    <AnimatePresence mode="wait">
      {staffView === 'directory' && (
        <motion.div key="dir" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
          {/* Add Staff Form */}
          <AnimatePresence>
            {showAddStaff && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`glass-card ${styles.form_card}`}
                style={{ padding: '32px', marginBottom: '32px', overflow: 'hidden' }}
              >
                <div className={styles.form_header}>
                  <div className={styles.title_stack}>
                    <h3>Initialize New User Credentials</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.5, fontWeight: 600 }}>Provision system access and biometric identity</p>
                  </div>
                  <button className="text-btn" onClick={() => onSetShowAddStaff(false)}>Close Portal</button>
                </div>

                <form onSubmit={onAddStaff} className={styles.staff_form}>
                  <div className={styles.form_grid_wrapper}>
                    <div className={styles.form_input_stack}>
                      <div className={styles.form_grid_3} style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className={styles.input_with_label}>
                          <label>Full Name</label>
                          <input className="glass-input" placeholder="e.g. John Wick" value={newStaff.name} onChange={(e) => onSetNewStaff({ ...newStaff, name: e.target.value })} required />
                        </div>
                        <div className={styles.input_with_label}>
                          <label>Email Address</label>
                          <input className="glass-input" placeholder="john@continental.com" type="email" value={newStaff.email} onChange={(e) => onSetNewStaff({ ...newStaff, email: e.target.value })} required />
                        </div>
                      </div>

                      <div className={styles.form_grid_3} style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className={styles.input_with_label}>
                          <label>Security Password</label>
                          <input className="glass-input" placeholder="••••••••" type="password" value={newStaff.password} onChange={(e) => onSetNewStaff({ ...newStaff, password: e.target.value })} required />
                        </div>
                        <div className={styles.input_with_label}>
                          <label>Department / Office</label>
                          <input className="glass-input" placeholder="Management" value={newStaff.department} onChange={(e) => onSetNewStaff({ ...newStaff, department: e.target.value })} required />
                        </div>
                      </div>

                      <div className={styles.input_with_label}>
                        <label>Access Role</label>
                        <select className="glass-input" value={newStaff.role} onChange={(e) => onSetNewStaff({ ...newStaff, role: e.target.value })}>
                          <option value="STAFF">Building Staff (Standard)</option>
                          <option value="GUARD">Security Guard (Gate Ops)</option>
                          <option value="RECEPTIONIST">Receptionist (Front Desk)</option>
                          <option value="ADMIN">System Administrator (Root)</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.form_side_info}>
                      <h4><ShieldCheck size={16} /> Security Protocol</h4>
                      <p>Passwords must be shared securely. New users will be required to change their credentials upon first deployment.</p>
                      <div style={{ flex: 1 }} />
                      <button className="glass-btn primary" style={{ width: '100%' }}>Provision Account</button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Staff Table */}
          <div className={`glass-card ${styles.registry_card}`} style={{ marginBottom: '40px' }}>
            <div className={styles.table_header}>
              <h3>User Control Center</h3>
              <div className={styles.header_actions}>
                <button className="glass-btn primary small" onClick={() => onSetShowAddStaff(true)}>
                  <Plus size={16} /> Add User
                </button>
                <button
                  className="glass-btn secondary small"
                  onClick={() => {
                    const el = document.getElementById('import_section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Download size={16} /> Import Users
                </button>
              </div>
            </div>
            <div className={styles.table_container}>
              <table className={styles.glass_table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Access Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((p) => (
                    <React.Fragment key={p._id}>
                      <tr className={styles.audit_row}>
                        <td>
                          <div className={styles.profile_cell}>
                            <div className={styles.profile_initials}>{p.name[0]}</div>
                            <div className={styles.profile_details}>
                              <span className={styles.name_text}>{p.name}</span>
                              <span className={styles.sub_text}>{p.email}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.department}</td>
                        <td><span className="badge">{p.role}</span></td>
                        <td>
                          <span className={styles.status_dot} style={{ background: p.isAvailable ? 'var(--apple-green)' : 'var(--apple-red)' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.isAvailable ? 'Online' : 'Away'}</span>
                        </td>
                        <td>
                          <div className={styles.action_cell}>
                            <button
                              className={employeeStats[p._id] ? styles.action_btn_blue_active : styles.action_btn_blue}
                              onClick={() => onFetchEmployeeStats(p._id)}
                            >
                              <Info size={14} /> Stats
                            </button>
                            <button className={styles.action_btn_red} onClick={() => onRemoveEmployee(p._id)}>Terminate</button>
                          </div>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {employeeStats[p._id] && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={styles.stats_expansion_row}
                          >
                            <td colSpan={5}>
                              <div className={styles.employee_stats_drawer}>
                                <div className={styles.drawer_header}>
                                  <h4>Operational Impact: {p.name}</h4>
                                  <p>Performance metrics aggregated from system logs.</p>
                                </div>
                                <div className={styles.stats_mini_grid}>
                                  {Array.isArray(employeeStats[p._id]) && employeeStats[p._id].length > 0 ? (
                                    employeeStats[p._id].map((stat: any) => (
                                      <div key={stat._id} className={styles.mini_stat_card}>
                                        <span className={styles.stat_label}>{stat._id}</span>
                                        <span className={styles.stat_value}>{stat.total}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className={styles.no_stats_msg}>No operational logs found for this user.</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Section */}
          <div id="import_section" className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
            <div className={styles.config_header}>
              <div className={styles.config_icon_large}><UploadCloud size={48} /></div>
              <h2>Import user using excel file</h2>
              <p>Headers: &quot;name&quot;, &quot;email&quot;, &quot;department&quot;.</p>
            </div>
            <div className={styles.upload_stage}>
              <div className={styles.file_dropzone}>
                <input type="file" id="file_upload" hidden onChange={(e) => onSetFile(e.target.files?.[0] || null)} />
                <label htmlFor="file_upload" className={styles.dropzone_label}>
                  {file ? <FileText size={24} /> : <Plus size={24} />}
                  <span>{file ? file.name : 'Select Users .xlsx or .csv master file'}</span>
                </label>
              </div>
              <button className="glass-btn primary" style={{ width: '100%', marginTop: '30px' }} onClick={onUpload}>
                Import users
              </button>
              {uploadStatus.message && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${styles.status_msg} ${styles[uploadStatus.type as keyof typeof styles]}`}>
                  {uploadStatus.message}
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {staffView === 'config' && (
        <motion.div key="cfg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
          <div className={`glass-card ${styles.registry_card}`}>
            <div className={styles.table_header}>
              <div>
                <h3>HOST PRIVILEGES control center</h3>
                <p className={styles.table_subtitle}>HOST PRIVILEGES control center</p>
              </div>
              <div className={styles.header_actions}>
                <div className={styles.matrix_search}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Filter Users..."
                    value={matrixSearch}
                    onChange={(e) => onSetMatrixSearch(e.target.value)}
                  />
                </div>
                <button className="glass-btn secondary small" onClick={() => onBulkToggleHost(true)}>Approve All</button>
                <button className="glass-btn secondary small" onClick={() => onBulkToggleHost(false)}>Restrict All</button>
              </div>
            </div>
            <div className={styles.table_container}>
              <table className={styles.glass_table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Host Privileges</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((p) => p.role === 'STAFF' || p.role === 'ADMIN')
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                        p.department.toLowerCase().includes(matrixSearch.toLowerCase())
                    )
                    .map((p) => (
                      <tr key={p._id} className={styles.audit_row}>
                        <td>
                          <div className={styles.profile_cell}>
                            <div className={styles.profile_initials}>{p.name[0]}</div>
                            <div className={styles.profile_details}>
                              <span className={styles.name_text}>{p.name}</span>
                              <span className={styles.sub_text}>{p.department}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge">{p.role}</span></td>
                        <td>
                          <motion.div 
                            layout
                            className={`${styles.privilege_switch_container} ${p.isHost ? styles.active : ''}`}
                            onClick={() => onToggleHost(p._id)}
                            whileTap={{ scale: 0.96 }}
                          >
                            <AnimatePresence mode="wait">
                              <motion.span 
                                key={p.isHost ? 'active' : 'locked'}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 5 }}
                                className={styles.switch_label}
                              >
                                {p.isHost ? 'Active' : 'Locked'}
                              </motion.span>
                            </AnimatePresence>
                            <div className={`${styles.ios_toggle} ${p.isHost ? styles.active : ''}`}>
                              <div className={styles.toggle_bg_text}>
                                <span>OFF</span>
                                <span>ON</span>
                              </div>
                              <motion.div 
                                className={styles.ios_toggle_pill}
                                layout
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                {p.isHost ? <ShieldCheck size={14} strokeWidth={3} /> : <Ban size={14} strokeWidth={3} />}
                              </motion.div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);
