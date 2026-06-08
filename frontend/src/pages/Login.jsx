import React, { useState } from 'react';
import { Bus, Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [obscurePassword, setObscurePassword] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await api.auth.login(email.trim().toLowerCase(), password);
      if (result.ok && result.data) {
        setFailedAttempts(0);
        onLoginSuccess(result.data.usuario);
      } else {
        setFailedAttempts(prev => prev + 1);
        setErrorMsg('Credenciales inválidas. Inténtalo de nuevo.');
      }
    } catch (error) {
      setFailedAttempts(prev => prev + 1);
      setErrorMsg(error.message || 'Error de conexión. Inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left panel - Hero info */}
      <div className="auth-sidebar">
        <div className="auth-logo">
          <Bus size={96} strokeWidth={1.5} />
        </div>
        <h1 style={{ color: 'white', fontSize: '3rem', margin: '0 0 16px 0', letterSpacing: '-1px' }}>RouteKids</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.2rem', maxWidth: '360px', margin: 0 }}>
          Lleva a tus niños seguros, siempre. Rastreabilidad escolar en tiempo real.
        </p>
      </div>

      {/* Right panel - Form wrapper */}
      <div className="auth-form-wrapper">
        <div className="auth-card">
          <h2 className="auth-title">Iniciar Sesión</h2>
          <p className="auth-subtitle">Ingresa tus credenciales para acceder a la plataforma</p>

          {/* Failed attempts alert */}
          {failedAttempts >= 3 && (
            <div className="auth-alert auth-alert-warning">
              <AlertTriangle size={20} />
              <div>
                <strong>Varios intentos fallidos.</strong> Por favor, verifica tus datos de inicio.
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div className="auth-alert auth-alert-danger">
              <AlertTriangle size={20} />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label htmlFor="password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={obscurePassword ? 'password' : 'text'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setObscurePassword(!obscurePassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--neutral-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {obscurePassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '28px',
              fontSize: '0.9rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }}
                />
                Recordarme
              </label>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('Funcionalidad en desarrollo. Contacte al administrador de RouteKids.');
                }}
                className="auth-link"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: '100%', padding: '14px' }}
            >
              {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--neutral-muted)' }}>
            ¿No tienes cuenta?{' '}
            <button 
              onClick={onNavigateToRegister}
              className="auth-link"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
            >
              Regístrate aquí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
