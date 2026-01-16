import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../lib/config';

const FileManager = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  // 1. Fetch File List on Load
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/files/list`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  // 2. Handle File Selection
  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // 3. Upload Function
  const onFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await fetch(`${BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });
      alert('File uploaded!');
      setSelectedFile(null);
      fetchFiles(); // Refresh list
    } catch (error) {
      console.error('Error uploading:', error);
    }
  };

  // 4. Download Function
  const downloadFile = (fileName) => {
     window.open(`${BASE_URL}/api/files/download/${fileName}`, '_blank');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', marginTop: '20px' }}>
      <h3>📂 File Manager</h3>
      
      {/* Upload Section */}
      <div style={{ marginBottom: '20px' }}>
        <input type="file" onChange={onFileChange} />
        <button onClick={onFileUpload} style={{ marginLeft: '10px' }}>
          Upload
        </button>
      </div>

      {/* File List */}
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {files.map((file, index) => (
          <li key={index} style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
            {file.name} 
            <button 
                onClick={() => downloadFile(file.name)}
                style={{ marginLeft: '10px', fontSize: '0.8rem' }}
            >
                ⬇ Download
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileManager;
