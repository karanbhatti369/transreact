import React from 'react';

const HistoryPage = ({ history, clearHistory, deleteEntry }) => {
  if (!history.length) {
    return <div className="no-history-message">
    No history available.
  </div>
  }

  return (
    <div className="history-container">
      <button onClick={clearHistory}>Clear History</button>
      
      <table>
        <thead>
          <tr>
            <th>Source Text</th>
            <th>Translated Text</th>
            <th>Source Language</th>
            <th>Target Language</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {history.map(entry => (
            <tr key={entry.id}>
              <td>{entry.sourceText}</td>
              <td>{entry.translatedText}</td>
              <td>{entry.sourceLanguage}</td>
              <td>{entry.targetLanguage}</td>
              <td>
                <button onClick={() => deleteEntry(entry.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  
};

export default HistoryPage;
