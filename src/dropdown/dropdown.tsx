import './dropdown.scoped.css';

import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { createPortal } from 'react-dom';

interface ToggleProps {
  onClick: () => void
  ref: React.Ref<HTMLButtonElement | null>
}

interface DropdownProps {
  options: string[]
  onSelect: (option: string) => void
  children: (props: ToggleProps) => ReactNode;
}

const DropdownMenu: FC<{
  ref: React.Ref<HTMLUListElement | null>,
  isOpen: boolean,
  options: string[], 
  onSelect: (option: string) => void, 
  x: number, 
  y: number 
}> = ({ ref, isOpen, options, onSelect, x, y }) => {
  if (!isOpen) {
    return null;
  }
  
  return createPortal(
    <ul ref={ref} className="dropdown" style={{ top: y, left: x }}>
      {options.map(option => (
        <li key={option} onClick={() => {
          onSelect(option);
        }}>
          {option}
        </li>
      ))}
    </ul>,
    document.body
  )
}

export const Dropdown: FC<DropdownProps> = ({ options, onSelect, children }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const handleTriggerClick = () => {
    setOpen(prev => !prev);

    setTimeout(() => {
      if (triggerRef.current) {
        const menuRect = menuRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 };
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        let x = rect.left;
        const y = rect.bottom;
  
        const isCloseToRightEdge = rect.left + menuRect.width > viewportWidth / 2;
  
        if (isCloseToRightEdge) {
          x = rect.right - menuRect.width; 
        }
  
        setPosition({ x, y });
      }
    }, 0)
  };
  const handleClickOutside = (e: MouseEvent) => {
    if (
      open &&
      dropdownRef.current && 
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }
  
  useEffect(() => {
    triggerRef.current?.classList.toggle('active', open);
  }, [open]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    }
  })

  return (
    <div ref={dropdownRef}>
      {children({ onClick: handleTriggerClick, ref: triggerRef })}
      <DropdownMenu 
        ref={menuRef}
        isOpen={open} 
        options={options} 
        onSelect={(option) => {
          onSelect(option);
          setOpen(false);
        }} 
        x={position.x} 
        y={position.y} 
      />
    </div>
  )
}