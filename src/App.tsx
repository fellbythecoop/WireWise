import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
  ConnectionLineType,
  Handle,
  Position,
  EdgeChange,
  updateEdge,
  NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ComponentLibrary } from './components/ComponentLibrary';
import { ComponentEditor } from './components/ComponentEditor';
import { ComponentNode } from './components/ComponentNode';
import { ContextMenu } from './components/ContextMenu';
import { ComponentType, ComponentTemplate, ComponentData } from './types';
import { componentTypes } from './constants';
import './styles/ComponentLibrary.css';
import './styles/ComponentEditor.css';
import './styles/ContextMenu.css';

// Grid configuration
const GRID_SIZE = 5; // 5px per grid unit
const GRID_WIDTH = 160; // 160 grid units wide
const GRID_HEIGHT = 35; // 35 rows
const ROW_HEIGHT = 4; // 4 grid units per row
const ROW_HEIGHT_PX = ROW_HEIGHT * GRID_SIZE; // 20px per row

interface ComponentNodeData {
  data: ComponentData;
}

interface CustomEdgeData {
  edgeDraggable: boolean;
}

const RowLabel = ({ rowNumber }: { rowNumber: number }) => {
  return (
    <div className="row-label" style={{ height: `${ROW_HEIGHT_PX}px` }}>
      {rowNumber}
    </div>
  );
};

const nodeTypes = {
  component: ComponentNode,
};

const initialNodes: Node<ComponentData>[] = [
  {
    id: '1',
    type: 'component',
    position: { x: 100, y: 100 },
    data: {
      label: 'Power Supply',
      type: 'power',
      ports: {
        inputs: [],
        outputs: [{
          id: 'output-default',
          type: 'output',
          label: 'Power',
          position: 50
        }],
        power: []
      }
    },
  },
  {
    id: '2',
    type: 'component',
    position: { x: 400, y: 100 },
    data: {
      label: 'Logic Gate',
      type: 'logic',
      ports: {
        inputs: [
          {
            id: 'input-1',
            type: 'input',
            label: 'A',
            position: 30
          },
          {
            id: 'input-2',
            type: 'input',
            label: 'B',
            position: 70
          }
        ],
        outputs: [{
          id: 'output-1',
          type: 'output',
          label: 'Q',
          position: 50
        }],
        power: []
      }
    },
  },
];

const initialEdges: Edge[] = [];

interface HistoryState {
  nodes: Node<ComponentData>[];
  edges: Edge[];
}

