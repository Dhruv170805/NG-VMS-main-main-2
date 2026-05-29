import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    try {
      const { origin } = payload;
      try {
        // @ts-ignore
        await faceapi.tf.setBackend('webgl');
      } catch {
        // @ts-ignore
        await faceapi.tf.setBackend('cpu');
      }
      // @ts-ignore
      await faceapi.tf.ready();

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(`${origin}/models`),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(`${origin}/models`),
        faceapi.nets.faceExpressionNet.loadFromUri(`${origin}/models`)
      ]);
      modelsLoaded = true;
      self.postMessage({ type: 'INIT_SUCCESS' });
    } catch (err: any) {
      self.postMessage({ type: 'INIT_ERROR', error: err.message });
    }
  }

  if (type === 'DETECT') {
    if (!modelsLoaded) return;
    
    try {
      const { width, height, data } = payload;
      // Reconstruct ImageData from the raw Uint8ClampedArray
      const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
      
      const detection = await faceapi.detectSingleFace(
        imageData as any,
        new faceapi.TinyFaceDetectorOptions()
      );
      self.postMessage({ type: 'DETECT_RESULT', faceDetected: !!detection });
    } catch (err: any) {
      self.postMessage({ type: 'DETECT_ERROR', error: err.message });
    }
  }
};
