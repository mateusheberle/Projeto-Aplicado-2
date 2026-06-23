document.addEventListener('DOMContentLoaded', () => {
  const fLogin = document.getElementById('fLogin');
  const btnSenhaToggle = document.getElementById('btnSenhaToggle');
  const iSenha = document.getElementById('iSenha');
  const eyeIcon = document.getElementById('eyeIcon');

  // Toggle de visualização da senha (ver/esconder)
  btnSenhaToggle.addEventListener('click', () => {
    const isPass = iSenha.type === 'password';
    iSenha.type = isPass ? 'text' : 'password';

    // Modifica o ícone do SVG dinamicamente para mostrar/esconder o olho
    if (isPass) {
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
      btnSenhaToggle.title = "Ocultar Senha";
    } else {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
      btnSenhaToggle.title = "Visualizar Senha";
    }
  });

  // Evento de envio do formulário
  fLogin.addEventListener('submit', realizarLogin);
});

/**
 * Função para efetuar login
 */
async function realizarLogin(e) {
  e.preventDefault();
  limparErros();

  const loginInput = document.getElementById('iLogin').value.trim();
  const senhaInput = document.getElementById('iSenha').value;
  const btnLogin = document.getElementById('btnLogin');

  let ok = true;

  // Validações locais
  if (!loginInput) {
    marcaErro('iLogin', 'E-mail ou nome é obrigatório');
    ok = false;
  }
  if (!senhaInput) {
    marcaErro('iSenha', 'Senha é obrigatória');
    ok = false;
  }

  if (!ok) {
    toast('Por favor, preencha todos os campos obrigatórios.', 'warn');
    return;
  }

  // Estado de carregando no botão
  btnLogin.disabled = true;
  const originalText = btnLogin.innerHTML;
  btnLogin.innerHTML = `<span>Entrando...</span>`;

  try {
    const res = await AuthAPI.login(loginInput, senhaInput);

    // Toast de Sucesso
    toast(res.mensagem || 'Login efetuado com sucesso!', 'ok');

    // Salva a sessão no localStorage
    localStorage.setItem('usuarioLogado', JSON.stringify(res.usuario));
    localStorage.setItem('tokenSessao', res.token);

    // Aguarda um momento antes de redirecionar para a transição ficar suave
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1200);

  } catch (err) {
    toast(err.message || 'Erro ao realizar login', 'err');
    
    // Marca erros na interface
    if (err.message.includes('Senha') || err.message.includes('senha')) {
      marcaErro('iSenha', 'Senha incorreta');
    } else if (err.message.includes('encontrado') || err.message.includes('login') || err.message.includes('usuário')) {
      marcaErro('iLogin', 'Usuário ou e-mail inválido');
    }
    
    btnLogin.disabled = false;
    btnLogin.innerHTML = originalText;
  }
}

/**
 * Utilitários Visuais
 */
function toast(msg, tipo) {
  const toastsContainer = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  toastsContainer.appendChild(t);
  
  // Animação de entrada
  requestAnimationFrame(() => t.classList.add('show'));
  
  // Remoção automática
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 280);
  }, 3800);
}

function marcaErro(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('erro');
  
  // Verifica se o elemento tem container wrapper (caso da senha)
  const parent = el.closest('.fg');
  const sp = document.createElement('span');
  sp.className = 'msg-erro';
  sp.textContent = msg;
  parent.appendChild(sp);
}

function limparErros() {
  document.querySelectorAll('.erro').forEach(e => e.classList.remove('erro'));
  document.querySelectorAll('.msg-erro').forEach(e => e.remove());
}
