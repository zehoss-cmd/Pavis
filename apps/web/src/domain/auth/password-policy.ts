export function passwordRequirements(password: string) {
  return {
    length: password.length >= 8 && password.length <= 72,
    characters: /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password),
  };
}
export function isValidPassword(password: string) {
  const result = passwordRequirements(password);
  return result.length && result.characters;
}
