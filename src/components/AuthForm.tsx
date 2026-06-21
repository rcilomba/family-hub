import { useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export function AuthForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [message, setMessage] = useState(
    'Ange namn och e-post. Supabase skickar en säker login-länk.',
  );
  const trimmedDisplayName = displayName.trim();
  const trimmedEmail = email.trim();

  async function handleSubmit() {
    if (!supabase || !trimmedDisplayName || !trimmedEmail) {
      return;
    }

    setStatus('loading');
    setMessage('Skickar login-länk...');

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        data: {
          display_name: trimmedDisplayName,
        },
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(getAuthErrorMessage(error.message));
      return;
    }

    setStatus('success');
    setMessage('Kolla din e-post och öppna login-länken för att fortsätta.');
  }

  return (
    <main className='auth-shell'>
      <section className='auth-card'>
        <div className='brand-block'>
          <img
            className='brand-logo auth-logo'
            src='/kapiamba-logo.png'
            alt='The Kapiambas'
          />
          <h1>Logga in</h1>
          <p>
            Ange namn och e-postadress för att komma åt sommarhusets bokningar.
          </p>
        </div>

        {!hasSupabaseConfig ? (
          <div className='availability-message invalid'>
            Lägg till VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY i .env.local
            innan login kan användas.
          </div>
        ) : (
          <form
            className='booking-form'
            onSubmit={(event) => event.preventDefault()}
          >
            <label>
              Namn
              <input
                autoComplete='name'
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder='Förnamn Efternamn'
                type='text'
                value={displayName}
              />
            </label>

            <label>
              E-post
              <input
                autoComplete='email'
                onChange={(event) => setEmail(event.target.value)}
                placeholder='namn@example.com'
                type='email'
                value={email}
              />
            </label>

            <div className={`availability-message ${status}`}>{message}</div>

            <button
              disabled={
                !trimmedDisplayName || !trimmedEmail || status === 'loading'
              }
              onClick={handleSubmit}
              type='button'
            >
              Skicka login-länk
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function getAuthErrorMessage(errorMessage: string) {
  if (errorMessage.toLowerCase().includes('not allowed')) {
    return 'E-postadressen är inte tillagd av admin ännu. Be Ramadan lägga till dig.';
  }

  if (errorMessage.toLowerCase().includes('rate limit')) {
    return 'För många login-länkar har skickats på kort tid. Vänta en stund och testa igen.';
  }

  return `Login-länken kunde inte skickas: ${errorMessage}`;
}
