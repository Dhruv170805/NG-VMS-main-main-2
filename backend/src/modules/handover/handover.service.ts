import mongoose from 'mongoose';
import VisitorLog from '../../models/VisitorLog';
import Handover from '../../models/Handover';

export class HandoverService {
  static async getShiftStats(gateId: string, shiftStart: string, actorId: string, tenantId: mongoose.Types.ObjectId) {
    const stats = await VisitorLog.aggregate([
      { 
        $match: { 
          actor: new mongoose.Types.ObjectId(actorId),
          gateId,
          createdAt: { $gte: new Date(shiftStart) },
          tenantId
        } 
      },
      {
        $group: {
          _id: "$event",
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      GATE_IN: stats.find(s => s._id === 'GATE_IN')?.count || 0,
      GATE_OUT: stats.find(s => s._id === 'GATE_OUT')?.count || 0,
      DENIED: stats.find(s => s._id === 'DENIED_BLACKLIST')?.count || 0
    };
  }

  static async createHandover(data: any, actor: { id: string, name: string }, tenantId: mongoose.Types.ObjectId) {
    const { gateId, shiftStart, notes, stats } = data;
    const handover = new Handover({
      actor: actor.id,
      actorName: actor.name,
      gateId,
      shiftStart: new Date(shiftStart),
      checkInCount: stats.GATE_IN,
      checkOutCount: stats.GATE_OUT,
      deniedCount: stats.DENIED,
      notes,
      tenantId
    });

    return await handover.save();
  }
}
