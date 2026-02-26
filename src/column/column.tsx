import { useDroppable } from "@dnd-kit/react";
import {CollisionPriority} from '@dnd-kit/abstract';
import { type FC, type PropsWithChildren } from "react";

interface ColumnProps {
  id: string
  title: string
  endAdornment?: React.ReactNode
}

export const Column: FC<PropsWithChildren<ColumnProps>> = ({ id, title, endAdornment, children }) => {
  const { ref } = useDroppable({
    id,
    type: 'column',
    accept: 'item',
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div className="column-wrap">
      <h2 className="column-heading">{title}</h2>
      <div className="column">
        <div ref={ref} className="cards">
          {children}
        </div>
        {!!endAdornment && (
          <footer className="end-adornment">
            {endAdornment}
          </footer>
        )}
      </div>
    </div>
  )
}