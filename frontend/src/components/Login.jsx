import React, { useState } from "react";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // A FastAPI OAuth2PasswordRequestForm "x-www-form-urlencoded" formátumot vár, nem sima JSON-t!
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await fetch(
        "https://familytree-backend-9ua6.onrender.com/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        },
      );

      if (!response.ok) {
        throw new Error("Hibás felhasználónév vagy jelszó!");
      }

      const data = await response.json();
      // Átadjuk a tokent és a jogosultságot az App.jsx-nek
      onLoginSuccess(data.access_token, data.is_admin);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Családfa Belépés</h2>

        {error && <p className="error-message">{error}</p>}

        <div className="input-group">
          <label>Felhasználónév</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Jelszó</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="login-button">
          Belépés
        </button>
      </form>
    </div>
  );
}

export default Login;
