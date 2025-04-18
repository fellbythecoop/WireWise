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

// Grid configuration
const GRID_SIZE = 5; // 5px per grid unit
const GRID_WIDTH = 160; // 160 grid units wide
const GRID_HEIGHT = 35; // 35 rows
const ROW_HEIGHT = 4; // 4 grid units per row
const ROW_HEIGHT_PX = ROW_HEIGHT * GRID_SIZE; // 20px per row

type ComponentType = 'input' | 'output' | 'power' | 'logic';

interface ComponentData {
  label: string;
  type: ComponentType;
}

interface ComponentNodeData {
  data: ComponentData;
}

interface CustomEdgeData {
  edgeDraggable: boolean;
}

const componentTypes: Record<ComponentType, { inputs: number; outputs: number }> = {
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

const ComponentNode = ({ data }: ComponentNodeData) => {
  return (
    <div className="component-node">
      <div className="component-header">{data.label}</div>
      <div className="component-ports">
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
      </div>
    </div>
  );
};

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
    data: { label: 'Power Supply', type: 'power' },
  },
  {
    id: '2',
    type: 'component',
    position: { x: 400, y: 100 },
    data: { label: 'Logic Gate', type: 'logic' },
  },
];

const initialEdges: Edge[] = [];

interface HistoryState {
  nodes: Node<ComponentData>[];
  edges: Edge[];
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [history, setHistory] = useState<HistoryState[]>([{ nodes: [...initialNodes], edges: [...initialEdges] }]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Add state to history when changes occur
  const addToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    console.log('Adding to history:', { newNodes, newEdges });
    setHistory(prev => {
      const newHistory = prev.slice(0, currentHistoryIndex + 1);
      const newState = { 
        nodes: JSON.parse(JSON.stringify(newNodes)), 
        edges: JSON.parse(JSON.stringify(newEdges)) 
      };
      return [...newHistory, newState];
    });
    setCurrentHistoryIndex(prev => prev + 1);
  }, [currentHistoryIndex]);

  // Handle node changes with history
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    let shouldAddToHistory = false;
    
    // Process all changes first
    onNodesChange(changes);
    
    // Then check if we should add to history
    changes.forEach((change) => {
      if (change.type === 'position') {
        if (change.dragging === false) { // Only when drag ends
          shouldAddToHistory = true;
        }
      } else {
        shouldAddToHistory = true;
      }
    });

    if (shouldAddToHistory) {
      // Use setTimeout to ensure we get the latest state
      setTimeout(() => {
        setNodes(currentNodes => {
          addToHistory(currentNodes, edges);
          return currentNodes;
        });
      }, 0);
    }
  }, [onNodesChange, edges, addToHistory, setNodes]);

  // Handle edge changes with history
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    
    // Add to history for edge changes (creation, deletion, etc.)
    setTimeout(() => {
      setEdges(currentEdges => {
        addToHistory(nodes, currentEdges);
        return currentEdges;
      });
    }, 0);
  }, [onEdgesChange, nodes, addToHistory]);

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
          
          // Use setTimeout to ensure we get the latest state
          setTimeout(() => {
            addToHistory(nodes, newEdges);
          }, 0);
          
          return newEdges;
        });
      }
    },
    [nodes, setEdges, addToHistory]
  );

  // Undo function
  const undo = useCallback(() => {
    console.log('Current history index:', currentHistoryIndex);
    console.log('History:', history);
    
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      const previousState = history[newIndex];
      
      console.log('Restoring to state:', previousState);
      
      if (previousState) {
        const restoredNodes = JSON.parse(JSON.stringify(previousState.nodes));
        const restoredEdges = JSON.parse(JSON.stringify(previousState.edges));
        
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
        setNodes([...nextState.nodes]);
        setEdges([...nextState.edges]);
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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{ 
        width: `${GRID_WIDTH * GRID_SIZE}px`,
        height: `${GRID_HEIGHT * ROW_HEIGHT_PX}px`,
        margin: '0 auto',
        border: '2px solid #2c3e50',
        position: 'relative',
        overflow: 'hidden',
        background: '#ffffff'
      }}>
        <div className="row-labels">
          {Array.from({ length: GRID_HEIGHT }, (_, i) => (
            <RowLabel key={i} rowNumber={i + 1} />
          ))}
        </div>
        <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5 }}>
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
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={GRID_SIZE} 
            size={1} 
            color="#e0e0e0"
          />
          <Controls showZoom={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default App; 