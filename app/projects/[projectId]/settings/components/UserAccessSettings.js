'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useTranslation } from 'react-i18next';

export default function UserAccessSettings({ projectId }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [projectId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/users`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password: password || undefined, name: name || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('settings.addUserFailed'));
        return;
      }
      setUsers((prev) => [...prev, data.user]);
      setEmail('');
      setPassword('');
      setName('');
      setMessage(t('settings.saveSuccess'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId) => {
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(t('settings.removeUserFailed'));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('settings.userAccess', 'User Access')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('settings.userAccessDesc', 'Add reviewers who can view this project and rate questions/answers.')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <Box component="form" onSubmit={handleAdd} sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          size="small"
          sx={{ minWidth: 200 }}
        />
        <TextField
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.passwordOptional')}
          size="small"
          sx={{ minWidth: 150 }}
        />
        <TextField
          label={t('auth.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('common.optional', 'Optional')}
          size="small"
          sx={{ minWidth: 120 }}
        />
        <Button type="submit" variant="contained" startIcon={<PersonAddIcon />} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : t('common.add', 'Add')}
        </Button>
      </Box>

      <List>
        {users.map((u) => (
          <ListItem
            key={u.id}
            secondaryAction={
              <IconButton edge="end" onClick={() => handleRemove(u.id)} aria-label={t('common.remove')}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText primary={u.email} secondary={u.name || u.role} />
          </ListItem>
        ))}
        {users.length === 0 && (
          <ListItem>
            <ListItemText primary={t('settings.noUsers', 'No reviewers assigned yet.')} />
          </ListItem>
        )}
      </List>
    </Box>
  );
}
