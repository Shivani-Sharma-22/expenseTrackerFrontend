import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private openModal = signal<string | null>(null);

  open(id: string) { this.openModal.set(id); }
  close() { this.openModal.set(null); }
  isOpen(id: string) { return this.openModal() === id; }
}
