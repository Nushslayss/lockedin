// LOGIN.JSX - LOCKEDIN LOGIN PAGE
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const API_URL = "https://lockedinbackend.up.railway.app";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", data.token);
      router.push("/");
    } catch (err) {
      setError("Could not connect. Try again.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <button onClick={toggleTheme} style={styles.themeBtn}>
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <div className="sparkle-wrap" style={{ marginBottom: 4 }}>
        <span className="sparkle" style={{ top: -10, left: -18 }}>✨</span>
        <span className="sparkle" style={{ top: -14, right: -14, animationDelay: "0.4s" }}>✨</span>
        <span className="sparkle" style={{ bottom: -8, left: 20, animationDelay: "0.8s" }}>💫</span>
        <span className="sparkle" style={{ bottom: -6, right: 10, animationDelay: "1.2s" }}>✨</span>
        <h1 className="wordmark" style={{ fontSize: "3rem", margin: 0 }}>lockedin</h1>
      </div>
      <p style={{ color: "var(--text-dim)", fontFamily: "Quicksand", marginTop: 0, marginBottom: 28 }}>
        Welcome back, bestie
      </p>

      <div style={styles.card}>
        <div style={styles.switcher}>
          <button style={styles.switchActive}>Log in</button>
          <button style={styles.switchInactive} onClick={() => router.push("/signup")}>
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p style={styles.footerText}>
          Don't have an account?{" "}
          <span style={styles.link} onClick={() => router.push("/signup")}>
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
  },
  themeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "50%",
    width: 44,
    height: 44,
    fontSize: 18,
    cursor: "pointer",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 24,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
  },
  switcher: {
    display: "flex",
    background: "var(--surface-2)",
    borderRadius: 999,
    padding: 4,
    marginBottom: 24,
  },
  switchActive: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 999,
    border: "none",
    background: "var(--primary)",
    color: "#fff",
    fontFamily: "Quicksand",
    fontWeight: 600,
    cursor: "pointer",
  },
  switchInactive: {
    flex: 1,
    padding: "10px 0",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "var(--text-dim)",
    fontFamily: "Quicksand",
    fontWeight: 600,
    cursor: "pointer",
  },
  input: {
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    fontFamily: "Poppins",
    fontSize: 14,
    outline: "none",
  },
  submitBtn: {
    marginTop: 6,
    padding: "14px 0",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(90deg, var(--primary-strong), var(--primary))",
    color: "#fff",
    fontFamily: "Quicksand",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  error: {
    color: "#ff5f5f",
    fontFamily: "Quicksand",
    fontSize: 13,
    margin: 0,
  },
  footerText: {
    textAlign: "center",
    color: "var(--text-dim)",
    fontFamily: "Quicksand",
    fontSize: 13,
    marginTop: 20,
    marginBottom: 0,
  },
  link: {
    color: "var(--primary-strong)",
    fontWeight: 700,
    cursor: "pointer",
  },
};