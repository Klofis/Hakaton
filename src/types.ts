// types.ts
export interface FaceWithConfidence {
    image: string;
    confidence: number;
    detection: faceapi.FaceDetection;
  }
  
  export interface Cluster {
    id: string;
    faces: FaceWithConfidence[];
    avgConfidence: number;
  }