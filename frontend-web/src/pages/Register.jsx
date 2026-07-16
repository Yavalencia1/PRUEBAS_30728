import React, { useState } from 'react';
import { Bus, User, Mail, Phone, Lock, ArrowLeft, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function Register({ onNavigateToLogin }) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
    confirmar_password: '',
    rol: 'padre',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ percent: 0, label: 'Débil', color: 'red' });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [id]: value };
      if (id === 'password') {
        calculatePasswordStrength(value);
      }
      return updated;
    });
  };

  const calculatePasswordStrength = (pass) => {
    if (!pass) {
      setPasswordStrength({ percent: 0, label: 'Vacía', color: '#cbd5e1' });
      return;
    }
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/\d/.test(pass)) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength += 25;

    let label = 'Débil';
    let color = 'var(--danger-color)';
    if (strength > 50) {
      label = 'Media';
      color = 'var(--warning-color)';
    }
    if (strength === 100) {
      label = 'Fuerte';
      color = 'var(--success-color)';
    }
    setPasswordStrength({ percent: strength, label, color });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validar contraseña
    if (formData.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmar_password) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    // Validar teléfono (10 dígitos en México/Ecuador habituales)
    if (!/^\d{10}$/.test(formData.telefono)) {
      setErrorMsg('El teléfono debe tener exactamente 10 dígitos.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        email: formData.email.trim().toLowerCase(),
        telefono: formData.telefono.trim(),
        password: formData.password,
        confirmar_password: formData.confirmar_password,
        rol: formData.rol,
      };

      const result = await api.auth.registro(payload);
      if (result.ok) {
        alert('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
        onNavigateToLogin();
      } else {
        setErrorMsg(result.mensaje || 'No se pudo crear la cuenta.');
      }
    } catch (error) {
      setErrorMsg(error.message || 'Error al conectar con el servidor.');
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
          Únete a nosotros y mantén la seguridad de tus niños en cada viaje escolar.
        </p>
      </div>

      {/* Right panel - Form wrapper */}
      <div className="auth-form-wrapper">
        <div className="auth-card" style={{ maxWidth: '540px' }}>
          <button
            onClick={onNavigateToLogin}
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '20px',
              borderRadius: 'var(--border-radius-sm)'
            }}
          >
            <ArrowLeft size={16} />
            Volver al Login
          </button>

          <h2 className="auth-title" style={{ textAlign: 'left', marginBottom: '8px' }}>Crear Cuenta</h2>
          <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '24px' }}>Regístrate completando tus datos personales</p>

          {errorMsg && (
            <div className="auth-alert auth-alert-danger">
              <AlertTriangle size={20} />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                    <User size={16} />
                  </span>
                  <input
                    id="nombre"
                    type="text"
                    placeholder="Juan"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="apellido">Apellido</label>
                <input
                  id="apellido"
                  type="text"
                  placeholder="Pérez"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="telefono">Teléfono (10 dígitos)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                    <Phone size={16} />
                  </span>
                  <input
                    id="telefono"
                    type="tel"
                    placeholder="0991234567"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="rol">Rol del Usuario</label>
                <select id="rol" value={formData.rol} onChange={handleInputChange} required>
                  <option value="padre">Padre de Familia</option>
                  <option value="conductor">Conductor de Autobús</option>
                  <option value="dueno">Dueño de Transporte</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleInputChange}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
              {/* Strength indicator bar */}
              {formData.password && (
                <div>
                  <div className="strength-bar">
                    <div 
                      className="strength-bar-fill"
                      style={{ 
                        width: `${passwordStrength.percent}%`, 
                        backgroundColor: passwordStrength.color 
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: passwordStrength.color, marginTop: '4px', display: 'block' }}>
                    Fortaleza de contraseña: {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label htmlFor="confirmar_password">Confirmar Contraseña</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-muted)' }}>
                  <Lock size={16} />
                </span>
                <input
                  id="confirmar_password"
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={formData.confirmar_password}
                  onChange={handleInputChange}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: '100%', padding: '14px' }}
            >
              {isLoading ? 'Registrando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
