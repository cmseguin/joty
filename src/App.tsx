import './App.css'

import { useEffect, useState } from 'react'
import { Status } from './model'
import type { State } from './model'

function App() {
  const [state, setState] = useState<State>({ items: [] })

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

  return (
    <>
      <h1>Joty</h1>
      <div className="board">
        <div className="column">
          <h2>To Do</h2>
          <div className="cards">
            {state.items.filter(i => i.status === Status.TODO).map(item => (
              <div key={item.id} className="card">
                <h3>{item.title}</h3>
                {item.body && <p>{item.body}</p>}
              </div>
            ))}
            <button className="add-card" onClick={handleAddCard}>+ Add Card</button>
          </div>
        </div>
        <div className="column">
          <h2>In Progress</h2>
          <div className="cards">

          </div>
        </div>
        <div className="column">
          <h2>Done</h2>
          <div className="cards">

          </div>
        </div>
      </div>
    </>
  )
}

export default App
