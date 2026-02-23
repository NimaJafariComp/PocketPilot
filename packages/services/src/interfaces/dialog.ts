export interface DialogAdapter {
  confirm(message: string, title?: string): Promise<boolean>;
  alert(message: string, title?: string): Promise<void>;
}
