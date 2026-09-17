import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { ApiError } from '@cafe/shared';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../routes/routePaths';
import './LoginPage.css';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password);
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? ROUTES.board, { replace: true });
    } catch (error) {
      setError('root', {
        message: error instanceof ApiError ? error.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="login-brand">
          <span className="login-brand-mark">A</span>
          <span>AMBRE Cashier</span>
        </div>

        <label className="login-field">
          <span>Email</span>
          <input type="email" autoComplete="username" {...register('email')} />
          {errors.email && <span className="login-field-error">{errors.email.message}</span>}
        </label>

        <label className="login-field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <span className="login-field-error">{errors.password.message}</span>}
        </label>

        {errors.root && <div className="login-banner">{errors.root.message}</div>}

        <button type="submit" className="login-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
