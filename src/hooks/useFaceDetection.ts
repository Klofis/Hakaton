// hooks/useFaceDetection.ts
import { useState, useCallback } from 'react';
import * as faceapi from "face-api.js";
import * as tf from '@tensorflow/tfjs';

export const useFaceDetection = () => {
  const [backendInfo, setBackendInfo] = useState<string>("");

  const initializeModels = useCallback(async () => {
    try {
      await tf.setBackend('webgl');
      tf.ENV.set('DEBUG', false);
      tf.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
      
      setBackendInfo(`Backend: ${tf.getBackend()} | Optimized SSD Mobilenet`);
      console.log('✅ TensorFlow optimized with WebGL');

      console.time('Models loading');
      const loadPromises = [
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models")
      ];
      
      await Promise.all(loadPromises);
      console.timeEnd('Models loading');

      console.log('✅ All models loaded and optimized');
    } catch (error) {
      console.error('Initialization error:', error);
      setBackendInfo('Initialization failed');
    }
  }, []);

  return { backendInfo, initializeModels };
};