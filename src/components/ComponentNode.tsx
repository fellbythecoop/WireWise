import React, { useCallback, useState, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ComponentData } from '../types';
import { componentTypes } from '../constants';

interface Port {
  id: string;
  type: 'input' | 'output' | 'power';
  label: string;
  position: number;
}

type ComponentNodeData = ComponentData & {
  ports?: {
    inputs: Port[];
    outputs: Port[];
    power: Port[];
  };
  height?: number;
};

const GRID_SNAP = 8; // 8 grid units per snap
const ROW_HEIGHT = 20; // 20px per row (4 grid units * 5px per grid)
const TOTAL_ROWS = 35; // Total number of rows in the grid
const MIN_HEIGHT = ROW_HEIGHT * 3; // Minimum 3 rows
const DEFAULT_HEIGHT = ROW_HEIGHT * 6; // Default 6 rows

export const ComponentNode: React.FC<NodeProps<ComponentNodeData>> = ({ data, isConnectable = true, id, dragHandle }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const onPortMouseDown = useCallback((event: React.MouseEvent, portId: string, side: Position) => {
    event.stopPropagation();
    event.preventDefault(); // Prevent connection behavior
    setIsDragging(true);

    const node = nodeRef.current;
    if (!node) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const nodeRect = node.getBoundingClientRect();
      const currentHeight = nodeRect.height;
      const relativeY = moveEvent.clientY - nodeRect.top;
      const normalizedY = Math.max(0, Math.min(relativeY, currentHeight));
      
      // Calculate the nearest grid snap position (8 grid units)
      const gridSize = GRID_SNAP * 5; // 8 grid units * 5px per grid = 40px
      const rowPosition = Math.round(normalizedY / gridSize) * gridSize;
      const percentPosition = (rowPosition / currentHeight) * 100;

      // Update the port position through a custom event
      const updateEvent = new CustomEvent('portPositionUpdate', {
        detail: {
          portId,
          position: Math.max(0, Math.min(100, percentPosition))
        },
        bubbles: true
      });
      node.dispatchEvent(updateEvent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const onResizeStart = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setIsResizing(true);

    const node = nodeRef.current;
    if (!node) return;

    const startY = event.clientY;
    const startHeight = node.offsetHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(MIN_HEIGHT, Math.round((startHeight + deltaY) / ROW_HEIGHT) * ROW_HEIGHT);

      // Update component height through custom event
      const updateEvent = new CustomEvent('componentResize', {
        detail: {
          nodeId: id,
          height: newHeight
        },
        bubbles: true
      });
      node.dispatchEvent(updateEvent);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id]);

  const renderPorts = (ports: Port[], type: 'source' | 'target', side: Position) => {
    return ports.map((port) => (
      <div
        key={port.id}
        className="port-wrapper no-drag"
        style={{
          position: 'absolute',
          top: `${port.position}%`,
          [side === Position.Left ? 'left' : 'right']: '-6px',
          transform: 'translateY(-50%)',
          zIndex: isDragging ? 1000 : 1
        }}
        onMouseDown={(e) => onPortMouseDown(e, port.id, side)}
      >
        <Handle
          type={type}
          position={side}
          id={port.id}
          style={{
            position: 'relative',
            transform: 'none',
            background: port.type === 'power' ? '#e74c3c' : '#3498db',
            cursor: 'grab'
          }}
          isConnectable={isConnectable && !isDragging}
        >
          <span
            className="port-label"
            style={{
              position: 'absolute',
              [side === Position.Left ? 'left' : 'right']: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.7rem',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {port.label}
          </span>
        </Handle>
      </div>
    ));
  };

  return (
    <div 
      ref={nodeRef}
      className={`component-node ${dragHandle}`}
      style={{ 
        height: data.height || DEFAULT_HEIGHT,
        cursor: isResizing ? 'row-resize' : 'default'
      }}
    >
      <div className="component-header">{data.label}</div>
      <div className="component-ports">
        {data.ports ? (
          <>
            {renderPorts([...data.ports.inputs, ...data.ports.power.filter(p => p.type === 'power')], 'target', Position.Left)}
            {renderPorts([...data.ports.outputs, ...data.ports.power.filter(p => p.type === 'power')], 'source', Position.Right)}
          </>
        ) : (
          // Fallback to default ports based on component type
          <>
            {Array.from({ length: componentTypes[data.type].inputs }).map((_, i) => (
              <Handle
                key={`input-${i}`}
                type="target"
                position={Position.Left}
                id={`input-${i}`}
                style={{ left: 0 }}
              />
            ))}
            {Array.from({ length: componentTypes[data.type].outputs }).map((_, i) => (
              <Handle
                key={`output-${i}`}
                type="source"
                position={Position.Right}
                id={`output-${i}`}
                style={{ right: 0 }}
              />
            ))}
          </>
        )}
      </div>
      <div 
        className="resize-handle no-drag"
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute',
          bottom: -4,
          left: 0,
          right: 0,
          height: 8,
          cursor: 'row-resize',
          backgroundColor: 'transparent',
          zIndex: 10
        }}
      />
    </div>
  );
}; 