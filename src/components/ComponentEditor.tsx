import React, { useState, useEffect } from 'react';
import { ComponentType, ComponentData } from '../types';

interface Port {
  id: string;
  type: 'input' | 'output' | 'power';
  label: string;
  position: number; // 0-100 percentage position on the side
}

interface ComponentEditorProps {
  component: {
    id: string;
    data: ComponentData & {
      ports?: {
        inputs: Port[];
        outputs: Port[];
        power: Port[];
      };
    };
    position: { x: number; y: number };
  };
  onClose: () => void;
  onSave: (id: string, data: ComponentData, ports: { inputs: Port[], outputs: Port[], power: Port[] }) => void;
}

export const ComponentEditor: React.FC<ComponentEditorProps> = ({ component, onClose, onSave }) => {
  const [label, setLabel] = useState(component.data.label);
  const [inputs, setInputs] = useState<Port[]>(component.data.ports?.inputs || []);
  const [outputs, setOutputs] = useState<Port[]>(component.data.ports?.outputs || []);
  const [powerPorts, setPowerPorts] = useState<Port[]>(component.data.ports?.power || []);

  useEffect(() => {
    setInputs(component.data.ports?.inputs || []);
    setOutputs(component.data.ports?.outputs || []);
    setPowerPorts(component.data.ports?.power || []);
  }, [component.data.ports]);

  const addPort = (type: 'input' | 'output' | 'power') => {
    const newPort: Port = {
      id: `${type}-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${
        type === 'input' ? inputs.length + 1 :
        type === 'output' ? outputs.length + 1 :
        powerPorts.length + 1
      }`,
      position: 50
    };

    switch (type) {
      case 'input':
        setInputs([...inputs, newPort]);
        break;
      case 'output':
        setOutputs([...outputs, newPort]);
        break;
      case 'power':
        setPowerPorts([...powerPorts, newPort]);
        break;
    }
  };

  const removePort = (portId: string) => {
    setInputs(inputs.filter(p => p.id !== portId));
    setOutputs(outputs.filter(p => p.id !== portId));
    setPowerPorts(powerPorts.filter(p => p.id !== portId));
  };

  const updatePortPosition = (portId: string, position: number) => {
    const updatePosition = (ports: Port[]) =>
      ports.map(p => p.id === portId ? { ...p, position: Math.max(0, Math.min(100, position)) } : p);

    setInputs(updatePosition(inputs));
    setOutputs(updatePosition(outputs));
    setPowerPorts(updatePosition(powerPorts));
  };

  const updatePortLabel = (portId: string, label: string) => {
    const updateLabel = (ports: Port[]) =>
      ports.map(p => p.id === portId ? { ...p, label } : p);

    setInputs(updateLabel(inputs));
    setOutputs(updateLabel(outputs));
    setPowerPorts(updateLabel(powerPorts));
  };

  const handleSave = () => {
    onSave(
      component.id,
      { ...component.data, label },
      { inputs, outputs, power: powerPorts }
    );
  };

  const renderPortsList = (ports: Port[], type: 'input' | 'output' | 'power') => {
    return (
      <div className="port-section">
        <h4>{type.charAt(0).toUpperCase() + type.slice(1)} Ports</h4>
        {ports.map(port => (
          <div key={port.id} className="port-item">
            <input
              type="text"
              value={port.label}
              onChange={(e) => updatePortLabel(port.id, e.target.value)}
              className="port-label-input"
            />
            <input
              type="range"
              min="0"
              max="100"
              value={port.position}
              onChange={(e) => updatePortPosition(port.id, parseInt(e.target.value))}
              className="port-position-slider"
            />
            <button
              onClick={() => removePort(port.id)}
              className="remove-port-button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="component-editor-overlay">
      <div className="component-editor">
        <div className="editor-header">
          <h2>Edit Component</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="editor-content">
          <div className="form-group">
            <label>Component Label:</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="ports-section">
            <div className="ports-header">
              <h3>Ports</h3>
              <div className="port-actions">
                <button onClick={() => addPort('input')} className="add-port-button">Add Input</button>
                <button onClick={() => addPort('output')} className="add-port-button">Add Output</button>
                <button onClick={() => addPort('power')} className="add-port-button">Add Power</button>
              </div>
            </div>

            <div className="ports-list">
              {renderPortsList(inputs, 'input')}
              {renderPortsList(outputs, 'output')}
              {renderPortsList(powerPorts, 'power')}
            </div>
          </div>
        </div>

        <div className="editor-footer">
          <button onClick={handleSave} className="save-button">Save Changes</button>
          <button onClick={onClose} className="cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  );
}; 