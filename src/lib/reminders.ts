export async function requestReminderPermission() {
  if (!('Notification' in window)) return 'unsupported' as const;
  if (Notification.permission === 'granted') return 'granted' as const;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied' as const;
  }
}

export async function sendWorkoutReminder(title: string, body: string, tag: string) {
  if ('vibrate' in navigator) navigator.vibrate([180, 80, 180]);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const options: NotificationOptions = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    } catch {
      // 开发环境没有 Service Worker 时回退到普通通知。
    }
  }
  new Notification(title, options);
}
