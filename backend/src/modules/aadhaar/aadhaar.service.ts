import mongoose from 'mongoose';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createCanvas } from 'canvas';
import { PolicyEngine } from '../../utils/policyEngine';
import { SecurityManager } from '../../utils/securityManager';

const pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');

export class AadhaarService {
  static async validateAadhaarLicense(tenantId: mongoose.Types.ObjectId) {
    const features = await SecurityManager.getInstance().getTenantFeatures(tenantId);
    if (!features.aadhaar) {
      throw new Error('Aadhaar verification is not enabled in your license.');
    }
  }

  static async extractAadhaarText(fileBuffer: Buffer, password?: string) {
    const pdfjs = await pdfjsPromise;
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfjs.getDocument({
      data,
      password,
      verbosity: 0
    });

    try {
      const pdfDocument = await loadingTask.promise;
      const page = await pdfDocument.getPage(1);
      const textContent = await page.getTextContent();
      return textContent.items.map((item: any) => item.str).join(' ');
    } catch (error: any) {
      if (error && (error.name === 'PasswordException' || error.message?.toLowerCase().includes('password'))) {
        throw new Error('Incorrect password or PDF is password protected. Please provide a valid password.');
      }
      throw error;
    }
  }

  static async processAadhaar(fileBuffer: Buffer, password?: string, tenantId?: mongoose.Types.ObjectId) {
    if (tenantId) await this.validateAadhaarLicense(tenantId);

    const text = await this.extractAadhaarText(fileBuffer, password);
    const match = text.match(/\d{4}\s?\d{4}\s?\d{4}/);

    if (!match) throw new Error('Aadhaar number not found. Verify password and document.');

    const aadhaar = match[0].replace(/\s/g, '');
    const identityProof = PolicyEngine.validateIdentity(aadhaar);
    if (!identityProof.allowed) throw new Error(identityProof.reason);

    const masked = 'XXXX XXXX ' + aadhaar.slice(-4);

    let imageBuffer: Buffer;
    try {
      const pdfjs = await pdfjsPromise;
      const data = new Uint8Array(fileBuffer);
      const loadingTask = pdfjs.getDocument({
        data,
        password,
        verbosity: 0
      });
      const pdfDocument = await loadingTask.promise;
      const page = await pdfDocument.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context as any,
        viewport: viewport,
        canvas: canvas as any
      } as any).promise;

      const rawImageBuffer = canvas.toBuffer('image/png');
      imageBuffer = await sharp(rawImageBuffer).png().toBuffer();
    } catch (renderError) {
      imageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .png()
      .toBuffer();
    }

    return {
      maskedAadhaar: masked,
      imageUrl: `data:image/png;base64,${imageBuffer.toString('base64')}`,
      pdfData: fileBuffer.toString('base64'),
      verified: true
    };
  }

  static async getLatestPdf(folder: string | undefined, tenantId?: mongoose.Types.ObjectId) {
    if (tenantId) await this.validateAadhaarLicense(tenantId);

    const downloadsPath = folder || process.env.DOWNLOADS_PATH || path.join(os.homedir(), 'Downloads');
    
    if (!fs.existsSync(downloadsPath)) {
      throw new Error(`Downloads folder not found at ${downloadsPath}`);
    }

    const files = fs.readdirSync(downloadsPath);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) throw new Error('No PDF files found in Downloads folder');

    let latestFile = pdfFiles[0];
    let latestMtime = fs.statSync(path.join(downloadsPath, latestFile)).mtime;

    for (let i = 1; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const mtime = fs.statSync(path.join(downloadsPath, file)).mtime;
      if (mtime > latestMtime) {
        latestMtime = mtime;
        latestFile = file;
      }
    }

    const filePath = path.join(downloadsPath, latestFile);
    return {
      filename: latestFile,
      pdfData: fs.readFileSync(filePath).toString('base64'),
      mtime: latestMtime
    };
  }
}
