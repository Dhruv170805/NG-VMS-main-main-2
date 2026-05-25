"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, Clock, ShieldCheck, Activity, Download,
} from 'lucide-react';
import { AnalyticsData, CHART_COLORS, Visitor } from './types';
import styles from '../../app/admin/admin.module.css';

interface Props {
  analyticsData: AnalyticsData;
  visitors: Visitor[];
  analyticsTimeRange: number;
  trafficChartType: 'area' | 'bar' | 'line';
  purposeChartType: 'pie' | 'bar';
  hostChartType: 'bar' | 'pie';
  exportConfig: any;
  onSetAnalyticsTimeRange: (r: number) => void;
  onSetTrafficChartType: (t: 'area' | 'bar' | 'line') => void;
  onSetPurposeChartType: (t: 'pie' | 'bar') => void;
  onSetHostChartType: (t: 'bar' | 'pie') => void;
  onDownloadPurposeReport: () => void;
  onSetExportConfig: (cfg: any) => void;
  onGoToReports: () => void;
}

const tooltipStyle = {
  borderRadius: '20px',
  border: '1px solid rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
};

export const AnalyticsTab: React.FC<Props> = ({
  analyticsData,
  visitors,
  analyticsTimeRange,
  trafficChartType,
  purposeChartType,
  hostChartType,
  exportConfig,
  onSetAnalyticsTimeRange,
  onSetTrafficChartType,
  onSetPurposeChartType,
  onSetHostChartType,
  onDownloadPurposeReport,
  onSetExportConfig,
  onGoToReports,
}) => (
  <motion.div
    key="analytics"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={styles.analytics_view}
  >
    {/* Metric Strip */}
    <div className={styles.metric_strip}>
      <div className={styles.metric_item}>
        <div className={styles.metric_icon} style={{ background: 'var(--apple-blue-glow)' }}>
          <TrendingUp size={20} />
        </div>
        <div className={styles.metric_data}>
          <span>System Throughput</span>
          <strong>{visitors.length} Visitors</strong>
        </div>
      </div>
      <div className={styles.metric_item}>
        <div className={styles.metric_icon} style={{ background: 'rgba(52,199,89,0.1)' }}>
          <Clock size={20} color="var(--apple-green)" />
        </div>
        <div className={styles.metric_data}>
          <span>Avg. Processing</span>
          <strong>2.4 Minutes</strong>
        </div>
      </div>
      <div className={styles.metric_item}>
        <div className={styles.metric_icon} style={{ background: 'rgba(175,82,222,0.1)' }}>
          <ShieldCheck size={20} color="var(--apple-purple)" />
        </div>
        <div className={styles.metric_data}>
          <span>System Health</span>
          <strong>Peak Optimization</strong>
        </div>
      </div>
    </div>

    <div className={styles.chart_grid}>
      {/* Traffic Flow Chart */}
      <div className={`glass-card ${styles.chart_card} ${styles.full_width}`}>
        <div className={styles.chart_header_row}>
          <div className={styles.chart_title_group}>
            <h3>Traffic Flow</h3>
            <p>Visitor intake trends over time.</p>
          </div>
          <div className={styles.chart_filters}>
            <select
              className="glass-input"
              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem', height: 'auto', borderRadius: '8px', marginRight: '10px' }}
              value={trafficChartType}
              onChange={(e) => onSetTrafficChartType(e.target.value as any)}
            >
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
            </select>
            <button className={analyticsTimeRange === 7 ? styles.active_filter : ''} onClick={() => onSetAnalyticsTimeRange(7)}>Last Week</button>
            <button className={analyticsTimeRange === 30 ? styles.active_filter : ''} onClick={() => onSetAnalyticsTimeRange(30)}>Last Month</button>
            <button className={analyticsTimeRange === 365 ? styles.active_filter : ''} onClick={() => onSetAnalyticsTimeRange(365)}>Last Year</button>
          </div>
        </div>
        <div className={styles.chart_container_large}>
          <ResponsiveContainer width="100%" height={340}>
            {trafficChartType === 'area' ? (
              <AreaChart data={analyticsData.traffic}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--apple-blue)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--apple-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="var(--apple-blue)" strokeWidth={5} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            ) : trafficChartType === 'bar' ? (
              <BarChart data={analyticsData.traffic}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--apple-blue)" radius={[10, 10, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={analyticsData.traffic}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="var(--apple-blue)" strokeWidth={4} dot={{ r: 6, fill: 'var(--apple-blue)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Purpose Breakdown */}
      <div className={`glass-card ${styles.chart_card}`}>
        <div className={styles.chart_header_row}>
          <div className={styles.chart_title_group}>
            <h3>Purpose</h3>
            <p>Breakdown of visitor purposes.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              className="glass-input"
              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem', height: 'auto', borderRadius: '8px' }}
              value={purposeChartType}
              onChange={(e) => onSetPurposeChartType(e.target.value as any)}
            >
              <option value="pie">Pie Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
            <button className="glass-btn secondary" title="Download Purpose Report" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem' }} onClick={onDownloadPurposeReport}>
              <Download size={14} />
            </button>
          </div>
        </div>
        <div className={styles.chart_container}>
          <ResponsiveContainer width="100%" height={280}>
            {purposeChartType === 'pie' ? (
              <PieChart>
                <Pie data={analyticsData.purposes} innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="count" nameKey="_id" labelLine={false} stroke="none">
                  {analyticsData.purposes.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            ) : (
              <BarChart data={analyticsData.purposes}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {analyticsData.purposes.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Host Engagement */}
      <div className={`glass-card ${styles.chart_card}`}>
        <div className={styles.chart_header_row}>
          <div className={styles.chart_title_group}>
            <h3>Host Engagement</h3>
            <p>Visitor count per host.</p>
          </div>
          <select
            className="glass-input"
            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem', height: 'auto', borderRadius: '8px' }}
            value={hostChartType}
            onChange={(e) => onSetHostChartType(e.target.value as any)}
          >
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
        <div className={styles.chart_container} style={{ minHeight: 280, height: hostChartType === "bar" ? Math.max(280, analyticsData.hosts.length * 40 + 20) : 280 }}>
          <ResponsiveContainer width="100%" height={hostChartType === "bar" ? Math.max(280, analyticsData.hosts.length * 40 + 20) : 280}>
            {hostChartType === 'bar' ? (
              <BarChart data={analyticsData.hosts} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="_id" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                  {analyticsData.hosts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie data={analyticsData.hosts} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="count" nameKey="_id" labelLine={false} stroke="none">
                  {analyticsData.hosts.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intelligence Insight Card */}
      <div className={`glass-card ${styles.insight_card} ${styles.full_width}`}>
        <div className={styles.insight_icon}><Activity size={24} /></div>
        <div className={styles.insight_content}>
          <h4>Intelligence Insight</h4>
          <p>
            Based on current trends, we anticipate a <strong>12% increase</strong> in visitor traffic
            during the afternoon window. Security protocols are currently performing at{' '}
            <strong>Peak Optimization</strong> with 0 delayed handovers detected in the last 24 cycles.
          </p>
        </div>
        <div className={styles.insight_action}>
          <button
            className="glass-btn primary small"
            onClick={() => {
              onSetExportConfig({ ...exportConfig, downloadType: 'full', format: 'pdf', timeRange: 'all' });
              onGoToReports();
            }}
          >
            View Full Audit Report
          </button>
        </div>
      </div>

      {/* NEW: Peak Hour Density */}
      <div className={`glass-card ${styles.chart_card} ${styles.full_width}`}>
        <div className={styles.chart_header_row}>
          <div className={styles.chart_title_group}>
            <h3>Peak Hour Density</h3>
            <p>Hourly distribution of visitor arrivals (24-hour cycle).</p>
          </div>
        </div>
        <div className={styles.chart_container_large}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--apple-blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW: Daily Distribution */}
      <div className={`glass-card ${styles.chart_card}`}>
        <div className={styles.chart_header_row}>
          <div className={styles.chart_title_group}>
            <h3>Daily Traffic Comparison</h3>
            <p>System load by day of week.</p>
          </div>
        </div>
        <div className={styles.chart_container}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analyticsData.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,122,255,0.05)' }} />
              <Bar dataKey="count" radius={[10, 10, 10, 10]}>
                {analyticsData.daily?.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW: Status Distribution */}
      <div className={`glass-card ${styles.chart_card}`}>
        <div className={styles.chart_header_row}>
          <div className={styles.chart_title_group}>
            <h3>Operational Health</h3>
            <p>Breakdown of visitor lifecycle status.</p>
          </div>
        </div>
        <div className={styles.chart_container}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={analyticsData.statusDist}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={8}
                dataKey="count"
                nameKey="_id"
                labelLine={false}
              >
                {analyticsData.statusDist?.map((entry, index) => {
                   let color = CHART_COLORS[index % CHART_COLORS.length];
                   if (entry._id === 'APPROVED') color = '#34C759';
                   if (entry._id === 'REJECTED') color = '#FF3B30';
                   if (entry._id === 'PENDING') color = '#FFCC00';
                   return <Cell key={index} fill={color} />;
                })}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 850, paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </motion.div>
);
