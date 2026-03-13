import { useState, useEffect } from 'react';
import type { ZoomDoc } from './types/zoomdoc';
import { DocumentLoader } from './components/DocumentLoader';
import { Reader } from './components/Reader';
import { sampleDoc } from './data/sample-doc';

function App() {
  const [doc, setDoc] = useState<ZoomDoc | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docUrl = params.get('doc');
    if (docUrl) {
      fetch(docUrl)
        .then(r => r.json())
        .then(d => setDoc(d as ZoomDoc))
        .catch(err => console.error('Failed to load document from URL:', err));
    }
  }, []);

  if (doc) {
    return <Reader doc={doc} onBack={() => setDoc(null)} />;
  }

  return (
    <DocumentLoader
      onLoad={setDoc}
      onLoadSample={() => setDoc(sampleDoc)}
    />
  );
}

export default App;
