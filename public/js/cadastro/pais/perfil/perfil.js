const account = JSON.parse(localStorage.getItem('babysite_pais') || '{}');
const initials = (account.nome || 'Usuário').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
document.getElementById('nomePerfil').textContent = account.nome || 'Seu nome';
document.getElementById('avatarInitials').textContent = initials;
document.getElementById('parentProfileForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const file = document.getElementById('foto_perfil').files[0];
  account.foto_perfil = file ? file.name : `iniciais:${initials}`;
  localStorage.setItem('babysite_pais', JSON.stringify(account));
  window.location.href = '../senha/senha.html';
});
document.getElementById('foto_perfil').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('avatarImage').src = reader.result; document.getElementById('avatarImage').classList.remove('d-none'); document.getElementById('avatarInitials').classList.add('d-none'); };
  reader.readAsDataURL(file);
});