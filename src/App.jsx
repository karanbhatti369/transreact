
import React, { useState } from "react";
import "./App.css";
import OpenAI from 'openai';
import { BeatLoader } from "react-spinners";

import { BrowserRouter as Router, Routes, Route,Link } from 'react-router-dom';

import HistoryPage from './HistoryPage'; // Import the new component

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

const App = () => {
  const [formData, setFormData] = useState({ language: "french", message: "" });
  const [error, setError] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Below your existing state variables, like formData and response
  const [correctedText, setCorrectedText] = useState("");  
  const [rewrittenText, setRewrittenText] = useState(""); // New state for rewritten text
  // to store the text after corrections by OpenAI


  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const [sourceLanguage, setSourceLanguage] = useState("English");
  const [targetLanguage, setTargetLanguage] = useState("French");
  
  const [view, setView] = useState('main');


//new
  const [context, setContext] = useState("");

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_KEY,
    dangerouslyAllowBrowser: true
  });

const handleInputChange = (e) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
  setError("");

  // Clear the correctedText if the input message is empty or changed
  if (e.target.name === "message") {
    if (e.target.value.trim() === "") {
      setCorrectedText("");
    } else {
      debounce(checkGrammarAndSpelling, 1000)();
    }
  }
};

//history
const [history, setHistory] = useState(() => {
  // Load history from local storage or initialize as an empty array
  const savedHistory = localStorage.getItem("translationHistory");
  return savedHistory ? JSON.parse(savedHistory) : [];
});






  const checkGrammarAndSpelling = async () => {
    const { message } = formData;
  
    // Structured conversation for grammar and spelling check
    const conversation = [
      { role: 'system', content: 'You are an assistant skilled in English grammar and spelling correction.' },
      { role: 'user', content: `Could you correct any grammatical or spelling errors in this sentence? '${message}'` }
    ];
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: conversation,
        temperature: 0.3,
        max_tokens: 60, // Adjust based on the expected length of corrections
        //... other parameters if needed
      });
  
      console.log("OpenAI Response:", response);  // Log the response
  
      if (response.choices && response.choices[0] && response.choices[0].message) {
        setCorrectedText(response.choices[0].message.content.trim());
      } else {
        console.error("Unexpected response format from OpenAI");
      }
    } catch (error) {
      console.error("Error in grammar and spelling check:", error);
    }
  };
  




  
 

  const rewriteText = async () => {
    const { message } = formData;
  
    // Enhanced conversation structure for rephrasing
    const conversation = [
      { role: 'system', content: 'You are a creative writer who excels in rephrasing text while maintaining its original meaning and context.' },
      { role: 'user', content: `Could you rephrase this text in a different way, but keep the same meaning? '${message}'` }
    ];
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4", // Using GPT-4
        messages: conversation,
        temperature: 0.8, // Increased temperature for more creativity
        max_tokens: 60,
      });
  
      // Handling the response
      if (response.choices && response.choices[0] && response.choices[0].message) {
        const rewrittenText = response.choices[0].message.content.trim();
        setRewrittenText(rewrittenText);
        // Check if the rewritten text is too similar to the original
        if (isTextTooSimilar(message, rewrittenText)) {
          console.error("Rewritten text is too similar to the original.");
          setError("Could not rewrite the text effectively. Please try again.");
          return ""; // Handle the similarity issue
        }
  
        return rewrittenText; // Return the rewritten text
      } else {
        console.error("Unexpected response format from OpenAI");
        setError("Could not rewrite the text. Please try again.");
        return ""; // Return an empty string in case of issues
      }
    } catch (err) {
      console.error("Error when calling OpenAI for rewriting:", err);
      setError("An error occurred while rewriting. Please check your connection and try again.");
      return ""; // Return an empty string in case of an error
    }
  };
  
  const isTextTooSimilar = (original, rewritten) => {
    // Implement a basic similarity check, e.g., Levenshtein distance or a simple string comparison
    return original.trim() === rewritten.trim(); // This is a basic example; consider more advanced methods
  };
  



