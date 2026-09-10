import { useCallback, useEffect, useRef, useState } from "react";
import "./MarketplaceChat.css";

async function api(base, token, path, body, signal) {
  const response = await fetch(base + "/api/marketplace-chat" + path, {
    method: body ? "POST" : "GET", signal, cache: "no-store",
    headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Chat is unavailable. Please retry.");
  return data;
}

export function useMarketplaceChat(base, token) {
  const [threads, setThreads] = useState([]);
  const [connection, setConnection] = useState("Connecting");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const reload = useCallback(async () => {
    const rows = await api(base, token, "/threads");
    setThreads(rows);
    return rows;
  }, [base, token]);

  useEffect(() => {
    if (!token) return;
    let stopped = false;
    let retry;
    let pollBusy = false;
    let stream;
    const fallback = new AbortController();
    const poll = async () => {
      if (pollBusy || stopped) return;
      pollBusy = true;
      try {
        const rows = await api(base, token, "/threads", null, fallback.signal);
        if (!stopped) { setThreads(rows); setError(""); }
      } catch (err) {
        if (!stopped) setError(err.message);
      } finally { pollBusy = false; }
    };
    const connect = async () => {
      stream = new AbortController();
      let lastEvent = Date.now();
      const watchdog = setInterval(() => { if (Date.now() - lastEvent > 35000) stream.abort(); }, 5000);
      try {
        const response = await fetch(base + "/api/marketplace-chat/events", {
          headers: { Authorization: "Bearer " + token }, signal: stream.signal, cache: "no-store"
        });
        if (!response.ok || !response.body) throw new Error("Live connection unavailable.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          lastEvent = Date.now();
          buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
          let boundary;
          while ((boundary = buffer.indexOf("\n\n")) >= 0) {
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = event.split("\n").find((line) => line.startsWith("data: "));
            if (data && !stopped) {
              setThreads(JSON.parse(data.slice(6)));
              setConnection("Live");
              setError("");
            }
          }
        }
      } catch {
        // The polling fallback keeps the inbox usable while the stream reconnects.
      } finally {
        clearInterval(watchdog);
        if (!stopped) { setConnection("Reconnecting"); retry = setTimeout(connect, 3000); }
      }
    };
    void poll();
    void connect();
    const pollTimer = setInterval(poll, 10000);
    const onFocus = () => { void poll(); };
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true; clearTimeout(retry); clearInterval(pollTimer);
      fallback.abort(); stream?.abort(); window.removeEventListener("focus", onFocus);
    };
  }, [base, token]);

  const request = async (listingId) => {
    setError("");
    try {
      const result = await api(base, token, "/requests", { listingId });
      setSelectedId(result.id);
      await reload();
      return true;
    } catch (err) { setError(err.message); return false; }
  };
  const act = async (id, action, body) => {
    setError("");
    try {
      const thread = await api(base, token, "/threads/" + encodeURIComponent(id) + "/" + action, body);
      setThreads((rows) => [thread, ...rows.filter((item) => item.id !== id)]);
      return true;
    } catch (err) { setError(err.message); return false; }
  };
  return { threads, connection, error, setError, selectedId, setSelectedId, request, act };
}

function ChatSymbol({ type = "chat" }) {
  const paths = {
    chat: <path d="M4 4h16v12H9l-5 4V4Z" />,
    send: <><path d="m3 3 18 9-18 9 4-9-4-9Z" /><path d="M7 12h14" /></>,
    file: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />
    ,clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export function ChatRequestButton({ chat, listingId, mine, openChats }) {
  const [busy, setBusy] = useState(false);
  const existing = chat.threads.find((thread) => thread.listingId === listingId);
  return <button type="button" disabled={busy} onClick={async () => {
    if (mine || existing) {
      chat.setSelectedId(existing?.id || ""); openChats(); return;
    }
    setBusy(true);
    const ok = await chat.request(listingId);
    setBusy(false);
    if (ok) openChats();
  }}><ChatSymbol />{busy ? "Sending request..." : mine ? "View chats" : existing?.approval === "Pending" ? "Request pending" : existing?.approval === "Rejected" ? "Request declined" : existing ? "Open chat" : "Request chat"}</button>;
}

const time = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

function isImageAttachment(attachment) {
  return String(attachment?.mimeType || "").startsWith("image/") ||
    /^data:image\/(?:png|jpeg|gif|webp);base64,/.test(String(attachment?.dataUrl || ""));
}

export function MarketplaceChat({ chat, clientId, admin = false }) {
  const selected = chat.threads.find((thread) => thread.id === chat.selectedId) || chat.threads[0];
  const [filter, setFilter] = useState("All");
  const rows = chat.threads.filter((thread) => filter === "All" || thread.approval === filter);
  return <section className="mc-workspace">
    <header className="mc-heading">
      <div className="mc-heading-main">
        <span className="mc-heading-icon"><ChatSymbol /></span>
        <div><span className="mc-kicker">{admin ? "Marketplace moderation" : "Your inbox"}</span><h2>{admin ? "Chat requests" : "Marketplace conversations"}</h2><span>{chat.threads.length} conversations</span></div>
      </div>
      <div className="mc-heading-meta">
        <span className="mc-retention"><ChatSymbol type="clock" /> Clears after 7 days inactive</span>
        <span className={"mc-connection " + (chat.connection === "Live" ? "is-live" : "")}><i />{chat.connection}</span>
      </div>
    </header>
    {chat.error && <p className="mc-error" role="alert">{chat.error}</p>}
    <div className="mc-layout">
      <aside className="mc-inbox">
        <label className="mc-filter"><span>Filter conversations</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
        {rows.map((thread) => <button className={"mc-thread " + (selected?.id === thread.id ? "is-selected" : "")} key={thread.id} onClick={() => chat.setSelectedId(thread.id)}>
          <span className="mc-thread-top"><strong>{admin || clientId === thread.sellerClientId ? thread.requesterName : thread.ownerName}</strong><small>{thread.approval}</small></span>
          <span>{thread.title}</span>
          <small>{thread.messages.at(-1)?.text || (thread.messages.at(-1)?.attachment ? "Attachment" : "No messages yet")}</small>
        </button>)}
        {!rows.length && <p className="mc-empty">No {filter === "All" ? "" : filter.toLowerCase() + " "}conversations.</p>}
      </aside>
      {selected ? <Conversation key={selected.id} thread={selected} chat={chat} clientId={clientId} admin={admin} /> :
        <div className="mc-empty-conversation"><ChatSymbol /><h3>{admin ? "No chat requests" : "No conversations yet"}</h3></div>}
    </div>
  </section>;
}

function Conversation({ thread, chat, clientId, admin }) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const retryId = useRef(null);
  const history = useRef(null);
  const approved = thread.approval === "Approved";
  const canSend = approved && !admin && !thread.blocked && thread.status !== "Closed";
  useEffect(() => {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [thread.messages.length]);
  const action = async (name, body) => {
    setBusy(true);
    try { return await chat.act(thread.id, name, body); }
    finally { setBusy(false); }
  };
  return <div className="mc-conversation">
    <header className="mc-conversation-head">
      <div><h3>{thread.title}</h3><p>{thread.requesterName} &middot; {thread.ownerName}</p><small>{thread.registration}</small></div>
      <span className="mc-status">{approved ? thread.status : thread.approval}</span>
    </header>
    {!approved && <div className="mc-approval">
      <strong>{thread.approval === "Pending"
        ? (admin
          ? "Review this chat request"
          : clientId === thread.sellerClientId
            ? "A client requested this chat. Waiting for Admin approval."
            : "Your chat request is waiting for Admin approval.")
        : "Chat request declined"}</strong>
      {admin && thread.approval === "Pending" && <div className="mc-actions">
        <button disabled={busy} onClick={() => action("decision", { decision: "Approved" })}><ChatSymbol type="check" />Approve</button>
        <button disabled={busy} className="mc-danger" onClick={() => action("decision", { decision: "Rejected" })}><ChatSymbol type="close" />Reject</button>
      </div>}
    </div>}
    <div className="mc-history" ref={history} aria-live="polite" aria-label="Messages">
      {thread.messages.map((message) => <article key={message.id} className={"mc-message " + (message.senderClientId === clientId ? "is-mine" : "")}>
        <strong>{message.senderName || "Client"}</strong>
        {message.text && <p>{message.text}</p>}
        {message.attachment?.dataUrl && /^data:(application\/pdf|image\/(?:png|jpeg|gif|webp));base64,/.test(message.attachment.dataUrl) &&
          (isImageAttachment(message.attachment) ? (
            <a className="mc-image-attachment" href={message.attachment.dataUrl} target="_blank" rel="noreferrer">
              <img src={message.attachment.dataUrl} alt={message.attachment.fileName || "Attached image"} />
              <span><ChatSymbol type="file" />{message.attachment.fileName}</span>
            </a>
          ) : (
            <a className="mc-file-attachment" href={message.attachment.dataUrl} download={message.attachment.fileName}>
              <ChatSymbol type="file" />{message.attachment.fileName}
            </a>
          ))}
        <small>{time(message.sentAt)}</small>
      </article>)}
      {approved && !thread.messages.length && <p className="mc-empty">No messages yet.</p>}
    </div>
    {canSend && <form className="mc-composer" onSubmit={async (event) => {
      event.preventDefault();
      if (busy || fileBusy || (!text.trim() && !attachment)) return;
      retryId.current ||= crypto.randomUUID();
      if (await action("message", { messageId: retryId.current, text, attachment })) {
        setText(""); setAttachment(null); retryId.current = null;
      }
    }}>
      {attachment && isImageAttachment(attachment) && <div className="mc-selected-image"><img src={attachment.dataUrl} alt="Selected attachment preview" /><span>{attachment.fileName}</span></div>}
      <div className="mc-composer-row">
        <label className="mc-file" title="Attach image or file" aria-label="Attach image or file"><ChatSymbol type="file" /><span>{fileBusy ? "Reading..." : attachment?.fileName || "Attach"}</span>
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" disabled={busy || fileBusy} onChange={async (event) => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (!file) return;
            if (file.size > 8 * 1024 * 1024) { chat.setError("File must be smaller than 8 MB."); return; }
            setFileBusy(true);
            try {
              const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
              setAttachment({ fileName: file.name, dataUrl }); retryId.current = null; chat.setError("");
            } catch { chat.setError("Unable to read file."); }
            finally { setFileBusy(false); }
          }} />
        </label>
        <textarea aria-label="Message" placeholder="Write a message..." value={text} maxLength={4000} disabled={busy} onChange={(event) => { setText(event.target.value); retryId.current = null; }} onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }} />
        {attachment && <button type="button" title="Remove attachment" aria-label="Remove attachment" disabled={busy} onClick={() => { setAttachment(null); retryId.current = null; }}><ChatSymbol type="close" /></button>}
        <button className="mc-send-button" type="submit" aria-label={busy ? "Sending message" : "Send message"} title={busy ? "Sending..." : "Send message"} disabled={busy || fileBusy || (!text.trim() && !attachment)}><ChatSymbol type="send" /></button>
      </div>
    </form>}
    {approved && !admin && !thread.blocked && <footer className="mc-footer">
      {clientId === thread.sellerClientId && thread.status !== "Closed" && <button disabled={busy} onClick={() => action("status", { status: "Reserved" })}>Reserve</button>}
      <button disabled={busy} onClick={() => action("status", { status: thread.status === "Closed" ? "Negotiating" : "Closed" })}>{thread.status === "Closed" ? "Reopen chat" : "Close chat"}</button>
      <button disabled={busy || thread.reported} onClick={() => action("status", { status: "Reported" })}>{thread.reported ? "Reported" : "Report"}</button>
      <button disabled={busy} className="mc-danger" onClick={() => { if (window.confirm("Block this conversation? Further messages will be stopped.")) void action("status", { status: "Blocked" }); }}>Block</button>
    </footer>}
  </div>;
}
