import { ExampleForceGraph } from "@/example-graph.tsx";
import './App.css'
import Layout from './components/layout'
import { useState } from 'react';
import type { DataSource } from './components/project-selection';
import type { SampleNode } from './example-data.types';
import { exampleDataStatic } from './example-data-static';
import { exampleDataMapped } from './example-data.util';

function App() {
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource>('static');
  const [selectedNode, setSelectedNode] = useState<SampleNode | null>(null);

  // Get current data based on selection
  const currentData = selectedDataSource === 'mapped' ? exampleDataMapped : exampleDataStatic;

  // When data source changes, clear selection since node IDs might be different
  const handleDataSourceChange = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setSelectedNode(null);
  };

  return (
    <>
      <Layout
        selectedDataSource={selectedDataSource}
        onDataSourceChange={handleDataSourceChange}
        selectedNode={selectedNode}
        allNodes={currentData.nodes}
        allLinks={currentData.links}
      >
        <ExampleForceGraph 
          selectedDataSource={selectedDataSource}
          onNodeSelect={setSelectedNode}
        />
      </Layout>
    </>
  )
}

export default App
