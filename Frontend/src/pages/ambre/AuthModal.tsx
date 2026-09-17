import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '@cafe/shared';
import { useAuth, type AuthIntent } from '../../auth/AuthContext';
import { Modal } from './Modal';

const INTENT_COPY: Record<Exclude<AuthIntent, null>, string> = {
  reserve: 'Войдите, чтобы забронировать столик',
  order: 'Войдите, чтобы оформить доставку',
};

type Tab = 'login' | 'register';

export function AuthModal() {
  const { isModalOpen, modalIntent, modalTab, closeAuthModal, login, registerClient } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      setTab(modalTab);
      setError(null);
    }
  }, [isModalOpen, modalTab]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  if (!isModalOpen) return null;

  const title = modalIntent ? INTENT_COPY[modalIntent] : 'Личный кабинет AMBRE';

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    login({ email: loginEmail, password: loginPassword })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Не удалось войти.'))
      .finally(() => setSubmitting(false));
  };

  const handleRegister = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (regPassword !== regPasswordConfirm) {
      setError('Пароли не совпадают.');
      return;
    }
    setSubmitting(true);
    setError(null);
    registerClient({ firstName, lastName, email: regEmail, phone, password: regPassword })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setError(err.errors.length > 0 ? err.errors.join(' ') : err.message);
        } else {
          setError('Не удалось зарегистрироваться.');
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Modal onClose={closeAuthModal} labelledBy="auth-modal-title" panelClassName="auth-modal">
      <p className="eyebrow">AMBRE</p>
      <h2 id="auth-modal-title" className="menu-title auth-modal-title">
        {title}
      </h2>

      <div className="auth-tabs">
        <button type="button" className={`auth-tab ${tab === 'login' ? 'is-active' : ''}`} onClick={() => { setTab('login'); setError(null); }}>
          Вход
        </button>
        <button type="button" className={`auth-tab ${tab === 'register' ? 'is-active' : ''}`} onClick={() => { setTab('register'); setError(null); }}>
          Регистрация
        </button>
      </div>

      {tab === 'login' ? (
        <form className="reserve-form" onSubmit={handleLogin}>
          <label className="reserve-field">
            <span>Email</span>
            <input type="email" required autoComplete="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
          </label>
          <label className="reserve-field">
            <span>Пароль</span>
            <input type="password" required autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
          </label>
          {error && <div className="reserve-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Входим…' : 'Войти'}
          </button>
        </form>
      ) : (
        <form className="reserve-form" onSubmit={handleRegister}>
          <div className="reserve-row">
            <label className="reserve-field">
              <span>Имя</span>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="reserve-field">
              <span>Фамилия</span>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
          <div className="reserve-row">
            <label className="reserve-field">
              <span>Email</span>
              <input type="email" required autoComplete="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            </label>
            <label className="reserve-field">
              <span>Телефон</span>
              <input type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
          <div className="reserve-row">
            <label className="reserve-field">
              <span>Пароль</span>
              <input type="password" required minLength={8} autoComplete="new-password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
            </label>
            <label className="reserve-field">
              <span>Повтор пароля</span>
              <input type="password" required minLength={8} autoComplete="new-password" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} />
            </label>
          </div>
          <p className="auth-hint">Пароль — минимум 8 символов, с заглавной и строчной буквой и цифрой.</p>
          <p className="auth-hint">Email нужен для уведомлений о бронях и заказах, телефон — чтобы с вами можно было связаться.</p>
          {error && <div className="reserve-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
          </button>
        </form>
      )}
    </Modal>
  );
}
