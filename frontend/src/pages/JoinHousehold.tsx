import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { useToast } from '../components/Toast';

export default function JoinHousehold() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setStatus('error');
      return;
    }
    client
      .post('/api/households/join', { invite_code: code })
      .then(() => {
        toast.success(t('profile.joinedHousehold'));
        setStatus('success');
        setTimeout(() => navigate('/profile'), 1500);
      })
      .catch(() => {
        toast.error(t('profile.invalidInvite'));
        setStatus('error');
      });
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
      {status === 'loading' && (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {status === 'success' && (
        <>
          <div className="text-4xl">🎉</div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.joinedHousehold')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.redirecting')}</p>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('profile.invalidInvite')}</p>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {t('profile.goToProfile')}
          </button>
        </>
      )}
    </div>
  );
}
