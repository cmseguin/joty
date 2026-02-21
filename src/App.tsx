import './App.css'

import { useEffect, useRef, useState, type FC } from 'react'
import { Status } from './model'
import type { Item, State } from './model'

interface CardProps {
  item: Item
  isDragged?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onUpdate?: (updatedItem: State) => void
}

const Card: FC<CardProps> = ({ item, onDragStart, onDragEnd, onUpdate, isDragged }) => {
  const [isDraggable, setIsDraggable] = useState(true)
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
    <div 
      key={item.id} 
      className={`card ${isDragged ? 'dragged' : ''}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div 
        className="title-container" 
        draggable={false} 
        onMouseDown={() => setIsDraggable(false)}
        onMouseUp={() => setIsDraggable(true)}
      >
        <label htmlFor={`page-title-${item.id}`} className="sr-only">Task Title</label>
        <input 
          id={`page-title-${item.id}`}
          type="text"
          draggable={false}
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

interface DropZoneProps { 
  onDrop: () => void;
  disabled?: boolean;
  fullHeight?: boolean;
  item?: Item 
}

const DropZone: FC<DropZoneProps> = ({ onDrop, disabled, item, fullHeight }) => {
  const [isOver, setIsOver] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  return (
    <div
      className={`drop-zone ${fullHeight ? 'full-height' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setIsOver(true)
        }
      }}
      onDrop={() => {
        if (!disabled) {
          onDrop(); 
        };
        setIsOver(false); 
      }}
      onDragLeave={() => {
        timeoutRef.current = setTimeout(() => {
          setIsOver(false);
        }, 100)
      }}
    >
      {!disabled && !!item && !!isOver && <Card item={item} />}
    </div>
  )
}

function App() {
  const [state, setState] = useState<State>({ items: [] })
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const draggedItem = state.items.map((x, i) => ({ ...x, index: i })).find(i => i.id === draggedId)
  const todoItems = state.items.map((x, i) => ({ ...x, index: i })).filter(i => i.status === Status.TODO)
  const inProgressItems = state.items.map((x, i) => ({ ...x, index: i })).filter(i => i.status === Status.IN_PROGRESS)
  const doneItems = state.items.map((x, i) => ({ ...x, index: i })).filter(i => i.status === Status.DONE)

  useEffect(() => {
    console.log('Fetching items...')
    fetch('http://localhost:3000/api/items')
      .then(res => res.json())
      .then(data => {
        setState({ items: data })
      })
  }, [])

  const handleAddCard = () => {
    fetch('http://localhost:3000/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Task' })
    })
    .then(res => res.json())
    .then(data => {
      setState(data)
      console.log('Created item:', data)
    })
  }

  const onCardDragStart = (id: string) => () => {
    console.log('Drag start:', id)
    setDraggedId(id)
  }

  const onCardDragStop = () => {
    console.log('Drag stop')
    setDraggedId(null)
  }

  const onDrop = (status: Status, previousIndex: number = -1) => () => {
    const body: Record<string, string | number> = { status }
    body.order = previousIndex + 1

    fetch(`http://localhost:3000/api/items/${draggedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(res => res.json() as Promise<State>)
    .then(data => {
      setState(data)
      console.log('Updated item:', data)
    })
  }

  return (
    <>
      <h1>Joty</h1>
      <div className="board">
        <div className="column">
          <h2>To Do</h2>
          <div className="cards">
            <DropZone 
              key="first-drop-zone" 
              item={draggedItem} 
              fullHeight={!todoItems.length}
              disabled={draggedItem && draggedItem.status === Status.TODO && draggedItem.id === inProgressItems?.[0]?.id}
              onDrop={onDrop(Status.TODO)}
            />
            {todoItems.map(item => (
              <>
                <Card
                  key={`card-${item.id}`}
                  item={item}
                  isDragged={draggedId === item.id}
                  onDragStart={onCardDragStart(item.id)} 
                  onDragEnd={onCardDragStop} 
                  onUpdate={(data) => setState(data)} 
                />
                <DropZone 
                  key={`drop-zone-${item.id}`}
                  disabled={draggedItem && draggedItem.status === Status.TODO && (draggedItem.id === item.id || draggedItem.index - 1 === item.index)}
                  item={draggedItem} 
                  onDrop={onDrop(Status.TODO, item.index)} 
                />
              </>
            ))}
            <button className="add-card" onClick={handleAddCard}>+ Add Card</button>
          </div>
        </div>
        <div className="column">
          <h2>In Progress</h2>
          <div className="cards">
            <DropZone 
              key="first-drop-zone" 
              item={draggedItem}
              fullHeight={!inProgressItems.length}
              disabled={draggedItem && draggedItem.status === Status.IN_PROGRESS && draggedItem.id === inProgressItems?.[0]?.id}
              onDrop={onDrop(Status.IN_PROGRESS)} 
            />
            {inProgressItems.map(item => (
              <>
                <Card
                  key={`card-${item.id}`}
                  item={item}
                  isDragged={draggedId === item.id}
                  onDragStart={onCardDragStart(item.id)} 
                  onDragEnd={onCardDragStop} 
                  onUpdate={(data) => setState(data)} 
                />
                <DropZone 
                  key={`drop-zone-${item.id}`} 
                  item={draggedItem}
                  disabled={draggedItem && draggedItem.status === Status.IN_PROGRESS && (draggedItem.id === item.id || draggedItem.index - 1 === item.index)}
                  onDrop={onDrop(Status.IN_PROGRESS, item.index)}
                />
              </>
            ))}
          </div>
        </div>
        <div className="column">
          <h2>Done</h2>
          <div className="cards">
            <DropZone 
              key="first-drop-zone" 
              item={draggedItem} 
              fullHeight={!doneItems.length}
              disabled={draggedItem && draggedItem.status === Status.DONE && draggedItem.id === inProgressItems?.[0]?.id}
              onDrop={onDrop(Status.DONE)}
            />
            {doneItems.map(item => (
              <>
                <Card
                  key={`card-${item.id}`}
                  item={item}
                  isDragged={draggedId === item.id}
                  onDragStart={onCardDragStart(item.id)} 
                  onDragEnd={onCardDragStop} 
                  onUpdate={(data) => setState(data)} 
                />
                <DropZone 
                  key={`drop-zone-${item.id}`} 
                  item={draggedItem}
                  disabled={draggedItem && draggedItem.status === Status.DONE && (draggedItem.id === item.id || draggedItem.index - 1 === item.index)}
                  onDrop={onDrop(Status.DONE, item.index)}
                />
              </>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default App
