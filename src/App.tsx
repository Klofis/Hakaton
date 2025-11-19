import React, { useEffect, useState, useRef } from "react";
import * as faceapi from "face-api.js";
import { DBSCAN } from "density-clustering";
import * as tf from '@tensorflow/tfjs';

interface Cluster {
  id: string;
  faces: string[];
}

const App: React.FC = () => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendInfo, setBackendInfo] = useState<string>("");
  const processingRef = useRef(false);

  // Инициализация TensorFlow и моделей
  useEffect(() => {
    const initOptimizedModels = async () => {
      try {
        // 1. Настройка бэкенда TensorFlow
        await tf.setBackend('webgl');
        tf.ENV.set('DEBUG', false);
        tf.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
        
        setBackendInfo(`Backend: ${tf.getBackend()} | Model: SSD Mobilenet`);
        console.log('✅ TensorFlow optimized with WebGL');

        // 2. Загрузка SSD Mobilenet с оптимизациями
        console.time('Models loading');
        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        console.timeEnd('Models loading');

        console.log('✅ SSD Mobilenet loaded and optimized');
      } catch (error) {
        console.error('Initialization error:', error);
        setBackendInfo('Initialization failed');
      }
    };

    initOptimizedModels();
  }, []);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || processingRef.current) return;
    
    processingRef.current = true;
    setLoading(true);
    setClusters([]);

    const descriptors: number[][] = [];
    const faces: string[] = [];
    const files = Array.from(event.target.files);

    try {
      console.time('Total processing time');
      const memoryBefore = tf.memory();

      // Оптимизированные настройки для SSD Mobilenet
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.5,      // Повышенный порог для скорости
        maxResults: 10           // Ограничение количества лиц на изображение
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing image ${i + 1}/${files.length}`);
        
        // Создаем оптимизированное изображение
        const img = await createOptimizedImage(file);
        
        // Масштабируем изображение если оно слишком большое
        const maxDimension = 800;
        if (img.width > maxDimension || img.height > maxDimension) {
          const scaledImg = await scaleImage(img, maxDimension);
          URL.revokeObjectURL(img.src); // Очищаем оригинал
          await processImage(scaledImg, descriptors, faces, detectionOptions);
        } else {
          await processImage(img, descriptors, faces, detectionOptions);
        }

        // Периодическая очистка памяти
        if (i % 3 === 0 && tf.memory().numTensors > 50) {
          await tf.nextFrame(); // Даем браузеру передохнуть
          tf.tidy(() => {});
        }
      }

      // Кластеризация
      if (descriptors.length > 0) {
        await performClustering(descriptors, faces);
      } else {
        setClusters([{ id: "No faces found", faces: [] }]);
      }

      console.timeEnd('Total processing time');
      
      const memoryAfter = tf.memory();
      console.log('Memory usage:', {
        before: memoryBefore.numTensors,
        after: memoryAfter.numTensors,
        diff: memoryAfter.numTensors - memoryBefore.numTensors
      });

    } catch (error) {
      console.error('Processing error:', error);
      setClusters([{ id: "Processing error", faces: [] }]);
    } finally {
      setLoading(false);
      processingRef.current = false;
      
      // Финальная очистка
      tf.tidy(() => {});
    }
  };

  // Обработка одного изображения
  const processImage = async (
    img: HTMLImageElement, 
    descriptors: number[][], 
    faces: string[],
    options: faceapi.SsdMobilenetv1Options
  ) => {
    const detections = await faceapi
      .detectAllFaces(img, options)
      .withFaceLandmarks()
      .withFaceDescriptors();

    for (const d of detections) {
      descriptors.push(Array.from(d.descriptor));

      // Создаем миниатюру с оптимизацией
      const faceCanvas = await faceapi.extractFaces(img, [d.detection]);
      if (faceCanvas.length > 0) {
        // Уменьшаем размер миниатюр для экономии памяти
        const optimizedFace = await optimizeThumbnail(faceCanvas[0]);
        faces.push(optimizedFace);
      }
    }
  };

  // Масштабирование больших изображений
  const scaleImage = (img: HTMLImageElement, maxDimension: number): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      const scaledImg = new Image();
      scaledImg.onload = () => resolve(scaledImg);
      scaledImg.src = canvas.toDataURL('image/jpeg', 0.8);
    });
  };

  // Оптимизация миниатюр лиц
  const optimizeThumbnail = (canvas: HTMLCanvasElement): string => {
    const optimizedCanvas = document.createElement('canvas');
    optimizedCanvas.width = 100; // Фиксированный размер для экономии памяти
    optimizedCanvas.height = 100;
    
    const ctx = optimizedCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, 100, 100);
    
    return optimizedCanvas.toDataURL('image/jpeg', 0.7);
  };

  // Создание изображения с оптимизацией
  const createOptimizedImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = reject;
      img.src = url;
    });
  };

  // Кластеризация
  const performClustering = async (descriptors: number[][], faces: string[]) => {
    console.time('Clustering time');
    
    const dbscan = new DBSCAN();
    const clustersIdx = dbscan.run(descriptors, 0.53, 2);
    const noiseIdx = dbscan.noise;

    const clustered: Cluster[] = clustersIdx.map((cluster, i) => ({
      id: `Cluster ${i} (${cluster.length} faces)`,
      faces: cluster.map(idx => faces[idx]),
    }));

    if (noiseIdx.length > 0) {
      clustered.push({
        id: `Noise (${noiseIdx.length} faces)`,
        faces: noiseIdx.map(idx => faces[idx]),
      });
    }

    setClusters(clustered);
    console.timeEnd('Clustering time');
    console.log(`Found ${clustersIdx.length} clusters + ${noiseIdx.length} noise points`);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Face Clustering Demo (SSD Mobilenet - Optimized)</h1>
      <div style={{ marginBottom: "1rem", color: "#666" }}>
        {backendInfo && <p>{backendInfo}</p>}
        <p>SSD Mobilenet with WebGL acceleration and memory optimization</p>
      </div>
      
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        onChange={handleFiles}
        disabled={loading}
        style={{
          padding: "0.5rem",
          border: "2px dashed #ccc",
          borderRadius: "4px",
          width: "100%",
          maxWidth: "400px"
        }}
      />
      
      {loading && (
        <div style={{ margin: "1rem 0" }}>
          <p>Processing images with SSD Mobilenet... (check console for details)</p>
          <div style={{ 
            width: "100%", 
            height: "4px", 
            backgroundColor: "#f0f0f0",
            borderRadius: "2px",
            overflow: "hidden",
            maxWidth: "400px"
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#007acc",
              animation: "pulse 1.5s ease-in-out infinite"
            }} />
          </div>
        </div>
      )}
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "2rem", 
        marginTop: "2rem" 
      }}>
        {clusters.map((cluster) => (
          <div 
            key={cluster.id} 
            style={{ 
              border: "1px solid #e0e0e0", 
              padding: "1.5rem",
              borderRadius: "12px",
              backgroundColor: "#fafafa",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            <h3 style={{ 
              margin: "0 0 1rem 0", 
              fontSize: "1.1rem",
              color: cluster.id.includes("Noise") ? "#666" : "#333"
            }}>
              {cluster.id}
            </h3>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
              gap: "0.5rem"
            }}>
              {cluster.faces.map((face, idx) => (
                <img 
                  key={idx} 
                  src={face} 
                  alt={`face-${idx}`} 
                  width={80} 
                  height={80}
                  style={{
                    borderRadius: "8px",
                    objectFit: "cover",
                    border: "2px solid #fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default App;