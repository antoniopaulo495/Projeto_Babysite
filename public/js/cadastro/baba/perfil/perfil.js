const account = JSON.parse(localStorage.getItem('babysite_baba') || '{}');
const initials = (account.nome || 'Usuário').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const photoStorageKey = 'babysite_baba_photo';
const stagedPhoto = sessionStorage.getItem(photoStorageKey);
const form = document.getElementById('sitterProfileForm');
const photoError = document.createElement('p');
const photoImage = document.getElementById('avatarImage');
photoError.className = 'text-danger small';
photoError.setAttribute('role', 'alert');
form.insertBefore(photoError, form.querySelector('.d-flex'));
document.getElementById('nomePerfil').textContent = account.nome || 'Seu nome';
document.getElementById('avatarInitials').textContent = initials;
if (stagedPhoto) {
  photoImage.src = stagedPhoto;
  photoImage.classList.remove('d-none');
  document.getElementById('avatarInitials').classList.add('d-none');
}

function prepararFoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Escolha um arquivo de imagem válido.'));
      image.onload = () => {
        const scale = Math.min(1, 512 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  photoError.textContent = '';
  const submitButton = form.querySelector('[type="submit"]');
  const file = document.getElementById('foto_perfil').files[0];
  if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    photoError.textContent = 'Escolha uma imagem JPEG, PNG ou WebP.';
    return;
  }
  if (file && file.size > 5 * 1024 * 1024) {
    photoError.textContent = 'A foto precisa ter no máximo 5 MB.';
    return;
  }
  submitButton.disabled = true;
  try {
    if (file) sessionStorage.setItem(photoStorageKey, await prepararFoto(file));
  } catch (error) {
    photoError.textContent = error.message;
    submitButton.disabled = false;
    return;
  }
  account.foto_perfil = file ? file.name : `iniciais:${initials}`;
  localStorage.setItem('babysite_baba', JSON.stringify(account));
  window.location.href = '../disponibilidade/disponibilidade.html';
});
document.getElementById('foto_perfil').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { photoImage.src = reader.result; photoImage.classList.remove('d-none'); document.getElementById('avatarInitials').classList.add('d-none'); };
  reader.readAsDataURL(file);
});
