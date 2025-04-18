import React, { useState } from 'react';
import { ComponentType } from '../types';

interface ComponentTemplate {
  id: string;
  label: string;
  type: ComponentType;
  description: string;
}

interface ComponentLibraryProps {
  onBack: () => void;
  onAddComponent: (component: ComponentTemplate) => void;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onBack, onAddComponent }) => {
  const [components, setComponents] = useState<ComponentTemplate[]>([
    {
      id: 'power-supply',
      label: 'Power Supply',
      type: 'power',
      description: 'Provides power to the circuit'
    },
    {
      id: 'logic-gate',
      label: 'Logic Gate',
      type: 'logic',
      description: 'Basic logic gate component'
    },
    {
      id: 'input-switch',
      label: 'Input Switch',
      type: 'input',
      description: 'Input switch for the circuit'
    },
    {
      id: 'output-led',
      label: 'Output LED',
      type: 'output',
      description: 'Output LED indicator'
    }
  ]);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newComponent, setNewComponent] = useState<Partial<ComponentTemplate>>({
    label: '',
    type: 'logic',
    description: ''
  });

  const handleAddNew = () => {
    if (newComponent.label && newComponent.type) {
      const component: ComponentTemplate = {
        id: `${newComponent.type}-${Date.now()}`,
        label: newComponent.label,
        type: newComponent.type,
        description: newComponent.description || ''
      };
      setComponents([...components, component]);
      onAddComponent(component);
      setIsAddingNew(false);
      setNewComponent({ label: '', type: 'logic', description: '' });
    }
  };

  return (
    <div className="component-library">
      <div className="library-header">
        <button onClick={onBack} className="back-button">
          ← Back to Editor
        </button>
        <h1>Component Library</h1>
        <button 
          onClick={() => setIsAddingNew(true)}
          className="add-component-button"
        >
          Add New Component
        </button>
      </div>

      {isAddingNew && (
        <div className="add-component-form">
          <h2>Add New Component</h2>
          <div className="form-group">
            <label>Label:</label>
            <input
              type="text"
              value={newComponent.label}
              onChange={(e) => setNewComponent({ ...newComponent, label: e.target.value })}
              placeholder="Component Label"
            />
          </div>
          <div className="form-group">
            <label>Type:</label>
            <select
              value={newComponent.type}
              onChange={(e) => setNewComponent({ ...newComponent, type: e.target.value as ComponentType })}
            >
              <option value="logic">Logic</option>
              <option value="input">Input</option>
              <option value="output">Output</option>
              <option value="power">Power</option>
            </select>
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={newComponent.description}
              onChange={(e) => setNewComponent({ ...newComponent, description: e.target.value })}
              placeholder="Component Description"
            />
          </div>
          <div className="form-actions">
            <button onClick={handleAddNew} className="save-button">Save</button>
            <button onClick={() => setIsAddingNew(false)} className="cancel-button">Cancel</button>
          </div>
        </div>
      )}

      <div className="components-grid">
        {components.map((component) => (
          <div key={component.id} className="component-card">
            <h3>{component.label}</h3>
            <div className="component-type">Type: {component.type}</div>
            <p>{component.description}</p>
            <button 
              onClick={() => onAddComponent(component)}
              className="use-component-button"
            >
              Use Component
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}; 