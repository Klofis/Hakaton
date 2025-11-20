// hooks/useClustering.ts
import { useCallback } from 'react';
import { DBSCAN } from "density-clustering";
import type { FaceWithConfidence, Cluster } from '../types';
import { OPTIMIZATION_CONFIG } from '../config';

export const useClustering = () => {
  const performClustering = useCallback(async (descriptors: number[][], facesWithConfidence: FaceWithConfidence[]): Promise<Cluster[]> => {
    console.time('Clustering time');
    
    try {
      const dbscan = new DBSCAN();
      const clustersIdx = dbscan.run(
        descriptors, 
        OPTIMIZATION_CONFIG.DBSCAN_EPS, 
        OPTIMIZATION_CONFIG.DBSCAN_MIN_POINTS
      );
      
      const noiseIdx = dbscan.noise;
      const clustered: Cluster[] = [];

      clustersIdx.forEach((cluster, i) => {
        if (cluster.length > 0) {
          const clusterFaces = cluster.map(idx => facesWithConfidence[idx]);
          const avgConfidence = clusterFaces.reduce((sum, face) => sum + face.confidence, 0) / clusterFaces.length;
          
          clustered.push({
            id: `Человек ${i + 1} (${cluster.length} фото)`,
            faces: clusterFaces,
            avgConfidence: avgConfidence
          });
        }
      });

      if (noiseIdx.length > 0) {
        const noiseFaces = noiseIdx.map(idx => facesWithConfidence[idx]);
        const avgConfidence = noiseFaces.reduce((sum, face) => sum + face.confidence, 0) / noiseFaces.length;
        
        clustered.push({
          id: `Неопределённые фото (${noiseIdx.length} фото)`,
          faces: noiseFaces,
          avgConfidence: avgConfidence
        });
      }

      clustered.sort((a, b) => {
        if (b.faces.length !== a.faces.length) {
          return b.faces.length - a.faces.length;
        }
        return b.avgConfidence - a.avgConfidence;
      });

      console.timeEnd('Clustering time');
      console.log(`Found ${clustersIdx.length} clusters + ${noiseIdx.length} noise points`);
      
      return clustered;
    } catch (error) {
      console.error('Clustering error:', error);
      return [{ 
        id: "Clustering failed", 
        faces: [], 
        avgConfidence: 0 
      }];
    }
  }, []);

  return { performClustering };
};