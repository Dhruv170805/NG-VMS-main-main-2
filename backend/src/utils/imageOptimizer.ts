import sharp from 'sharp';

/**
 * Sovereign Image Optimizer (AETHER Core)
 * Compresses base64 images to meet strict database storage invariants.
 * Target: ~7KB per image to fit 20-25KB per record.
 */
export const optimizeImage = async (base64String: string, targetSizeKb: number = 7): Promise<string> => {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return base64String;
  }

  try {
    const [, data] = base64String.split(',');
    const buffer = Buffer.from(data, 'base64');

    // Single pipeline with metadata stripping and optimized compression
    const sharpInstance = sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize({
        width: 400,
        height: 400,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat('jpeg', {
        quality: 50,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: '4:2:0'
      });

    let optimizedBuffer = await sharpInstance.toBuffer();

    // Aggressive second pass only if necessary
    if (optimizedBuffer.length > targetSizeKb * 1024) {
      optimizedBuffer = await sharp(optimizedBuffer)
        .resize({ width: 300 })
        .jpeg({ quality: 35, mozjpeg: true })
        .toBuffer();
    }

    console.log(`[OPTIMIZER] reduced ${Math.round(data.length * 0.75 / 1024)}KB -> ${Math.round(optimizedBuffer.length / 1024)}KB`);
    return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('[IMAGE OPTIMIZER] Error:', error);
    return base64String;
  }
};
