export interface Point3D {
  pid: number;
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  id: number;
  pid1: number;
  pid2: number;
  pid3: number;
  layer?: string;
  pitName?: string;
}

export interface CutString {
  id: number;
  points: Point3D[];
}

export interface GeometryBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export type ValidationStatus = 'valid' | 'warning' | 'error';

export interface PhaseGeometryData {
  points: Point3D[];
  triangles: {
    topography: Triangle[];
    pit: Triangle[];
  };
  cutStrings: CutString[];
  validation: {
    status: ValidationStatus;
    messages: string[];
    stats: {
      totalPoints: number;
      totalTriangles: number;
      totalStrings: number;
      totalStringPoints: number;
      topographyTriangles: number;
      pitTriangles: number;
      invalidPIDs: number;
    };
  };
  bounds: GeometryBounds;
  dataSource: {
    type: 'REAL_DATAMINE' | 'NO_DATA';
    files: string[];
    missingFiles: string[];
  };
}
