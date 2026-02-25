'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';
import { authAtom } from '@/lib/store';

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuth = useSetAtom(authAtom);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          router.push('/');
          return;
        }
        return fetch('/api/auth/register/check', { credentials: 'include' });
      })
      .then((res) => {
        if (res && res.ok) {
          return res.json();
        }
        return { registrationOpen: false };
      })
      .then((data) => setRegistrationOpen(data?.registrationOpen ?? false))
      .catch(() => setRegistrationOpen(false));
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Registration failed');
        return;
      }

      router.push('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (registrationOpen === null) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!registrationOpen) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              {t('auth.registerSubtitle')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {t('auth.adminExists')}
            </Typography>
            <Button component="a" href="/login" variant="contained">
              {t('auth.login')}
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            {t('auth.registerTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {t('auth.registerSubtitle')}
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              helperText={t('auth.passwordMinLength')}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('auth.nameOptional')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
              {loading ? <CircularProgress size={24} /> : t('auth.register')}
            </Button>
          </form>

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            <Link href="/login">{t('auth.login')}</Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
