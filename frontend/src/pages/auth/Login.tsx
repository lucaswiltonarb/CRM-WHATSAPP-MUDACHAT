import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('carlos@techserve.com.br');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { notify('Preencha e-mail e senha', 'warning'); return; }
    setLoading(true);
    try {
      await login(email, password);
      notify('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch {
      notify('Falha no login. Verifique suas credenciais.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="brand-logo lg"><i className="ti ti-message-chatbot" /></div>
          <h1>NexAtende</h1>
          <p>Plataforma inteligente de atendimento, vendas e automação omnichannel.</p>
          <ul className="auth-features">
            <li><i className="ti ti-circle-check" /> Atendimento humano e por IA</li>
            <li><i className="ti ti-circle-check" /> CRM e funil de vendas</li>
            <li><i className="ti ti-circle-check" /> Automações com fluxo visual</li>
            <li><i className="ti ti-circle-check" /> Campanhas e agentes de IA</li>
          </ul>
        </div>
      </div>
      <div className="auth-form-side">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Bem-vindo de volta</h2>
          <p className="auth-sub">Entre com suas credenciais para acessar a plataforma</p>
          <div className="form-group">
            <label>E-mail</label>
            <div className="input-icon">
              <i className="ti ti-mail" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
          </div>
          <div className="form-group">
            <label>Senha</label>
            <div className="input-icon">
              <i className="ti ti-lock" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div className="auth-row">
            <label className="checkbox-inline"><input type="checkbox" defaultChecked /> Lembrar-me</label>
            <a href="#" onClick={(e) => e.preventDefault()}>Esqueceu a senha?</a>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <p className="auth-demo-hint">Demo: use qualquer e-mail dos usuários ou apenas clique em Entrar.</p>
        </form>
      </div>
    </div>
  );
}
