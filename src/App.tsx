import './App.css'

import { useEffect, useRef, useState, type ComponentProps, type FC, type PropsWithChildren } from 'react'
import { Status } from './model'
import type { Item, State } from './model'
import { Card } from './card/card';
import { DragDropProvider } from '@dnd-kit/react';
import { Column } from './column/column';
import { isSortable } from '@dnd-kit/react/sortable';

/**
 * The DragDropProvider component from @dnd-kit/react does not do too well
 * with complex state that is updated after asynchronous operations (like our fetch calls). 
 * It seems to lose track of the active draggable item, which causes the 
 * drag and drop interactions to break until you start a new drag operation.
 * 
 * To work around this, we can unmount and remount the DragDropProvider whenever a drag operation ends.
 * This forces it to reset its internal state and recognize the new state of our items.
 * We use a timeout to delay the unmounting, which allows any pending state updates to complete first.
 */
const DnDProvider: FC<PropsWithChildren<ComponentProps<typeof DragDropProvider>>> = ({ children, onDragStart, onDragEnd, ...props }) => {
  const timeoutRef = useRef<number | null>(null);
  const [ready, setReady] = useState(true);

  if (!ready) return children;

  return (
    <DragDropProvider 
      onDragStart={(...args) => {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); }
        onDragStart?.(...args)
      }}
      onDragEnd={(...args) => {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); }
        timeoutRef.current = window.setTimeout(() => {
          setReady(false);
          setTimeout(() => {
            setReady(true);
          }, 10);
        }, 500);
        onDragEnd?.(...args)
      }}
      {...props}
    >
      {children}
    </DragDropProvider>
  )
}

function App() {
  
  const [state, setState] = useState<State>([])
  const titleMap = new Map([
    [Status.TODO, 'To Do'],
    [Status.IN_PROGRESS, 'In Progress'],
    [Status.DONE, 'Done']
  ])

  const groups = (state ?? []).reduce((acc, item) => {
    if (!acc[item.status]) {
      acc[item.status] = []
    }
    acc[item.status].push(item)
    return acc
  }, {
    [Status.TODO]: [],
    [Status.IN_PROGRESS]: [],
    [Status.DONE]: []
  } as Record<Status, Item[]>)

  useEffect(() => {
    fetch('http://localhost:3000/api/items')
      .then(res => res.json())
      .then(data => {
        setState(data)
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
    })
  }

  const onDrop = (id: string, status: Status, index: number) => () => {
    const groupsCopy = JSON.parse(JSON.stringify(groups)) as Record<Status, Item[]>
    groupsCopy[status] = groupsCopy?.[status]?.filter((item) => item.id !== id);
    const elementBefore = groupsCopy?.[status]?.[index - 1];
    const elementAfter = groupsCopy?.[status]?.[index];

    const lexoRankOrder = elementBefore || elementAfter ? `${elementBefore?.order ?? ''}-${elementAfter?.order ?? ''}` : undefined;

    const body: Record<string, string | number> = { status }

    if (lexoRankOrder) {
      body.order = lexoRankOrder
    }

    fetch(`http://localhost:3000/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(res => res.json() as Promise<State>)
    .then(data => {
      setState(data);
    })
  }

  return (
    <DnDProvider
      onDragOver={(e) => {
        const { source, target } = e.operation
        if ((target?.type === 'column' || target?.type === 'item') && source?.type === 'item') {
          const status = target?.type === 'column' ? target.id as Status : state.find(x => x.id === target.id)?.status
          if (!status) {
            console.warn('Could not determine target status for drag over event', { target, state })
            return
          }
          console.log(`Dragging item ${source.id} over ${target.id} (status: ${status})`)
          // Swap the status of the dragged item with the target column's status
          setState(items => items.map(i => {
            if (i.id === source.id) {
              return { ...i, status }
            }
            return i
          }));
        }
      }}
      onDragEnd={(event) => {
        if (event.canceled) return;
        const { source } = event.operation;

        if (isSortable(source)) {
          const { index, group } = source;
          if (!source?.id) return
          onDrop(source.id.toString(), group as Status, index as number)()
        }
      }}
    >
      <h1>Joty</h1>
      <div className="board">
        {Object.entries(groups).map(([status, items]) => (
          <Column key={status} id={status} title={titleMap.get(status as Status) ?? status}>
            {items.map((item, index) => (
              <Card
                key={`${status}-${item.id}`}
                id={`${status}-${item.id}`}
                item={item}
                index={index}
                onUpdate={(data) => setState(data)} 
              />
            ))}
            {status === Status.TODO && (
              <button className="add-card" onClick={handleAddCard}>+ Add Card</button>
            )}
          </Column>
        ))}
      </div>
    </DnDProvider>
  )
}

export default App
