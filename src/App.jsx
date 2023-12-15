
import React, { useState } from "react";
import "./App.css";
import OpenAI from 'openai';
import { BeatLoader } from "react-spinners";


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
  const [correctedText, setCorrectedText] = useState("");  // to store the text after corrections by OpenAI


  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const [sourceLanguage, setSourceLanguage] = useState("English");
  const [targetLanguage, setTargetLanguage] = useState("French");
  

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


  const checkGrammarAndSpelling = async () => {
    const promptMessage = `Provide a grammatically correct version of the following sentence: '${formData.message}'`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: 'user', content: promptMessage }],
      temperature: 0.3,
      //... other parameters if needed
    });

    console.log("OpenAI Response:", response);  // Log the response

    if (response.choices && response.choices[0] && response.choices[0].message) {
      setCorrectedText(response.choices[0].message.content.trim());
    } else {
      console.error("Unexpected response format from OpenAI");
    }
  };

//new 
  const rewriteText = async () => {
    const promptMessage = `rephrase the following sentence: '${formData.message}'`;
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: 'user', content: promptMessage }],
        temperature: 0.7,
        max_tokens: 60,
      });
  
      if (response.choices && response.choices[0] && response.choices[0].message) {
        return response.choices[0].message.content.trim(); // Return the rewritten text
      } else {
        console.error("Unexpected response format from OpenAI");
        setError("Could not rewrite the text. Please try again.");
        return ""; // Return an empty string if there was a problem
      }
    } catch (err) {
      console.error("Error when calling OpenAI for rewriting:", err);
      setError("An error occurred while rewriting. Please check your connection and try again.");
      return ""; // Return an empty string if there was an error
    }
  };
  






  const translate = async () => {
    try {
      const { language, message } = formData;
      let promptMessage = `Translate this from ${sourceLanguage} to ${targetLanguage}: ${formData.message}`;
      if (context) {
        promptMessage = `${context}: ${message}`;
      }
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: 'user', content: `Translate this into ${language}: ${promptMessage}` }],

        temperature: 0.3,
        max_tokens: 100,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      });
      if (response.choices && response.choices[0].message.content) {
        const translatedText = response.choices[0].message.content.trim();
        setTranslation(translatedText);
      } else {
        setError("Translation failed. Please try again.");
      }
    } catch (error) {
      setError("An error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };


//new
const performAction = async () => {
  setIsLoading(true);
  let textToProcess = formData.message;

  try {
    if (action === 'rewrite' || action === 'both') {
      const rewrittenText = await rewriteText();
      if (rewrittenText) {
        setCorrectedText(rewrittenText);
        textToProcess = rewrittenText;
      } else {
        setIsLoading(false);
        return;
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
    translate();
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


  return (
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
{correctedText && action !== 'translate' && (
  <div className="rewriting-output">
    <h2>Rewritten Text</h2>
    <p>{correctedText}</p>
  </div>
)}


        {/* Below the original textarea */}
        {correctedText && formData.message && (
          <div className="suggestion" onClick={() => setFormData({ ...formData, message: correctedText })}
           >
            Did you mean: {correctedText}
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
    </div>
  );
};

export default App;



