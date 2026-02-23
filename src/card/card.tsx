import { type FC } from "react"
import type { Item, State } from "../model"
import { useSortable } from '@dnd-kit/react/sortable';

interface CardProps {
  id?: string
  index: number
  item: Item
  onUpdate?: (updatedItem: State) => void
}

export const Card: FC<CardProps> = ({ index, item, onUpdate }) => {
  const { ref } = useSortable({ 
    id: item.id, 
    index,
    type: 'item',
    accept: 'item',
    group: item.status,
  });

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim()
    if (newTitle && newTitle !== item.title && onUpdate) {
      fetch(`http://localhost:3000/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })
      .then(res => res.json())
      .then(data => {
        onUpdate(data)
      })
    }
  }

  return (
    <div className="card" ref={ref}>
      <div className="title-container">
        <label htmlFor={`page-title-${item.id}`} className="sr-only">Task Title</label>
        <input 
          id={`page-title-${item.id}`}
          type="text"
          className="title-input" 
          placeholder="Enter title..." 
          defaultValue={item.title}
          onBlur={handleBlur}
        />
      </div>
      {item.body && <p>{item.body}</p>}
    </div>
  )
}