const translate = async () => {
  try {
    const { language, message } = formData;
    let promptMessage = `Translate this from ${sourceLanguage} to ${targetLanguage}: ${message}`;
    if (context) {
      promptMessage = `${context}: ${message}`;
    }

    // Structured conversation for translation
    const conversation = [
      { role: 'system', content: `You are a multilingual translator  fluent in ${sourceLanguage} and ${targetLanguage} and knows modern words also.` },
      { role: 'user', content: promptMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: conversation,
      temperature: 0.3,
      max_tokens: 100,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    if (response.choices && response.choices[0].message.content) {
      const translatedText = response.choices[0].message.content.trim();
      setTranslation(translatedText);

      // Update history with the new translation
      const newHistoryEntry = {
        id: Date.now(),
        sourceText: message,
        translatedText: translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        timestamp: new Date().toISOString()
      };
      updateHistory(newHistoryEntry);
    } else {
      setError("Translation failed. Please try again.");
    }
  } catch (error) {
    setError("An error occurred. Please check your connection and try again.");
  } finally {
    setIsLoading(false);
  }
};



const performAction = async () => {
  setIsLoading(true);
  let textToProcess = formData.message;

 try {
    if (action === 'rewrite' || action === 'both') {
      const rewrittenText = await rewriteText();
      if (rewrittenText) {
        // Set the rewritten text using the new state variable
        setRewrittenText(rewrittenText);
        // Use the rewritten text for further actions if needed
        textToProcess = rewrittenText;
      } else {
        setError("Could not rewrite the text. Please try again.");
      }
    }

    if (action === 'translate' || action === 'both') {
      await translate(textToProcess);
    }
  } catch (err) {
    console.error("Error in performAction:", err);
    setError("An error occurred during the action. Please try again.");
  } finally {
    setIsLoading(false);
  }
};



  const handleOnSubmit = (e) => {
    e.preventDefault();
    if (!formData.message) {
      setError("Please enter the message.");
      return;
    }
    setIsLoading(true);
    performAction();
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(translation)
      .then(() => displayNotification())
      .catch((err) => console.error("failed to copy: ", err));
  };

  const displayNotification = () => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const toggleTheme = () => {
    if (theme === 'light') {
        setTheme('dark');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        setTheme('light');
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
};


const [action, setAction] = useState("translate"); // add this line

const handleLanguageSwap = () => {
  setSourceLanguage(targetLanguage);
  setTargetLanguage(sourceLanguage);
};


//history logic



const updateHistory = (newEntry) => {
  const updatedHistory = [newEntry, ...history].slice(0, 20); // keeping only the latest 20 entries
  setHistory(updatedHistory);
  localStorage.setItem("translationHistory", JSON.stringify(updatedHistory));
};

const deleteEntry = (id) => {
  const updatedHistory = history.filter(entry => entry.id !== id);
  setHistory(updatedHistory);
  localStorage.setItem("translationHistory", JSON.stringify(updatedHistory));
};

const clearHistory = () => {
  setHistory([]);
  localStorage.removeItem("translationHistory");
};



  return (
    <Router>
    <Routes>
      <Route path="/" element={
    <div className="container">
     
      <h1>Translation</h1>
    
      <form onSubmit={handleOnSubmit}>
      
        <div className="language-selection">
  <div>
    <label htmlFor="sourceLanguage">From: </label>
    <select name="sourceLanguage" id="sourceLanguage" value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
      <option value="English">English</option>
      <option value="French">French</option>
      <option value="Spanish">Spanish</option>
      <option value="Japanese">Japanese</option>
      <option value="German">German</option>
    </select>
  </div>


  <button type="button" className="language-swap-btn" onClick={handleLanguageSwap}>
  ↔️
</button>


  <div>
    <label htmlFor="targetLanguage">To: </label>
    <select name="targetLanguage" id="targetLanguage" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
      <option value="English">English</option>
      <option value="French">French</option>
      <option value="Spanish">Spanish</option>
      <option value="Japanese">Japanese</option>
      <option value="German">German</option>
    </select>
  </div>
</div>





        <div className="context-selection">
          <label htmlFor="context">Context: </label>
          <select name="context" id="context" onChange={(e) => setContext(e.target.value)}>
            <option value="">Select Context</option>
            <option value="greeting">Greeting</option>
            <option value="question">Question</option>
            <option value="statement">Statement</option>
            {/* Add more contexts as needed */}
          </select>



          {/* new Add this section below your context selection dropdown in the form */}
<div className="rewriting-options">
  <input
    type="radio"
    id="translate"
    name="action"
    value="translate"
    checked={action === "translate"}
    onChange={(e) => setAction(e.target.value)}
  />
  <label htmlFor="translate">Translate</label>

  <input
    type="radio"
    id="rewrite"
    name="action"
    value="rewrite"
    checked={action === "rewrite"}
    onChange={(e) => setAction(e.target.value)}
  />
  <label htmlFor="rewrite">Rewrite</label>

  <input
    type="radio"
    id="both"
    name="action"
    value="both"
    checked={action === "both"}
    onChange={(e) => setAction(e.target.value)}
  />
  <label htmlFor="both">Both</label>
</div>




          <div className="theme-toggle" onClick={toggleTheme}>
    <div className={`slider ${theme}`}></div>
    <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
</div>

        </div>


        <textarea
          name="message"
          placeholder="Type your message here.."
          value={formData.message}
          onChange={handleInputChange}
        ></textarea>

{/* Add this section below the textarea for the original message */}
{rewrittenText && (action === 'rewrite' || action === 'both') && (
            <div className="rewriting-output">
              <h2>Rewritten Text</h2>
              <p>{rewrittenText}</p>
            </div>
          )}


        {/* Below the original textarea */}
        {correctedText && formData.message && (
          <div className="suggestion" onClick={() => setFormData({ ...formData, message: correctedText })}
           >
             {correctedText}
          </div>
        )}



        {error && <div className="error">{error}</div>}

        <button type="submit">Translate</button>
      </form>

      <div className="translation">
        <div className="copy-btn" onClick={handleCopy}>
          {  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M0 0h24v24H0z" fill="none"/>
    <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
  </svg>}
        </div>
        {isLoading ? <BeatLoader size={12} color={"red"} /> : translation}
      </div>

      <div className={`notification ${showNotification ? "active" : ""}`}>
        Copied to clipboard!
      </div>

      <Link to="/history" className="view-history-button">View History</Link>

    </div>
    } />

    <Route path="/history" element={
      <HistoryPage
        history={history}
        clearHistory={clearHistory}
        deleteEntry={deleteEntry}
   
      />
    } />
  </Routes>
</Router>
);
    

};

export default App;



