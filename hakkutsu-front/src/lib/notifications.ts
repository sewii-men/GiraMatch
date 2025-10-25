// ブラウザ通知ユーティリティ

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

/**
 * 通知権限をリクエストする
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("このブラウザは通知をサポートしていません");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * ブラウザ通知を表示する
 */
export function showNotification(options: NotificationOptions): void {
  if (!("Notification" in window)) {
    console.warn("このブラウザは通知をサポートしていません");
    return;
  }

  if (Notification.permission !== "granted") {
    console.warn("通知権限が許可されていません");
    return;
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || "/icon-192x192.png",
    tag: options.tag,
    badge: "/icon-72x72.png",
  });

  if (options.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  // 5秒後に自動的に閉じる
  setTimeout(() => {
    notification.close();
  }, 5000);
}

/**
 * ギラ飲みチャット用の通知を表示
 */
export function showChatNotification(
  nickname: string,
  message: string,
  onClickCallback?: () => void
): void {
  showNotification({
    title: `ギラ飲みチャット - ${nickname}`,
    body: message,
    icon: "/icon-192x192.png",
    tag: "giranomi-chat",
    onClick: onClickCallback,
  });
}

/**
 * チャット開設通知
 */
export function showChatOpenNotification(opponent: string, onClickCallback?: () => void): void {
  showNotification({
    title: "ギラ飲みチャットが開設されました！",
    body: `${opponent}の試合後チャットが始まりました。参加して交流しましょう！`,
    icon: "/icon-192x192.png",
    tag: "giranomi-chat-open",
    onClick: onClickCallback,
  });
}

/**
 * チャット終了通知
 */
export function showChatCloseNotification(): void {
  showNotification({
    title: "ギラ飲みチャット終了",
    body: "本日のギラ飲みチャットは23:59に終了しました。またのご参加をお待ちしています！",
    icon: "/icon-192x192.png",
    tag: "giranomi-chat-close",
  });
}
