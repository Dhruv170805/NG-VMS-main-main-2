import { Request, Response } from 'express';
import { BootstrapService } from './bootstrap.service';

export class BootstrapController {
  static async checkStatus(req: Request, res: Response) {
    try {
      const status = await BootstrapService.checkStatus();
      res.status(200).json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async runBootstrap(req: Request, res: Response) {
    try {
      const result = await BootstrapService.runBootstrap(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
