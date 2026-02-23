import { useDroppable } from "@dnd-kit/react";
import {CollisionPriority} from '@dnd-kit/abstract';
import { useEffect, type FC, type PropsWithChildren } from "react";

interface ColumnProps {
  id: string
  title: string
}

export const Column: FC<PropsWithChildren<ColumnProps>> = ({ id, title, children }) => {
  const { ref, isDropTarget } = useDroppable({
    id,
    type: 'column',
    accept: 'item',
    collisionPriority: CollisionPriority.Low,
  });

  useEffect(() => {
    console.log(`Column ${id} isDropTarget:`, isDropTarget);
  }, [isDropTarget, id]);

  return (
    <div className="column">
      <h2>{title}</h2>
      <div ref={ref} className="cards">
        {children}
      </div>
    </div>
  )
}