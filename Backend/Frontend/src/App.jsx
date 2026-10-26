
import { useState, useEffect } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

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

  async function loadPosts() {
    try {
      const response = await fetch(`${API}/posts`);
      if (!response.ok) throw new Error("Could not load posts");
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
        headers: { "Content-Type": "application/json" },
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

    if (!postText.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          content: postText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Post creation failed.");
        return;
      }

      setPostText("");
      await loadPosts();
      setMessage("Post shared successfully!");
    } catch {
      setMessage("Post share avvaledu. Backend check cheyyi.");
    } finally {
      setLoading(false);
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
          <section className="welcome-card">
            <h2>Welcome, {currentUser}!</h2>
            <p>Share your moments with the Vyntra community.</p>
          </section>

          <section className="create-post">
            <h3>Create a post</h3>
            <form onSubmit={createPost}>
              <textarea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={4}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? "Please wait..." : "Share post"}
              </button>
            </form>
            {message && <p role="status">{message}</p>}
          </section>

          <section className="posts-section">
            <h2>Home Feed</h2>

            {posts.length === 0 ? (
              <div className="empty-feed">
                <h3>No posts yet</h3>
                <p>Be the first to share something!</p>
              </div>
            ) : (
              posts.map((post) => (
                <article className="post-card" key={post.id}>
                  <div className="post-header">
                    <div className="avatar">
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{post.username}</strong>
                    </div>
                  </div>

                  <p className="post-content">{post.content}</p>

                  <button
                    className="like-button"
                    onClick={() => toggleLike(post.id)}
                  >
                    {likedPosts.includes(post.id) ? "❤️ Liked" : "♡ Like"}
                  </button>
                </article>
              ))
            )}
          </section>
        </main>

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
            {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}

        {!isSignup && (
          <>
            <p className="forgot">Forgot password?</p>
            <div className="divider"><span>OR</span></div>
            <p className="facebook">Log in with Facebook</p>
          </>
        )}

        <div className="signup">
          {isSignup ? "Have an account? " : "Don't have an account? "}
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
