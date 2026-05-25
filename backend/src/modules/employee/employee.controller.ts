import { Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types/requests';
import { EmployeeService } from './employee.service';

export const getEmployees: RequestHandler = async (req, res) => {
  const { query, tenantId } = req as AuthRequest;
  try {
    const employees = await EmployeeService.getEmployees(query.search, tenantId!);
    res.json(employees);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEmployee: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as AuthRequest;
  try {
    await EmployeeService.deleteEmployee(params.id as string, tenantId!);
    res.json({ success: true, message: 'Employee removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleAvailability: RequestHandler = async (req, res) => {
    const { params, tenantId } = req as AuthRequest;
    try {
      const emp = await EmployeeService.toggleAvailability(params.id as string, tenantId!);
      res.json(emp);
    } catch (error: any) {
      res.status(error.message === 'Not found' ? 404 : 500).json({ success: false, message: error.message });
    }
};

export const toggleHostStatus: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as AuthRequest;
  try {
    const emp = await EmployeeService.toggleHostStatus(params.id as string, tenantId!);
    res.json(emp);
  } catch (error: any) {
    res.status(error.message === 'Not found' ? 404 : 500).json({ success: false, message: error.message });
  }
};

export const bulkToggleHostStatus: RequestHandler = async (req, res) => {
  const { body, tenantId } = req as AuthRequest;
  try {
    const { ids, isHost } = body;
    await EmployeeService.bulkToggleHostStatus(ids, isHost, tenantId!);
    res.json({ success: true, message: `Successfully updated ${ids.length} users.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeStats: RequestHandler = async (req, res) => {
  const { params, tenantId } = req as AuthRequest;
  try {
    const stats = await EmployeeService.getEmployeeStats(params.id as string, tenantId!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
