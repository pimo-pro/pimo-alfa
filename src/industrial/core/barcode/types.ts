export type BarcodeEntityType = 'project' | 'piece' | 'department' | 'task' | 'command';

export interface ParsedBarcode {
  raw: string;
  prefix: string;
  id: string;
  entityType: BarcodeEntityType;
  route: string;
}
