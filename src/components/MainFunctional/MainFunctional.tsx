// App.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";
import * as tf from '@tensorflow/tfjs';
import './MainFunctional.css'
import FileUploader from '../FileUploader/FileUploader';
import ProgressIndicator from '../ProgressIndicator/ProgressIndicator';
import ClusterGrid from '../ClusterGrid/ClusterGrid';
import { useFaceDetection } from '../../hooks/useFaceDetection';
import { useClustering } from '../../hooks/useClustering';
import { useImageProcessing } from '../../hooks/useImageProcessing';

import type { Cluster } from '../../types';
import { OPTIMIZATION_CONFIG } from '../../config';

const App: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const processingRef = useRef(false);
  const abortControllerRef = useRef<AbortController>(null);

  const { initializeModels } = useFaceDetection();
  const { performClustering } = useClustering();
  const { processFilesInBatches } = useImageProcessing();

  // Инициализация моделей
  useEffect(() => {
    initializeModels();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      tf.engine().startScope();
      tf.engine().endScope();
    };
  }, [initializeModels]);

  // Обработка файлов
  const handleFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || processingRef.current) return;
    
    processingRef.current = true;
    setLoading(true);
    setProgress(0);
    setClusters([]);
    
    abortControllerRef.current = new AbortController();
    const files = Array.from(event.target.files);

    try {
      console.time('Total processing time');
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: OPTIMIZATION_CONFIG.DETECTION_CONFIDENCE,
        maxResults: OPTIMIZATION_CONFIG.MAX_FACES_PER_IMAGE
      });

      const { descriptors, facesWithConfidence } = await processFilesInBatches(
        files, 
        detectionOptions, 
        (current, total) => {
          setProgress(Math.round((current / total) * 100));
        },
        abortControllerRef.current.signal
      );

      if (abortControllerRef.current.signal.aborted) return;

      if (descriptors.length > 0) {
        const clustered = await performClustering(descriptors, facesWithConfidence);
        setClusters(clustered);
      } else {
        setClusters([{ 
          id: "No faces found", 
          faces: [], 
          avgConfidence: 0 
        }]);
      }
      
      console.timeEnd('Total processing time');

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Processing error:', error);
        setClusters([{ 
          id: "Processing error", 
          faces: [], 
          avgConfidence: 0 
        }]);
      }
    } finally {
      setLoading(false);
      setProgress(0);
      processingRef.current = false;
      tf.tidy(() => {});
    }
  }, [processFilesInBatches, performClustering]);

  // Отмена обработки
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setProgress(0);
    processingRef.current = false;
  }, []);

  return (
    <div className="main-functional-block">
      <h1 className="main-title">Кластеризация</h1>
      

      
      <FileUploader 
        onFilesSelected={handleFiles}
        loading={loading}
        onCancel={handleCancel}
      />
      
      <ProgressIndicator 
        loading={loading}
        progress={progress}
      />
      
      <ClusterGrid clusters={clusters} />
    </div>
  );
};

export default App;