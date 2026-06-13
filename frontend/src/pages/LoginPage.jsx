import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await apiClient.post("/auth/login/", form);

      localStorage.setItem("token", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      navigate("/");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back</h1>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />

          <button type="submit">
            {loading ? "Signing In..." : "Login"}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account?
          <Link to="/register"> Register</Link>
        </p>
      </div>

      <style>{`
      .auth-page{
        min-height:100vh;
        background:#120a06;
        display:flex;
        justify-content:center;
        align-items:center;
        padding:20px;
      }

      .auth-card{
        width:100%;
        max-width:450px;
        background:#1a0f08;
        border:1px solid rgba(196,148,72,.2);
        border-radius:16px;
        padding:32px;
      }

      h1{
        color:#f0dba8;
        margin-bottom:24px;
        text-align:center;
      }

      input{
        width:100%;
        margin-bottom:15px;
        height:52px;
        padding:0 15px;
        border-radius:10px;
        border:1px solid rgba(196,148,72,.2);
        background:#120a06;
        color:#f0dba8;
      }

      button{
        width:100%;
        height:52px;
        border:none;
        border-radius:10px;
        background:linear-gradient(135deg,#c49448,#8b5e1a);
        color:#120a06;
        font-weight:700;
        cursor:pointer;
      }

      .auth-link{
        margin-top:20px;
        text-align:center;
        color:#9a7a4a;
      }

      .auth-link a{
        color:#c49448;
      }

      .error{
        color:#ff7c7c;
      }
      `}</style>
    </div>
  );
}