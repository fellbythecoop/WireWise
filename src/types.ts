export type ComponentType = 'input' | 'output' | 'power' | 'logic';

interface Port {
  id: string;
  type: 'input' | 'output' | 'power';
  label: string;
  position: number;
}

export interface ComponentData {
  label: string;
  type: ComponentType;
  ports?: {
    inputs: Port[];
    outputs: Port[];
    power: Port[];
  };
}

export interface ComponentTemplate {
  id: string;
  label: string;
  type: ComponentType;
  description: string;
} 