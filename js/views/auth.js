import { h, clear, toast } from '../ui.js';
import { signUp, signIn, DEMO_MODE } from '../supabase.js';
import { icon } from '../icons.js';

let mode = 'login'; // 'login' | 'signup'
let role = 'surfista';

export function renderAuth(root, onDone) {
  clear(root);

  if (DEMO_MODE) {
    root.append(
      h('div', { class: 'page' }, [
        h('div', { class: 'container' }, [
          h('div', { class: 'card reveal', style: 'max-width:520px;margin:30px auto;padding:32px' }, [
            h('div', { class: 'emo', style: 'color:var(--teal-400)' }, icon('login', { size: 48 })),
            h('h1', { class: 'page-title', style: 'margin-top:10px' }, 'Login indisponível no modo demonstração'),
            h('p', { class: 'page-sub' },
              'A previsão de ondas e marés já está funcionando! Para liberar login, feed de fotos e campeonatos, configure o Supabase (gratuito) seguindo o README.md.'),
            h('a', { class: 'btn btn-primary', href: '#/forecast' }, [icon('waves', { size: 17 }), 'Ver previsão de ondas']),
          ]),
        ]),
      ])
    );
    return;
  }

  const isSignup = mode === 'signup';
  const form = h('form', { class: 'form' });

  if (isSignup) {
    form.append(
      h('div', { class: 'field' }, [
        h('label', {}, 'Você é...'),
        h('div', { class: 'role-pick' }, [
          roleOption('surfista', 'surf', 'Surfista'),
          roleOption('fotografo', 'camera', 'Fotógrafo / Videomaker'),
        ]),
      ]),
      field('name', 'Nome', 'text', 'Como quer aparecer no app'),
    );
  }
  form.append(
    field('email', 'E-mail', 'email', 'voce@email.com'),
    field('password', 'Senha', 'password', 'mínimo 6 caracteres'),
    h('button', { class: 'btn btn-primary', type: 'submit', style: 'width:100%;justify-content:center' },
      isSignup ? 'Criar conta' : 'Entrar'),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Aguarde...';
    try {
      if (isSignup) {
        await signUp({
          email: fd.get('email'),
          password: fd.get('password'),
          name: fd.get('name'),
          role,
        });
        toast('Conta criada! Bem-vindo(a) ao Marolas');
      } else {
        await signIn({ email: fd.get('email'), password: fd.get('password') });
        toast('Bem-vindo(a) de volta!');
      }
      onDone?.();
    } catch (err) {
      toast(traduzErro(err), true);
      btn.disabled = false;
      btn.textContent = isSignup ? 'Criar conta' : 'Entrar';
    }
  });

  function roleOption(value, iconName, label) {
    return h('div', {
      class: 'role-opt' + (role === value ? ' sel' : ''),
      onclick: (ev) => {
        role = value;
        ev.currentTarget.parentElement.querySelectorAll('.role-opt')
          .forEach((n) => n.classList.remove('sel'));
        ev.currentTarget.classList.add('sel');
      },
    }, [h('span', { class: 'emo' }, icon(iconName, { size: 26 })), label]);
  }

  root.append(
    h('div', { class: 'page' }, [
      h('div', { class: 'container' }, [
        h('div', { class: 'card reveal', style: 'max-width:480px;margin:24px auto;padding:32px' }, [
          h('h1', { class: 'page-title' }, isSignup ? 'Criar conta' : 'Entrar no Marolas'),
          h('p', { class: 'page-sub' },
            isSignup ? 'Junte-se à comunidade do surf do Litoral Norte.' : 'Que bom te ver de novo.'),
          form,
          h('p', { class: 'center', style: 'margin-top:18px' }, [
            isSignup ? 'Já tem conta? ' : 'Ainda não tem conta? ',
            h('a', {
              href: '#',
              onclick: (e) => { e.preventDefault(); mode = isSignup ? 'login' : 'signup'; renderAuth(root, onDone); },
            }, isSignup ? 'Entrar' : 'Criar agora'),
          ]),
        ]),
      ]),
    ])
  );
}

function field(name, label, type, placeholder) {
  return h('div', { class: 'field' }, [
    h('label', {}, label),
    h('input', { name, type, placeholder, required: true, minlength: type === 'password' ? 6 : null }),
  ]);
}

function traduzErro(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been')) return 'Esse e-mail já tem conta. Faça login.';
  if (m.includes('password')) return 'Senha precisa ter pelo menos 6 caracteres.';
  return err?.message || 'Algo deu errado. Tente de novo.';
}
