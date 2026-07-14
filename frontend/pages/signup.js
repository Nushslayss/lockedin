import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const API_URL = "https://task-manager-production-d03d.up.railway.app";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (data.token) {
        localStorage.setItem("token", data.token);
        alert("✨ Signup successful! Redirecting...");
        router.push("/");
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    }
  };

  return (
    <div style={{...styles.container, ...(theme === "dark" ? styles.containerDark : {})}}>
      <style>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(236, 72, 153, 0.5); }
          50% { text-shadow: 0 0 20px rgba(236, 72, 153, 0.8); }
        }
        .sparkle-text {
          animation: glow 2s ease-in-out infinite;
        }
        .glow-button:hover {
          box-shadow: 0 0 30px rgba(236, 72, 153, 0.6) !important;
          transform: scale(1.05);
        }
      `}</style>

      <button style={{...styles.themeToggle, ...(theme === "dark" ? styles.themeToggleDark : {})}} onClick={toggleTheme}>
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <div style={styles.content}>
        <h1 style={styles.title} className="sparkle-text">
          ✨ Task Manager ✨
        </h1>
        
        <div style={{...styles.card, ...(theme === "dark" ? styles.cardDark : {})}}>
          <h2 style={{...styles.heading, ...(theme === "dark" ? styles.headingDark : {})}}>Create Account 💗</h2>

          {error && <div style={{...styles.error, ...(theme === "dark" ? styles.errorDark : {})}}>{error}</div>}

          <form onSubmit={handleSignup} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={{...styles.label, ...(theme === "dark" ? styles.labelDark : {})}}>📧 Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{...styles.input, ...(theme === "dark" ? styles.inputDark : {})}}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={{...styles.label, ...(theme === "dark" ? styles.labelDark : {})}}>🔒 Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{...styles.input, ...(theme === "dark" ? styles.inputDark : {})}}
                required
              />
            </div>

            <button type="submit" style={styles.button} className="glow-button">
              ✨ Sign Up ✨
            </button>
          </form>

          <p style={styles.toggle}>
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              style={{...styles.toggleBtn, ...(theme === "dark" ? styles.toggleBtnDark : {})}}
            >
              Login here
            </button>
          </p>
        </div>

        <p style={{...styles.test, ...(theme === "dark" ? styles.testDark : {})}}>
          💡 Test: test@test.com | password123
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.3s ease",
  },
  containerDark: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  },
  themeToggle: {
    position: "absolute",
    top: "20px",
    right: "20px",
    background: "rgba(255, 255, 255, 0.2)",
    border: "2px solid white",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    fontSize: "24px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  themeToggleDark: {
    background: "rgba(251, 191, 36, 0.2)",
    borderColor: "#fbbf24",
  },
  content: {
    width: "100%",
    maxWidth: "420px",
    padding: "20px",
    zIndex: 10,
  },
  title: {
    fontSize: "40px",
    color: "white",
    textAlign: "center",
    marginBottom: "50px",
    textShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
    fontWeight: "bold",
  },
  card: {
    background: "white",
    padding: "50px 40px",
    borderRadius: "25px",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
    border: "3px solid #fbcfe8",
    transition: "all 0.3s ease",
  },
  cardDark: {
    background: "#16213e",
    border: "3px solid #0f3460",
  },
  heading: {
    fontSize: "28px",
    color: "#ec4899",
    marginBottom: "35px",
    textAlign: "center",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  headingDark: {
    color: "#fbbf24",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "2px solid #fca5a5",
    textAlign: "center",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  errorDark: {
    background: "rgba(239, 68, 68, 0.2)",
    color: "#fca5a5",
    borderColor: "#dc2626",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#ec4899",
    transition: "all 0.3s ease",
  },
  labelDark: {
    color: "#fbbf24",
  },
  input: {
    padding: "14px 16px",
    border: "2px solid #fbcfe8",
    borderRadius: "12px",
    fontSize: "16px",
    outline: "none",
    backgroundColor: "#fff5fb",
    color: "#1f2937",
    transition: "all 0.3s ease",
    fontFamily: "inherit",
  },
  inputDark: {
    border: "2px solid #0f3460",
    backgroundColor: "#0f3460",
    color: "#fbbf24",
  },
  button: {
    padding: "16px",
    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
    transition: "all 0.3s ease",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    letterSpacing: "0.5px",
  },
  toggle: {
    textAlign: "center",
    marginTop: "25px",
    color: "#6b7280",
    fontSize: "14px",
    transition: "all 0.3s ease",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#ec4899",
    fontWeight: "bold",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "14px",
    transition: "all 0.3s ease",
  },
  toggleBtnDark: {
    color: "#fbbf24",
  },
  test: {
    textAlign: "center",
    marginTop: "40px",
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "13px",
    fontStyle: "italic",
    fontWeight: "500",
    transition: "all 0.3s ease",
  },
  testDark: {
    color: "rgba(251, 191, 36, 0.8)",
  },
};
