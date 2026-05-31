function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getDeviceId(): string {
  const key = 'loccalo_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getDeviceType(): 'web' {
  return 'web';
}
