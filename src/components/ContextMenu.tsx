import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onEdit: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onEdit, onClose }) => {
  React.useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div 
      className="context-menu"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 1000,
      }}
    >
      <div className="context-menu-item" onClick={onEdit}>
        Edit Component
      </div>
    </div>
  );
}; 