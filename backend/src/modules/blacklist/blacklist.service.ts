import mongoose from 'mongoose';
import Blacklist from '../../models/Blacklist';

export class BlacklistService {
  static async getBlacklist(search: any, tenantId: mongoose.Types.ObjectId) {
    let query: any = { tenantId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } }
      ];
    }

    return await Blacklist.find(query).sort({ createdAt: -1 });
  }

  static async toggleStatus(id: string, tenantId: mongoose.Types.ObjectId) {
    const item = await Blacklist.findOne({ _id: id, tenantId });
    if (!item) throw new Error('Not found');
    
    item.active = !item.active;
    await item.save();
    return item;
  }

  static async addToBlacklist(data: any, tenantId: mongoose.Types.ObjectId) {
    const { idNumberHash, reason, name, company, visitorId } = data;
    if (!idNumberHash || !reason || !name) {
      throw new Error('Missing fields');
    }

    const existing = await Blacklist.findOne({ idNumberHash, tenantId });
    if (existing) {
      existing.active = true;
      existing.reason = reason;
      existing.name = name;
      existing.company = company;
      existing.visitorId = visitorId;
      return await existing.save();
    }

    const item = new Blacklist({ idNumberHash, reason, name, company, visitorId, tenantId });
    return await item.save();
  }

  static async removeFromBlacklist(id: string, tenantId: mongoose.Types.ObjectId) {
    return await Blacklist.findOneAndDelete({ _id: id, tenantId });
  }
}
