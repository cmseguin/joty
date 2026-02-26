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

  const handleBlur = (field: 'title' | 'body') => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const oldValue = item[field]
    const newValue = e.target.value.trim()

    if (newValue && newValue !== oldValue && onUpdate) {
      fetch(`http://localhost:3000/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
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
        <textarea 
          id={`page-title-${item.id}`}
          className="title-input" 
          placeholder="Enter title..." 
          defaultValue={item.title}
          onBlur={handleBlur('title')}
        />
      </div>
      <textarea
        className="body-input"
        placeholder="Enter description..."
        defaultValue={item.body}
        onBlur={handleBlur('body')}
      />
    </div>
  )
}