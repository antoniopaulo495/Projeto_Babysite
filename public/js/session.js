window.BabysiteSession = {
  get(tipoUsuario) {
    return localStorage.getItem(`babysite_token_${tipoUsuario}`);
  },

  remember(tipoUsuario, token) {
    localStorage.setItem(`babysite_token_${tipoUsuario}`, token);
  },

  clear(tipoUsuario, token) {
    const roleKey = `babysite_token_${tipoUsuario}`;
    if (localStorage.getItem(roleKey) === token) localStorage.removeItem(roleKey);
    if (localStorage.getItem('babysite_token') === token) localStorage.removeItem('babysite_token');
  }
};
