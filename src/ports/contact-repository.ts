import type { Contact, ContactId, NewContact } from "@/domain/contact/contact";
import type { UserId } from "@/domain/user/user";

export interface ContactRepository {
  listByOwnerId(ownerId: UserId): Promise<readonly Contact[]>;
  findById(ownerId: UserId, id: ContactId): Promise<Contact | null>;
  findByPhone(ownerId: UserId, phone: string): Promise<Contact | null>;
  create(ownerId: UserId, contact: NewContact): Promise<Contact>;
}
