// types.ts
export interface FaceWithConfidence {
    image: string;
    confidence: number;

  }
  
  export interface Cluster {
    id: string;
    faces: FaceWithConfidence[];
    avgConfidence: number;
  }