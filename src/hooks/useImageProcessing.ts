// hooks/useImageProcessing.ts
import { useCallback } from 'react';
import * as faceapi from "face-api.js";
import * as tf from '@tensorflow/tfjs';
import type { FaceWithConfidence } from '../types';
import { OPTIMIZATION_CONFIG } from '../config';

export const useImageProcessing = () => {
  const createOptimizedImage = useCallback((file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load image: ${file.name}`));
      };
      
      img.src = url;
    });
  }, []);

  const scaleImageIfNeeded = useCallback(async (img: HTMLImageElement): Promise<HTMLImageElement> => {
    const { width, height } = img;
    const maxDimension = OPTIMIZATION_CONFIG.MAX_IMAGE_DIMENSION;
    
    if (width <= maxDimension && height <= maxDimension) {
      return img;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      let newWidth = width;
      let newHeight = height;
      
      if (width > height && width > maxDimension) {
        newHeight = Math.round((height * maxDimension) / width);
        newWidth = maxDimension;
      } else if (height > maxDimension) {
        newWidth = Math.round((width * maxDimension) / height);
        newHeight = maxDimension;
      }
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      const scaledImg = new Image();
      scaledImg.onload = () => resolve(scaledImg);
      scaledImg.src = canvas.toDataURL('image/jpeg', 0.85);
    });
  }, []);

  const createFaceWithFrame = useCallback(async (
    img: HTMLImageElement, 
    detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection; }, faceapi.FaceLandmarks68>>
  ): Promise<string> => {
    const faceCanvas = await faceapi.extractFaces(img, [detection.detection]);
    
    if (faceCanvas.length === 0) {
      return '';
    }

    const originalFace = faceCanvas[0];
    const confidence = detection.detection.score || 0;
    
    const finalCanvas = document.createElement('canvas');
    const padding = 13;
    const textHeight = 31;
    const borderWidth = 2;
    
    finalCanvas.width = OPTIMIZATION_CONFIG.THUMBNAIL_SIZE;
    finalCanvas.height = OPTIMIZATION_CONFIG.THUMBNAIL_SIZE + textHeight;
    
    const ctx = finalCanvas.getContext('2d')!;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    const faceSize = OPTIMIZATION_CONFIG.THUMBNAIL_SIZE - padding * 2;
    ctx.drawImage(
      originalFace, 
      padding, 
      padding, 
      faceSize, 
      faceSize
    );
    
    let borderColor = '#ff4444';
    if (confidence > 0.8) {
      borderColor = '#00cc00';
    } else if (confidence > 0.6) {
      borderColor = '#ffaa00';
    }
    
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(
      padding - borderWidth / 2, 
      padding - borderWidth / 2, 
      faceSize + borderWidth, 
      faceSize + borderWidth
    );
    
    const textY = OPTIMIZATION_CONFIG.THUMBNAIL_SIZE + 15;
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(padding, textY - 12, faceSize, 8);
    
    const confidenceWidth = faceSize * confidence;
    ctx.fillStyle = borderColor;
    ctx.fillRect(padding, textY - 12, confidenceWidth, 8);
    
    ctx.fillStyle = '#333333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${(confidence * 100).toFixed(1)}%`, 
      finalCanvas.width / 2, 
      textY + 10
    );
    
    return finalCanvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const processFilesInBatches = useCallback(async (
    files: File[], 
    detectionOptions: faceapi.SsdMobilenetv1Options,
    onProgress: (current: number, total: number) => void,
    signal: AbortSignal
  ): Promise<{ descriptors: number[][], facesWithConfidence: FaceWithConfidence[] }> => {
    const descriptors: number[][] = [];
    const facesWithConfidence: FaceWithConfidence[] = [];
    
    for (let i = 0; i < files.length; i += OPTIMIZATION_CONFIG.BATCH_SIZE) {
      if (signal.aborted) break;
      
      const batch = files.slice(i, i + OPTIMIZATION_CONFIG.BATCH_SIZE);
      const batchPromises = batch.map(async (file) => {
        if (signal.aborted) return null;
        
        try {
          const img = await createOptimizedImage(file);
          const processedImg = await scaleImageIfNeeded(img);
          
          const detections = await faceapi
            .detectAllFaces(processedImg, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptors();

          if (processedImg.src.startsWith('blob:')) {
            URL.revokeObjectURL(processedImg.src);
          }

          for (const d of detections) {
            descriptors.push(Array.from(d.descriptor));
            
            const faceWithFrame = await createFaceWithFrame(processedImg, d);
            facesWithConfidence.push({
              image: faceWithFrame,
              confidence: d.detection.score || 0,
              detection: d.detection
            });
          }
          
          return detections.length;
        } catch (error) {
          console.warn(`Failed to process file ${file.name}:`, error);
          return 0;
        }
      });

      await Promise.all(batchPromises);
      onProgress(Math.min(i + OPTIMIZATION_CONFIG.BATCH_SIZE, files.length), files.length);
      
      await tf.nextFrame();
      if (i % 2 === 0) {
        tf.tidy(() => {});
      }
    }
    
    return { descriptors, facesWithConfidence };
  }, [createOptimizedImage, scaleImageIfNeeded, createFaceWithFrame]);

  return { processFilesInBatches };
};