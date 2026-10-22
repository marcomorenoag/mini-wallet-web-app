import type { LoginIdentifier } from "@/domain/auth/login-identifier";
import type { User, UserId } from "@/domain/user/user";

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByIdentifier(identifier: LoginIdentifier): Promise<User | null>;
}
