import { Response, RequestHandler } from 'express';
import * as XLSX from '@e965/xlsx';
import Visitor from '../../models/Visitor';
import { TenantRequest } from '../../types/requests';
import { AnalyticsService } from './analytics.service';

export const getVisitorTraffic: RequestHandler = async (req, res) => {
  const { query, tenantId } = req as TenantRequest;
  try {
    const days = parseInt(query.days as string) || 7;
    const traffic = await AnalyticsService.getVisitorTraffic(days, tenantId!);
    res.json(traffic);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurposeDistribution: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const distribution = await AnalyticsService.getPurposeDistribution(tenantId!);
    res.json(distribution);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHostDistribution: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const distribution = await AnalyticsService.getHostDistribution(tenantId!);
    res.json(distribution);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShiftSummary: RequestHandler = async (req, res) => {
  const { query, tenantId } = req as TenantRequest;
  try {
    const summary = await AnalyticsService.getShiftSummary(query.start as string, tenantId!);
    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHourlyDensity: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const density = await AnalyticsService.getHourlyDensity(tenantId!);
    res.json(density);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDailyDistribution: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const distribution = await AnalyticsService.getDayOfWeekDistribution(tenantId!);
    res.json(distribution);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStatusDistribution: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const distribution = await AnalyticsService.getStatusDistribution(tenantId!);
    res.json(distribution);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportPurposeReport: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const distribution = await AnalyticsService.getPurposeDistribution(tenantId!);

    const data = distribution.map(item => ({
      'Purpose of Visit': item._id || 'Not Specified',
      'Total Visitors': item.count
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purpose Distribution');

    const visitors = await Visitor.find({ tenantId: tenantId! }, 'name email phone company purpose hostName createdAt status').sort({ purpose: 1 });
    const visitorData = visitors.map(v => ({
      'Purpose': v.purpose,
      'Visitor Name': v.name,
      'Email': v.email,
      'Phone': v.phone,
      'Company': v.company || 'N/A',
      'Host': v.hostName,
      'Status': v.status,
      'Date': new Date(v.createdAt).toLocaleDateString()
    }));

    const visitorWorksheet = XLSX.utils.json_to_sheet(visitorData);
    XLSX.utils.book_append_sheet(workbook, visitorWorksheet, 'Detailed Purpose Log');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=purpose_analytics_report.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
