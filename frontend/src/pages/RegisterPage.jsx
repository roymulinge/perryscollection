import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password2: "",
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

    if (form.password !== form.password2) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);
      setError("");

      await apiClient.post("/auth/register/", form);

      navigate("/login");
    } catch (err) {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .auth-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top right, #2a1708 0%, #120a06 55%),
              #120a06;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }

          .auth-card {
            width: 100%;
            max-width: 500px;
            background: #1a0f08;
            border: 1px solid rgba(196, 148, 72, 0.2);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
          }

          .auth-logo {
            text-align: center;
            margin-bottom: 20px;
          }

          .logo-circle {
            width: 75px;
            height: 75px;
            margin: auto;
            border-radius: 50%;
            background: linear-gradient(
              135deg,
              #c49448,
              #8b5e1a
            );
            display: flex;
            align-items: center;
            justify-content: center;
            color: #120a06;
            font-size: 32px;
            font-weight: bold;
            font-family: Georgia, serif;
          }

          .auth-title {
            color: #f0dba8;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2rem;
            font-family: Georgia, serif;
          }

          .auth-subtitle {
            text-align: center;
            color: #9a7a4a;
            margin-bottom: 30px;
          }

          .error {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.2);
            color: #ff8c8c;
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .auth-input {
            width: 100%;
            height: 54px;
            padding: 0 15px;
            border-radius: 10px;
            border: 1px solid rgba(196, 148, 72, 0.2);
            background: #120a06;
            color: #f0dba8;
            font-size: 15px;
            transition: all 0.3s ease;
          }

          .auth-input::placeholder {
            color: #755632;
          }

          .auth-input:focus {
            outline: none;
            border-color: #c49448;
            box-shadow: 0 0 0 3px rgba(196, 148, 72, 0.15);
          }

          .auth-button {
            width: 100%;
            height: 54px;
            margin-top: 10px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(
              135deg,
              #c49448,
              #8b5e1a
            );
            color: #120a06;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .auth-button:hover {
            transform: translateY(-2px);
          }

          .auth-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .auth-link {
            margin-top: 25px;
            text-align: center;
            color: #9a7a4a;
          }

          .auth-link a {
            color: #c49448;
            text-decoration: none;
            font-weight: 600;
          }

          .auth-link a:hover {
            color: #f0dba8;
          }

          @media (max-width: 600px) {
            .auth-card {
              padding: 25px;
            }

            .auth-title {
              font-size: 1.6rem;
            }

            .logo-circle {
              width: 65px;
              height: 65px;
              font-size: 28px;
            }
          }
        `}
      </style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="logo-circle">P</div>
          </div>

          <h1 className="auth-title">Create Account</h1>

          <p className="auth-subtitle">
            Join Perry's Collection and discover timeless elegance.
          </p>

          {error && <p className="error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                className="auth-input"
                name="first_name"
                placeholder="First Name"
                value={form.first_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <input
                className="auth-input"
                name="last_name"
                placeholder="Last Name"
                value={form.last_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <input
                className="auth-input"
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <input
                className="auth-input"
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <input
                className="auth-input"
                type="password"
                name="password2"
                placeholder="Confirm Password"
                value={form.password2}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="auth-link">
            Already have an account?{" "}
            <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}