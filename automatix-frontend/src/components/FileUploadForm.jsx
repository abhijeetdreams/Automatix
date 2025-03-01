import React, { useState } from 'react';
import axios from 'axios';

const FileUploadForm = () => {
  const [botId, setBotId] = useState('');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState([]);

  // Handle file selection
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  // Add this helper function to read file as buffer
  const readFileAsBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YzE0ZDM1ZjRhMDUzMjBlZDE3Mzk0YyIsImlhdCI6MTc0MDcyMTYzOSwiZXhwIjoxNzcyMjc5MjM5fQ.Vr4eTdVum7tAn0n7sdGzmmb-kPd3hXF-aUcQqpyqzhY";
    
    try {
      // First, get the pre-signed URLs
      const filesData = files.map(file => ({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size
      }));

      const response = await axios.post(
        'http://localhost:8000/api/protected/slack/send-message',
        {
          botId,
          userId,
          message,
          files: filesData
        },
        {
          headers: {
            authorization: `Bearer ${token}`,
            authmember: "67c14ee0f4a05320ed173974"
          }
        }
      );

      // Modified upload logic to use buffers
      const uploadPromises = files.map(async (file, index) => {
        const buffer = await readFileAsBuffer(file);
        const uploadUrl = response.data.uris[index];
        await axios.put(uploadUrl, buffer, {
          headers: {
            'Content-Type': file.type
          }
        });
      });

      await Promise.all(uploadPromises);
      console.log('All files uploaded successfully as buffers');
      
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="botId">Bot ID:</label>
        <input 
          type="text" 
          id="botId" 
          value={botId} 
          onChange={(e) => setBotId(e.target.value)} 
          required 
        />
      </div>

      <div>
        <label htmlFor="userId">User ID:</label>
        <input 
          type="text" 
          id="userId" 
          value={userId} 
          onChange={(e) => setUserId(e.target.value)} 
          required 
        />
      </div>

      <div>
        <label htmlFor="message">Message:</label>
        <input 
          type="text" 
          id="message" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          required 
        />
      </div>

      <div>
        <label htmlFor="files">Select Files:</label>
        <input 
          type="file" 
          id="files" 
          multiple 
          onChange={handleFileChange} 
          // Leave the accept attribute empty to allow all file types
        />
      </div>

      <button type="submit">Upload</button>
    </form>
  );
};

export default FileUploadForm;
