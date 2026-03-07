import './card.scoped.css';

import { type FC } from "react"
import type { Item, State } from "../model"
import { useSortable } from '@dnd-kit/react/sortable';
import { Dropdown } from "../dropdown/dropdown";
import { KebabButton } from "../kebab-button/kebab-button";
import { remove, update } from '../sdk';

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

  const handleDropdownSelect = async (option: string) => {
    if (option === 'Delete' && onUpdate) {
      const data = await remove({ id: item.id })
      onUpdate(data)
    }
  }

  const handleBlur = (field: 'title' | 'body') => async (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const oldValue = item[field]
    const newValue = e.target.value.trim()

    if (newValue && newValue !== oldValue && onUpdate) {
      const data = await update({ id: item.id, [field]: newValue })
      onUpdate(data)
    }
  }

  return (
    <div className="card" ref={ref}>
      <header className="header">
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
        <Dropdown options={[ 'Delete' ]} onSelect={handleDropdownSelect}>
          {({ ...props }) => (
            <KebabButton className='kebab-btn' {...props} />
          )}
        </Dropdown>
      </header>
      <textarea
        className="body-input"
        placeholder="Enter description..."
        defaultValue={item.body}
        onBlur={handleBlur('body')}
      />
    </div>
  )
}