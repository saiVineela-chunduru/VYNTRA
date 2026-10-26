
import { useState, useEffect } from "react";
import "./App.css";

const API = "https://vyntra-backend-8dgz.onrender.com";

function App() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  async function loadPosts() {
    try {
      const response = await fetch(`${API}/posts`);

      if (!response.ok) {
        throw new Error("Could not load posts");
      }

      const data = await response.json();
      setPosts(data);
    } catch {
      setMessage("Posts load avvaledu. Backend check cheyyi.");
    }
  }

  useEffect(() => {
    if (loggedIn) {
      loadPosts();
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!selectedFile) {
      setMediaPreview("");
      return;
    }

    const previewURL = URL.createObjectURL(selectedFile);
    setMediaPreview(previewURL);

    return () => URL.revokeObjectURL(previewURL);
  }, [selectedFile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = isSignup ? "/signup" : "/login";

      const requestData = isSignup
        ? {
            username: username.trim(),
            email: email.trim(),
            password,
          }
        : {
            username: email.trim(),
            password,
          };

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Something went wrong.");
      } else if (isSignup) {
        setMessage("Account created! Please log in.");
        setIsSignup(false);
        setUsername("");
        setEmail("");
        setPassword("");
      } else {
        setCurrentUser(data.username);
        setLoggedIn(true);
        setEmail("");
        setPassword("");
      }
    } catch {
      setMessage("Backend connection failed.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsSignup(!isSignup);
    setUsername("");
    setEmail("");
    setPassword("");
    setMessage("");
  }

  async function createPost(e) {
    e.preventDefault();

    if (!postText.trim() && !selectedFile) {
      setMessage("Text or an image/video select cheyyi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (selectedFile) {
        setUploading(true);

        const formData = new FormData();
        formData.append("username", currentUser);
        formData.append("file", selectedFile);
        formData.append("content", postText.trim());

        const response = await fetch(`${API}/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Media upload failed.");
        }
      } else {
        const response = await fetch(`${API}/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: currentUser,
            content: postText.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Post creation failed.");
        }
      }

      await loadPosts();

      setPostText("");
      setSelectedFile(null);
      setMessage("Post shared successfully!");
    } catch (error) {
      setMessage(error.message || "Post share avvaledu.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  function toggleLike(id) {
    setLikedPosts((previous) =>
      previous.includes(id)
        ? previous.filter((postId) => postId !== id)
        : [...previous, id]
    );
  }

  function logout() {
    setLoggedIn(false);
    setCurrentUser("");
    setMessage("");
    setIsSignup(false);
    setSelectedFile(null);
    setPostText("");
    setPosts([]);
    setLikedPosts([]);
  }

  if (loggedIn) {
    return (
      <div className="home-page">
        <header className="topbar">
          <h1 className="logo">Vyntra</h1>

          <div className="topbar-right">
            <span>@{currentUser}</span>

            <button onClick={logout} className="logout-button">
              Log out
            </button>
          </div>
        </header>

        <main className="feed">
          {activeTab === "home" && (
            <section className="welcome-card">
              <h2>Welcome, {currentUser}!</h2>
              <p>Share your moments with the Vyntra community.</p>
            </section>
          )}

          {activeTab === "upload" && <section className="create-post">
            <h3>Create a post</h3>

            <form onSubmit={createPost}>
              <textarea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={4}
              />

              <label htmlFor="media-file">
                Choose image or video
              </label>

              <input
                id="media-file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                  setMessage("");
                }}
              />

              {mediaPreview && selectedFile && (
                <div className="media-preview">
                  {selectedFile.type.startsWith("video/") ? (
                    <video
                      src={mediaPreview}
                      controls
                      className="post-media"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Selected media preview"
                      className="post-media"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      const input = document.getElementById("media-file");
                      if (input) input.value = "";
                    }}
                  >
                    Remove media
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading}>
                {uploading
                  ? "Uploading media..."
                  : loading
                    ? "Please wait..."
                    : "Share post"}
              </button>
            </form>

            {message && <p role="status">{message}</p>}
          </section>}

          {(activeTab === "home" || activeTab === "search" || activeTab === "reels") && (
          <section className="posts-section">
            <h2>{activeTab === "search" ? "Search" : activeTab === "reels" ? "Reels" : "Home Feed"}</h2>

            {activeTab === "search" && (
              <input
                className="search-input"
                type="search"
                placeholder="Search usernames or captions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            )}

            {(() => {
              const visiblePosts = posts.filter((post) => {
                if (activeTab === "reels") return post.media_type === "video" && post.media_url;
                if (activeTab === "search") {
                  const query = searchQuery.trim().toLowerCase();
                  return !query || `${post.username || ""} ${post.content || ""}`.toLowerCase().includes(query);
                }
                return true;
              });

              return visiblePosts.length === 0 ? (
                <div className="empty-feed">
                  <h3>{activeTab === "reels" ? "No reels yet" : activeTab === "search" ? "No matching posts" : "No posts yet"}</h3>
                  <p>{activeTab === "reels" ? "Video posts will appear here." : activeTab === "search" ? "Try another username or keyword." : "Be the first to share something!"}</p>
                </div>
              ) : (
                visiblePosts.map((post) => (
                <article className="post-card" key={post.id}>
                  <div className="post-header">
                    <div className="avatar">
                      {post.username?.charAt(0).toUpperCase() || "U"}
                    </div>

                    <div>
                      <strong>{post.username}</strong>
                    </div>
                  </div>

                  {post.content && (
                    <p className="post-content">{post.content}</p>
                  )}

                  {post.media_url && (
                    <div className="post-media-container">
                      {post.media_type === "video" ? (
                        <video
                          src={post.media_url}
                          controls
                          className="post-media"
                        />
                      ) : (
                        <img
                          src={post.media_url}
                          alt={`Post by ${post.username}`}
                          className="post-media"
                        />
                      )}
                    </div>
                  )}

                  <button
                    className="like-button"
                    onClick={() => toggleLike(post.id)}
                  >
                    {likedPosts.includes(post.id)
                      ? "❤️ Liked"
                      : "♡ Like"}
                  </button>
                </article>
                ))
              );
            })()}
          </section>
          )}

          {activeTab === "chat" && (
            <section className="placeholder-screen">
              <h2>Chat</h2>
              <p>Messaging is not connected yet.</p>
              <p>We can add real one-to-one chat after creating the messaging backend.</p>
            </section>
          )}
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          <button className={activeTab === "home" ? "nav-item active" : "nav-item"} onClick={() => { setActiveTab("home"); setMessage(""); }} aria-label="Home">
            <span className="nav-icon">⌂</span><span>Home</span>
          </button>
          <button className={activeTab === "search" ? "nav-item active" : "nav-item"} onClick={() => { setActiveTab("search"); setMessage(""); }} aria-label="Search">
            <span className="nav-icon">⌕</span><span>Search</span>
          </button>
          <button className={activeTab === "chat" ? "nav-item active" : "nav-item"} onClick={() => { setActiveTab("chat"); setMessage(""); }} aria-label="Chat">
            <span className="nav-icon">▢</span><span>Chat</span>
          </button>
          <button className={activeTab === "upload" ? "nav-item active" : "nav-item"} onClick={() => { setActiveTab("upload"); setMessage(""); }} aria-label="Upload">
            <span className="nav-icon upload-icon">+</span><span>Upload</span>
          </button>
          <button className={activeTab === "reels" ? "nav-item active" : "nav-item"} onClick={() => { setActiveTab("reels"); setMessage(""); }} aria-label="Reels">
            <span className="nav-icon">▷</span><span>Reels</span>
          </button>
        </nav>

        <footer>© 2026 Vyntra</footer>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="phone">
        <h1 className="logo">Vyntra</h1>

        {isSignup && (
          <p className="signup-heading">
            Sign up to see photos and videos from your friends.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          <input
            type={isSignup ? "email" : "text"}
            placeholder={isSignup ? "Email address" : "Username"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isSignup
                ? "Sign up"
                : "Log in"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}

        {!isSignup && (
          <>
            <p className="forgot">Forgot password?</p>

            <div className="divider">
              <span>OR</span>
            </div>

            <p className="facebook">Log in with Facebook</p>
          </>
        )}

        <div className="signup">
          {isSignup
            ? "Have an account? "
            : "Don't have an account? "}

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              switchMode();
            }}
          >
            {isSignup ? "Log in" : "Sign up"}
          </a>
        </div>
      </div>

      <footer>© 2026 Vyntra</footer>
    </div>
  );
}

export default App;
