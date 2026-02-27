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
  isOpen: boolean,
  options: string[], 
  onSelect: (option: string) => void, 
  x: number, 
  y: number 
}> = ({ isOpen, options, onSelect, x, y }) => {
  if (!isOpen) {
    return null;
  }
  
  return createPortal(
    <ul className="glass-dropdown" style={{ top: y, left: x }}>
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
  const handleTriggerClick = () => {
    setOpen(prev => !prev);
    setPosition({
      x: triggerRef.current?.getBoundingClientRect().left ?? 0,
      y: triggerRef.current?.getBoundingClientRect().bottom ?? 0,
    });
  }
  const handleClickOutside = (e: MouseEvent) => {
    if (
      open &&
      dropdownRef.current && 
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setOpen(false);
    }
  }
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  
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