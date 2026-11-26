// Minimal typings for the Moodle core AMD modules we use.
declare module 'core/ajax' {
  const Ajax: { call(requests: { methodname: string; args: Record<string, unknown> }[]): Promise<any>[] };
  export default Ajax;
}
declare module 'core/notification' {
  const Notification: { exception(e: unknown): void; alert(title: string, message: string): void };
  export default Notification;
}
declare module 'core/toast' {
  export function add(message: string, config?: { type?: 'success' | 'info' | 'warning' | 'danger'; delay?: number }): Promise<void>;
}