function App() {
  const [showLibrary, setShowLibrary] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Node | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: Node } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: [...initialNodes], edges: [...initialEdges] }]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Add state to history when changes occur
  const addToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentHistoryIndex + 1);
      
      // Create a proper deep copy of the new state
      const newState = {
        nodes: newNodes.map(node => ({
          ...node,
          position: { ...node.position },
          data: { ...node.data }
        })),
        edges: newEdges.map(edge => ({
          ...edge,
          data: edge.data ? { ...edge.data } : undefined
        }))
      };
      
      // Only add to history if the state is different from the last one
      const lastState = newHistory[newHistory.length - 1];
      if (!lastState || JSON.stringify(lastState) !== JSON.stringify(newState)) {
        const updatedHistory = [...newHistory, newState];
        setCurrentHistoryIndex(currentHistoryIndex + 1);
        return updatedHistory;
      }
      return prev;
    });
  }, [currentHistoryIndex]);

  // Handle node changes with history
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    
    const shouldAddToHistory = changes.some(change => 
      change.type !== 'position' || (change.type === 'position' && !change.dragging)
    );

    if (shouldAddToHistory) {
      requestAnimationFrame(() => {
        setNodes(currentNodes => {
          addToHistory(currentNodes, edges);
          return currentNodes;
        });
      });
    }
  }, [onNodesChange, edges, addToHistory, setNodes]);

  // Handle edge changes with history
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    requestAnimationFrame(() => {
      setEdges(currentEdges => {
        addToHistory(nodes, currentEdges);
        return currentEdges;
      });
    });
  }, [onEdgesChange, nodes, addToHistory, setEdges]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setEdges((els) => updateEdge(oldEdge, newConnection, els));
  }, [setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      if (params.sourceHandle?.startsWith('output') && params.targetHandle?.startsWith('input')) {
        const rowNumber = Math.floor(sourceNode.position.y / ROW_HEIGHT_PX) + 1;
        const edgeId = `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`;
        
        setEdges(eds => {
          const newEdges = addEdge(
            {
              ...params,
              id: edgeId,
              type: 'step',
              style: { stroke: '#2c3e50', strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
              animated: true,
              label: rowNumber.toString(),
              labelStyle: { fill: '#2c3e50', fontWeight: 700 },
              labelBgStyle: { fill: '#f5f5f5' },
              labelBgPadding: [4, 4],
              labelBgBorderRadius: 4,
              labelShowBg: true,
              updatable: true,
              selected: false,
              data: { 
                edgeDraggable: true,
              } as CustomEdgeData
            },
            eds
          );
          
          requestAnimationFrame(() => {
            addToHistory(nodes, newEdges);
          });
          
          return newEdges;
        });
      }
    },
    [nodes, setEdges, addToHistory]
  );

  // Undo function
  const undo = useCallback(() => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      const previousState = history[newIndex];
      
      if (previousState) {
        // Create proper deep copies to ensure state updates
        const restoredNodes = previousState.nodes.map(node => ({
          ...node,
          position: { ...node.position },
          data: { ...node.data }
        }));
        const restoredEdges = previousState.edges.map(edge => ({
          ...edge,
          data: edge.data ? { ...edge.data } : undefined
        }));
        
        setNodes(restoredNodes);
        setEdges(restoredEdges);
        setCurrentHistoryIndex(newIndex);
      }
    }
  }, [currentHistoryIndex, history, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    if (currentHistoryIndex < history.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      const nextState = history[newIndex];
      
      if (nextState) {
        // Create proper deep copies to ensure state updates
        const restoredNodes = nextState.nodes.map(node => ({
          ...node,
          position: { ...node.position },
          data: { ...node.data }
        }));
        const restoredEdges = nextState.edges.map(edge => ({
          ...edge,
          data: edge.data ? { ...edge.data } : undefined
        }));
        
        setNodes(restoredNodes);
        setEdges(restoredEdges);
        setCurrentHistoryIndex(newIndex);
      }
    }
  }, [currentHistoryIndex, history, setNodes, setEdges]);

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        event.preventDefault();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        redo();
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  const handleAddComponent = (component: ComponentTemplate) => {
    const defaultPorts = {
      inputs: Array.from({ length: componentTypes[component.type].inputs }, (_, i) => ({
        id: `input-${i + 1}`,
        type: 'input' as const,
        label: String.fromCharCode(65 + i), // A, B, C, etc.
        position: (i + 1) * (100 / (componentTypes[component.type].inputs + 1))
      })),
      outputs: Array.from({ length: componentTypes[component.type].outputs }, (_, i) => ({
        id: `output-${i + 1}`,
        type: 'output' as const,
        label: i === 0 ? 'Q' : `Q${i + 1}`, // Q, Q2, Q3, etc.
        position: 50
      })),
      power: []
    };

    const newNode: Node<ComponentData> = {
      id: `${component.type}-${Date.now()}`,
      type: 'component',
      position: { x: 100, y: 100 },
      data: {
        label: component.label,
        type: component.type,
        ports: defaultPorts
      }
    };

    setNodes(nodes => [...nodes, newNode]);
    setShowLibrary(false);
  };

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    // Ensure we pass the complete node data including ports
    const nodeWithPorts = nodes.find(n => n.id === node.id);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node: nodeWithPorts || node
    });
  }, [nodes]);

  // Add port position update handler
  useEffect(() => {
    const handlePortPositionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { portId, position } = customEvent.detail;
      
      setNodes(nodes => nodes.map(node => {
        const ports = node.data.ports;
        if (!ports) return node;

        // Find which port array contains this port
        let portType: 'inputs' | 'outputs' | 'power' | null = null;
        if (ports.inputs.some(p => p.id === portId)) portType = 'inputs';
        else if (ports.outputs.some(p => p.id === portId)) portType = 'outputs';
        else if (ports.power.some(p => p.id === portId)) portType = 'power';

        if (!portType) return node;

        // Update the port position
        return {
          ...node,
          data: {
            ...node.data,
            ports: {
              ...ports,
              [portType]: ports[portType].map(p =>
                p.id === portId ? { ...p, position } : p
              )
            }
          }
        };
      }));
    };

    window.addEventListener('portPositionUpdate', handlePortPositionUpdate as EventListener);
    return () => {
      window.removeEventListener('portPositionUpdate', handlePortPositionUpdate as EventListener);
    };
  }, [setNodes]);

  // Add component resize handler
  useEffect(() => {
    const handleComponentResize = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { nodeId, height } = customEvent.detail;
      
      setNodes(nodes => nodes.map(node => 
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                height
              }
            }
          : node
      ));
    };

    window.addEventListener('componentResize', handleComponentResize as EventListener);
    return () => {
      window.removeEventListener('componentResize', handleComponentResize as EventListener);
    };
  }, [setNodes]);

  const handleSaveComponent = useCallback((id: string, data: ComponentData, ports: any) => {
    // Adjust port positions to be 8 grid rows apart
    const adjustPortPositions = (portList: any[]) => {
      return portList.map((port, index) => ({
        ...port,
        position: (index * 8 * ROW_HEIGHT_PX / (ROW_HEIGHT_PX * GRID_HEIGHT)) * 100
      }));
    };

    const adjustedPorts = {
      inputs: adjustPortPositions(ports.inputs),
      outputs: adjustPortPositions(ports.outputs),
      power: adjustPortPositions(ports.power)
    };

    setNodes(nodes => nodes.map(node => 
      node.id === id 
        ? {
            ...node,
            data: {
              ...data,
              ports: adjustedPorts
            }
          }
        : node
    ));
    setEditingComponent(null);
  }, [setNodes]);

  if (showLibrary) {
    return (
      <ComponentLibrary
        onBack={() => setShowLibrary(false)}
        onAddComponent={handleAddComponent}
      />
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div 
        className={editingComponent ? 'editor-active' : ''}
        style={{ 
          width: `${GRID_WIDTH * GRID_SIZE}px`,
          height: `${GRID_HEIGHT * ROW_HEIGHT_PX}px`,
          margin: '0 auto',
          border: '2px solid #2c3e50',
          position: 'relative',
          overflow: 'hidden',
          background: '#ffffff'
        }}
      >
        <div className="row-labels">
          {Array.from({ length: GRID_HEIGHT }, (_, i) => (
            <RowLabel key={i} rowNumber={i + 1} />
          ))}
        </div>
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5 }}>
          <button 
            onClick={() => setShowLibrary(true)}
            style={{
              marginRight: '5px',
              padding: '5px 10px',
              background: '#2c3e50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Component Library
          </button>
          <button 
            onClick={undo} 
            disabled={currentHistoryIndex === 0}
            style={{
              marginRight: '5px',
              padding: '5px 10px',
              background: '#2c3e50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentHistoryIndex === 0 ? 'default' : 'pointer',
              opacity: currentHistoryIndex === 0 ? 0.5 : 1
            }}
          >
            Undo
          </button>
          <button 
            onClick={redo}
            disabled={currentHistoryIndex === history.length - 1}
            style={{
              padding: '5px 10px',
              background: '#2c3e50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentHistoryIndex === history.length - 1 ? 'default' : 'pointer',
              opacity: currentHistoryIndex === history.length - 1 ? 0.5 : 1
            }}
          >
            Redo
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onEdgeUpdate={onEdgeUpdate}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeContextMenu={handleNodeContextMenu}
          fitView={false}
          snapToGrid={true}
          snapGrid={[GRID_SIZE, GRID_SIZE]}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnScroll={true}
          connectionLineType={ConnectionLineType.Step}
          connectionLineStyle={{ stroke: '#2c3e50', strokeWidth: 2 }}
          edgesUpdatable={true}
          elementsSelectable={true}
          edgeUpdaterRadius={10}
          nodesDraggable={true}
          noDragClassName="no-drag"
          nodeDragThreshold={1}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={GRID_SIZE} 
            size={1} 
            color="#e0e0e0"
          />
          <Controls showZoom={false} />
        </ReactFlow>

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onEdit={() => {
              setEditingComponent(contextMenu.node);
              setContextMenu(null);
            }}
            onClose={() => setContextMenu(null)}
          />
        )}

        {editingComponent && (
          <ComponentEditor
            component={editingComponent}
            onClose={() => setEditingComponent(null)}
            onSave={handleSaveComponent}
          />
        )}
      </div>
    </div>
  );
}

export default App; 