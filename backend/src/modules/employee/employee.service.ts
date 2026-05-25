import mongoose from 'mongoose';
import Employee from '../../models/Employee';
import VisitorLog from '../../models/VisitorLog';

export class EmployeeService {
  static async getEmployees(search: any, tenantId: mongoose.Types.ObjectId) {
    let query: any = { tenantId };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    return await Employee.find(query).select('-password').sort({ createdAt: -1 });
  }

  static async deleteEmployee(id: string, tenantId: mongoose.Types.ObjectId) {
    return await Employee.findOneAndDelete({ _id: id, tenantId });
  }

  static async toggleAvailability(id: string, tenantId: mongoose.Types.ObjectId) {
    const emp = await Employee.findOne({ _id: id, tenantId });
    if (!emp) throw new Error('Not found');
    
    emp.isAvailable = !emp.isAvailable;
    await emp.save();
    return emp;
  }

  static async toggleHostStatus(id: string, tenantId: mongoose.Types.ObjectId) {
    const emp = await Employee.findOne({ _id: id, tenantId });
    if (!emp) throw new Error('Not found');
    
    emp.isHost = !emp.isHost;
    await emp.save();
    return emp;
  }

  static async bulkToggleHostStatus(ids: string[], isHost: boolean, tenantId: mongoose.Types.ObjectId) {
    return await Employee.updateMany(
      { _id: { $in: ids }, tenantId },
      { $set: { isHost } }
    );
  }

  static async getEmployeeStats(id: string, tenantId: mongoose.Types.ObjectId) {
    return await VisitorLog.aggregate([
      { $match: { actor: new mongoose.Types.ObjectId(id), tenantId } },
      {
        $group: {
          _id: "$event",
          total: { $sum: 1 }
        }
      }
    ]);
  }
}
