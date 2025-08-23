import { useState } from 'react'
import './App.css'
import { SampleForceGraph } from "./components/core/SampleForceGraph"
import Layout from './components/core/layout'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Layout>
        <SampleForceGraph />
      </Layout>
    </>
  )
}

export default App
