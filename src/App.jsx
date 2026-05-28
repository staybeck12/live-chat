import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue } from "firebase/database";

const FONTS = ["Impact", "Arial Black", "Comic Sans MS", "Oswald", "Bebas Neue"];
const COLORS = ["#FFFFFF", "#FFFF00", "#FF0000", "#00FF00", "#00BFFF", "#FF69B4", "#FF8C00", "#000000"];

function MemeEditor({ gifUrl, onSend, onCancel }) {
  const canvasRef = useRef(null);
  const [texts, setTexts] = useState([]);
  const [font, setFont] = useState("Impact");
  const [fontSize, setFontSize] = useState(36);
  const [color, setColor] = useState("#FFFFFF");
  const [stroke, setStroke] = useState("#000000");
  const [input, setInput] = useState("");
  const [placing, setPlacing] = useState(false);
  const [dragging, setDragging] = useState(null);
  const dragOff = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    canvas.width = imgRef.current.naturalWidth || 400;
    canvas.height = imgRef.current.naturalHeight || 300;
    ctx.drawImage(imgRef.current, 0, 0);
    texts.forEach((t) => {
      ctx.font = `bold ${t.size}px ${t.font}`;
      ctx.lineWidth = Math.max(2, t.size / 10);
      ctx.strokeStyle = t.stroke;
      ctx.fillStyle = t.color;
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.strokeText(t.text, t.x * canvas.width, t.y * canvas.height);
      ctx.fillText(t.text, t.x * canvas.width, t.y * canvas.height);
    });
  }, [texts]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = gifUrl;
  }, [gifUrl]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const handleCanvasClick = (e) => {
    if (!placing || !input.trim()) return;
    const { x, y } = getPos(e);
    setTexts((prev) => [...prev, { id: Date.now(), text: input.trim(), x, y, font, size: fontSize, color, stroke }]);
    setInput(""); setPlacing(false);
  };

  const handleMouseDown = (e) => {
    if (placing) return;
    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      const hw = (t.text.length * t.size * 0.55) / 2 / canvas.width;
      const hh = (t.size * 1.2) / canvas.height;
      if (Math.abs(x - t.x) < hw && Math.abs(y - t.y) < hh) {
        setDragging(t.id);
        dragOff.current = { x: x - t.x, y: y - t.y };
        return;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const { x, y } = getPos(e);
    setTexts((p) => p.map((t) => t.id === dragging ? { ...t, x: x - dragOff.current.x, y: y - dragOff.current.y } : t));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#18191c", borderRadius: 16, padding: 20, maxWidth: 700, width: "100%", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", position: "relative" }}>
          <canvas ref={canvasRef} onClick={handleCanvasClick} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={() => setDragging(null)}
            style={{ width: "100%", borderRadius: 10, cursor: placing ? "crosshair" : "default", display: "block", background: "#000" }} />
          {placing && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#000a", padding: "8px", fontSize: 12, color: "#fff", textAlign: "center" }}>📍 Clique où poser le texte</div>}
        </div>
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>✏️ Édite ton mème</div>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && input.trim() && setPlacing(true)}
            placeholder="Tape ton texte…" style={{ background: "#2f3136", border: "1px solid #40444b", borderRadius: 8, padding: "8px 10px", color: "#fff", outline: "none", fontSize: 14 }} />
          <button onClick={() => input.trim() && setPlacing(true)} style={{ background: "#5865f2", border: "none", borderRadius: 8, color: "#fff", padding: "8px", cursor: "pointer", fontWeight: 700 }}>
            {placing ? "⬆️ Clique sur le mème" : "📍 Placer le texte"}
          </button>
          <select value={font} onChange={(e) => setFont(e.target.value)} style={{ background: "#2f3136", border: "1px solid #40444b", borderRadius: 8, padding: "7px 10px", color: "#fff" }}>
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div>
            <div style={{ fontSize: 11, color: "#72767d", marginBottom: 3 }}>Taille : {fontSize}px</div>
            <input type="range" min={14} max={100} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#72767d", marginBottom: 4 }}>Couleur</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {COLORS.map((c) => <div key={c} onClick={() => setColor(c)} style={{ width: 20, height: 20, background: c, borderRadius: 4, cursor: "pointer", border: color === c ? "2px solid #5865f2" : "2px solid transparent" }} />)}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 20, height: 20, padding: 0, border: "none", cursor: "pointer" }} />
            </div>
          </div>
          {texts.length > 0 && (
            <div style={{ background: "#2f3136", borderRadius: 8, padding: "8px 10px", maxHeight: 80, overflowY: "auto" }}>
              {texts.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#e2e8f0" }}>{t.text}</span>
                  <button onClick={() => setTexts((p) => p.filter((x) => x.id !== t.id))} style={{ background: "none", border: "none", color: "#ed4245", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <button onClick={onCancel} style={{ flex: 1, background: "#40444b", border: "none", borderRadius: 8, color: "#fff", padding: "10px", cursor: "pointer", fontWeight: 700 }}>Annuler</button>
            <button onClick={() => onSend(canvasRef.current.toDataURL("image/png"))} style={{ flex: 2, background: "linear-gradient(135deg,#ff6b35,#f7c59f)", border: "none", borderRadius: 8, color: "#000", padding: "10px", cursor: "pointer", fontWeight: 800 }}>🚀 Envoyer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({ onReady }) {
  const [fbConfig, setFbConfig] = useState({ apiKey: "", authDomain: "", databaseURL: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" });
  const [tenorKey, setTenorKey] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("memechat_config");
    if (saved) { const c = JSON.parse(saved); onReady(c.firebase, c.tenor, c.username); }
    else setReady(true);
  }, []);

  const saveAll = () => {
    if (!username.trim()) { setError("Choisis un pseudo !"); return; }
    const config = { firebase: fbConfig, tenor: tenorKey, username: username.trim() };
    localStorage.setItem("memechat_config", JSON.stringify(config));
    onReady(fbConfig, tenorKey, username.trim());
  };

  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0f12", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 520, width: "100%", color: "#e2e8f0" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52 }}>🎭</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>MemeChat</div>
          <div style={{ color: "#72767d", fontSize: 14 }}>Configuration initiale — une seule fois !</div>
        </div>
        <div style={{ background: "#1e2124", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>🔥 Firebase Config</div>
          {Object.keys(fbConfig).map((k) => (
            <input key={k} value={fbConfig[k]} onChange={(e) => setFbConfig((p) => ({ ...p, [k]: e.target.value }))}
              placeholder={k} style={{ width: "100%", background: "#2f3136", border: "1px solid #40444b", borderRadius: 7, padding: "7px 10px", color: "#fff", fontSize: 12, marginBottom: 6, boxSizing: "border-box", outline: "none" }} />
          ))}
        </div>
        <div style={{ background: "#1e2124", borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>🎬 Giphy API Key</div>
          <input value={tenorKey} onChange={(e) => setTenorKey(e.target.value)} placeholder="Colle ta clé Giphy ici"
            style={{ width: "100%", background: "#2f3136", border: "1px solid #40444b", borderRadius: 7, padding: "7px 10px", color: "#fff", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
          <div style={{ fontSize: 11, color: "#72767d", marginTop: 4 }}>Laisse vide pour utiliser les templates intégrés</div>
        </div>
        <div style={{ background: "#1e2124", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>👤 Ton pseudo</div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveAll()}
            placeholder="MonPseudo" style={{ width: "100%", background: "#2f3136", border: "1px solid #40444b", borderRadius: 7, padding: "9px 12px", color: "#fff", fontSize: 15, boxSizing: "border-box", outline: "none" }} />
        </div>
        {error && <div style={{ color: "#ed4245", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button onClick={saveAll} style={{ width: "100%", background: "linear-gradient(135deg,#ff6b35,#f7c59f)", border: "none", borderRadius: 12, color: "#000", padding: "14px", cursor: "pointer", fontWeight: 900, fontSize: 16 }}>
          🚀 Lancer MemeChat
        </button>
      </div>
    </div>
  );
}

const BUILTIN_MEMES = [
  { id: "b1", url: "https://i.imgflip.com/1bij.jpg", title: "One Does Not Simply" },
  { id: "b2", url: "https://i.imgflip.com/4t0m5.jpg", title: "Drake" },
  { id: "b3", url: "https://i.imgflip.com/1otk96.jpg", title: "Two Buttons" },
  { id: "b4", url: "https://i.imgflip.com/1g8my4.jpg", title: "Distracted Boyfriend" },
  { id: "b5", url: "https://i.imgflip.com/2fm6x.jpg", title: "Change My Mind" },
  { id: "b6", url: "https://i.imgflip.com/9ehk.jpg", title: "Surprised Pikachu" },
  { id: "b7", url: "https://i.imgflip.com/1bhk.jpg", title: "Y U No" },
  { id: "b8", url: "https://i.imgflip.com/26am.jpg", title: "This is Fine" },
];

export default function MemeChatApp() {
  const [ready, setReady] = useState(false);
  const [tenorApiKey, setTenorApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState([]);
  const [dbRef, setDbRef] = useState(null);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState(BUILTIN_MEMES);
  const [selectedGif, setSelectedGif] = useState(null);
  const [showGifPanel, setShowGifPanel] = useState(false);
  const [textMsg, setTextMsg] = useState("");
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef(null);

  const onReady = (firebase, tenor, user) => {
    setTenorApiKey(tenor);
    setUsername(user);
    setReady(true);
    try {
      let app;
      try { app = initializeApp(firebase, "memechat"); } catch (e) { app = initializeApp(firebase); }
      const database = getDatabase(app);
      const msgsRef = ref(database, "messages");
      setDbRef(msgsRef);
      onValue(msgsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const list = Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.timestamp - b.timestamp);
        setMessages(list);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });
    } catch (e) { console.error("Firebase error:", e); }
  };

  const searchGifs = async (query) => {
    if (!tenorApiKey || !query.trim()) { setGifs(BUILTIN_MEMES); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${tenorApiKey}&q=${encodeURIComponent(query)}&limit=20&rating=g`);
      const data = await res.json();
      if (data.data) setGifs(data.data.map((r) => ({ id: r.id, url: r.images.fixed_height.url, title: r.title })));
    } catch (e) { setGifs(BUILTIN_MEMES); }
    setSearching(false);
  };

  const sendMessage = async (content, type = "text") => {
    if (!dbRef) return;
    await push(dbRef, { sender: username, type, content, timestamp: Date.now() });
    setTextMsg("");
  };

  const avatarColor = (name) => {
    const colors = ["#ff6b35", "#5865f2", "#23a55a", "#f7c59f", "#ed4245", "#00bfff", "#ff69b4"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  };

  if (!ready) return <SetupScreen onReady={onReady} />;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0d0f12", fontFamily: "'Segoe UI', sans-serif", color: "#e2e8f0" }}>
      <div style={{ background: "linear-gradient(135deg,#1a1d22,#18191c)", borderBottom: "1px solid #2f3136", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>🎭</span>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>MemeChat</div>
            <div style={{ fontSize: 11, color: "#23a55a" }}>● Live</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(username), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#fff" }}>
            {username[0]?.toUpperCase()}
          </div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{username}</span>
          <button onClick={() => { localStorage.removeItem("memechat_config"); window.location.reload(); }} style={{ background: "#2f3136", border: "none", borderRadius: 8, color: "#72767d", padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>⚙️</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#40444b", gap: 8 }}>
            <div style={{ fontSize: 48 }}>🎭</div>
            <div style={{ fontWeight: 700 }}>Envoie le premier mème !</div>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender === username;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(msg.sender), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#fff", flexShrink: 0 }}>
                {msg.sender[0]?.toUpperCase()}
              </div>
              <div style={{ maxWidth: "70%" }}>
                <div style={{ fontSize: 11, color: "#72767d", marginBottom: 3, textAlign: isMe ? "right" : "left" }}>{msg.sender}</div>
                {msg.type === "text" ? (
                  <div style={{ background: isMe ? "linear-gradient(135deg,#ff6b35,#f7931a)" : "#2f3136", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 15, color: "#fff", wordBreak: "break-word" }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", overflow: "hidden", border: isMe ? "2px solid #ff6b35" : "2px solid #2f3136" }}>
                    <img src={msg.content} alt="mème" style={{ display: "block", maxWidth: "100%", maxHeight: 350 }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {showGifPanel && (
        <div style={{ background: "#1e2124", borderTop: "1px solid #2f3136", padding: 14, flexShrink: 0, maxHeight: 260, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchGifs(gifSearch)}
              placeholder="Recherche un mème / GIF…"
              style={{ flex: 1, background: "#2f3136", border: "1px solid #40444b", borderRadius: 8, padding: "8px 12px", color: "#fff", outline: "none", fontSize: 14 }} />
            <button onClick={() => searchGifs(gifSearch)} style={{ background: "#5865f2", border: "none", borderRadius: 8, color: "#fff", padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>
              {searching ? "…" : "🔍"}
            </button>
            <button onClick={() => setGifs(BUILTIN_MEMES)} style={{ background: "#2f3136", border: "1px solid #40444b", borderRadius: 8, color: "#fff", padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>
              Templates
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {gifs.map((g) => (
              <div key={g.id} onClick={() => { setSelectedGif(g.url); setShowGifPanel(false); }}
                style={{ flexShrink: 0, width: 120, height: 90, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "2px solid transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#ff6b35"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}>
                <img src={g.url} alt={g.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#1a1d22", borderTop: "1px solid #2f3136", padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => setShowGifPanel(!showGifPanel)}
          style={{ background: showGifPanel ? "#ff6b35" : "#2f3136", border: "none", borderRadius: 10, color: "#fff", padding: "10px 14px", cursor: "pointer", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
          🎭 Mème
        </button>
        <input value={textMsg} onChange={(e) => setTextMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && textMsg.trim() && sendMessage(textMsg, "text")}
          placeholder="Envoie un message…"
          style={{ flex: 1, background: "#2f3136", border: "1px solid #40444b", borderRadius: 10, padding: "10px 14px", color: "#fff", outline: "none", fontSize: 15 }} />
        <button onClick={() => textMsg.trim() && sendMessage(textMsg, "text")}
          style={{ background: "linear-gradient(135deg,#ff6b35,#f7931a)", border: "none", borderRadius: 10, color: "#fff", padding: "10px 16px", cursor: "pointer", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
          ➤
        </button>
      </div>

      {selectedGif && <MemeEditor gifUrl={selectedGif} onSend={(dataUrl) => { sendMessage(dataUrl, "meme"); setSelectedGif(null); }} onCancel={() => setSelectedGif(null)} />}
    </div>
  );
}