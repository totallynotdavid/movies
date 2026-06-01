import "void";
import type { UserRole } from "@/domain/user";
import type { Visibility } from "@/shared/types/identity";

declare module "void" {
  interface CloudContextVariables {
    role: UserRole;
    shared: {
      // username + visibility let the nav link to (and gate) the public profile
      // without an extra client read.
      user: {
        id: string;
        name: string;
        email: string;
        username: string | null;
        visibility: Visibility;
      } | null;
      role: UserRole;
    };
  }
}
