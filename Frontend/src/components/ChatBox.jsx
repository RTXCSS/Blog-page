import { useEffect, useState } from "react";
import socket from "../services/socket";

function ChatBox() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receive-message");
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("send-message", message);
    setMessage("");
  };

  return (
    <div style={{ width: "320px", border: "1px solid #ccc", padding: "10px" }}>
      <h3>Chat</h3>

      <div style={{ height: "200px", overflowY: "auto", marginBottom: "10px" }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type message..."
        style={{ width: "100%", marginBottom: "5px" }}
      />

      <button onClick={sendMessage} style={{ width: "100%" }}>
        Send
      </button>
    </div>
  );
}

export default ChatBox;
