import React, { useState, useEffect, useRef } from "react";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

const createChatModel = (apiKey) => {
  return new ChatGroq({
    apiKey: apiKey,
    model: "mixtral-8x7b-32768",
    temperature: 0.7,
  });
};

const createPromptTemplate = () => {
  return ChatPromptTemplate.fromMessages([
    ["system", "You are a friendly and helpful library assistant. Start the conversation with a warm greeting about how you can help with library-related questions."],
    ["human", "{input}"]
  ]);
};

function Chatbot() {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [chain, setChain] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

        if (!groqApiKey) {
          throw new Error("GROQ API key not found in environment variables");
        }

        const model = createChatModel(groqApiKey);
        const prompt = createPromptTemplate();

        const newChain = RunnableSequence.from([
          prompt,
          model,
          new StringOutputParser()
        ]);

        setChain(newChain);

        await sendInitialGreeting(newChain);

      } catch (error) {
        console.error("Error initializing chat:", error);
        setError(`Initialization Error: ${error.message}`);
      }
    };

    const sendInitialGreeting = async (chainInstance) => {
      try {
        const greeting = await chainInstance.invoke({ 
          input: "Please provide a warm greeting to the user about helping with library-related questions." 
        });

        setChatHistory([{
          type: 'ai',
          content: greeting
        }]);
      } catch (greetingError) {
        console.error("Error sending initial greeting:", greetingError);
        setError("Could not generate initial greeting");
      }
    };

    initializeChat();
  }, []); 

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (!chain) {
      setError("Chat system not properly initialized. Please check API key configuration.");
      return;
    }

    const newUserMessage = { 
      type: 'user', 
      content: trimmedInput 
    };
    setChatHistory(prevHistory => [...prevHistory, newUserMessage]);
    
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const result = await chain.invoke({ input: trimmedInput });

      const newAIMessage = { 
        type: 'ai', 
        content: result 
      };

      setChatHistory(prevHistory => [...prevHistory, newAIMessage]);
    } catch (error) {
      console.error("Error:", error);
      setError(`Conversation Error: ${error.message}`);
      
      setChatHistory(prevHistory => prevHistory.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatBox}>
        {error && <div style={styles.error}>{error}</div>}
        
        <div style={styles.chatHistory}>
          {chatHistory.map((msg, index) => (
            <div 
              key={index} 
              style={msg.type === 'user' ? styles.userMessage : styles.aiMessage}
            >
              {msg.type === 'user' ? '👤 You: ' : '🤖 Assistant: '}
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div style={styles.loadingMessage}>Assistant is typing...</div>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          style={styles.input}
          placeholder="Ask me about the library..."
          disabled={isLoading}
        />
        <button 
          type="submit" 
          style={styles.button} 
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    backgroundColor: "#f0f0f5",
    fontFamily: "Arial, sans-serif",
    height: "100vh",
  },
  chatBox: {
    maxWidth: "600px",
    width: "100%",
    height: "calc(100% - 150px)",
    marginBottom: "20px",
    padding: "10px",
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
    overflowY: "auto",
  },
  chatHistory: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "10px",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#e6f2ff",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "80%",
    wordWrap: "break-word",
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "80%",
    wordWrap: "break-word",
  },
  form: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
    maxWidth: "600px",
  },
  input: {
    width: "80%",
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    marginRight: "10px",
  },
  button: {
    padding: "10px 15px",
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  error: {
    color: '#ff4444',
    marginBottom: '10px',
    padding: '10px',
    backgroundColor: '#ffe6e6',
    borderRadius: '5px',
  },
  loadingMessage: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  }
};

export default Chatbot;