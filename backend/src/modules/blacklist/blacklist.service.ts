import mongoose from 'mongoose';
import Blacklist from './blacklist.model';
import { CacheService } from '../../services/cache.service';

export class BlacklistService {
  static async getBlacklist(search: any, tenantId: mongoose.Types.ObjectId) {
    const cacheKey = CacheService.generateKey(tenantId.toString(), 'blacklist', search || 'all');
    
    return await CacheService.getOrSet(cacheKey, async () => {
      let query: any = { tenantId };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { reason: { $regex: search, $options: 'i' } }
        ];
      }

      return await Blacklist.find(query).sort({ createdAt: -1 });
    });
  }

  static async toggleStatus(id: string, tenantId: mongoose.Types.ObjectId) {
    const item = await Blacklist.findOne({ _id: id, tenantId });
    if (!item) throw new Error('Not found');
    
    item.active = !item.active;
    await item.save();

    await CacheService.invalidatePattern(`tenant:${tenantId}:blacklist:*`);
    return item;
  }

  static async addToBlacklist(data: any, tenantId: mongoose.Types.ObjectId) {
    const { idNumberHash, reason, name, company, visitorId } = data;
    if (!idNumberHash || !reason || !name) {
      throw new Error('Missing fields');
    }

    let result;
    const existing = await Blacklist.findOne({ idNumberHash, tenantId });
    if (existing) {
      existing.active = true;
      existing.reason = reason;
      existing.name = name;
      existing.company = company;
      existing.visitorId = visitorId;
      result = await existing.save();
    } else {
      const item = new Blacklist({ idNumberHash, reason, name, company, visitorId, tenantId });
      result = await item.save();
    }

    await CacheService.invalidatePattern(`tenant:${tenantId}:blacklist:*`);
    return result;
  }

  static async removeFromBlacklist(id: string, tenantId: mongoose.Types.ObjectId) {
    const result = await Blacklist.findOneAndDelete({ _id: id, tenantId });
    await CacheService.invalidatePattern(`tenant:${tenantId}:blacklist:*`);
    return result;
  }
}
