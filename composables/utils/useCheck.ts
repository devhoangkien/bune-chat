export function checkEmail(email: string): boolean {
  return /^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email);
};


export function checkPhone(phone: string): boolean {
  return /^(?:(?:\+|00)86)?1[3-9]\d{9}$/.test(phone);
}
