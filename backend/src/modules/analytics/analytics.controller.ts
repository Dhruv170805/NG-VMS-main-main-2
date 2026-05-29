import { Response, RequestHandler } from 'express';
import * as XLSX from '@e965/xlsx';
import Visitor from '../visitor/visitor.model';
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

import { reportQueue } from '../../queues/queueSetup';

export const exportPurposeReport: RequestHandler = async (req, res) => {
  const { tenantId } = req as TenantRequest;
  try {
    const job = await reportQueue.add('export-purpose-report', { tenantId });
    res.status(202).json({ success: true, message: 'Report generation started', jobId: job.id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
