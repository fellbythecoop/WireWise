import { ComponentType } from './types';

export const componentTypes: Record<ComponentType, { inputs: number; outputs: number }> = {
  input: {
    inputs: 0,
    outputs: 1,
  },
  output: {
    inputs: 1,
    outputs: 0,
  },
  power: {
    inputs: 0,
    outputs: 1,
  },
  logic: {
    inputs: 2,
    outputs: 1,
  },
}; 